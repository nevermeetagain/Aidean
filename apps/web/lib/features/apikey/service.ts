/**
 * 平台 API Key 领域服务（GW-KEY-01 P1-S1.2/S1.3）。
 *
 * 生命周期：创建（明文仅返回一次）→ 脱敏列表 → 吊销（isActive=false 即时生效）→ verify。
 *
 * 哈希选型（报告 §3 详述）：HMAC-SHA256（pepper=JWT_SECRET 派生）而非 bcrypt——
 * ① API Key 为 256 位高熵随机值（base64url 32 字节），无低熵字典攻击面，慢哈希无必要；
 * ② keyHash 已建索引（schema @@index([keyHash])），sha256 系支持 O(1) 等值定位，
 *    bcrypt 每次网关调用 ~100ms 成本不可接受；③ node:crypto 零新依赖。
 *
 * Key 形态：`aid_ak_<16hex>_<base64url-32B>`；keyId 为可展示标识（限流/审计键），
 * verify 先按 keyId 定位行再 HMAC 比对（timingSafeEqual 防时序侧信道）。
 *
 * 限流：Redis 固定窗口（lib/rate-limit.ts 通用实现，Redis 不可用 fail-open），
 * 键 `rl:apikey:<keyId>:min`；rateLimit 缺省取 API_KEY_DEFAULT_RPM=60
 * （默认 60 req/min：单 Key 防滥用兜底，创建时可按 Key 覆盖，上限 6000）。
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { prisma } from "../../db/prisma";
import { checkFixedWindow } from "../../rate-limit";
import type {
  ApiKeyView,
  CreateKeyInput,
  GatewayPrincipal,
  NormalizedRateLimit,
  ParsedInput,
  VerifiedApiKey,
} from "./types";

/** 明文 Key 前缀（稳定契约：外部程序按 Bearer/x-api-key 原样携带） */
export const API_KEY_PREFIX = "aid";
/** Key 级限流缺省值：60 req/min（防滥用兜底；创建时 rateLimit.requestsPerMinute 可覆盖） */
export const API_KEY_DEFAULT_RPM = 60;
/** rateLimit.requestsPerMinute 合法上限 */
export const API_KEY_MAX_RPM = 6000;
/** 网关调用权限位（chat 路由首守卫校验） */
export const PERMISSION_GATEWAY_CHAT = "gateway:chat";

// ==================== 哈希与解析（内部） ====================

function pepper(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "JWT_SECRET 未配置（API Key 哈希 pepper 不可用）");
  return s;
}

/** HMAC-SHA256(secret, pepper) hex——库内 key_hash 唯一存储形态 */
function hashSecret(secret: string): string {
  return createHmac("sha256", pepper()).update(secret).digest("hex");
}

