#!/usr/bin/env node
/**
 * QA-FE-01 品牌 Logo 与默认主题运行回归（一键 · 只读）
 *
 * 用法：
 *   node apps/web/scripts/qa-fe-01-regression.mjs [--base http://localhost:3000] [--only P|H|T|R|S]
 *   node apps/web/scripts/qa-fe-01-regression.mjs --with-e2e        # 附带 e2e 两套（console-flow-gradient + smoke）
 *
 * 覆盖三层断言（对应工作包 §9.2 回归矩阵）：
 *   P 前置   3000 存活 / BUILD_ID 双一致 / logo 三处字节一致
 *   H HTTP   首页 / logo 长度+MD5 / CSS / /_next/static/** 逐条 / 内页头部 / 刷新稳定
 *   T 主题   DOM(aria-pressed) + localStorage + html[data-theme] + computed --primary 四层
 *            覆盖：无存储默认 / 三色切换 / 有效值恢复 / 无效值回退 / 刷新保持 / 控制台干净
 *   R 重定向 未登录 authorize / consent / 受保护页 / admin 的 Location origin 与回跳参数
 *   S e2e    console-flow-gradient（exact:true 止 flake 实证）+ smoke
 *
 * 设计约束：
 *  - **只读**：仅 GET 探测与浏览器渲染；不写 DB、不改业务代码、不重建 .next、不新起产物快照。
 *  - **不占端口**：复用已在 3000 的 standalone 服务（不拉起 dev；`reuseExistingServer` 语义）。
 *  - **唯一输出目录**：`.pw-qa01/<label>-<ts>`（规避宿主 safe-delete 对既有目录批量删除的拦截）。
 *  - **瞬时 500/502 判据**：任一资源首次非 200 时，间隔 1.5s 重测至多 2 次；两次仍非 200 才记 FAIL。
 *
 * 退出码：0=全绿；1=存在 FAIL；2=前置未放行（3000 不可用，H/T/R/S 跳过）。
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const HERE = dirname(fileURLToPath(import.meta.url)); // <root>/apps/web/scripts
const ROOT = resolve(HERE, "..", "..", "..");
const WEB = join(ROOT, "apps", "web");

const argv = process.argv.slice(2);
const BASE = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:3000";
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const WITH_E2E = argv.includes("--with-e2e");

/** 权威常量（改动需同步 docs/engineering/测试与验收文档.md 与工作包契约） */
const LOGO = {
  url: "/aidean-logo.png",
  bytes: 53594,
  md5: "74ed94791f98a76fc420705e0c6cb92c",
  dimensions: "103x28",
};
const THEME = {
  storageKey: "aidean-theme",
  default_: "teal",
  variants: {
    indigo: "#4f46e5",
    teal: "#0f766e",
    orange: "#c2410c",
  },
  aria: { teal: "切换到青碧主题", indigo: "切换到靛蓝主题", orange: "切换到橙焰主题" },
};
const PUBLIC_PAGES = ["/models", "/products", "/pricing", "/docs", "/roadmap", "/partners", "/about"];
/** 预期 404 的 Pages Router 遗留路径（App Router 构建本就不产出） */
const LEGACY_404 = ["/_next/static/chunks/webpack.js", "/_next/static/runtime/main.js"];

const results = [];
function rec(step, name, status, detail) {
  results.push({ step, name, status, detail: String(detail) });
  const color = { PASS: "\x1b[32m", FAIL: "\x1b[31m", BLOCKED: "\x1b[33m", INFO: "\x1b[36m" }[status] ?? "";
  console.log(`${color}${status.padEnd(7)}\x1b[0m | ${String(step).padStart(2)} | ${name} | ${detail}`);
}

const md5 = (buf) => createHash("md5").update(buf).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 带"瞬时抖动重测"的 GET：首次非期望码时重测最多 2 次（区分终态与抖动） */
async function getWithRetry(url, expectStatus = 200, tries = 3) {
  let last = { status: 0, buf: Buffer.alloc(0) };
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      const buf = Buffer.from(await r.arrayBuffer());
      last = { status: r.status, buf, headers: r.headers };
      if (r.status === expectStatus) return { ...last, attempts: i + 1, flaky: i > 0 };
    } catch (e) {
      last = { status: 0, buf: Buffer.alloc(0), err: e.message };
    }
    if (i < tries - 1) await sleep(1500);
  }
  return { ...last, attempts: tries, flaky: false };
}

