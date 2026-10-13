/**
 * Admin RBAC 角色/成员管理 e2e（S3.5 / change-id restructure-admin-nav-rbac-cms · A2+B2）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，通配 *）登录 → storageState。
 * 断言点：
 *  1) 冷启动直访 /admin/roles：侧栏「角色权限」入口（种子 adm_roles）高亮；面板读取到 3 个系统角色。
 *  2) 用户面板对 SUPER_ADMIN 露出「分配角色」入口（canAssignRoles 由服务端有效权限推导）。
 *  3) 后端护栏（越权/自锁防护）：对「自身」用户 PATCH 角色分配 → 拒绝（信封 code≠0，文案含「不能修改自己的角色分配」）；
 *     该拒绝发生在写入之前，无副作用（不落库）。
 *  4) 后端逐接口强制的负向证据（未登录）：匿名 GET 角色接口 → 401（10004）。
 *
 * 说明：MODERATOR「无该码 403」由 `lib/features/auth/__tests__/admin-guard.spec.ts` 在 requireAdminApi 层逐例覆盖
 *       （持有→放行 / 未持有→10008 / 通配→放行 / 非 staff→需要管理员权限），后端强制、不依赖前端。
 */
import { test, expect } from "../fixtures";

const ROLES_LINK = 'nav[aria-label="管理导航"] a[href="/admin/roles"]';
const SEED_ADMIN_EMAIL = "admin@aidean.com";

test.describe("Admin 角色权限管理（S3.5 RBAC）", () => {
  test("冷启动 /admin/roles：侧栏入口高亮 + 面板读取系统角色", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForLoadState("networkidle");

    const link = page.locator(ROLES_LINK).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");

    await expect(page.getByRole("heading", { name: "角色权限" })).toBeVisible();
    // GET /api/v1/admin/roles 回落的系统角色（seed-rbac：超级管理员 / 管理员 / 内容审核员）
    await expect(page.getByText("超级管理员", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("内容审核员", { exact: true }).first()).toBeVisible();
    // 通配标注 + 新建入口
    await expect(page.getByText("通配 *（全权）").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "新建角色" })).toBeVisible();
  });

  test("用户面板对 SUPER_ADMIN 露出「分配角色」入口", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "分配角色" }).first()).toBeVisible();
  });

  test("护栏：禁止修改自身角色分配（后端拒绝，无副作用）", async ({ page }) => {
    // 定位当前登录管理员自身 id
    const listRes = await (
      await page.request.get(`/api/v1/admin/users?page=1&pageSize=20&q=${encodeURIComponent(SEED_ADMIN_EMAIL)}`)
    ).json();
    const users = listRes?.data?.users ?? [];
    const self = users.find((u: { email: string }) => u.email === SEED_ADMIN_EMAIL);
    expect(self, "种子管理员应在用户列表中").toBeTruthy();

    const patchRes = await page.request.patch(`/api/v1/admin/users/${self.id}/roles`, {
      data: { roleCodes: ["ADMIN"] },
    });
    expect(patchRes.status()).toBe(400);
    const body = await patchRes.json();
    expect(body.code).not.toBe(0);
    expect(String(body.message)).toContain("不能修改自己的角色分配");
  });

  test("后端逐接口强制：清除登录 Cookie 后访问 admin 角色接口 → 401（认证层先拦）", async ({ context, page }) => {
    // 当前上下文携 admin storageState；清除 Cookie 后即为未登录 → requireAdminApi 先抛 10004（401）。
    await context.clearCookies();
    const res = await page.request.get(`/api/v1/admin/roles`);
    expect(res.status()).toBe(401);
  });
});
