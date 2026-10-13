/**
 * S4「站点可见即可改」端到端联动 e2e（change-id restructure-admin-nav-rbac-cms）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN）登录 → storageState；dev 服务运行于 3000（e2e 复用外部进程）。
 * 断言点（后台改配置 → 前台即时反映，覆盖 CMS 真链路）：
 *  1) 改站点名（site.name，置空 site.title 走「名 · 描述」回退）→ 前台首页 <title> 含新站名；
 *  2) 改首页 Hero 主标题（home.hero）→ 前台首页对应 <h1> 可见。
 * 反例已由单测覆盖：非法 JSON / DB 不可用 → 读服务回退默认（见 lib/__tests__/site-content-s4.spec.ts）。
 * 隔离：读取原值 → 断言 → 还原原值（PUT 为 validate-then-store-raw，回写逐字节还原，不留脏）。
 */
import { test, expect } from "../fixtures";

type ConfigRow = { configKey: string; configValue: string };

async function readConfig(page: import("@playwright/test").Page, key: string): Promise<string> {
  const body = await (await page.request.get("/api/v1/admin/configs")).json();
  const row = (body?.data?.configs as ConfigRow[] | undefined)?.find((c) => c.configKey === key);
  return row?.configValue ?? "";
}

async function writeConfig(page: import("@playwright/test").Page, key: string, value: string) {
  const res = await page.request.put("/api/v1/admin/configs", { data: { configKey: key, configValue: value } });
  expect(res.status(), `${key} 写入应 200`).toBe(200);
  const body = await res.json();
  expect(body.code, `${key} 写入信封 code 应为 0`).toBe(0);
}

test.describe("S4 站点可见即可改（后台改 → 前台联动）", () => {
  test("改站点名 → 前台首页 <title> 变化", async ({ page }) => {
    const origName = await readConfig(page, "site.name");
    const origTitle = await readConfig(page, "site.title");
    const marker = `站点改名${Date.now()}`;
    try {
      await writeConfig(page, "site.title", ""); // 置空标题，令 <title> 走「站点名 · 描述」
      await writeConfig(page, "site.name", marker);
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveTitle(new RegExp(marker));
    } finally {
      await writeConfig(page, "site.name", origName || "Aidean");
      await writeConfig(page, "site.title", origTitle);
    }
  });

  test("改首页 Hero 主标题 → 前台首页标题区变化", async ({ page }) => {
    const origHero = await readConfig(page, "home.hero");
    const hero = JSON.parse(origHero);
    const marker = `首页主标${Date.now()}`;
    try {
      await writeConfig(page, "home.hero", JSON.stringify({ ...hero, title: marker }));
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { level: 1, name: marker })).toBeVisible();
    } finally {
      await writeConfig(page, "home.hero", origHero);
    }
  });
});
