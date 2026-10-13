#!/usr/bin/env node
/**
 * QA-GATE-02 全链路回归门禁（一键 · 只读聚合器）
 *
 * 把 QA-FE-01 与 SSO-02 的一次性验证固化为**常态门禁**：串行调用既有验证资产，
 * 统一日志落盘（每步一份）、统一退出码，并把 e2e 输出目录唯一化以规避宿主 safe-delete 拦截。
 *
 * 用法：
 *   node apps/web/scripts/gate-regression.mjs                      # 默认 G0–G3
 *   node apps/web/scripts/gate-regression.mjs --with-c02           # 追加 c02-regression 全套（S1–S6）
 *   node apps/web/scripts/gate-regression.mjs --with-admin         # 追加 G5 管理端门禁（默认关）
 *   node apps/web/scripts/gate-regression.mjs --strict-contract    # 契约段按生产口径（WARN 亦失败）
 *   node apps/web/scripts/gate-regression.mjs --only G2            # 只跑指定段
 *   node apps/web/scripts/gate-regression.mjs --base http://localhost:3000
 *
 * 分段：
 *   G0 前置确权   3000 存活 + **单监听者**（防 Windows 端口重叠分派）+ BUILD_ID 双一致 + 六项产物 + logo 字节
 *   G1 契约门槛   check-runtime-contract.mjs --mode build [--strict]（NEXT_PUBLIC_SITE_URL 必须构建期注入）
 *   G2 品牌矩阵   qa-fe-01-regression.mjs（P 前置 / H HTTP / T 主题四层 / R 重定向）
 *   G3 e2e        console-flow-gradient（e2e/playwright.config.ts）+ smoke（根配置 project=smoke）
 *                 + 稳定性复跑（gradient × N，默认 3 轮，全通过才判 PASS —— 证 exact:true 真实止 flake）
 *   G4 兼容回归   c02-regression.mjs（可选，--with-c02；turbo/DB/http-verify/smoke/sso/全量）
 *   G5 管理端     qc01-admin-gate.mjs 收敛段（可选，--with-admin；调其 --only A3/A4 子集：
 *                 A3 admin e2e + A4 admin 组受保护 3xx。**默认关**——admin 受库/环境波动影响，
 *                 不拖挂主链；失败计 FAIL，退出码语义（0/1/2）不变）
 *
 * 退出码：0=全绿；1=存在 FAIL；2=前置未放行（G0 失败，后续依赖 3000 的段跳过）。
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // <root>/apps/web/scripts
const ROOT = resolve(HERE, "..", "..", "..");
const WEB = join(ROOT, "apps", "web");

const argv = process.argv.slice(2);
const pick = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = pick("--base", "http://localhost:3000");
const ONLY = pick("--only", null);
const STRICT = argv.includes("--strict-contract");
const WITH_C02 = argv.includes("--with-c02");
const WITH_ADMIN = argv.includes("--with-admin");

const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const LOG_DIR = join(ROOT, ".qg02-logs", STAMP);
const OUT_DIR = join(ROOT, ".pw-qg02");
mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const LOGO = { url: "/aidean-logo.png", bytes: 53594, md5: "74ed94791f98a76fc420705e0c6cb92c" };
const md5 = (b) => createHash("md5").update(b).digest("hex");

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
    pass_assert: num(/PASS=(\d+)/), fail_assert: num(/FAIL=(\d+)/), blocked: num(/BLOCKED=(\d+)/),
  };
}

const want = (seg) => !ONLY || ONLY.toUpperCase() === seg;
const node = process.execPath;

// ============================================================ G0 前置确权
async function g0() {
  // 3000 存活 + 形态
  let home = { status: 0, hdr: null };
  try {
    const r = await fetch(`${BASE}/`);
    home = { status: r.status, hdr: r.headers };
  } catch { /* handled below */ }
  const poweredBy = home.hdr?.get?.("x-powered-by") ?? "";
  rec("G0.1", "3000 存活 + Next.js 形态", home.status === 200 ? "PASS" : "BLOCKED",
    `status=${home.status} x-powered-by=${poweredBy || "(none)"}`);

  // 单监听者（关键：Windows 允许同端口重叠绑定，多监听 → 请求随机分派 → 结论不可信）
  let listeners = -1;
  try {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", shell: false });
    listeners = (r.stdout ?? "").split("\n").filter((l) => /LISTENING/.test(l) && /:3000\s/.test(l)).length;
  } catch { /* noop */ }
  rec("G0.2", "3000 单监听者（防端口重叠分派）", listeners === 1 ? "PASS" : "FAIL",
    `LISTENING 匹配数=${listeners}`);

  // BUILD_ID 双一致
  const b1 = join(WEB, ".next", "BUILD_ID");
  const b2 = join(WEB, ".next", "standalone", "apps", "web", ".next", "BUILD_ID");
  let buildId = "(missing)";
  if (existsSync(b1) && existsSync(b2)) {
    const v1 = readFileSync(b1, "utf8").trim();
    const v2 = readFileSync(b2, "utf8").trim();
    buildId = v1;
    rec("G0.3", "BUILD_ID 双路径一致", v1 === v2 && v1 ? "PASS" : "FAIL", `${v1} / ${v2}`);
  } else {
    rec("G0.3", "BUILD_ID 双路径一致", "BLOCKED", `worktree=${existsSync(b1)} standalone=${existsSync(b2)}`);
  }

  // 六项产物
  const items = [
    [".next/BUILD_ID", join(WEB, ".next", "BUILD_ID")],
    [".next/static", join(WEB, ".next", "static")],
    [".next/server", join(WEB, ".next", "server")],
    ["standalone server.js", join(WEB, ".next", "standalone", "apps", "web", "server.js")],
    ["standalone .next/static", join(WEB, ".next", "standalone", "apps", "web", ".next", "static")],
    ["standalone public/logo", join(WEB, ".next", "standalone", "apps", "web", "public", "aidean-logo.png")],
  ];
  const missing = items.filter(([, p]) => !existsSync(p)).map(([n]) => n);
  rec("G0.4", "六项产物 6/6", missing.length === 0 ? "PASS" : "FAIL",
    missing.length ? `MISSING: ${missing.join(", ")}` : "全部 PRESENT");

  // logo 三处字节一致（源 / 产物 / 服务）
  let logoOk = false, logoDetail = "跳过（服务不可用）";
  const src = join(WEB, "public", "aidean-logo.png");
  const dst = join(WEB, ".next", "standalone", "apps", "web", "public", "aidean-logo.png");
  if (home.status === 200 && existsSync(src) && existsSync(dst)) {
    try {
      const served = Buffer.from(await (await fetch(`${BASE}${LOGO.url}`)).arrayBuffer());
      const a = readFileSync(src);
      const b = readFileSync(dst);
      logoOk = a.length === b.length && a.length === served.length
        && md5(a) === md5(b) && md5(a) === md5(served) && md5(a) === LOGO.md5;
      logoDetail = `src=${a.length}B dist=${b.length}B served=${served.length}B md5=${md5(a).slice(0, 8)}`;
    } catch (e) { logoDetail = `探测异常: ${e.message}`; }
  }
  rec("G0.5", "logo 三处字节一致（源/产物/服务）", logoOk ? "PASS" : (home.status === 200 ? "FAIL" : "BLOCKED"), logoDetail);

  return { ok: home.status === 200 && listeners === 1, buildId };
}

