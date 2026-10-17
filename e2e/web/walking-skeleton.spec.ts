import { test, expect } from "../fixtures";

/**
 * TASK-005 · S0 步行骨架 e2e（REQ-F-05 用户系统 / REQ-NF-01 统一错误 / REQ-NF-005）。
 *
 * 目标：在 :3000 真实服务上串起最小闭环，逐跳可验收：
 *   POST /auth/register → POST /auth/login → POST /user/api-keys（鉴权写）
 *   → /user/console?tab=platformKeys 可见新 Key → 清理 DELETE
 *   并行独立断言：匿名 GET /user/api-keys 得 401 且信封四要素齐全、GET /system/ready 200。
 *
 * 契约真源（唯一源 = packages/shared，ADR-P001 / TASK-001 落地）：
 *   - ErrorBodySchema：错误信封四要素 {code(已登记), message(非空), data:null, requestId}；
 *   - SystemReadySchema：{status:"ready", checks:{db:"ok", redis:"ok"}, time:ISO}。
 *
 * 导入口径说明（证据链见 EVD-005/import-resolution.md）：
 *   TASK-005 步骤 2 要求「从 @aidean/shared 导入」。但 Playwright 从仓库根运行，
 *   `@aidean/shared` 仅在 apps/web/node_modules 建立 workspace 符号链接，根 node_modules
 *   无该链接（实测 require.resolve 从 e2e/web 解析 @aidean/shared = MODULE_NOT_FOUND），
 *   且「允许修改」范围仅本 spec + EVD-005（不得改 playwright/tsconfig 加 alias）。
 *   故以**相对源码路径**直接导入等价符号（同一 packages/shared 源文件、同样经 zod 校验），
 *   语义与裸包名导入完全一致，仅解析入口不同。
 *
 * 用例划分（每个 test 独立 context，storageState=web-guest 游客态不含 aidean_token）：
 *   - 主链路用例：注册即签发 RS256 aidean_token Cookie（无邮箱验证码，见 EVD-005/blocking-note.md），
 *     page.request 与 page.context 共享 Cookie，故注册/登录后鉴权写与控制台导航天然携带登录态。
 *   - 匿名用例：显式 clearCookies 保证真实匿名（纵深防御，不依赖游客态是否含令牌）。
 *   - 就绪用例：PUBLIC 无鉴权，DB+Redis 探活均 ok → 200。
 */

// 相对源码导入（避开裸包名在仓库根的解析缺失；packages/shared/src/errors.ts 仅依赖 zod）
// 注意（S-3 审查）：本导入锚定 packages/shared 现有文件布局；若后续 errors.ts / system.schema.ts
// 被迁移或改名，须同步更新以下两行导入路径（语义仍为唯一源，仅路径随源文件移动）。
import { ErrorBodySchema } from "../../packages/shared/src/errors";
import { SystemReadySchema } from "../../packages/shared/src/schemas/system.schema";

