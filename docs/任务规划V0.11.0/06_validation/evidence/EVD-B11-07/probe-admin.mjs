// B11-07 运行态取证（EVD-B11-07 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// /admin/monitoring 源状态 + 变更流（使用 .auth/admin-auth.json 会话；过期先跑 playwright --project=admin-setup）
// 用法：cd <repo root> && node probe-admin.mjs
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const { chromium } = require("@playwright/test");

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    storageState: path.resolve(process.cwd(), ".auth/admin-auth.json"),
    baseURL: "http://localhost:3000",
  });
  const page = await ctx.newPage();
  const res = await page.goto("/admin/monitoring", { waitUntil: "networkidle", timeout: 90_000 });
  const text = await page.evaluate(() => document.body.innerText);
  const counts = {};
  for (const k of ["openrouter", "aihubmix", "quanzil", "fetch failed", "692", "332", "变更", "never"]) {
    counts[k] = (text.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
  }
  console.log(JSON.stringify({ url: page.url(), status: res?.status(), textBytes: text.length, counts, excerpt: text.slice(0, 4000) }, null, 1));
} catch (e) {
  console.error("ERR", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
