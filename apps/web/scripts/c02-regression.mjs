#!/usr/bin/env node
/**
 * C-02 放行后一键回归（员工C · C-01 准备物）
 *
 * 用法：node apps/web/scripts/c02-regression.mjs [--base http://localhost:3000] [--only <1..6>]
 *
 * 设计约束：
 *  - **只读**：仅执行 turbo/vitest、check-tables（SELECT）、http-verify（PUT 后复原 seed 真源）、
 *    playwright 三套；不写 DB、不改业务代码。
 *  - **串行**：所有人 e2e 步一律 `--workers=1`。根配置默认 workers=undefined（本机 14）会并发登录，
 *    触发「登录 IP 固定窗口限流」20 次/600s（Redis `rl:login:*`）→ 全量变 429 假红。
 *  - **每步前清 RL**：清 `rl:login:*`（scan+unlink），保证限流窗口不污染回归。
 *  - **3000 死亡自查**：前置自检失败时不再沉默，显式打印 BLOCKED 报告——
 *    列出被阻塞步骤、仍可执行步骤，并对不依赖 3000 的步骤（check-tables）照常取证。
 *
 * 退出码：0=全绿；1=门禁红；2=前置未放行（BLOCKED，未执行 3000 依赖步）。
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";

const HERE = dirname(fileURLToPath(import.meta.url)); // <root>/apps/web/scripts
const ROOT = resolve(HERE, "..", "..", ".."); // <root>
const WEB = join(ROOT, "apps", "web");

const argv = process.argv.slice(2);
const BASE = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:3000";
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

/** 期望值（放行口径，改动需同步 docs/engineering/测试与验收文档.md §九 / §8.2） */
const EXPECT = {
  vitestFiles: 37,
  vitestTests: 329,
  dbWhitelist: "11/11",
  httpVerify: "11/11 PASS",
  smokePassed: 7,
  ssoPassed: 3,
  fullPassed: 40,
  fullSkipped: 71,
  fullFailed: 0,
};

const results = [];
function rec(step, name, status, detail) {
  results.push({ step, name, status, detail });
  const color = { PASS: "\x1b[32m", FAIL: "\x1b[31m", BLOCKED: "\x1b[33m", INFO: "\x1b[36m" }[status] ?? "";
  console.log(`${color}${status.padEnd(7)}\x1b[0m | ${String(step).padStart(2)} | ${name} | ${detail}`);
}

// ------------------------------------------------------------------ 工具

async function clearRlLogin() {
  const r = new Redis("redis://localhost:6379", { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await r.connect();
    const keys = [];
    let cur = "0";
    do {
      const [n, k] = await r.scan(cur, "MATCH", "rl:login:*", "COUNT", 1000);
      cur = n;
      keys.push(...k);
    } while (cur !== "0");
    if (keys.length) await r.unlink(...keys);
    return { ok: true, cleared: keys.length };
  } catch (e) {
    return { ok: false, cleared: 0, err: e.message };
  } finally {
    try { await r.quit(); } catch { /* noop */ }
  }
}

/** 剥离 ANSI 转义（子进程 TTY 判定差异会让 vitest/turbo 输出染色，破坏正则匹配） */
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s) => s.replace(ANSI_RE, "");

/** 跑一条命令，返回 {code, out}（stdout+stderr 合并并去 ANSI；失败时附 spawn error）。
 * win32 下必须 shell:false + argv 数组：任何含空格路径（如 C:\Program Files\node.exe）
 * 经 shell:true 会被截断成 'C:\Program'（C-03 修：S2–S6 输出 NaN 的根因）。
 * shell:false 时 cmd/args 原生支持空格，无需引号。 */
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const out = stripAnsi(`${r.stdout ?? ""}${r.stderr ?? ""}`);
  return { code: r.status ?? 1, out, err: r.error ? r.error.message : "" };
}

/** 取解析失败的尾部片段，便于自我诊断（不再沉默） */
const tail = (s, n = 400) => JSON.stringify(s.slice(-n));

const PW_CLI = join(ROOT, "node_modules", "@playwright", "test", "cli.js");

/** 跑一套 playwright（唯一时间戳输出目录，规避沙箱/防病毒对「批量删除已有目录」的拦截） */
function playwright(label, args) {
  const outDir = join(ROOT, ".pw-c02", `${label}-${Date.now()}`);
  mkdirSync(join(ROOT, ".pw-c02"), { recursive: true });
  const res = run(process.execPath, [PW_CLI, "test", ...args, "--output", outDir], ROOT);
  const m = (re) => {
    const g = res.out.match(re);
    return g ? Number(g[1]) : NaN;
  };
  return {
    code: res.code,
    out: res.out,
    outDir,
    passed: m(/(\d+) passed/),
    failed: m(/(\d+) failed/) || 0,
    skipped: m(/(\d+) skipped/) || 0,
  };
}

