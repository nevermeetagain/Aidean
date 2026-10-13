/**
 * Aidean API Smoke Test
 * 对所有 /api/v1/* 端点进行HTTP级别冒烟测试
 *
 * 用法:
 *   node scripts/api-smoke.mjs              # 测试全部
 *   node scripts/api-smoke.mjs --only public  # 仅公开API
 *   node scripts/api-smoke.mjs --only auth    # 仅认证API
 */

import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// ============================================
// 配置
// ============================================

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const TIMEOUT_MS = 10_000;

// ============================================
// 工具函数
// ============================================

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, headers: res.headers, text, json };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(url, { timeoutMs = 20_000, intervalMs = 500 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { status } = await fetchJSON(`${url}/api/v1/system/health`);
      if (status === 200) return true;
    } catch { /* ignore */ }
    await delay(intervalMs);
  }
  return false;
}

// ============================================
// 测试结果收集
// ============================================

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${name}${detail ? " — " + detail : ""}`);
}

// ============================================
// 公开API测试
// ============================================

async function testPublicAPIs() {
  console.log("\n━━━ 公开API ━━━");

  // 1. System Health
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/system/health`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/system/health", ok, `status=${r.status}`);
  }

  // 2. System Stats
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/system/stats`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/system/stats", ok, `status=${r.status}`);
  }

  // 3. System Announcements
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/system/announcements?limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/system/announcements", ok, `status=${r.status}`);
  }

  // 4. Models List
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/models?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/models", ok, `status=${r.status}`);
  }

  // 5. Models List with filters
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/models?page=1&limit=5&type=LLM&isOpenSource=true`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/models?type=LLM&isOpenSource=true", ok, `status=${r.status}`);
  }

  // 6. Ladder
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/ladder?type=professional&page=1&limit=10`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/ladder", ok, `status=${r.status}`);
  }

  // 7. Tools - Skills
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/tools/skills?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/tools/skills", ok, `status=${r.status}`);
  }

  // 8. Tools - MCP
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/tools/mcp?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/tools/mcp", ok, `status=${r.status}`);
  }

  // 9. Tools - Agents
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/tools/agents?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/tools/agents", ok, `status=${r.status}`);
  }

  // 10. Tools - API Stations
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/tools/api-stations?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/tools/api-stations", ok, `status=${r.status}`);
  }

  // 11. Evaluations (public GET)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/evaluations?page=1&limit=5`);
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/evaluations", ok, `status=${r.status}`);
  }
}

// ============================================
// 认证API测试
// ============================================

let accessToken = "";
let refreshToken = "";
const testEmail = `smoke_${Date.now()}@test.aidean.com`;
const testPassword = "TestPass123";

async function testAuthAPIs() {
  console.log("\n━━━ 认证API ━━━");

  // 1. Register
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        nickname: "SmokeTester",
      }),
    });
    const ok = r.status === 201 && r.json?.success === true;
    if (ok) {
      accessToken = r.json.data?.tokens?.access_token || "";
      refreshToken = r.json.data?.tokens?.refresh_token || "";
    }
    record("POST /api/v1/auth/register", ok, `status=${r.status} email=${testEmail}`);
  }

  // 2. Register - duplicate email (should fail)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        nickname: "SmokeTester2",
      }),
    });
    const ok = r.status === 409;
    record("POST /api/v1/auth/register (duplicate)", ok, `status=${r.status}`);
  }

  // 3. Register - weak password (should fail)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `weak_${Date.now()}@test.aidean.com`,
        password: "123",
        nickname: "WeakPass",
      }),
    });
    const ok = r.status === 422;
    record("POST /api/v1/auth/register (weak password)", ok, `status=${r.status}`);
  }

  // 4. Login
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const ok = r.status === 200 && r.json?.success === true;
    if (ok) {
      accessToken = r.json.data?.tokens?.access_token || accessToken;
      refreshToken = r.json.data?.tokens?.refresh_token || refreshToken;
    }
    record("POST /api/v1/auth/login", ok, `status=${r.status}`);
  }

  // 5. Login - wrong password
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword1",
      }),
    });
    const ok = r.status === 401;
    record("POST /api/v1/auth/login (wrong password)", ok, `status=${r.status}`);
  }

  // 6. Auth Me (需要token)
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/auth/me", ok, `status=${r.status}`);
  } else {
    record("GET /api/v1/auth/me", false, "no access token");
  }

  // 7. Auth Me - without token (should fail)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/me`);
    const ok = r.status === 401;
    record("GET /api/v1/auth/me (no token)", ok, `status=${r.status}`);
  }

  // 8. Refresh Token
  if (refreshToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const ok = r.status === 200 || r.status === 201;
    record("POST /api/v1/auth/refresh", ok, `status=${r.status}`);
  } else {
    record("POST /api/v1/auth/refresh", false, "no refresh token");
  }

  // 9. Logout
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ok = r.status === 200;
    record("POST /api/v1/auth/logout", ok, `status=${r.status}`);
  } else {
    record("POST /api/v1/auth/logout", false, "no access token");
  }
}

// ============================================
// 认证保护API测试
// ============================================

