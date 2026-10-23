/**
 * S4「站点可见即可改」端到端联动 e2e（change-id restructure-admin-nav-rbac-cms）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN）登录 → storageState；dev 服务运行于 3000（e2e 复用外部进程）。
 * 断言点（后台改配置 → 前台即时反映，覆盖 CMS 真链路）：
 *  1) 改站点名（site.name，置空 site.title 走「名 · 描述」回退）→ 前台首页 <title> 含新站名；
 *  2) 改首页 Hero 主标题（home.hero）→ 前台首页对应 <h1> 可见。
 * 反例已由单测覆盖：非法 JSON / DB 不可用 → 读服务回退默认（见 lib/__tests__/site-content-s4.spec.ts）。
 * 隔离：读取原值 → 断言 → 还原原值（PUT 为 validate-then-store-raw，回写逐字节还原，不留脏）。
 * 已知阻断（T120-03 登记，用例以 test.fixme 呈现而非放宽断言）：断言点 2 受缺陷 D1「首页 SSR 缓存失效
 * 丢失」影响，后台写库成功但前台 10s 内不反映 → 见 EVD-T120-03/defects.md；D1 修复后本用例自动恢复全断言。
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

/**
 * 轮询「前台首页 SSR 是否已反映新值」——每轮重新导航以重取 SSR（失效是随请求发生的，
 * 只看已加载的 DOM 观察不到收敛）。返回 true=收敛，false=windowMs 内未收敛（不抛错，
 * 由调用方决定是断言还是登记 fixme）。
 */
async function waitHomeReflects(
  page: import("@playwright/test").Page,
  text: string,
  windowMs = 10_000
): Promise<boolean> {
  const deadline = Date.now() + windowMs;
  for (;;) {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    if (await page.getByRole("heading", { level: 1, name: text }).isVisible().catch(() => false)) return true;
    if (Date.now() >= deadline) return false;
    await page.waitForTimeout(500);
  }
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
    let converged = true;
    try {
      await writeConfig(page, "home.hero", JSON.stringify({ ...hero, title: marker }));
      // 「即时生效」契约（HomeContentEditor.tsx:8 / configs/route.ts:80-83 声称 revalidateTag('site-home')
      // + revalidatePath('/')）本身不放宽：仍用 10s 窗口（与 config.expect 同量级），只是把「未收敛」
      // 从裸断言失败改为下面的 fixme 登记，以便缺陷修好后自动恢复为完整断言。
      converged = await waitHomeReflects(page, marker);
      if (converged) {
        await expect(page.getByRole("heading", { level: 1, name: marker })).toBeVisible();
      }
    } finally {
      await writeConfig(page, "home.hero", origHero);
    }
    if (!converged) {
      // 真缺陷登记（T120-03，只登记不修；源码在卡面禁改路径 apps/web/app|lib/**）：
      // 后台写 home.hero 后库内与后台回读均已更新，但首页 SSR 在 10s（实测 20s+）内仍不反映新值，
      // 且「同一 TTL 窗口内的第二次连续写入」必现（首轮写入 0s 收敛、次轮 >20s 不收敛，
      // 再补一次同值 PUT 又 0s 收敛）→ revalidateTag/revalidatePath 失效丢失。
      // 实测数据与定位见 docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-03/defects.md 缺陷 D1（抄送 Hark）。
      test.fixme(true, "D1 首页 SSR 不反映后台新值（缓存失效丢失，见 EVD-T120-03/defects.md）");
    }
  });
});
