#!/usr/bin/env node
/**
 * B11-04b / B11-05 / B11-03b 截图与失败注入工具（桌面 1440 + 移动 390）。
 *
 * 前置：web 已在 BASE_URL 运行（默认 http://localhost:3000），且已 seed；
 *       环境变量 ADMIN_EMAIL / ADMIN_PASSWORD 提供管理员口令（不得写进命令行历史或证据文件）。
 * 用法：
 *   node scripts/audit/admin-shots.mjs --out <dir> --routes /admin/products,/admin/menus
 *   node scripts/audit/admin-shots.mjs --out <dir> --routes /admin/protocols --inject 500:/api/v1/admin/protocols
 *   node scripts/audit/admin-shots.mjs --out <dir> --routes /admin/protocols --inject offline:/api/v1/admin/protocols
 *   node scripts/audit/admin-shots.mjs --out <dir> --routes /admin/protocols --inject empty:/api/v1/admin/protocols
 * 输出：<dir>/<route-slug>.<desktop|mobile>[.<inject>].png，以及 <dir>/shots.json（每张图的 data-state 读数）。
 * 说明：
 *   - 登录走 POST /api/v1/auth/login（与浏览器同源 Cookie），不经 UI 表单，避免截图里出现口令。
 *   - --inject 只拦截以该前缀开头的 GET 请求：500 返回统一信封；offline 直接 abort；empty 返回 {rows:[],total:0}。
 *   - data-state 取页面上第一个 [data-testid^="admin-"][data-state] 的值；无五态外壳的页面记为 null。
 * Hark 注：本沙箱缺浏览器系统依赖，未在 Hark 侧实跑；助手首次使用时先对 1 个路由试跑并把 shots.json 贴进 EVD。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = arg("--base", process.env.BASE_URL || "http://localhost:3000");
const OUT = arg("--out", ".scratch/shots");
const ROUTES = String(arg("--routes", "")).split(",").filter(Boolean);
const INJECT = arg("--inject", null); // "500:/api/v1/admin/x" | "offline:/api/..." | "empty:/api/..."
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

if (!ROUTES.length) { console.error("--routes 必填，如 /admin/products,/admin/menus"); process.exit(2); }
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("需要环境变量 ADMIN_EMAIL / ADMIN_PASSWORD"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
try {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport, baseURL: BASE });
    const login = await ctx.request.post("/api/v1/auth/login", { data: { email, password } });
    if (!login.ok()) throw new Error(`登录失败 HTTP ${login.status()}`);
    const page = await ctx.newPage();
    if (INJECT) {
      const [kind, prefix] = INJECT.split(/:(.+)/);
      await page.route((url) => url.pathname.startsWith(prefix), (route) => {
        if (route.request().method() !== "GET") return route.continue();
        if (kind === "offline") return route.abort("internetdisconnected");
        if (kind === "empty") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { rows: [], items: [], total: 0, page: 1, pageSize: 20 } }) });
        return route.fulfill({ status: Number(kind) || 500, contentType: "application/json", body: JSON.stringify({ code: 50000, message: "注入的服务端错误", data: null }) });
      });
    }
    for (const r of ROUTES) {
      await page.goto(r, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const state = await page.locator('[data-testid^="admin-"][data-state]').first().getAttribute("data-state").catch(() => null);
      const slug = r.replace(/^\/+/, "").replace(/[^\w-]+/g, "_") || "root";
      const file = join(OUT, `${slug}.${vpName}${INJECT ? "." + INJECT.split(":")[0] : ""}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results.push({ route: r, viewport: vpName, inject: INJECT, state, file });
      console.log(`${vpName}\t${r}\tstate=${state}\t${file}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  writeFileSync(join(OUT, "shots.json"), JSON.stringify(results, null, 2) + "\n");
}
