#!/usr/bin/env node
/**
 * QA-COV-01 · P3 管理端门禁包装器（qc01-admin-gate.mjs）
 *
 * 目的：把「管理端 e2e 子集 + 仪表盘冒烟 + 运行契约」固化为**独立可复跑的段**，
 * 供 QA-GATE-02 作为 **G5 段**接入（或独立执行），补齐全门禁当前对 (admin) 组的覆盖缺口。
 *
 * 背景（为何需要独立包装器而非直接进 G3）：
 *   - admin 组 e2e 依赖 `admin-setup`（登录并落 .auth/admin-auth.json），且需 DB 内
 *     存在可登录的管理员种子 + 统计数据；与 web 组共用同一 3000，但登录会消耗同一
 *     IP 限流窗口（rl:login:* 20/600s），故必须在**段首**清一次限流，且不与 web 组混跑。
 *   - 全量回归里 admin 组历史上出现「需 DB 种子」类失败（非产品回归），门禁把它独立成段
 *     才能区分「环境未播种」与「真实回归」。
 *
 * 分段（顺序）：
 *   A1 前置确权   3000 存活 + 单监听者（防 Windows 端口重叠分派）
 *   A2 限流重置   rl:login:* 清空（ioredis，失败则放行）
 *   A3 管理端 e2e playwright --project=admin（含 admin-setup 依赖）
 *   A4 仪表盘冒烟 GET /admin（未登录应 3xx 到登录页；已登录需 200 —— 用无凭据请求判定守卫在场）
 *   A5 运行契约   check-runtime-contract.mjs --mode runtime（生产口径可加 --strict）
 *
 * 用法：
 *   node apps/web/scripts/qc01-admin-gate.mjs
 *   node apps/web/scripts/qc01-admin-gate.mjs --base http://localhost:3000
 *   node apps/web/scripts/qc01-admin-gate.mjs --strict-runtime
 *   node apps/web/scripts/qc01-admin-gate.mjs --only A3
 *
 * 退出码：0=全绿；1=存在 FAIL；2=A1 前置未放行（后续依赖 3000 的段跳过）。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // <root>/apps/web/scripts
const ROOT = resolve(HERE, "..", "..", "..");
const WEB = join(ROOT, "apps", "web");

const argv = process.argv.slice(2);
const pick = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = pick("--base", "http://localhost:3000");
const ONLY = pick("--only", null);
const STRICT_RUNTIME = argv.includes("--strict-runtime");

const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const LOG_DIR = join(ROOT, ".qg02-logs", `qc01-admin-${STAMP}`);
const OUT_DIR = join(ROOT, ".pw-qc01", `admin-${STAMP}`);
mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
function rec(id, name, status, detail, log) {
  rows.push({ id, name, status, detail: String(detail), log: log ?? "" });
  const c = { PASS: "\x1b[32m", FAIL: "\x1b[31m", BLOCKED: "\x1b[33m", SKIP: "\x1b[90m", INFO: "\x1b[36m" }[status] ?? "";
  console.log(`${c}${status.padEnd(7)}\x1b[0m | ${id.padEnd(3)} | ${name.padEnd(34)} | ${detail}`);
}

/** 跑子进程（win32：shell:false + argv 数组，路径含空格不被截断） */
function run(cmd, args, cwd, logName) {
  const r = spawnSync(cmd, args, {
    cwd, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const logPath = join(LOG_DIR, `${logName}.log`);
  writeFileSync(logPath, `$ ${cmd} ${args.join(" ")}\n(cwd=${cwd})\nexit=${r.status ?? 1}\n\n${out}`, "utf8");
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : NaN; };
  return {
    code: r.status ?? 1, out, logPath,
    passed: num(/(\d+) passed/), failed: num(/(\d+) failed/) || 0, skipped: num(/(\d+) skipped/) || 0,
    errs: num(/ERROR=(\d+)/), warns: num(/WARN=(\d+)/),
  };
}

const want = (seg) => !ONLY || String(ONLY).toUpperCase() === seg;
const node = process.execPath;

// ============================================================ A1 前置确权
async function a1() {
  let status = 0;
  try { status = (await fetch(`${BASE}/`)).status; } catch { /* handled */ }
  rec("A1.1", "3000 存活", status === 200 ? "PASS" : "BLOCKED", `GET / -> ${status}`);

  let listeners = -1;
  try {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", shell: false });
    listeners = (r.stdout ?? "").split("\n").filter((l) => /LISTENING/.test(l) && /:3000\s/.test(l)).length;
  } catch { /* noop */ }
  rec("A1.2", "3000 单监听者（防端口重叠分派）", listeners === 1 ? "PASS" : "FAIL", `LISTENING 匹配数=${listeners}`);

  return { ok: status === 200 && listeners === 1 };
}

// ============================================================ A2 限流重置
async function a2() {
  const { execFileSync } = await import("node:child_process");
  let ok = false, detail = "";
  try {
    const out = execFileSync(node, ["-e",
      "const r=require('ioredis');const c=new r('redis://localhost:6379');" +
      "c.keys('rl:login:*').then(async ks=>{const n=ks.length;if(n)await c.del(...ks);console.log('CLEARED='+n);await c.quit()})" +
      ".catch(async e=>{console.log('ERR='+e.message);try{await c.quit()}catch{}})",
    ], { cwd: join(WEB), encoding: "utf8", timeout: 15000 });
    ok = true;
    detail = (out.match(/CLEARED=(\d+)/) ?? ["", "?"])[1].replace(/^/, "cleared=");
  } catch (e) { detail = `redis 不可用，放行：${e.message.slice(0, 60)}`; }
  rec("A2", "登录限流窗口重置（rl:login:*）", ok ? "PASS" : "SKIP", detail);
}

// ============================================================ A3 管理端 e2e
function a3() {
  const cli = join(ROOT, "node_modules", "@playwright", "test", "cli.js");
  // --project=admin 会自动拉起依赖 admin-setup（登录落 storageState）
  const r = run(node,
    [cli, "test", "--config", "playwright.config.ts", "--project=admin", "--workers=1", "--reporter=list",
     "--output", join(OUT_DIR, "admin")],
    ROOT, "a3-admin-e2e");
  const ok = r.code === 0 && r.failed === 0 && r.passed >= 1;
  rec("A3", "管理端 e2e（--project=admin）", ok ? "PASS" : "FAIL",
    `passed=${r.passed} failed=${r.failed} skipped=${r.skipped} exit=${r.code}`, r.logPath);
  return ok;
}

// ============================================================ A4 仪表盘冒烟
async function a4() {
  // 无凭据直取 /admin：Next 中间件应重定向到登录页（3xx），证明 (admin) 组受保护且路由在场。
  let status = 0, loc = "";
  try {
    const r = await fetch(`${BASE}/admin`, { redirect: "manual" });
    status = r.status;
    loc = r.headers.get("location") ?? "";
  } catch { /* handled */ }
  const ok = status >= 300 && status < 400;
  rec("A4", "admin 组受保护（无凭据 /admin → 3xx）", ok ? "PASS" : "FAIL",
    `status=${status} location=${loc || "(none)"}`);
}

// ============================================================ A5 运行契约
function a5() {
  const args = ["--mode", "runtime"];
  if (STRICT_RUNTIME) args.push("--strict");
  const r = run(node, [join(WEB, "scripts", "check-runtime-contract.mjs"), ...args], ROOT, "a5-contract-runtime");
  rec("A5", `运行契约（runtime${STRICT_RUNTIME ? " strict" : ""}）`, r.code === 0 ? "PASS" : "FAIL",
    `ERROR=${r.errs} WARN=${r.warns} exit=${r.code}`, r.logPath);
}

// ============================================================ 主流程
(async () => {
  console.log(`\n===== QA-COV-01 P3 管理端门禁 =====`);
  console.log(`base=${BASE}  logDir=${LOG_DIR}${STRICT_RUNTIME ? "  strict-runtime=on" : ""}\n`);

  let pre = { ok: false };
  if (want("A1")) { console.log("--- A1 前置确权 ---"); pre = await a1(); }
  else { pre = { ok: true }; }

  if (want("A2")) { console.log("\n--- A2 限流重置 ---"); await a2(); }

  if (want("A3")) {
    console.log("\n--- A3 管理端 e2e ---");
    if (pre.ok) a3();
    else rec("A3", "管理端 e2e（--project=admin）", "BLOCKED", "A1 未放行");
  }

  if (want("A4")) {
    console.log("\n--- A4 仪表盘冒烟 ---");
    if (pre.ok) await a4();
    else rec("A4", "admin 组受保护", "BLOCKED", "A1 未放行");
  }

  if (want("A5")) { console.log("\n--- A5 运行契约 ---"); a5(); }

  console.log(`\n===== 汇总 =====`);
  for (const r of rows) console.log(`${r.status.padEnd(7)} | ${r.id.padEnd(4)} | ${r.name} | ${r.detail}`);
  const failed = rows.filter((r) => r.status === "FAIL").length;
  const blocked = rows.filter((r) => r.status === "BLOCKED").length;
  const exitCode = failed > 0 ? 1 : blocked > 0 ? 2 : 0;
  console.log(`\n日志目录：${LOG_DIR}`);
  console.log(`退出码 ${exitCode}（0=全绿 1=存在 FAIL 2=前置未放行；PASS=${rows.filter((r) => r.status === "PASS").length} FAIL=${failed} BLOCKED=${blocked}）\n`);
  process.exitCode = exitCode;
})();