async function testProtectedAPIs() {
  console.log("\n━━━ 认证保护API ━━━");

  // 重新登录获取token
  const loginR = await fetchJSON(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (loginR.status === 200 && loginR.json?.success) {
    accessToken = loginR.json.data?.tokens?.access_token || "";
  }

  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  // 1. Favorites - GET (需要认证)
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/favorites`, {
      headers: authHeaders,
    });
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/favorites", ok, `status=${r.status}`);
  } else {
    record("GET /api/v1/favorites", false, "no token");
  }

  // 2. Favorites - without token (should fail)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/favorites`);
    const ok = r.status === 401;
    record("GET /api/v1/favorites (no token)", ok, `status=${r.status}`);
  }

  // 3. Favorites - POST (add)
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/favorites`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ refId: "test-model-1", refType: "MODEL" }),
    });
    const ok = r.status === 200 || r.status === 201 || r.status === 404;
    record("POST /api/v1/favorites (add)", ok, `status=${r.status}`);
  } else {
    record("POST /api/v1/favorites (add)", false, "no token");
  }

  // 4. Finance - Balance
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/finance/balance`, {
      headers: authHeaders,
    });
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/finance/balance", ok, `status=${r.status}`);
  } else {
    record("GET /api/v1/finance/balance", false, "no token");
  }

  // 5. Finance - Transactions
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/finance/transactions?page=1&limit=5`, {
      headers: authHeaders,
    });
    const ok = r.status === 200 && r.json?.success === true;
    record("GET /api/v1/finance/transactions", ok, `status=${r.status}`);
  } else {
    record("GET /api/v1/finance/transactions", false, "no token");
  }

  // 6. Evaluations - POST (create, 需要认证)
  if (accessToken) {
    const r = await fetchJSON(`${BASE_URL}/api/v1/evaluations`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test Eval",
        prompt: "Test prompt for smoke testing",
        modelIds: [],
      }),
    });
    // 可能因余额不足返回422，也算正常
    const ok = r.status === 201 || r.status === 200 || r.status === 422;
    record("POST /api/v1/evaluations", ok, `status=${r.status}`);
  } else {
    record("POST /api/v1/evaluations", false, "no token");
  }
}

// ============================================
// 管理员API测试 (期望401/403，因为测试用户非管理员)
// ============================================

async function testAdminAPIs() {
  console.log("\n━━━ 管理员API (预期401/403) ━━━");

  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  // 1. Admin Stats
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/admin/stats`, {
      headers: authHeaders,
    });
    const ok = r.status === 401 || r.status === 403;
    record("GET /api/v1/admin/stats (非管理员)", ok, `status=${r.status}`);
  }

  // 2. Admin Users
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/admin/users?page=1&limit=5`, {
      headers: authHeaders,
    });
    const ok = r.status === 401 || r.status === 403;
    record("GET /api/v1/admin/users (非管理员)", ok, `status=${r.status}`);
  }

  // 3. Users (admin-only)
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/users?page=1&limit=5`, {
      headers: authHeaders,
    });
    const ok = r.status === 401 || r.status === 403;
    record("GET /api/v1/users (非管理员)", ok, `status=${r.status}`);
  }
}

// ============================================
// 响应格式验证
// ============================================

async function testResponseFormat() {
  console.log("\n━━━ 响应格式验证 ━━━");

  // 成功响应格式
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/system/health`);
    const json = r.json;
    const hasSuccess = typeof json?.success === "boolean";
    const hasData = json?.data !== undefined;
    record("成功响应包含 success + data", hasSuccess && hasData, `success=${json?.success} hasData=${hasData}`);
  }

  // 错误响应格式
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/auth/me`);
    const json = r.json;
    const hasError = json?.error !== undefined;
    const hasCode = typeof json?.error?.code === "string";
    record("错误响应包含 error.code", hasError && hasCode, `code=${json?.error?.code}`);
  }

  // 分页响应格式
  {
    const r = await fetchJSON(`${BASE_URL}/api/v1/models?page=1&limit=5`);
    const meta = r.json?.meta;
    const hasPage = meta?.page !== undefined;
    const hasTotal = meta?.total !== undefined;
    record("分页响应包含 meta.page + meta.total", hasPage && hasTotal, `page=${meta?.page} total=${meta?.total}`);
  }
}

// ============================================
// 主流程
// ============================================

async function main() {
  console.log(`\n🚀 Aidean API Smoke Test — ${BASE_URL}`);
  console.log(`   Started at: ${new Date().toISOString()}\n`);

  // 等待服务就绪
  console.log("⏳ 等待服务就绪...");
  const ready = await waitForServer(BASE_URL);
  assert(ready, `服务未就绪: ${BASE_URL}/api/v1/system/health`);
  console.log("✅ 服务已就绪\n");

  // 解析参数
  const onlyIdx = process.argv.indexOf("--only");
  const onlyGroup = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

  if (!onlyGroup || onlyGroup === "public") {
    await testPublicAPIs();
  }
  if (!onlyGroup || onlyGroup === "auth") {
    await testAuthAPIs();
  }
  if (!onlyGroup || onlyGroup === "protected") {
    await testProtectedAPIs();
  }
  if (!onlyGroup || onlyGroup === "admin") {
    await testAdminAPIs();
  }
  if (!onlyGroup || onlyGroup === "format") {
    await testResponseFormat();
  }

  // 汇总
  console.log("\n━━━ 测试汇总 ━━━");
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  console.log(`  通过: ${passed}/${total}`);
  console.log(`  失败: ${failed}/${total}`);

  if (failed > 0) {
    console.log("\n  ❌ 失败项:");
    results.filter(r => !r.pass).forEach(r => {
      console.log(`     — ${r.name}: ${r.detail}`);
    });
  }

  console.log(`\n  完成: ${new Date().toISOString()}\n`);

  if (failed > 0) process.exitCode = 1;
}

await main();