function healthOnce() {
  try {
    const r = execFileSync(process.execPath, ["-e", `
      fetch("${BASE}/api/v1/system/health").then(async r=>{console.log(r.status, (await r.text()).slice(0,80));}).catch(e=>console.log("ERR", e.code||e.message));
    `], { encoding: "utf8", timeout: 15000 });
    return r.trim();
  } catch (e) {
    return `ERR ${e.message}`;
  }
}

// ------------------------------------------------------------------ 前置自检

console.log(`\n===== C-02 放行后一键回归（base=${BASE}）=====\n`);
console.log("--- Phase 0 前置自检 ---");

const pre = { server: false, buildPair: false, port3334Free: false, redis: false };

// P1 3000 存活
const h = healthOnce();
pre.server = /^200/.test(h);
rec("P1", "3000 /api/v1/system/health", pre.server ? "PASS" : "BLOCKED", h);

// P2 BUILD_ID 双路径一致
const b1 = join(WEB, ".next", "BUILD_ID");
const b2 = join(WEB, ".next", "standalone", "apps", "web", ".next", "BUILD_ID");
if (existsSync(b1) && existsSync(b2)) {
  const v1 = readFileSync(b1, "utf8").trim();
  const v2 = readFileSync(b2, "utf8").trim();
  pre.buildPair = v1 === v2 && v1.length > 0;
  rec("P2", "BUILD_ID 双路径一致", pre.buildPair ? "PASS" : "FAIL", `${v1} / ${v2}`);
} else {
  rec("P2", "BUILD_ID 双路径一致", "BLOCKED", `缺文件 worktree=${existsSync(b1)} standalone=${existsSync(b2)}`);
}

// P3 3334 零占用
try {
  const ns = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  const hits = ns.split("\n").filter((l) => /LISTENING/.test(l) && /:3334\b/.test(l));
  pre.port3334Free = hits.length === 0;
  rec("P3", "3334 零占用", pre.port3334Free ? "PASS" : "FAIL", `LISTENING 匹配数=${hits.length}`);
} catch (e) {
  rec("P3", "3334 零占用", "BLOCKED", e.message);
}

// P4 Redis 可达（清 RL 的能力前提）
const rl0 = await clearRlLogin();
pre.redis = rl0.ok;
rec("P4", "Redis 可达（清 RL 能力）", pre.redis ? "PASS" : "FAIL", rl0.ok ? `rl:login:* 清 ${rl0.cleared} 键` : rl0.err);

// ------------------------------------------------------------------ 步骤定义

const STEPS = [
  { id: 1, name: "turbo test", needs3000: false },
  { id: 2, name: "check-tables（DB 只读）", needs3000: false },
  { id: 3, name: "http-verify", needs3000: true },
  { id: 4, name: "smoke --workers=1", needs3000: true },
  { id: 5, name: "sso-3333 --workers=1", needs3000: true },
  { id: 6, name: "全量 --workers=1", needs3000: true },
];

const blocked = STEPS.filter((s) => s.needs3000 && !pre.server);

if (!pre.server) {
  console.log("\n########## BLOCKED：3000 未放行 ##########");
  console.log(`前置 P1 失败：base=${BASE} health=${h}`);
  console.log(`被阻塞步骤：${blocked.map((s) => `S${s.id} ${s.name}`).join("；")}`);
  const runnable = STEPS.filter((s) => !s.needs3000);
  console.log(`仍将执行（不依赖 3000）：${runnable.map((s) => `S${s.id} ${s.name}`).join("；")}`);
  console.log("提示：放行后重跑本脚本即可；DB/资产类检查不受影响。\n");
}

// ------------------------------------------------------------------ 执行

async function step(id, fn) {
  if (ONLY && String(id) !== String(ONLY)) return;
  const def = STEPS.find((s) => s.id === id);
  if (def?.needs3000 && !pre.server) {
    rec(id, def.name, "BLOCKED", "3000 未放行，跳过（前置 P1 失败）");
    return;
  }
  const cleared = await clearRlLogin();
  const rlNote = cleared.ok ? `RL清${cleared.cleared}` : "RL清理失败";
  await fn(rlNote);
}