// ============================================================ G1 契约门槛
function g1() {
  const args = ["--mode", "build"];
  if (STRICT) args.push("--strict");
  const r = run(node, [join(WEB, "scripts", "check-runtime-contract.mjs"), ...args], ROOT, "g1-contract-build");
  const errs = (r.out.match(/ERROR=(\d+)/) ?? [])[1] ?? "?";
  const warns = (r.out.match(/WARN=(\d+)/) ?? [])[1] ?? "?";
  rec("G1", `运行契约（build${STRICT ? " strict" : ""}）`, r.code === 0 ? "PASS" : "FAIL",
    `ERROR=${errs} WARN=${warns} exit=${r.code}`, r.logPath);
}

// ============================================================ G2 品牌矩阵
function g2() {
  const r = run(node, [join(WEB, "scripts", "qa-fe-01-regression.mjs"), "--base", BASE], ROOT, "g2-brand-matrix");
  const ok = r.code === 0 && (r.fail_assert === 0 || Number.isNaN(r.fail_assert));
  rec("G2", "品牌/主题/重定向矩阵（P/H/T/R）", ok ? "PASS" : "FAIL",
    `PASS=${r.pass_assert} FAIL=${r.fail_assert} BLOCKED=${r.blocked} exit=${r.code}`, r.logPath);
}

