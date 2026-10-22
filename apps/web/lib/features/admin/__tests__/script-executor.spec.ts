/**
 * computeNextRun 单测（R-48 cron-parser 集成）+ planScriptRun 单测（DEF-011-11 调度链可执行性）。
 * 测试 intervalDays / cronExpression / 非法 cron / 空值 各路径；
 * 以及 scriptPath 解析 / tsx 优先 / npx 退回 / Windows 拒开 shell / 非法入参 各路径。
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { computeNextRun, planScriptRun } = await import("../script-executor");

describe("computeNextRun", () => {
  it("intervalDays > 0 → 加天数", () => {
    const before = new Date();
    const result = computeNextRun({ intervalDays: 7, cronExpression: null, triggerTime: null });
    expect(result).not.toBeNull();
    const after = new Date();
    // 应在 6.99 ~ 7.01 天后
    const diffDays = (result!.getTime() - before.getTime()) / 86400000;
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
    // 确认在合理范围内（不受 test 执行时间影响）
    expect(result!.getTime()).toBeGreaterThan(before.getTime());
    expect(result!.getTime()).toBeLessThan(after.getTime() + 86400000 * 7 + 1000);
  });

  it("cronExpression='0 2 * * *' → 次日 02:00", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: "0 2 * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 次日 02:00 的时间戳应大于当前
    expect(result!.getTime()).toBeGreaterThan(Date.now());
    // 小时应为 2（UTC+8 语境下 cron-parser 默认按 UTC 或 TZ 环境）
    // 只验证返回了一个有效未来时间
    expect(result!.getTime()).toBeLessThan(Date.now() + 86400000 * 2);
  });

  it("cronExpression='*/5 * * * *' → 5 分钟内", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: "*/5 * * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 下一次应在 5 分钟内
    expect(result!.getTime()).toBeLessThan(Date.now() + 5 * 60 * 1000 + 1000);
  });

  it("非法 cronExpression → 回退 +1 day", () => {
    const before = new Date();
    const result = computeNextRun({ intervalDays: null, cronExpression: "invalid-cron", triggerTime: null });
    expect(result).not.toBeNull();
    const diffDays = (result!.getTime() - before.getTime()) / 86400000;
    expect(diffDays).toBeGreaterThan(0.99);
    expect(diffDays).toBeLessThan(1.01);
  });

  it("intervalDays 和 cronExpression 都为空 → null", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: null, triggerTime: null });
    expect(result).toBeNull();
  });

  it("intervalDays=0 且有 cronExpression → 走 cron 路径", () => {
    const result = computeNextRun({ intervalDays: 0, cronExpression: "0 * * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 下一次应在 1 小时内
    expect(result!.getTime()).toBeLessThan(Date.now() + 60 * 60 * 1000 + 1000);
  });
});

// ── planScriptRun（DEF-011-11）───────────────────────────────────────────────
// 虚构仓库：ROOT 下只放我们声明存在的路径，不触真实磁盘
const ROOT = resolve("/fake-repo");
const WEB = join(ROOT, "apps", "web"); // web 进程 cwd（pnpm --filter web dev/start 的真实情形）
const SCRIPT = "scripts/crawl/fx_daily.ts";
const SCRIPT_ABS = join(ROOT, "scripts", "crawl", "fx_daily.ts");
const TSX_WEB = join(WEB, "node_modules", "tsx", "dist", "cli.mjs");
const TSX_ROOTWEB = join(ROOT, "apps", "web", "node_modules", "tsx", "dist", "cli.mjs");

const filesOf = (...paths: string[]) => new Set(paths);
const existsFrom = (set: Set<string>) => (p: string) => set.has(p);

