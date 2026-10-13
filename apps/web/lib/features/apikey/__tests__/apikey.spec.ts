/**
 * apikey 域单测（GW-KEY-01 P6 矩阵）：签发/verify/吊销/过期/权限/限流/脱敏/加密往返。
 *
 * 策略：prisma.apiKey 内存行 mock（create/findUnique/findMany/updateMany/update）；
 * rate-limit mock（窗口状态可控，覆盖 429 与放行不误伤）；JWT_SECRET vi.stubEnv 供
 * HMAC pepper 与 AES-256-GCM 派生。全部 in-process，无网络、无真库。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("JWT_SECRET", "unit-test-secret-aidean");

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  window: { allowed: true, count: 0 },
}));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    apiKey: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = {
          id: `key-${state.rows.length + 1}`,
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date("2026-09-15T00:00:00Z"),
          ...args.data,
        };
        state.rows.push(row);
        return row;
      }),
      findUnique: vi.fn(async (args: { where: { keyId: string } }) =>
        state.rows.find((r) => r.keyId === args.where.keyId) ?? null
      ),
      findMany: vi.fn(async () => state.rows),
      updateMany: vi.fn(async (args: { where: { id: string; userId: string } }) => {
        const row = state.rows.find((r) => r.id === args.where.id && r.userId === args.where.userId);
        if (!row) return { count: 0 };
        (row as { isActive: boolean }).isActive = false;
        return { count: 1 };
      }),
      update: vi.fn(async () => ({})),
      deleteMany: vi.fn(async (args: { where: { id: string; userId: string } }) => {
        const before = state.rows.length;
        state.rows = state.rows.filter(
          (r) => !(r.id === args.where.id && r.userId === args.where.userId)
        );
        return { count: before - state.rows.length };
      }),
    },
  },
}));

vi.mock("../../../rate-limit", () => ({
  checkFixedWindow: vi.fn(async () => state.window),
}));

import { ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { decryptSecret, encryptSecret } from "../crypto";
import {
  API_KEY_DEFAULT_RPM,
  authenticateApiKey,
  createApiKey,
  deleteApiKey,
  listApiKeys,
  parseCreateKeyInput,
  parsePlaintextKey,
  revokeApiKey,
  verifyApiKey,
} from "../service";

beforeEach(() => {
  state.rows.length = 0;
  state.window = { allowed: true, count: 0 };
});

describe("平台 API Key（GW-KEY-01 P1）", () => {
  it("① 签发 → aid_ak_ 前缀明文 → verify 返回归属与权限（Bearer 语义的地基）", async () => {
    const { plaintext, view } = await createApiKey("u-1", { name: "ci", permissions: ["gateway:chat"] });
    expect(plaintext).toMatch(/^aid_ak_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/);
    expect(view).not.toHaveProperty("keyHash");
    const v = await verifyApiKey(plaintext);
    expect(v).toMatchObject({ userId: "u-1", keyId: view.keyId, permissions: ["gateway:chat"] });
  });

  it("② 库内只存哈希：keyHash 64-hex，与明文互不包含", async () => {
    const { plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    const hash = String(state.rows[0].keyHash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(plaintext.includes(hash)).toBe(false);
    expect(hash.includes(plaintext)).toBe(false);
  });

  it("③ 伪造 secret（同 keyId 换密文）→ 10004/401", async () => {
    const { plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    const forged = `${plaintext.slice(0, plaintext.lastIndexOf("_") + 1)}forgedSecretValue`;
    await expect(verifyApiKey(forged)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHENTICATED });
  });

  it("④ 吊销后 verify → 10004/401 即时生效", async () => {
    const { view, plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    await revokeApiKey("u-1", view.id);
    await expect(verifyApiKey(plaintext)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHENTICATED });
  });

  it("⑤ 过期 Key → 10004/401", async () => {
    const { plaintext } = await createApiKey("u-1", {
      name: "t",
      permissions: ["gateway:chat"],
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    await expect(verifyApiKey(plaintext)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHENTICATED });
  });

  it("⑥ 无 gateway:chat 权限 → authenticateApiKey 10008/403", async () => {
    const { plaintext } = await createApiKey("u-1", { name: "t", permissions: ["other:perm"] });
    await expect(authenticateApiKey(plaintext)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN });
  });

  it("⑦ Key 超限 → 10006/429；窗口内先放行不误伤", async () => {
    const { plaintext, view } = await createApiKey("u-1", {
      name: "t",
      permissions: ["gateway:chat"],
      rateLimit: { requestsPerMinute: 2 },
    });
    await expect(authenticateApiKey(plaintext)).resolves.toMatchObject({ keyId: view.keyId });
    state.window = { allowed: false, count: 3 };
    await expect(authenticateApiKey(plaintext)).rejects.toMatchObject({ code: ERROR_CODES.TOO_MANY_REQUESTS });
  });

  it("⑧ rateLimit 缺省 → 归一默认 60 req/min（API_KEY_DEFAULT_RPM）", async () => {
    const { plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    const v = await verifyApiKey(plaintext);
    expect(v.rateLimit).toEqual({ requestsPerMinute: API_KEY_DEFAULT_RPM });
  });

  it("⑨ 列表脱敏：JSON 序列化不含 keyHash 与明文", async () => {
    const { plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    const s = JSON.stringify(await listApiKeys("u-1"));
    expect(s).not.toContain("keyHash");
    expect(s).not.toContain(plaintext);
  });

  it("⑩ revoke 0 行（不存在/非本人）→ 40000", async () => {
    await expect(revokeApiKey("u-1", "no-such")).rejects.toMatchObject({ code: ERROR_CODES.BAD_REQUEST });
  });

  it("⑩b deleteApiKey 物理删除 → 行移除；删除后 verify → 10004；非本人/不存在 → 40000", async () => {
    const { view, plaintext } = await createApiKey("u-1", { name: "t", permissions: ["gateway:chat"] });
    await deleteApiKey("u-1", view.id);
    expect(state.rows.find((r) => r.id === view.id)).toBeUndefined();
    await expect(verifyApiKey(plaintext)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHENTICATED });
    await expect(deleteApiKey("u-1", "no-such")).rejects.toMatchObject({ code: ERROR_CODES.BAD_REQUEST });
  });

  it("⑪ parsePlaintextKey：非法格式/前缀 → null（→401）", () => {
    expect(parsePlaintextKey("sk-xxx")).toBeNull();
    expect(parsePlaintextKey("aid_ak_")).toBeNull();
    expect(parsePlaintextKey("")).toBeNull();
    expect(parsePlaintextKey("aid_ak_only3")).toBeNull();
  });

  it("⑫ parseCreateKeyInput：空 name/空 permissions/越界 rpm/坏 expiresAt 拒绝；合法通过且 name 去空白", () => {
    expect(parseCreateKeyInput({ name: "", permissions: ["gateway:chat"] }).ok).toBe(false);
    expect(parseCreateKeyInput({ name: "t", permissions: [] }).ok).toBe(false);
    expect(parseCreateKeyInput({ name: "t", permissions: ["gateway:chat"], rateLimit: { requestsPerMinute: 0 } }).ok).toBe(false);
    expect(parseCreateKeyInput({ name: "t", permissions: ["gateway:chat"], expiresAt: "not-a-date" }).ok).toBe(false);
    expect(parseCreateKeyInput({ name: " t ", permissions: ["gateway:chat"] })).toMatchObject({
      ok: true,
      value: { name: "t" },
    });
  });

  it("⑬ AES-256-GCM 往返一致；密文篡改解密失败且不回退明文", () => {
    const ct = encryptSecret("sk-user-upstream-key");
    expect(ct.startsWith("v1:")).toBe(true);
    expect(decryptSecret(ct)).toBe("sk-user-upstream-key");
    expect(() => decryptSecret(`${ct.slice(0, -4)}AAAA`)).toThrow();
  });
});