// ============================================================ P 前置
async function phaseP() {
  const h = await getWithRetry(`${BASE}/`);
  const poweredBy = h.headers?.get?.("x-powered-by") ?? "";
  const ok = h.status === 200;
  rec("P1", "3000 存活（GET /）", ok ? "PASS" : "BLOCKED", `status=${h.status} x-powered-by=${poweredBy || "(none)"}`);

  const b1 = join(WEB, ".next", "BUILD_ID");
  const b2 = join(WEB, ".next", "standalone", "apps", "web", ".next", "BUILD_ID");
  if (existsSync(b1) && existsSync(b2)) {
    const v1 = readFileSync(b1, "utf8").trim();
    const v2 = readFileSync(b2, "utf8").trim();
    rec("P2", "BUILD_ID 双路径一致", v1 === v2 && v1 ? "PASS" : "FAIL", `${v1} / ${v2}`);
  } else {
    rec("P2", "BUILD_ID 双路径一致", "BLOCKED", `缺文件 worktree=${existsSync(b1)} standalone=${existsSync(b2)}`);
  }

  const src = join(WEB, "public", "aidean-logo.png");
  const dst = join(WEB, ".next", "standalone", "apps", "web", "public", "aidean-logo.png");
  const served = await getWithRetry(`${BASE}${LOGO.url}`);
  if (existsSync(src) && existsSync(dst) && served.status === 200) {
    const a = readFileSync(src);
    const b = readFileSync(dst);
    const ok = a.length === b.length && a.length === served.buf.length
      && md5(a) === md5(b) && md5(a) === md5(served.buf);
    rec("P3", "logo 三处字节一致（源/产物/服务）", ok ? "PASS" : "FAIL",
      `src=${a.length}B/${md5(a).slice(0, 8)} dist=${b.length}B/${md5(b).slice(0, 8)} served=${served.buf.length}B/${md5(served.buf).slice(0, 8)}`);
  } else {
    rec("P3", "logo 三处字节一致（源/产物/服务）", "BLOCKED",
      `src=${existsSync(src)} dist=${existsSync(dst)} servedStatus=${served.status}`);
  }
  return { serverUp: ok && served.status === 200 };
}