function newKeyRaw(): { keyId: string; secret: string; plaintext: string } {
  const keyId = `ak_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  return { keyId, secret, plaintext: `${API_KEY_PREFIX}_${keyId}_${secret}` };
}

/** 明文 Key 解析：`aid_ak_<16hex>_<secret>` → { keyId, secret }；格式不符返回 null（→401）。
 *  keyId 自身含 `_`（ak_ 前缀），secret 为 base64url 亦可含 `_`/`-`——故按固定形状整体匹配，
 *  keyId 段 = ak_ + 16 hex（19 字符），secret 取其余全部。 */
export function parsePlaintextKey(raw: string): { keyId: string; secret: string } | null {
  const prefix = `${API_KEY_PREFIX}_`;
  if (!raw.startsWith(prefix)) return null;
  const rest = raw.slice(prefix.length);
  const m = /^ak_[0-9a-f]{16}_(.+)$/.exec(rest);
  if (!m || !m[1]) return null;
  return { keyId: rest.slice(0, 19), secret: m[1] };
}

/** rateLimit Json 列 → 归一配置（缺省/脏数据回落默认值） */
export function normalizeRateLimit(raw: unknown): NormalizedRateLimit {
  const rpm =
    raw && typeof raw === "object" && typeof (raw as { requestsPerMinute?: unknown }).requestsPerMinute === "number"
      ? (raw as { requestsPerMinute: number }).requestsPerMinute
      : API_KEY_DEFAULT_RPM;
  return { requestsPerMinute: rpm > 0 ? rpm : API_KEY_DEFAULT_RPM };
}

// ==================== 创建 / 列表 / 吊销 ====================

/** 行 → 脱敏视图（永不携带 keyHash） */
function toView(row: {
  id: string;
  keyId: string;
  name: string;
  permissions: string[];
  rateLimit: unknown;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}): ApiKeyView {
  return {
    id: row.id,
    keyId: row.keyId,
    name: row.name,
    permissions: row.permissions,
    rateLimit: row.rateLimit ? normalizeRateLimit(row.rateLimit) : null,
    isActive: row.isActive,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 创建：明文仅在本返回值中出现一次（调用方透传创建响应后即丢弃） */
export async function createApiKey(userId: string, input: CreateKeyInput): Promise<{ plaintext: string; view: ApiKeyView }> {
  const { keyId, secret, plaintext } = newKeyRaw();
  const row = await prisma.apiKey.create({
    data: {
      userId,
      keyId,
      name: input.name,
      keyHash: hashSecret(secret),
      permissions: input.permissions,
      rateLimit: input.rateLimit ?? undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
  return { plaintext, view: toView(row) };
}

/** 本人 Key 脱敏列表（永不回明文/哈希） */
export async function listApiKeys(userId: string): Promise<ApiKeyView[]> {
  const rows = await prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => toView(r));
}

/** 吊销（isActive=false 即时生效；非物理删除以保留审计痕迹）；0 行 → 40000 */
export async function revokeApiKey(userId: string, id: string): Promise<void> {
  const res = await prisma.apiKey.updateMany({ where: { id, userId }, data: { isActive: false } });
  if (res.count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "API Key 不存在或无权操作");
}

/**
 * 删除（物理移除；控制台诉求：Key 应删除而非吊销）。
 * 安全性：UsageLog 不引用 apiKeyId（按 userId 归因），CacheObservation.apiKeyId 为无 FK 裸列，
 * Redis 限流桶 60s TTL 自然过期——删除 Key 行不破坏任何历史消耗明细，故零 schema 变更即可物理删除。
 * 0 行（不存在/非本人）→ 40000。
 */
export async function deleteApiKey(userId: string, id: string): Promise<void> {
  const res = await prisma.apiKey.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "API Key 不存在或无权操作");
}

// ==================== verify / 限流 ====================

/**
 * 校验明文 Key：格式 → keyId 定位 → 吊销/过期 → HMAC 比对（timingSafeEqual）。
 * 无效/吊销/过期一律 10004（withApi → 401），不区分具体原因（防枚举）。
 */
export async function verifyApiKey(raw: string): Promise<VerifiedApiKey> {
  const parsed = parsePlaintextKey(raw);
  if (!parsed) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效或已失效");
  const row = await prisma.apiKey.findUnique({ where: { keyId: parsed.keyId } });
  if (!row || !row.isActive) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效或已失效");
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效或已失效");
  }
  const expect = Buffer.from(row.keyHash, "hex");
  const got = Buffer.from(hashSecret(parsed.secret), "hex");
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效或已失效");
  }
  return {
    userId: row.userId,
    keyId: row.keyId,
    permissions: row.permissions,
    rateLimit: normalizeRateLimit(row.rateLimit),
  };
}

/**
 * Key 级限流（P1-S1.3）：固定窗口 60s，键 rl:apikey:<keyId>:min。
 * checkFixedWindow 在 Redis 不可用时 fail-open（纵深防御，不阻断主流程）。
 * 超限 → 10006（withApi → 429），提示语含重试语义。
 */
export async function enforceKeyRateLimit(keyId: string, rateLimit: NormalizedRateLimit): Promise<void> {
  const res = await checkFixedWindow(`rl:apikey:${keyId}:min`, rateLimit.requestsPerMinute, 60);
  if (!res.allowed) {
    throw new ApiError(
      ERROR_CODES.TOO_MANY_REQUESTS,
      `请求过于频繁：当前 Key 限流 ${rateLimit.requestsPerMinute}/min，请在窗口结束后重试`
    );
  }
}

/** lastUsedAt 痕迹更新：fire-and-forget，失败静默（不阻断网关主流程、不产生用户可见延迟） */
export function touchLastUsed(keyId: string): void {
  void prisma.apiKey
    .update({ where: { keyId }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
}

// ==================== 参数校验（手写，web 无直接 zod 依赖且 shared 属冻结面） ====================

/** CreateKeyInput 校验：name 1~64；permissions 非空字符串数组 ≤16；rpm 1~6000；expiresAt 合法 ISO */
export function parseCreateKeyInput(raw: unknown): ParsedInput<CreateKeyInput> {
  if (!raw || typeof raw !== "object") return { ok: false, message: "请求体须为对象" };
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || r.name.trim().length < 1 || r.name.length > 64) {
    return { ok: false, message: "name 须为 1~64 字符" };
  }
  if (
    !Array.isArray(r.permissions) ||
    r.permissions.length === 0 ||
    r.permissions.length > 16 ||
    r.permissions.some((p) => typeof p !== "string" || p.length === 0)
  ) {
    return { ok: false, message: "permissions 须为非空字符串数组（≤16 项，如 [\"gateway:chat\"]）" };
  }
  let rateLimit: CreateKeyInput["rateLimit"];
  if (r.rateLimit != null) {
    if (typeof r.rateLimit !== "object") return { ok: false, message: "rateLimit 须为对象" };
    const rpm = (r.rateLimit as Record<string, unknown>).requestsPerMinute;
    if (rpm !== undefined) {
      if (typeof rpm !== "number" || !Number.isInteger(rpm) || rpm < 1 || rpm > API_KEY_MAX_RPM) {
        return { ok: false, message: `rateLimit.requestsPerMinute 须为 1~${API_KEY_MAX_RPM} 整数` };
      }
      rateLimit = { requestsPerMinute: rpm };
    }
  }
  let expiresAt: string | undefined;
  if (r.expiresAt != null) {
    if (typeof r.expiresAt !== "string" || Number.isNaN(new Date(r.expiresAt).getTime())) {
      return { ok: false, message: "expiresAt 须为合法 ISO 8601 日期" };
    }
    expiresAt = r.expiresAt;
  }
  return {
    ok: true,
    value: {
      name: r.name.trim(),
      permissions: r.permissions as string[],
      rateLimit,
      expiresAt,
    },
  };
}

/** guard 快捷入口（P2-S2.1）：verify + 限流 + lastUsedAt 痕迹，权限位判定由 guard 做 */
export async function authenticateApiKey(raw: string): Promise<GatewayPrincipal> {
  const v = await verifyApiKey(raw);
  if (!v.permissions.includes(PERMISSION_GATEWAY_CHAT)) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "API Key 缺少 gateway:chat 权限");
  }
  await enforceKeyRateLimit(v.keyId, v.rateLimit);
  touchLastUsed(v.keyId);
  return { userId: v.userId, source: "api_key", keyId: v.keyId };
}
