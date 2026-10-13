/**
 * 用户自有上游 Key 领域服务（GW-KEY-01 P3-S3.3）。
 *
 * 站点维度录入/删除/列表（userId+stationId 唯一，重复录入 = 覆盖换 Key 并复活 isActive）：
 * - 明文仅录入请求中出现一次，落库即 AES-256-GCM 密文（crypto.ts，JWT_SECRET 派生）；
 * - 列表/UI 走 keyMasked 脱敏列（maskApiKey 口径），密文列永不出 service；
 * - 解密只发生在网关调上游前（gateway/service.ts UPSTREAM 分支经 decryptSecret）。
 */
import { maskApiKey } from "@aidean/shared";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { prisma } from "../../db/prisma";
import { encryptSecret } from "./crypto";
import { findOfficialPlatform } from "../upstream/official-catalog";
import type { ParsedInput } from "./types";

export interface StationKeyInput {
  stationId: string;
  apiKey: string;
  name?: string;
}

/** 列表/详情脱敏视图：不含 keyCipher，不含明文 */
export interface StationKeyView {
  id: string;
  stationId: string;
  name: string | null;
  keyMasked: string;
  isActive: boolean;
  createdAt: string;
}

/** 部分更新入参（PATCH）：缺省字段不动；apiKey 缺省=不换密钥 */
export interface StationKeyPatch {
  name?: string;
  apiKey?: string;
  isActive?: boolean;
}

/** 控制台可选站点摘要（自有 Key 录入下拉；官方平台目录合并，携带 icon 与模型清单） */
export interface UpstreamStationOption {
  id: string;
  displayName: string;
  baseUrl: string | null;
  /** 官方平台代码（openai/anthropic/...），非官方站为空 */
  code?: string;
  /** 图标地址（本地路径或受白名单约束的外链） */
  icon?: string;
  /** 品牌色（图标加载失败时的占位徽标） */
  brandColor?: string;
  /** 平台提供的官方模型标识清单（slug 口径） */
  models?: string[];
  /** 协议格式 */
  format?: "openai" | "anthropic";
}

/** StationKeyInput 校验：stationId 必填；apiKey 1~512；name ≤64 */
export function parseStationKeyInput(raw: unknown): ParsedInput<StationKeyInput> {
  if (!raw || typeof raw !== "object") return { ok: false, message: "请求体须为对象" };
  const r = raw as Record<string, unknown>;
  if (typeof r.stationId !== "string" || r.stationId.trim().length < 1) {
    return { ok: false, message: "stationId 必填" };
  }
  if (typeof r.apiKey !== "string" || r.apiKey.trim().length < 1 || r.apiKey.length > 512) {
    return { ok: false, message: "apiKey 须为 1~512 字符" };
  }
  let name: string | undefined;
  if (r.name != null) {
    if (typeof r.name !== "string" || r.name.trim().length > 64) {
      return { ok: false, message: "name 须 ≤64 字符" };
    }
    name = r.name.trim();
  }
  return { ok: true, value: { stationId: r.stationId.trim(), apiKey: r.apiKey, name } };
}