/** 时间戳唯一后缀，避免邮箱/Key 名跨用例冲突（多次执行、并行 worker 亦互不干扰）。 */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("S0 步行骨架：注册→登录→鉴权写→页面可见→错误信封→就绪", () => {
  test("主链路：注册→登录→创建 API Key→控制台可见→清理", async ({ page }) => {
    const suffix = uniqueSuffix();
    const email = `walk-${suffix}@e2e.aidean.test`;
    const password = "WalkSkeleton123!"; // ≥8，满足 RegisterSchema
    const nickname = "步行骨架";
    const keyName = `walk-key-${suffix}`;
    let keyId: string | undefined;

    // M-1（审查）：无论 happy-path 断言是否中途失败，用例结束都**幂等兜底删除**已创建的 Key，
    // 防失败路径残留累积污染（happy path 仍显式断言 DELETE 成功；finally 二次删除吞异常即可）。
    try {
      // 1) 注册（即时签发双令牌 Cookie，无邮箱验证码旁路依赖）
      const registerResp = await page.request.post("/api/v1/auth/register", {
        data: { email, password, nickname },
      });
      expect(registerResp.status()).toBe(200);
      const registerBody = await registerResp.json();
      expect(registerBody.code).toBe(0);
      expect(registerBody.data?.user?.email).toBe(email);
      const tokenAfterRegister = (await page.context().cookies()).find(
        (c) => c.name === "aidean_token",
      )?.value;

      // 2) 登录（信封 {code:0,data:{user}}，Set-Cookie aidean_token 落 context）
      //    断言 login 相对 register **独立重新签发**了 access 令牌（新 jti → 令牌值变化），
      //    使「login」这一步真正可证伪（S-1 审查建议）。
      const loginResp = await page.request.post("/api/v1/auth/login", {
        data: { email, password },
      });
      expect(loginResp.status()).toBe(200);
      const loginBody = await loginResp.json();
      expect(loginBody.code).toBe(0);
      const cookiesAfterLogin = await page.context().cookies();
      expect(cookiesAfterLogin.some((c) => c.name === "aidean_token" && c.value.length > 0)).toBe(true);
      const tokenAfterLogin = cookiesAfterLogin.find((c) => c.name === "aidean_token")?.value;
      expect(typeof tokenAfterLogin === "string" && tokenAfterLogin !== tokenAfterRegister).toBe(true);

      // 3) 鉴权写：创建平台 API Key（明文仅此响应返回一次；permissions 须为非空字符串数组）
      const createResp = await page.request.post("/api/v1/user/api-keys", {
        data: { name: keyName, permissions: ["gateway:chat"] },
      });
      expect(createResp.status()).toBe(200);
      const createBody = await createResp.json();
      expect(createBody.code).toBe(0);
      keyId = createBody.data?.item?.id as string;
      expect(typeof keyId).toBe("string");
      expect(keyId.length).toBeGreaterThan(0);
      expect(createBody.data?.item?.name).toBe(keyName);
      // 明文稳定形态 aid_ak_<16hex>_<base64url>（lib/features/apikey/service.ts），断前缀收紧到 aid_ak_
      expect((createBody.data?.plaintext as string).startsWith("aid_ak_")).toBe(true);

      // 3b) 鉴权读：本人列表应含新建 Key（脱敏视图，无明文/哈希）
      const listResp = await page.request.get("/api/v1/user/api-keys");
      expect(listResp.status()).toBe(200);
      const listBody = await listResp.json();
      const items = listBody.data?.items as Array<{ id: string; name: string }>;
      expect(items.some((it) => it.id === keyId && it.name === keyName)).toBe(true);

      // 4) 页面可见：控制台深链 ?tab=platformKeys 自动激活「平台渠道」面板，列表面板内含该 Key 名称
      await page.goto("/user/console?tab=platformKeys");
      const panel = page.getByTestId("console-panel-platformKeys");
      await expect(panel).toBeVisible();
      await expect(panel.getByText(keyName, { exact: true })).toBeVisible();

      // 5) 清理：物理删除本用例创建的 Key（执行步骤 3「测试末尾 DELETE 创建的 api-key」）
      const deleteResp = await page.request.delete(`/api/v1/user/api-keys/${keyId}`);
      expect(deleteResp.status()).toBe(200);
      const deleteBody = await deleteResp.json();
      expect(deleteBody.code).toBe(0);
      expect(deleteBody.data?.deleted).toBe(true);
      keyId = undefined; // 已成功删除，finally 无需再删
    } finally {
      if (keyId) {
        await page.request.delete(`/api/v1/user/api-keys/${keyId}`).catch(() => undefined);
      }
    }
  });

  test("匿名 GET /user/api-keys → 401 且错误信封四要素齐全（ErrorBodySchema.parse）", async ({ page }) => {
    // 真实匿名：清空 context cookie（含游客态），杜绝任何登录态混入
    await page.context().clearCookies();

    const anonResp = await page.request.get("/api/v1/user/api-keys");
    expect(anonResp.status()).toBe(401);
    const body = await anonResp.json();

    // 四要素结构由冻结契约 ErrorBodySchema 校验：code 须为已登记码、message 非空、data 恒 null、requestId 非空
    const parsed = ErrorBodySchema.parse(body);
    expect(parsed.code).toBe(10004); // UNAUTHENTICATED
    expect(parsed.data).toBeNull();
    expect(parsed.message.length).toBeGreaterThan(0);
    expect(parsed.requestId.length).toBeGreaterThan(0);
  });

  test("GET /system/ready → 200 且就绪体符合 SystemReadySchema", async ({ page }) => {
    const resp = await page.request.get("/api/v1/system/ready");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.code).toBe(0);

    const ready = SystemReadySchema.parse(body.data);
    expect(ready.status).toBe("ready");
    expect(ready.checks.db).toBe("ok");
    expect(ready.checks.redis).toBe("ok");
  });
});