// S1 turbo test（vitest）
await step(1, async (rl) => {
  const r = run("pnpm", ["test"], ROOT);
  const mf = r.out.match(/Test Files\s+(\d+) passed/);
  const mt = r.out.match(/Tests\s+(\d+) passed/);
  const filesN = mf ? Number(mf[1]) : NaN;
  const testsN = mt ? Number(mt[1]) : NaN;
  const ok = r.code === 0 && filesN === EXPECT.vitestFiles && testsN === EXPECT.vitestTests;
  const detail = ok
    ? `files=${filesN} tests=${testsN} exit=${r.code} ${rl}`
    : `files=${filesN} tests=${testsN} exit=${r.code} ${rl} err=${r.err} outLen=${r.out.length} tail=${tail(r.out)}`;
  rec(1, "turbo test", ok ? "PASS" : "FAIL", detail);
});

// S2 check-tables（DB 只读）
await step(2, async (rl) => {
  const r = run(process.execPath, [join(WEB, "scripts", "check-tables.mjs")], ROOT);
  const m = r.out.match(/system_configs whitelist:\s+(\d+\/\d+) exists\s+\|\s+missing:\s*(.*)/);
  const got = m ? m[1] : "?";
  const missing = m ? m[2].trim() : "?";
  const ok = r.code === 0 && got === EXPECT.dbWhitelist && /^\(none\)/.test(missing);
  rec(2, "check-tables（DB 只读）", ok ? "PASS" : "FAIL", `whitelist=${got} missing=${missing} exit=${r.code} ${rl}`);
});

// S3 http-verify
await step(3, async (rl) => {
  const r = run(process.execPath, [join(WEB, "scripts", "http-verify-configs.mjs"), "--base", BASE], ROOT);
  const m = r.out.match(/HTTP 验证矩阵汇总：(\d+\/\d+) PASS/);
  const got = m ? m[1] : "?";
  const ok = r.code === 0 && r.out.includes(EXPECT.httpVerify);
  rec(3, "http-verify", ok ? "PASS" : "FAIL", `汇总=${got} exit=${r.code} ${rl}`);
});

// S4 smoke
await step(4, async (rl) => {
  const p = playwright("smoke", ["--config", "playwright.config.ts", "--project=smoke", "--workers=1", "--reporter=list"]);
  const ok = p.code === 0 && p.passed === EXPECT.smokePassed && p.failed === 0;
  rec(4, "smoke --workers=1", ok ? "PASS" : "FAIL", `passed=${p.passed} failed=${p.failed} exit=${p.code} ${rl}`);
});

// S5 sso-3333
await step(5, async (rl) => {
  const p = playwright("sso", ["e2e/web/sso-3333.spec.ts", "--config", "playwright.config.ts", "--workers=1", "--reporter=list"]);
  const ok = p.code === 0 && p.passed === EXPECT.ssoPassed && p.failed === 0;
  rec(5, "sso-3333 --workers=1", ok ? "PASS" : "FAIL", `passed=${p.passed} failed=${p.failed} exit=${p.code} ${rl}`);
});

// S6 全量
await step(6, async (rl) => {
  const p = playwright("full", ["--config", "playwright.config.ts", "--workers=1", "--reporter=list"]);
  const ok =
    p.code === 0 &&
    p.passed === EXPECT.fullPassed &&
    p.skipped === EXPECT.fullSkipped &&
    p.failed === EXPECT.fullFailed;
  rec(6, "全量 --workers=1", ok ? "PASS" : "FAIL", `passed=${p.passed} skipped=${p.skipped} failed=${p.failed} exit=${p.code} ${rl}`);
});

// ------------------------------------------------------------------ 汇总

console.log("\n===== 汇总 =====");
console.log(`前置：3000=${pre.server ? "OK" : "DEAD"} BUILD_ID对=${pre.buildPair ? "OK" : "NG"} 3334=${pre.port3334Free ? "空闲" : "占用"} Redis=${pre.redis ? "OK" : "NG"}`);
for (const r of results) console.log(`${r.status.padEnd(7)} | ${String(r.step).padStart(2)} | ${r.name} | ${r.detail}`);

const failed = results.filter((r) => r.status === "FAIL").length;
const blockedN = results.filter((r) => r.status === "BLOCKED").length;
const exitCode = failed > 0 ? 1 : blockedN > 0 ? 2 : 0;
console.log(`\n退出码 ${exitCode}（0=全绿 1=门禁红 2=前置未放行；FAIL=${failed} BLOCKED=${blockedN}）`);
process.exit(exitCode);