describe("planScriptRun", () => {
  it("cwd=apps/web 时，仓库根相对 scriptPath 能向上定位到真身", () => {
    const plan = planScriptRun(SCRIPT, {
      cwd: WEB,
      platform: "linux",
      execPath: "/usr/bin/node",
      exists: existsFrom(filesOf(SCRIPT_ABS, TSX_WEB)),
    });
    expect(plan.scriptAbs).toBe(SCRIPT_ABS);
    expect(plan.root).toBe(ROOT);
    expect(plan.cmd).toBe("/usr/bin/node");
    expect(plan.args[0]).toBe(TSX_WEB);
    expect(plan.args[1]).toBe(SCRIPT_ABS);
  });

  it("绝对路径 scriptPath 直接使用，root 取其所在目录", () => {
    const plan = planScriptRun(SCRIPT_ABS, {
      cwd: WEB,
      platform: "linux",
      execPath: "/usr/bin/node",
      exists: existsFrom(filesOf(SCRIPT_ABS, TSX_ROOTWEB)),
    });
    expect(plan.scriptAbs).toBe(SCRIPT_ABS);
    expect(plan.root).toBe(dirname(SCRIPT_ABS));
    expect(plan.cmd).toBe("/usr/bin/node");
  });

  it("params 以 --key value 成对进入 args 数组（不开 shell、不拼字符串）", () => {
    const plan = planScriptRun(SCRIPT, {
      cwd: WEB,
      platform: "linux",
      execPath: "/usr/bin/node",
      exists: existsFrom(filesOf(SCRIPT_ABS, TSX_WEB)),
      params: { source: "all", times: 2 },
    });
    expect(plan.args).toEqual([TSX_WEB, SCRIPT_ABS, "--source", "all", "--times", "2"]);
    // 反向自检：若有人改成 shell 拼接，此处必红
    expect(plan.cmd).not.toBe("sh");
    expect(plan.cmd).not.toBe("cmd");
    expect(plan.args.some((a) => a.includes(" && "))).toBe(false);
  });

  it("POSIX 且无本地 tsx → 退回 npx（仍为 args 数组）", () => {
    const plan = planScriptRun(SCRIPT, {
      cwd: ROOT,
      platform: "linux",
      execPath: "/usr/bin/node",
      exists: existsFrom(filesOf(join(ROOT, "scripts", "crawl", "fx_daily.ts"))),
    });
    expect(plan.cmd).toBe("npx");
    expect(plan.args).toEqual(["tsx", SCRIPT_ABS]);
  });

  it("win32 且无本地 tsx → 直接报错，绝不以 shell 包裹 npx（防注入）", () => {
    // 收紧断言（审查 N2）：旧写法 /tsx/ 过于宽，任何含 tsx 字样的失败都能空转通过
    let msg = "";
    try {
      planScriptRun(SCRIPT, {
        cwd: WEB,
        platform: "win32",
        execPath: "C:\\node.exe",
        exists: existsFrom(filesOf(SCRIPT_ABS)),
      });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/未找到本地 tsx CLI/);
    expect(msg).toMatch(/已尝试/); // 必须给出候选路径，供后台 errorMsg 定位
  });

  it("脚本不存在 → 报错含已尝试路径（供后台 errorMsg 定位）", () => {
    let msg = "";
    try {
      planScriptRun("scripts/crawl/nope.ts", {
        cwd: WEB,
        platform: "linux",
        exists: existsFrom(filesOf()),
      });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/脚本不存在/);
    expect(msg).toMatch(/已尝试/);
  });

  it("含 .. 或空串 → 非法 scriptPath 拒接", () => {
    const exists = existsFrom(filesOf(SCRIPT_ABS));
    expect(() => planScriptRun("../etc/passwd", { cwd: WEB, exists })).toThrow(/非法 scriptPath/);
    expect(() => planScriptRun("", { cwd: WEB, exists })).toThrow(/非法 scriptPath/);
  });

  it("真实环境反向自检：本仓 cwd 下能定位到已登记的 fx 脚本且 tsx 存在", () => {
    // 不注入 exists：用真实磁盘。若本仓目录结构变化导致定位失败，此断言会红，
    // 从而证明上面那些注入用例不是“自说自话”（上一轮探针假确认事故的教训）。
    const appsWeb = fileURLToPath(new URL("../../../../", import.meta.url)); // __tests__→admin→features→lib → apps/web
    const repoRoot = resolve(appsWeb, "..", ".."); // apps/web → 仓库根
    const plan = planScriptRun(SCRIPT, { cwd: repoRoot });
    expect(existsSync(plan.scriptAbs)).toBe(true);
    expect(plan.scriptAbs).toBe(join(repoRoot, "scripts", "crawl", "fx_daily.ts"));
    expect(plan.cmd).toBe(process.execPath);
    expect(existsSync(plan.args[0])).toBe(true);

    // 同一脚本在 cwd=apps/web 下也必须定位成功（这是本次修复的实际场景）
    const planFromWeb = planScriptRun(SCRIPT, { cwd: join(repoRoot, "apps", "web") });
    expect(planFromWeb.scriptAbs).toBe(plan.scriptAbs);
    expect(planFromWeb.root).toBe(repoRoot);
  });
});