// ============================================================ G3 e2e
// 限流纪律：登录限流为 IP 固定窗口 20/600s。凡连续登录的段（G3 全段）
// 必须在段首清一次 rl:login:*，段内不再清——否则「清键→登录」循环
// 本身会把环境调成与生产不一致。本轮曾因 G3.1/G3.2/G3.3 连续登录级联 429 复现红。
async function g3() {
  const cli = join(ROOT, "node_modules", "@playwright", "test", "cli.js");
  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync(process.execPath, ["-e",
      "const r=require('ioredis');const c=new r('redis://localhost:6379');" +
      "c.keys('rl:login:*').then(async ks=>{if(ks.length)await c.del(...ks);await c.quit()})" +
      ".catch(async()=>{try{await c.quit()}catch{}})",
    ], { cwd: join(WEB), stdio: "ignore", timeout: 15000 });
    console.log("G3 前置：已清理 rl:login:*（登录限流窗口重置）");
  } catch { /* redis 不可用则放行 */ }
  const g = run(node,
    [cli, "test", "console-flow-gradient.spec.ts", "--config", "e2e/playwright.config.ts", "--workers=1", "--reporter=list",
     "--output", join(OUT_DIR, `gradient-${STAMP}`)],
    ROOT, "g3-gradient");
  rec("G3.1", "e2e console-flow-gradient", g.code === 0 && g.failed === 0 && g.passed >= 2 ? "PASS" : "FAIL",
    `passed=${g.passed} failed=${g.failed} exit=${g.code}`, g.logPath);

  const s = run(node,
    [cli, "test", "--config", "playwright.config.ts", "--project=smoke", "--workers=1", "--reporter=list",
     "--output", join(OUT_DIR, `smoke-${STAMP}`)],
    ROOT, "g3-smoke");
  rec("G3.2", "e2e smoke（7 断言）", s.code === 0 && s.failed === 0 && s.passed === 7 ? "PASS" : "FAIL",
    `passed=${s.passed} failed=${s.failed} skipped=${s.skipped} exit=${s.code}`, s.logPath);

  // G3.3 稳定性复跑：gradient 连续 N 轮，全部 passed≥2 且 failed=0 才 PASS
  // 目的：把 QA-FE-01 的一次性「exact:true 止 flake」结论升级为**可复现**——单轮过可能是运气，
  //       连续 N 轮过才是消除 strict-mode 竞态的证据。轮间距 1.5s，避免缓存热态作弊。
  const rounds = 3;
  const seqSuffix = ["", "-b", "-c"];
  let stableAll = true, passSeq = [], lastLog = "";
  for (let i = 0; i < rounds; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const g = run(node,
      [cli, "test", "console-flow-gradient.spec.ts", "--config", "e2e/playwright.config.ts", "--workers=1", "--reporter=list",
       "--output", join(OUT_DIR, `gradient-stab${seqSuffix[i] ?? `-${i}`}-${STAMP}`)],
      ROOT, `g3-stability-${i + 1}`);
    const ok = g.code === 0 && g.failed === 0 && g.passed >= 2;
    if (!ok) stableAll = false;
    lastLog = g.logPath;
    passSeq.push(ok ? `${g.passed}✓` : `${g.passed}✗`);
  }
  rec("G3.3", `e2e 稳定性复跑（gradient ×${rounds}）`, stableAll ? "PASS" : "FAIL",
    `轮次=${passSeq.join(" ")}`, lastLog);
}

// ============================================================ G4 兼容回归（可选）
function g4() {
  const r = run(node, [join(WEB, "scripts", "c02-regression.mjs"), "--base", BASE], ROOT, "g4-c02");
  rec("G4", "c02-regression 全套（S1–S6）", r.code === 0 ? "PASS" : (r.code === 2 ? "BLOCKED" : "FAIL"),
    `exit=${r.code}`, r.logPath);
}

