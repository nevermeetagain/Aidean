/**
 * Script Executor — 执行 ScheduledScript 并记录 ScriptExecution。
 *
 * 执行流程：
 * 1. 查询 isActive=true 且 nextRunAt <= now 的 ScheduledScript
 * 2. 创建 ScriptExecution(status=0 执行中)
 * 3. 通过 child_process 执行 scriptPath
 * 4. 更新 ScriptExecution(status=1 成功 / 2 失败 + output/errorMsg)
 * 5. 更新 ScheduledScript.lastRunAt + nextRunAt
 *
 * 调用方式：
 * - 主动触发：executeScript(scriptId, params?)
 * - 定时扫描：runDueScripts()
 *
 * R-48: cronExpression 现在通过 cron-parser 库精确解析，
 * 不再回退到 +1 day 默认值。
 *
 * DEF-011-11（2026-10-20）：执行前先由 planScriptRun 把 DB 里登记的仓库根相对
 * scriptPath 解成绝对路径，并优先用本地 tsx CLI 启动（不再裸调 `npx`）。
 * 实测两条断裂：Windows 下 `spawn('npx')` 直接 ENOENT（npx 只有 .cmd/.ps1），
 * 且 web 进程 cwd 常为 apps/web 使 `scripts/crawl/*.ts` 解析不到 → 四个已注册
 * 脚本在本机永远 status=2（`.scratch/execprobe011.txt` 六用例取证）。
 */

import { spawn } from 'child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { CronExpressionParser } from 'cron-parser';
import { prisma } from '../../db/prisma';

export interface ExecuteResult {
  executionId: string;
  status: 0 | 1 | 2;
  output: string;
  errorMsg: string | null;
  durationMs: number;
}

/**
 * Execute a single scheduled script by ID.
 */
export async function executeScript(
  scriptId: string,
  params?: Record<string, unknown>
): Promise<ExecuteResult> {
  const script = await prisma.scheduledScript.findFirst({
    where: { id: scriptId, deletedAt: null },
  });

  if (!script) {
    throw new Error(`ScheduledScript ${scriptId} not found`);
  }

  const startedAt = new Date();
  const startTime = Date.now();

  // Create execution record
  const execution = await prisma.scriptExecution.create({
    data: {
      scriptId,
      status: 0,
      startedAt,
    },
  });

  try {
    const output = await runScriptProcess(script.scriptPath, params);
    const durationMs = Date.now() - startTime;

    await prisma.scriptExecution.update({
      where: { id: execution.id },
      data: {
        status: 1,
        finishedAt: new Date(),
        durationMs,
        output: output.slice(0, 65535), // @db.Text limit
      },
    });

    await prisma.scheduledScript.update({
      where: { id: scriptId },
      data: {
        lastRunAt: startedAt,
        nextRunAt: computeNextRun(script),
        intervalCount: { increment: 1 },
      },
    });

    return {
      executionId: execution.id,
      status: 1,
      output,
      errorMsg: null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await prisma.scriptExecution.update({
      where: { id: execution.id },
      data: {
        status: 2,
        finishedAt: new Date(),
        durationMs,
        errorMsg: errorMsg.slice(0, 65535),
      },
    });

    await prisma.scheduledScript.update({
      where: { id: scriptId },
      data: {
        lastRunAt: startedAt,
        nextRunAt: computeNextRun(script),
      },
    });

    return {
      executionId: execution.id,
      status: 2,
      output: '',
      errorMsg,
      durationMs,
    };
  }
}

/**
 * Find and execute all scripts that are due (nextRunAt <= now).
 */
export async function runDueScripts(): Promise<ExecuteResult[]> {
  const dueScripts = await prisma.scheduledScript.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      nextRunAt: { lte: new Date() },
    },
  });

  const results: ExecuteResult[] = [];
  for (const script of dueScripts) {
    // 透传 ScheduledScript.params（Json?）→ CLI 参数（runScriptProcess 以 --key value 展开）。
    // 此前 run-due 未传 params，导致 DB 里的 {"source":"quanzil"} 等自定义参数被忽略，
    // 「按源 / 按参 自定义频率调度」无法落地；此处接通（null → undefined，既有行行为不变）。
    const result = await executeScript(
      script.id,
      (script.params as Record<string, unknown> | null) ?? undefined,
    );
    results.push(result);
  }

  return results;
}

/**
 * Run a script via child_process (tsx for .ts files).
 * Captures stdout and rejects on non-zero exit code.
 */