// ============================================================ H HTTP
async function phaseH() {
  const home = await getWithRetry(`${BASE}/`);
  const html = home.buf.toString("utf8");
  rec("H1", "首页 200 + text/html", home.status === 200 ? "PASS" : "FAIL",
    `status=${home.status} size=${home.buf.length}B attempts=${home.attempts}`);

  const logo = await getWithRetry(`${BASE}${LOGO.url}`);
  const ct = logo.headers?.get?.("content-type") ?? "";
  const okLogo = logo.status === 200 && ct.includes("image/png")
    && logo.buf.length === LOGO.bytes && md5(logo.buf) === LOGO.md5;
  rec("H2", "logo 200 + image/png + 长度/MD5", okLogo ? "PASS" : "FAIL",
    `status=${logo.status} type=${ct} len=${logo.buf.length} md5=${md5(logo.buf).slice(0, 8)}`);

  const hasLogoRef = html.includes("aidean-logo.png");
  const hasBrand = html.includes(THEME.variants.indigo);
  rec("H3", "首页含 logo 引用与 #4f46e5", hasLogoRef && hasBrand ? "PASS" : "FAIL",
    `logoRef=${hasLogoRef} brandColor=${hasBrand}`);

  // 静态资源清单：从首页 HTML 动态提取（可复用于任意 BUILD）
  const refs = Array.from(new Set((html.match(/\/_next\/static\/[^"'\\?\s]+/g) ?? []))).sort();
  let pass = 0;
  const fails = [];
  for (const u of refs) {
    const r = await getWithRetry(`${BASE}${u}`);
    if (r.status === 200) pass++;
    else fails.push(`${u}=${r.status}`);
  }
  rec("H4", `/_next/static/** 逐条 200（${pass}/${refs.length}）`,
    pass === refs.length && refs.length > 0 ? "PASS" : "FAIL",
    fails.length ? `FAIL: ${fails.join(", ")}` : `共 ${refs.length} 条全 200`);

  const legacy = [];
  for (const u of LEGACY_404) {
    const r = await getWithRetry(`${BASE}${u}`, 404);
    legacy.push(`${u}=${r.status}`);
  }
  const okLegacy = legacy.every((s) => s.endsWith("=404"));
  rec("H5", "豁免项 2 条 Pages 遗留路径 404", okLegacy ? "PASS" : "FAIL", legacy.join(", "));

  const pageRows = [];
  let pagePass = 0;
  for (const p of PUBLIC_PAGES) {
    const r = await getWithRetry(`${BASE}${p}`);
    const body = r.buf.toString("utf8");
    const ok = r.status === 200 && body.includes("aidean-logo.png") && body.includes(THEME.variants.indigo);
    if (ok) pagePass++;
    pageRows.push(`${p}=${r.status}${ok ? "" : "(缺头部)"}`);
  }
  rec("H6", `内页头部（logo+#4f46e5）${pagePass}/${PUBLIC_PAGES.length}`,
    pagePass === PUBLIC_PAGES.length ? "PASS" : "FAIL", pageRows.join(" "));

  // H7 CSS 引用动态提取（不硬编码 chunk hash，跨 BUILD 可复用；取不到则回落 logo 保证探针仍可跑）
  const cssRef = (refs ?? []).find((u) => u.endsWith(".css")) ?? LOGO.url;
  const rounds = [];
  let stable = true;
  for (let i = 0; i < 5; i++) {
    const [a, b, c] = await Promise.all([
      getWithRetry(`${BASE}/`),
      getWithRetry(`${BASE}${LOGO.url}`),
      getWithRetry(`${BASE}${cssRef}`),
    ]);
    const line = `r${i + 1}[home=${a.status} logo=${b.status} css=${c.status}]`;
    if (a.status !== 200 || b.status !== 200 || c.status !== 200) stable = false;
    rounds.push(line);
    await sleep(400);
  }
  rec("H7", "刷新稳定性（5 轮 × 3 资源）", stable ? "PASS" : "FAIL", `css=${cssRef} ${rounds.join(" ")}`);
}

// ============================================================ T 主题
function themeProbe(page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    const cs = getComputedStyle(el);
    const pressed = {};
    document.querySelectorAll('[role="group"] button[aria-pressed]').forEach((b) => {
      const label = b.getAttribute("aria-label") || "";
      pressed[label] = b.getAttribute("aria-pressed");
    });
    return {
      dataTheme: el.getAttribute("data-theme"),
      primary: cs.getPropertyValue("--primary").trim(),
      stored: window.localStorage.getItem("aidean-theme"),
      pressed,
    };
  });
}

async function phaseT(browser) {
  const results = {};
  const base = { viewport: { width: 1280, height: 800 }, locale: "zh-CN" };

  // ---- T1 无存储：默认应为 teal（属性缺失 + :root 变量 + teal 按钮 pressed）
  let ctx = await browser.newContext(base);
  let page = await ctx.newPage();
  const consoleErrors = [];
  const badResponses = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  let s = await themeProbe(page);
  const t1ok = s.dataTheme === null && s.primary === THEME.variants.teal
    && s.stored === null && s.pressed[THEME.aria.teal] === "true";
  rec("T1", "无存储默认=teal（属性缺省 + :root + aria）", t1ok ? "PASS" : "FAIL",
    `dataThem=${JSON.stringify(s.dataTheme)} primary=${s.primary} stored=${JSON.stringify(s.stored)} tealPressed=${s.pressed[THEME.aria.teal]}`);
  results.T1 = s;

  // ---- T2/T3/T4 三色切换（点击→ DOM+storage+computed 三层）
  const switchCase = async (name, aria, expectTheme, expectColor) => {
    await page.click(`button[aria-label="${aria}"]`);
    await sleep(150);
    const st = await themeProbe(page);
    const ok = st.dataTheme === expectTheme && st.stored === expectTheme
      && st.primary === expectColor && st.pressed[aria] === "true";
    rec(name === "teal" ? "T2" : name === "orange" ? "T3" : "T4",
      `切换 ${name} → data-theme/localStorage/--primary`, ok ? "PASS" : "FAIL",
      `dataTheme=${st.dataTheme} stored=${st.stored} primary=${st.primary} pressed=${st.pressed[aria]}`);
    return st;
  };
  await switchCase("teal", THEME.aria.teal, "teal", THEME.variants.teal);
  await switchCase("orange", THEME.aria.orange, "orange", THEME.variants.orange);
  await switchCase("indigo", THEME.aria.indigo, "indigo", THEME.variants.indigo);

  // ---- T5 有效值恢复：新上下文预置 localStorage=teal
  const ctx2 = await browser.newContext(base);
  await ctx2.addInitScript((k) => window.localStorage.setItem(k, "teal"), THEME.storageKey);
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const s5 = await themeProbe(p2);
  const t5ok = s5.dataTheme === "teal" && s5.primary === THEME.variants.teal && s5.stored === "teal";
  rec("T5", "有效值恢复（预置 teal）", t5ok ? "PASS" : "FAIL",
    `dataTheme=${s5.dataTheme} primary=${s5.primary} stored=${s5.stored}`);
  await ctx2.close();

  // ---- T6 无效值回退：预置 purple → 属性缺省 + teal 变量 + teal 按钮高亮（回退到默认青碧）
  const ctx3 = await browser.newContext(base);
  await ctx3.addInitScript((k) => window.localStorage.setItem(k, "purple"), THEME.storageKey);
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const s6 = await themeProbe(p3);
  const t6ok = s6.dataTheme === null && s6.primary === THEME.variants.teal
    && s6.pressed[THEME.aria.teal] === "true";
  rec("T6", "无效值回退（预置 purple → teal 默认）", t6ok ? "PASS" : "FAIL",
    `dataThem=${JSON.stringify(s6.dataTheme)} primary=${s6.primary} tealPressed=${s6.pressed[THEME.aria.teal]}`);
  await ctx3.close();

  // ---- T7 刷新保持：teal → reload
  await page.click(`button[aria-label="${THEME.aria.teal}"]`);
  await sleep(150);
  await page.reload({ waitUntil: "networkidle" });
  const s7 = await themeProbe(page);
  const t7ok = s7.dataTheme === "teal" && s7.primary === THEME.variants.teal && s7.stored === "teal";
  rec("T7", "刷新保持（teal → reload）", t7ok ? "PASS" : "FAIL",
    `dataTheme=${s7.dataTheme} primary=${s7.primary} stored=${s7.stored}`);

  // ---- T8 控制台干净：无资源 4xx/5xx、无 hydration 错误
  await sleep(500);
  const staticFails = badResponses.filter((x) => x.includes("/_next/static/") || x.includes("aidean-logo"));
  const hydration = consoleErrors.filter((t) => /hydrat|did not match|Text content does not match/i.test(t));
  const ok8 = staticFails.length === 0 && hydration.length === 0;
  rec("T8", "控制台：无资源 404 / 无 hydration 错误", ok8 ? "PASS" : "FAIL",
    `badStatic=[${staticFails.join(" | ")}] hydrationErrors=${hydration.length}${hydration.length ? " :: " + hydration[0].slice(0, 120) : ""}`);

  await ctx.close();
  return results;
}

// ============================================================ R 重定向
async function phaseR() {
  const AUTHORIZE = "/oauth/authorize?response_type=code&client_id=wechat-rag"
    + "&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=qa01probe";
  const origin = new URL(BASE).origin;

  const cases = [
    { id: "R1", name: "未登录 authorize → /login（origin=公开基址，state 不丢）", url: AUTHORIZE,
      expectPrefix: `${origin}/login?redirect=`, mustContain: ["state%3Dqa01probe"] },
    { id: "R2", name: "未登录 consent → /login（回跳指向 authorize，参数完整）", url: "/oauth/consent?response_type=code&client_id=wechat-rag"
        + "&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=qa01probe",
      expectPrefix: `${origin}/login?redirect=`, mustContain: ["%2Foauth%2Fauthorize", "state%3Dqa01probe"] },
    { id: "R3", name: "未登录 /user/console → /login?redirect=/user/console", url: "/user/console",
      expectPrefix: `${origin}/login?redirect=%2Fuser%2Fconsole`, mustContain: [] },
    { id: "R4", name: "未登录 /admin → /admin/login?redirect=/admin", url: "/admin",
      expectPrefix: `${origin}/admin/login?redirect=%2Fadmin`, mustContain: [] },
    // R5–R8：authorize 校验序契约（client/redirect_uri 非法 → 400 绝不重定向；参数错误 → 经 redirect_uri 回传 error）
    { id: "R5", name: "redirect_uri 白名单外 → 400 且不重定向（防开放重定向）",
      url: "/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=https%3A%2F%2Fevil.example.com%2Fcb&scope=openid&state=qa01probe",
      status: [400], noLoc: true },
    { id: "R6", name: "client_id 无效 → 400 且不重定向",
      url: "/oauth/authorize?response_type=code&client_id=no-such-client&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=qa01probe",
      status: [400], noLoc: true },
    { id: "R7", name: "response_type 非 code → 302 经 redirect_uri 回传 error",
      url: "/oauth/authorize?response_type=token&client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=qa01probe",
      expectPrefix: "http://localhost:3333/auth/aidean/callback", mustContain: ["error=unsupported_response_type", "state=qa01probe"] },
    { id: "R8", name: "scope 非法 → 302 回传 error=invalid_scope",
      url: "/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=admin%3Aall&state=qa01probe",
      expectPrefix: "http://localhost:3333/auth/aidean/callback", mustContain: ["error=invalid_scope", "state=qa01probe"] },
  ];

  for (const c of cases) {
    const r = await fetch(`${BASE}${c.url}`, { redirect: "manual" });
    const loc = r.headers.get("location") ?? "";
    const expectStatus = c.status ?? [307, 302];
    const okStatus = expectStatus.includes(r.status);
    const okNoLoc = c.noLoc ? loc === "" : true;
    const okPrefix = c.expectPrefix ? loc.startsWith(c.expectPrefix) : true;
    const okParams = (c.mustContain ?? []).every((m) => loc.includes(m));
    const okNoZero = !loc.includes("0.0.0.0");
    const ok = okStatus && okNoLoc && okPrefix && okParams && okNoZero;
    rec(c.id, c.name, ok ? "PASS" : "FAIL",
      `status=${r.status} loc=${loc.slice(0, 110)}${loc.length > 110 ? "…" : ""}` +
      (ok ? "" : ` [status=${okStatus} noLoc=${okNoLoc} prefix=${okPrefix} params=${okParams} noZero=${okNoZero}]`));
  }
}

// ============================================================ S e2e
function playwright(label, args) {
  const outDir = join(ROOT, ".pw-qa01", `${label}-${Date.now()}`);
  mkdirSync(join(ROOT, ".pw-qa01"), { recursive: true });
  const cli = join(ROOT, "node_modules", "@playwright", "test", "cli.js");
  const r = spawnSync(process.execPath, [cli, "test", ...args, "--output", outDir], {
    cwd: ROOT, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : NaN; };
  return { code: r.status ?? 1, out, passed: num(/(\d+) passed/), failed: num(/(\d+) failed/) || 0 };
}

function phaseS() {
  // console-flow-gradient：归属 e2e/playwright.config.ts（testDir ./tests，dev-mock 基线）
  const g = playwright("gradient", ["console-flow-gradient.spec.ts", "--config", "e2e/playwright.config.ts", "--workers=1", "--reporter=list"]);
  const okG = g.code === 0 && g.failed === 0 && g.passed >= 2;
  rec("S1", "e2e console-flow-gradient（exact:true 止 flake）", okG ? "PASS" : "FAIL",
    `passed=${g.passed} failed=${g.failed} exit=${g.code}`);
  if (!okG) console.log(g.out.split("\n").slice(-25).join("\n"));

  // smoke：归属根配置 smoke project
  const s = playwright("smoke", ["--config", "playwright.config.ts", "--project=smoke", "--workers=1", "--reporter=list"]);
  const okS = s.code === 0 && s.failed === 0 && s.passed === 7;
  rec("S2", "e2e smoke（7 断言）", okS ? "PASS" : "FAIL",
    `passed=${s.passed} failed=${s.failed} exit=${s.code}`);
  if (!okS) console.log(s.out.split("\n").slice(-25).join("\n"));
}

// ============================================================ 主流程
(async () => {
  console.log(`\n===== QA-FE-01 品牌 Logo 与默认主题运行回归（base=${BASE}）=====\n`);
  console.log("--- Phase P 前置确权 ---");
  const pre = await phaseP();
  const gate = { P: true, H: pre.serverUp, T: pre.serverUp, R: pre.serverUp, S: pre.serverUp || WITH_E2E };

  const want = (p) => !ONLY || ONLY.toUpperCase() === p;

  if (pre.serverUp && want("H")) {
    console.log("\n--- Phase H HTTP ---");
    await phaseH();
  } else if (!pre.serverUp) {
    rec("H1", "HTTP 层", "BLOCKED", "3000 未放行，跳过");
  }

  if (pre.serverUp && want("T")) {
    console.log("\n--- Phase T 主题（DOM+storage+data-theme+computed）---");
    const browser = await chromium.launch();
    try { await phaseT(browser); } finally { await browser.close(); }
  } else if (!pre.serverUp) {
    rec("T1", "主题层", "BLOCKED", "3000 未放行，跳过");
  }

  if (pre.serverUp && want("R")) {
    console.log("\n--- Phase R 重定向 ---");
    await phaseR();
  } else if (!pre.serverUp) {
    rec("R1", "重定向层", "BLOCKED", "3000 未放行，跳过");
  }

  if (want("S") && (WITH_E2E || ONLY?.toUpperCase() === "S")) {
    console.log("\n--- Phase S e2e ---");
    phaseS();
  }

  console.log("\n===== 汇总 =====");
  for (const r of results) console.log(`${r.status.padEnd(7)} | ${String(r.step).padStart(2)} | ${r.name} | ${r.detail}`);
  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const exitCode = failed > 0 ? 1 : blocked > 0 ? 2 : 0;
  console.log(`\n退出码 ${exitCode}（0=全绿 1=存在 FAIL 2=前置未放行；PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed} BLOCKED=${blocked}）`);
  process.exit(exitCode);
})();
