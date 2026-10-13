/**
 * Admin 可配置菜单 e2e（S2 / change-id restructure-admin-nav-rbac-cms）
 *
 * 触发：登录 admin 后（admin-setup 依赖）
 * 断言点：
 *  1) 侧边栏由 NavigationMenu(scope=ADMIN) 驱动：冷启动直访 /admin/menus
 *     → 「菜单配置」入口（DB 种子 adm_menus）在 DOM、可见、aria-current="page"（路由命中自动展开财务与配置组）
 *  2) /admin/menus 管理面板从 API 读到真源数据：主区标题 + 至少一个一级分组卡（含种子 menuCode adm_grp_ops/运营管理）
 *  3) 「新建一级分组」表单可展开（编码/名称/排序 + 创建按钮），不提交（无 DB 写副作用）
 */
import { test, expect } from "../fixtures";

const MENUS_LINK = 'nav[aria-label="管理导航"] a[href="/admin/menus"]';

test.describe("Admin 可配置菜单（S2）", () => {
  test("冷启动 /admin/menus：DB 驱动的「菜单配置」入口自动展开且高亮", async ({ page }) => {
    await page.goto("/admin/menus");
    await page.waitForLoadState("networkidle");

    const link = page.locator(MENUS_LINK).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
  });

  test("菜单面板读取真源：标题 + 种子分组可见", async ({ page }) => {
    await page.goto("/admin/menus");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "菜单配置" })).toBeVisible();
    // GET /api/v1/admin/menus 回落的种子一级分组「运营管理」（adm_grp_ops）
    await expect(page.getByText("运营管理", { exact: true }).first()).toBeVisible();
    await expect(page.locator("text=adm_grp_ops").first()).toBeVisible();
  });

  test("新建一级分组表单可展开（不提交）", async ({ page }) => {
    await page.goto("/admin/menus");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "新建一级分组" }).click();
    await expect(page.getByPlaceholder("adm_grp_xxx")).toBeVisible();
    await expect(page.getByRole("button", { name: "创建分组" })).toBeVisible();
  });
});