function toView(row: {
  id: string;
  stationId: string;
  name: string | null;
  keyMasked: string;
  isActive: boolean;
  createdAt: Date;
}): StationKeyView {
  return {
    id: row.id,
    stationId: row.stationId,
    name: row.name,
    keyMasked: row.keyMasked,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 录入（upsert：userId+stationId 唯一）；密文落库，返回脱敏视图 */
export async function saveStationUserKey(userId: string, input: StationKeyInput): Promise<StationKeyView> {
  // N3（丁）：官方平台目录以 catalog:<code> 为临时 id，落库前解析为 api_stations 真实 UUID。
  // 同名官方站已入库（seedOfficialPlatforms）则直接取；未入库则按 baseUrl 兜底 upsert 一站（billingMode=UPSTREAM），
  // 保证用户录入自有 Key 后网关路由链能命中该站直调官方、不扣平台余额。
  const stationId = input.stationId.startsWith("catalog:")
    ? await resolveCatalogStationId(input.stationId.slice("catalog:".length))
    : input.stationId.trim();

  const row = await prisma.stationUserKey.upsert({
    where: { userId_stationId: { userId, stationId } },
    create: {
      userId,
      stationId,
      name: input.name ?? null,
      keyCipher: encryptSecret(input.apiKey),
      keyMasked: maskApiKey(input.apiKey),
    },
    update: {
      name: input.name ?? null,
      keyCipher: encryptSecret(input.apiKey),
      keyMasked: maskApiKey(input.apiKey),
      isActive: true,
    },
  });
  return toView(row);
}

/** catalog code → api_stations 真实 UUID（幂等；未入库时按目录 baseUrl 兜底建站） */
async function resolveCatalogStationId(code: string): Promise<string> {
  const platform = findOfficialPlatform(code);
  if (!platform) throw new ApiError(ERROR_CODES.BAD_REQUEST, `官方平台目录不存在: ${code}`);

  const existing = await prisma.aPIStation.findFirst({
    where: { baseUrl: platform.baseUrl, deletedAt: null },
  });
  if (existing) return existing.id;

  const created = await prisma.aPIStation.create({
    data: {
      name: platform.name,
      nameCn: platform.nameCn,
      displayName: platform.nameCn || platform.name,
      description: platform.description,
      provider: platform.name,
      website: platform.website,
      baseUrl: platform.baseUrl,
      models: platform.models,
      icon: platform.icon,
      protocols: [platform.format === "anthropic" ? "ANTHROPIC" : "OPENAI"],
      isVerified: true,
    } as never,
  });
  await prisma.stationBillingRule.upsert({
    where: { stationId: created.id },
    create: { stationId: created.id, billingMode: "UPSTREAM" },
    update: { billingMode: "UPSTREAM" },
  } as never);
  return created.id;
}

/** 本人站点 Key 列表（脱敏视图，永不回密文/明文） */
export async function listStationUserKeys(userId: string): Promise<StationKeyView[]> {
  const rows = await prisma.stationUserKey.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => toView(r));
}

/** 删除（物理删，密文不留痕）；0 行 → 40000 */
export async function removeStationUserKey(userId: string, stationId: string): Promise<void> {
  const res = await prisma.stationUserKey.deleteMany({ where: { userId, stationId } });
  if (res.count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "站点 Key 不存在或无权操作");
}

/**
 * PATCH 入参校验：name（≤64 或置空）、apiKey（1~512，缺省=不换）、isActive（布尔）；至少一项。
 */
export function parseStationKeyPatchInput(raw: unknown): ParsedInput<StationKeyPatch> {
  if (!raw || typeof raw !== "object") return { ok: false, message: "请求体须为对象" };
  const r = raw as Record<string, unknown>;
  const patch: StationKeyPatch = {};
  if (r.name !== undefined) {
    if (typeof r.name !== "string" || r.name.trim().length > 64) return { ok: false, message: "name 须 ≤64 字符" };
    patch.name = r.name.trim();
  }
  if (r.apiKey !== undefined) {
    if (typeof r.apiKey !== "string" || r.apiKey.trim().length < 1 || r.apiKey.length > 512) {
      return { ok: false, message: "apiKey 须为 1~512 字符（留空则不传）" };
    }
    patch.apiKey = r.apiKey;
  }
  if (r.isActive !== undefined) {
    if (typeof r.isActive !== "boolean") return { ok: false, message: "isActive 须为布尔" };
    patch.isActive = r.isActive;
  }
  if (Object.keys(patch).length === 0) return { ok: false, message: "至少提供一个待更新字段" };
  return { ok: true, value: patch };
}

/**
 * 部分更新（按行 id）：先校验归属（id+userId），再仅更新传入字段；
 * apiKey 缺省时不动密文/掩码（改名/启停免重填 Key）。0 归属→ 40000。
 */
export async function updateStationUserKey(userId: string, id: string, patch: StationKeyPatch): Promise<StationKeyView> {
  const existing = await prisma.stationUserKey.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, "站点 Key 不存在或无权操作");
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.apiKey !== undefined) {
    data.keyCipher = encryptSecret(patch.apiKey);
    data.keyMasked = maskApiKey(patch.apiKey);
  }
  const row = await prisma.stationUserKey.update({ where: { id }, data });
  return toView(row);
}

/** 按行 id 删除（归属校验）；0 行 → 40000 */
export async function removeStationUserKeyById(userId: string, id: string): Promise<void> {
  const res = await prisma.stationUserKey.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "站点 Key 不存在或无权操作");
}

/** 可选 UPSTREAM 计费站点列表（控制台自有 Key 录入下拉，避免手填 UUID） */
export async function listUpstreamStations(): Promise<UpstreamStationOption[]> {
  const rows = await prisma.aPIStation.findMany({
    where: { deletedAt: null, billingRule: { billingMode: "UPSTREAM" } },
    select: { id: true, displayName: true, baseUrl: true, icon: true, models: true },
    orderBy: { displayName: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    baseUrl: r.baseUrl,
    ...(r.icon ? { icon: r.icon } : {}),
    ...(r.models && r.models.length > 0 ? { models: r.models } : {}),
  }));
}