// ── RK-11-07：生产镜像口径（无 .ts 源 / 无 tsx，仅预编译产物）────────────────────
describe("planScriptRun · 预编译产物（RK-11-07）", () => {
  const IMG = resolve("/app"); // runner WORKDIR
  const DIST_IMG = join(IMG, "apps", "web", "scripts-dist", "crawl", "fx_daily.mjs");

  it("镜像内（cwd=/app，无源无 tsx）→ node 直接执行 scripts-dist 产物", () => {
    const plan = planScriptRun(SCRIPT, {
      cwd: IMG,
      platform: "linux",
      execPath: "/usr/local/bin/node",
      exists: existsFrom(filesOf(DIST_IMG)),
      params: { source: "all" },
    });
    expect(plan.cmd).toBe("/usr/local/bin/node");
    expect(plan.args).toEqual([DIST_IMG, "--source", "all"]);
    expect(plan.scriptAbs).toBe(DIST_IMG);
    expect(plan.root).toBe(IMG);
  });

  it("cwd=apps/web 时也能命中 <cwd>/scripts-dist", () => {
    const dist = join(WEB, "scripts-dist", "crawl", "fx_daily.mjs");
    const plan = planScriptRun(SCRIPT, { cwd: WEB, platform: "linux", execPath: "/n", exists: existsFrom(filesOf(dist)) });
    expect(plan.args[0]).toBe(dist);
  });

  it("源码+tsx 同时存在时仍优先 tsx（dev 口径不变）", () => {
    const dist = join(ROOT, "apps", "web", "scripts-dist", "crawl", "fx_daily.mjs");
    const plan = planScriptRun(SCRIPT, { cwd: WEB, platform: "linux", execPath: "/n", exists: existsFrom(filesOf(SCRIPT_ABS, TSX_WEB, dist)) });
    expect(plan.args[0]).toBe(TSX_WEB);
  });

  it("有源无 tsx 但有产物 → 产物优先于 npx（离线容器里 npx 会尝试联网）", () => {
    const dist = join(ROOT, "apps", "web", "scripts-dist", "crawl", "fx_daily.mjs");
    const plan = planScriptRun(SCRIPT, { cwd: ROOT, platform: "linux", execPath: "/n", exists: existsFrom(filesOf(SCRIPT_ABS, dist)) });
    expect(plan.cmd).toBe("/n");
    expect(plan.args[0]).toBe(dist);
  });

  it("win32 无 tsx 但有产物 → 可执行，不再报错", () => {
    const dist = join(ROOT, "apps", "web", "scripts-dist", "crawl", "fx_daily.mjs");
    const plan = planScriptRun(SCRIPT, { cwd: ROOT, platform: "win32", execPath: "node.exe", exists: existsFrom(filesOf(SCRIPT_ABS, dist)) });
    expect(plan.cmd).toBe("node.exe");
  });

  it("白名单外的路径不做产物映射（防止借产物目录执行任意文件）", () => {
    const evil = join(IMG, "apps", "web", "scripts-dist", "evil", "x.mjs");
    expect(() =>
      planScriptRun("scripts/evil/x.ts", { cwd: IMG, platform: "linux", exists: existsFrom(filesOf(evil)) }),
    ).toThrow(/脚本不存在/);
  });

  it("源与产物都缺 → 报错且列出产物候选路径", () => {
    expect(() => planScriptRun(SCRIPT, { cwd: IMG, platform: "linux", exists: () => false })).toThrow(/预编译产物/);
  });
});