function runScriptProcess(
  scriptPath: string,
  params?: Record<string, unknown>
): Promise<string> {
  return new Promise((resolveP, reject) => {
    // 解析失败也要入 ScriptExecution.errorMsg（不得让调度静默失败）
    let plan: ScriptRunPlan;
    try {
      plan = planScriptRun(scriptPath, { params });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const proc = spawn(plan.cmd, plan.args, {
      // M3 口径说明：plan.root 只用于定位脚本与 tsx 真身；子进程 cwd **有意**保持 web 进程 cwd，
      // 以免改变脚本对 .env / 相对路径的解析基准（运行态实证的成功路径就是该口径）
      cwd: process.cwd(),
      env: { ...process.env },
      timeout: 300_000, // 5 min max
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolveP(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''));
      } else {
        reject(new Error(`Exit code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export interface ScriptRunPlan {
  cmd: string;
  args: string[];
  scriptAbs: string;
  /** 实际用于解析 scriptPath 与 tsx 的仓库根 */
  root: string;
}

type PlanEnv = {
  cwd?: string;
  platform?: NodeJS.Platform;
  execPath?: string;
  exists?: (p: string) => boolean;
  params?: Record<string, unknown>;
};

/**
 * 把 ScheduledScript.scriptPath 解析成可直接 spawn 的命令与参数（纯函数，依赖可注入以便单测）。
 *
 * 口径：
 * - scriptPath 与 `script-validation.ts:14` 白名单同构，即**仓库根相对**；而 web 进程
 *   cwd 可能是 `apps/web`（`pnpm --filter web dev/start`）或仓库根（镜像内 `WORKDIR /app`），
 *   故从 cwd 开始探测至多 MAX_ROOT_LOOKUP 个候选根（cwd 本身 + 向上两级父目录），
 *   取第一个包含该相对路径的目录作为仓库根；全部未命中则抛错并列出已尝试路径（fail-safe，不会误指他处）。
 * - 启动器优先本地 tsx CLI（全平台可用、不依赖 PATH）；找不到才退回 npx：
 *   POSIX 下 npx 可无 shell 启动；win32 下 `npx`/`npx.cmd` 无 shell 分别 ENOENT/EINVAL，
 *   而开 `shell:true` 会把后台可编辑的 params 拼进命令行（命令注入），故宁可直接报错。
 * - 全程 args 数组，**绝不开 shell**。
 */
/** 仓库根探测的候选根上限：cwd 本身 + 向上两级父目录（共 3 个候选，与上方口径一致） */
const MAX_ROOT_LOOKUP = 3;

export function planScriptRun(scriptPath: string, env: PlanEnv = {}): ScriptRunPlan {
  const cwd = env.cwd ?? process.cwd();
  const platform = env.platform ?? process.platform;
  const execPath = env.execPath ?? process.execPath;
  const exists = env.exists ?? ((p: string) => existsSync(p));

  if (!scriptPath || scriptPath.includes('..')) {
    throw new Error(`非法 scriptPath：${scriptPath}（须为仓库内相对路径，且不得含 ..）`);
  }

  // 1) 定位脚本真身：绝对路径直用；相对路径从 cwd 逐级向上拼
  let scriptAbs: string | null = null;
  let root: string | null = null;
  const tried: string[] = [];
  if (isAbsolute(scriptPath)) {
    tried.push(scriptPath);
    if (exists(scriptPath)) {
      scriptAbs = scriptPath;
      root = dirname(scriptPath);
    }
  } else {
    // DB 里的 scriptPath 用正斜杠（跨平台书写），拆段后按本平台分隔符重拼，避免混合分隔符路径
    const rel = scriptPath.split(/[\\/]+/).filter(Boolean);
    let base = resolve(cwd);
    for (let i = 0; i < MAX_ROOT_LOOKUP; i += 1) {
      const candidate = join(base, ...rel);
      tried.push(candidate);
      if (exists(candidate)) {
        scriptAbs = candidate;
        root = base;
        break;
      }
      const parent = dirname(base);
      if (parent === base) break;
      base = parent;
    }
  }
  if (!scriptAbs || !root) {
    throw new Error(`脚本不存在：${scriptPath}（已尝试 ${tried.join(' | ')}）`);
  }

  // 2) 参数展开：与旧实现同口径 `--key value`，仍走 args 数组
  const paramArgs: string[] = [];
  if (env.params) {
    for (const [key, value] of Object.entries(env.params)) {
      paramArgs.push(`--${key}`, String(value));
    }
  }

  // 3) 启动器：本地 tsx CLI 优先（从仓库根与 cwd 两个上下文各试一次）
  const tsxCandidates: string[] = [];
  for (const base of root === cwd ? [root] : [root, cwd]) {
    tsxCandidates.push(
      join(base, 'apps', 'web', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      join(base, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    );
  }
  const tsxCli = tsxCandidates.find((p) => exists(p));
  if (tsxCli) {
    return { cmd: execPath, args: [tsxCli, scriptAbs, ...paramArgs], scriptAbs, root };
  }

  if (platform === 'win32') {
    throw new Error(
      `未找到本地 tsx CLI（已尝试 ${tsxCandidates.join(' | ')}）；Windows 下不可用 shell 包裹 npx（参数含后台可编辑值，开 shell 即命令注入）`,
    );
  }

  return { cmd: 'npx', args: ['tsx', scriptAbs, ...paramArgs], scriptAbs, root };
}

/**
 * Compute next run time based on intervalDays or cronExpression.
 *
 * 优先级：
 * 1. intervalDays > 0 → 加天数
 * 2. cronExpression 非空 → cron-parser 精确解析下一次执行时间
 * 3. 都没有 → null（不自动调度）
 *
 * R-48: cron-parser 替代旧的 +1 day 回退逻辑。
 */
export function computeNextRun(script: {
  intervalDays: number | null;
  cronExpression: string | null;
  triggerTime: string | null;
}): Date | null {
  // 优先 intervalDays
  if (script.intervalDays && script.intervalDays > 0) {
    const next = new Date();
    next.setDate(next.getDate() + script.intervalDays);
    return next;
  }

  // cronExpression 精确解析
  if (script.cronExpression) {
    try {
      const interval = CronExpressionParser.parse(script.cronExpression, { tz: process.env.TZ ?? 'Asia/Shanghai' });
      return interval.next().toDate();
    } catch {
      // 非法 cron 表达式，回退 +1 day（不阻断执行）
      const next = new Date();
      next.setDate(next.getDate() + 1);
      return next;
    }
  }

  return null;
}
