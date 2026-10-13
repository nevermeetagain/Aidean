/**
 * apikey 域类型（GW-KEY-01 P1-S1.1）。
 *
 * 明文 Key 仅在 createApiKey 返回值中出现一次（透传给创建响应）；
 * 列表/查询/日志/UI 全部走脱敏视图（ApiKeyView），永不回明文与哈希。
 */

/** 创建入参：permissions 为权限位数组（当前仅 gateway:chat）；rateLimit 缺省取 API_KEY_DEFAULT_RPM */
export interface CreateKeyInput {
  name: string;
  permissions: string[];
  rateLimit?: { requestsPerMinute?: number };
  /** ISO 8601；缺省永不过期 */
  expiresAt?: string;
}

/** 列表/详情脱敏视图：不含 keyHash，不含明文 */
export interface ApiKeyView {
  id: string;
  keyId: string;
  name: string;
  permissions: string[];
  rateLimit: { requestsPerMinute: number } | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

/** 网关调用主体：API Key 态携带 keyId（限流/审计键）；cookie 态零回退 */
export interface GatewayPrincipal {
  userId: string;
  source: "cookie" | "api_key";
  keyId?: string;
}

/** verifyApiKey 产物：guard 层据此做 permissions/rateLimit 判定 */
export interface VerifiedApiKey {
  userId: string;
  keyId: string;
  permissions: string[];
  rateLimit: { requestsPerMinute: number };
}

/** 归一化后的限流配置（库内 Json 缺省 → 默认值） */
export interface NormalizedRateLimit {
  requestsPerMinute: number;
}

/** parseCreateKeyInput 结果：手写校验（web 无直接 zod 依赖，shared 属冻结面） */
export type ParsedInput<T> = { ok: true; value: T } | { ok: false; message: string };
