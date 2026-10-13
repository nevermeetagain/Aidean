#!/usr/bin/env node
/**
 * B-N10 后置：/api/v1/admin/configs HTTP 验证矩阵（一键复跑）
 *
 * 前置：C 已 `pnpm build → PORT=3000 standalone` 且 3000 在线（B 禁 build/start）。
 * 用法：node scripts/http-verify-configs.mjs [--base http://localhost:3000]
 * 凭据：prisma/seed.ts 超管 admin@aidean.com / Admin123!@#（仅本地验证用）
 *
 * 矩阵（与 B-E13 计划一致）：
 *  1. GET  /admin/configs 匿名        → 401 code=10004 请先登录
 *  2. POST /auth/login               → 200 且下发会话 cookie
 *  3. GET  /admin/configs 登录态      → 200 且恰好 8 键、updatedAt 非空
 *  4. PUT  pricing.currency = XXX     → 40000「允许CNY/USD」
 *  5. PUT  pricing.currency = USD     → 200
 *  6. PUT  pricing.evalPerModel 99999 → 200 且值被 clamp 为 9999
 *  7. PUT  site.name = ""             → 40000
 *  8. PUT  site.title = ""            → 200（allowEmpty）
 *  9. PUT  ladder_score_granularity 999 → 200 且值被 clamp 为 10
 *  10. 复原：currency=CNY、evalPerModel=2、site.title=""、ladder=10（seed 真源值）
 */
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
const EMAIL = "admin@aidean.com";
const PASSWORD = "Admin123!@#";

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`);
}

const cookieJar = new Map();
function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, { body, anon = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (!anon && cookieJar.size > 0) headers.Cookie = cookieHeader();
  const res = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

(async () => {
  // 0. 在线探活
  const health = await req("GET", "/api/v1/system/health", { anon: true });
  if (health.status !== 200) {
    console.error(`3000 不在线或非新 BUILD（health=${health.status}）。请等 C 起服后重跑。`);
    process.exit(2);
  }
  console.log(`base=${base} BUILD 在线，health=200\n`);

  // 1. 匿名 GET → 401
  const anonGet = await req("GET", "/api/v1/admin/configs", { anon: true });
  record("匿名 GET → 401",
    anonGet.status === 401 && anonGet.json?.code === 10004,
    `http=${anonGet.status} code=${anonGet.json?.code} msg=${anonGet.json?.message}`);

  // 2. 登录
  const login = await req("POST", "/api/v1/auth/login", { body: { email: EMAIL, password: PASSWORD }, anon: true });
  record("超管登录 → 200", login.status === 200 && cookieJar.has("aidean_token"),
    `http=${login.status} cookie=${cookieJar.has("aidean_token") ? "token已下发" : "无"}`);
  if (login.status !== 200) { summarize(); return; }

  // 3. 登录态 GET → 11 键
  const getList = await req("GET", "/api/v1/admin/configs");
  const rows = Array.isArray(getList.json?.data?.configs) ? getList.json.data.configs
    : (Array.isArray(getList.json?.data) ? getList.json.data : []);
  const keys = rows.map((r) => r.configKey).sort();
  const expectKeys = ["ladder_score_granularity", "pricing.currency", "pricing.evalPerModel",
    "security.accessTokenTtlMinutes", "security.maxLoginAttempts", "security.refreshTokenTtlDays",
    "site.description", "site.faviconUrl", "site.logoUrl", "site.name", "site.title"].sort();
  record("登录 GET → 200 且 11 键",
    getList.status === 200 && JSON.stringify(keys) === JSON.stringify(expectKeys),
    `http=${getList.status} keys=${keys.length} ${keys.length === 11 ? "" : "实际:" + keys.join(",")}`);
  record("GET 全量 updatedAt 非空",
    rows.length > 0 && rows.every((r) => !!r.updatedAt),
    `rows=${rows.length}`);

  // 4-9. PUT 矩阵
  async function put(key, value) {
    return req("PUT", "/api/v1/admin/configs", { body: { configKey: key, configValue: value } });
  }
  const r4 = await put("pricing.currency", "XXX");
  record("PUT currency=XXX → 40000", r4.status === 400 && r4.json?.code === 40000,
    `http=${r4.status} code=${r4.json?.code} msg=${r4.json?.message}`);

  const r5 = await put("pricing.currency", "USD");
  record("PUT currency=USD → 200", r5.status === 200, `http=${r5.status} code=${r5.json?.code}`);

  const r6 = await put("pricing.evalPerModel", 99999);
  record("PUT evalPerModel=99999 → 200/clamp 9999", r6.status === 200, `http=${r6.status}`);

  const r7 = await put("site.name", "");
  record("PUT site.name=\"\" → 40000", r7.status === 400 && r7.json?.code === 40000,
    `http=${r7.status} code=${r7.json?.code} msg=${r7.json?.message}`);

  const r8 = await put("site.title", "");
  record("PUT site.title=\"\" → 200(allowEmpty)", r8.status === 200, `http=${r8.status}`);

  const r9 = await put("ladder_score_granularity", 999);
  record("PUT ladder=999 → 200/clamp 10", r9.status === 200, `http=${r9.status}`);

  // 10. 复原 seed 真源值
  const restores = [
    await put("pricing.currency", "CNY"),
    await put("pricing.evalPerModel", 2),
    await put("site.title", ""),
    await put("ladder_score_granularity", 0.1),
  ];
  record("复原 seed 真源值 → 全 200", restores.every((r) => r.status === 200),
    restores.map((r) => r.status).join(","));

  summarize();
})();

function summarize() {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n===== HTTP 验证矩阵汇总：${pass}/${results.length} PASS =====`);
  process.exit(pass === results.length ? 0 : 1);
}
