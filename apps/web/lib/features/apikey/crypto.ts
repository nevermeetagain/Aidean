/**
 * StationUserKey 对称加密（GW-KEY-01 P3-S3.3）。
 *
 * AES-256-GCM，密钥 = SHA256(JWT_SECRET)（32 字节派生，进程 env，不入库）；
 * 密文格式 `v1:<iv>:<tag>:<ct>`（base64url）——版本前缀为后续算法演进留位。
 * 解密只发生在网关调上游前（gateway/service.ts UPSTREAM 分支），
 * 列表/日志/UI 永不触达明文（列表走 keyMasked 脱敏列）。
 *
 * 注：CustomChannel.apiKey 明文债已由 T3（CLOSER-07）清还并由 0003 迁移 DROP 旧列：
 * 写侧 saveChannel → encryptSecret 落 keyCipher + maskApiKey 落 keyMasked（非空）；
 * executeChat FREE_PROXY 分支 decryptSecret(keyCipher) 直调，无 fallback。
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";

function keyOf(): Buffer {
  const s = process.env.JWT_SECRET;
  if (!s) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "JWT_SECRET 未配置（StationUserKey 加密不可用）");
  return createHash("sha256").update(s).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ct.toString("base64url")}`;
}

export function decryptSecret(cipherText: string): string {
  const [v, iv, tag, ct] = cipherText.split(":");
  if (v !== "v1" || !iv || !tag || !ct) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "StationUserKey 密文格式非法");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyOf(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    // 解密失败（密钥轮换/密文损坏）按内部错误上抛，不回退明文路径
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "StationUserKey 解密失败");
  }
}