// ============================================================ G5 管理端门禁（可选）
// 收敛自 qc01-admin-gate.mjs（QA-COV-01 P3）：调用其 --only A3/A4 子集
// （A3 admin e2e --project=admin + A4 admin 组受保护 3xx）。默认关——admin 依赖库种子
// 与环境稳定，波动时不应拖挂主链；启用后其 PASS/FAIL 并入汇总，退出码语义不变。
function g5() {
  // 全量 A1–A5（不带 --only）：与 qc01 独立运行时的 6 断言（A1.1/A1.2/A2/A3/A4/A5）等口径，
  // 与文档「--with-admin 16/16」（主链 10 + G5 六项）一致。此前只跑 A3 → 满分只能 11，属实现与文档偏差。
  const r = run(node, [join(WEB, "scripts", "qc01-admin-gate.mjs"), "--base", BASE], ROOT, "g5-admin-e2e");
  // qc01 的 stdout 是键值形（"passed=18 failed=0 skipped=29"），不能复用 playwright 的 "N failed" 正则：
  // "passed=18 failed=0" 含子串 "18 failed"，全局 num() 会误读 failed=18 → G5 假红（实测 18/0/29 全绿）。
  // 判定以 qc01 自身退出码为权威（0=全绿 1=FAIL 2=前置未放行），kv 正则仅做展示回读。
  const kv = (re) => { const m = r.out.match(re); return m ? m[1] : "?"; };
  const status = r.code === 0 ? "PASS" : r.code === 2 ? "BLOCKED" : "FAIL";
  // 行展开：把 qc01 内部 A1.1–A5 六个断言逐行并入汇总（与文档「--with-admin 16/16」口径对齐；
  // 此前只记 1 行 → 满分 11，属实现与文档偏差）。qc01 输出行形如
  //   "PASS    | A3  | 管理端 e2e（--project=admin） | passed=18 failed=0 skipped=29 exit=0"
  // 解析失败时回退单行记录，不影响退出码判定。
  const inner = [...r.out.matchAll(/^(PASS|FAIL|BLOCKED|SKIP)\s*\|\s*(A\d(?:\.\d)?)\s*\|\s*([^|\n]+?)\s*\|\s*([^\n]*)$/gm)]
    .map((m) => ({ st: m[1], id: m[2], name: m[3].trim(), detail: m[4].trim() }));
  if (inner.length >= 2) {
    // qc01 输出含分段区 + 汇总区两轮同 ID 行 → 按 ID 去重取首轮，防重复计数
    const seen = new Set();
    for (const row of inner) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rec(`G5·${row.id}`, `管理端·${row.name}`, row.st, row.detail, r.logPath);
    }
  } else {
    rec("G5", "管理端门禁（admin e2e + 守卫）", status,
      `passed=${kv(/passed=(\d+)/)} failed=${kv(/failed=(\d+)/)} skipped=${kv(/skipped=(\d+)/)} exit=${r.code}`, r.logPath);
  }
}

// ============================================================ 主流程
(async () => {
  console.log(`\n===== QA-GATE-02 全链路回归门禁 =====`);
  console.log(`base=${BASE}  logDir=${LOG_DIR}  ${STRICT ? "strict=on " : ""}${WITH_C02 ? "with-c02" : ""}\n`);

  let pre = { ok: false, buildId: "(skipped)" };
  if (want("G0")) {
    console.log("--- G0 前置确权 ---");
    pre = await g0();
  } else {
    pre = { ok: true, buildId: "(G0 skipped)" };
  }

  if (want("G1")) { console.log("\n--- G1 运行契约 ---"); g1(); }

  if (want("G2")) {
    console.log("\n--- G2 品牌/主题/重定向矩阵 ---");
    if (pre.ok) g2();
    else rec("G2", "品牌/主题/重定向矩阵", "BLOCKED", "G0 未放行（3000 不可用或监听者数≠1）");
  }

  if (want("G3")) {
    console.log("\n--- G3 e2e ---");
    if (pre.ok) await g3();
    else rec("G3", "e2e", "BLOCKED", "G0 未放行");
  }

  if (WITH_C02) { console.log("\n--- G4 兼容回归（c02） ---"); g4(); }

  if (WITH_ADMIN) {
    console.log("\n--- G5 管理端门禁（admin） ---");
    if (pre.ok) g5();
    else rec("G5", "管理端门禁（admin e2e + 守卫）", "BLOCKED", "G0 未放行");
  }

  console.log(`\n===== 汇总（BUILD_ID=${pre.buildId}） =====`);
  for (const r of rows) console.log(`${r.status.padEnd(7)} | ${r.id.padEnd(3)} | ${r.name} | ${r.detail}`);
  const failed = rows.filter((r) => r.status === "FAIL").length;
  const blocked = rows.filter((r) => r.status === "BLOCKED").length;
  const exitCode = failed > 0 ? 1 : blocked > 0 ? 2 : 0;
  console.log(`\n日志目录：${LOG_DIR}`);
  console.log(`退出码 ${exitCode}（0=全绿 1=存在 FAIL 2=前置未放行；PASS=${rows.filter((r) => r.status === "PASS").length} FAIL=${failed} BLOCKED=${blocked}）\n`);
  process.exitCode = exitCode;
})();
