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
 */

import { spawn } from 'child_process';
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
  return new Promise((resolve, reject) => {
    const args = ['tsx', scriptPath];

    // Pass params as CLI args
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        args.push(`--${key}`, String(value));
      }
    }

    const proc = spawn('npx', args, {
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
        resolve(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''));
      } else {
        reject(new Error(`Exit code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
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
