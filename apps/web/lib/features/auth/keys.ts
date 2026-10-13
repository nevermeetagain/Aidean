/**
 * auth 认证域 keys（M-SSO P0.1 / FOLLOWUP C1 双代轮换）：RS256 密钥管理。
 *
 * 设计：
 * - 私钥仅主站持有（SSO 后产品只持公钥验签，堵死 HS256 共享密钥的伪造就地爆炸点）；
 * - 存储（Redis `auth:rs256:keyring`，AOF 持久）：{ current, previous? }——
 *   **轮换语义**：rotate 时 current→previous、新生成 current；JWKS 同时列出两代公钥，
 *   过渡期内旧 kid 令牌仍可验签（用户无感），下一次轮换自然淘汰 previous；
 * - 来源优先级：env `JWT_PRIVATE_KEY`（生产口径）→ Redis keyring（dev 默认）→ 内存兜底；
 * - kid = SHA-256(publicJwk.n ‖ publicJwk.e) 前 16 hex；
 * - RS256（而非 EdDSA）：RagFlow 等 Python 接入方 PyJWT 零额外依赖。
 */
import { createHash } from "node:crypto";
import { decodeProtectedHeader, exportJWK, exportPKCS8, generateKeyPair, importJWK, importPKCS8, type CryptoKey } from "jose";

import { getRedis } from "../../db/redis";

const ALG = "RS256" as const;
const KEYRING_REDIS_KEY = "auth:rs256:keyring";
/** 旧版单钥键（迁移读取后写回 keyring） */
const LEGACY_KEYPAIR_REDIS_KEY = "auth:rs256:keypair";

interface KeyMaterial {
  kid: string;
  privatePkcs8: string;
}

interface KeyRing {
  current: KeyMaterial;
  previous?: KeyMaterial;
}

interface KeyPairBundle {
  kid: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

type KeyRingBundles = { current: KeyPairBundle; previous?: KeyPairBundle };

let cachedRing: KeyRingBundles | null = null;
let inflight: Promise<KeyRingBundles> | null = null;

async function derivePublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
  const jwk = await exportJWK(privateKey);
  const publicJwk = { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: ALG, use: "sig" };
  return (await importJWK(publicJwk, ALG)) as CryptoKey;
}

async function kidFromPublicJwk(jwk: { n?: string; e?: string }): Promise<string> {
  return createHash("sha256")
    .update(`${String(jwk.n)}|${String(jwk.e)}`)
    .digest("hex")
    .slice(0, 16);
}

async function buildBundle(material: KeyMaterial): Promise<KeyPairBundle> {
  // extractable 必须：derivePublicKey 需从私钥 JWK 裁剪公参
  const privateKey = await importPKCS8(material.privatePkcs8, ALG, { extractable: true });
  const publicKey = await derivePublicKey(privateKey);
  return { kid: material.kid, privateKey, publicKey };
}

async function generateMaterial(): Promise<KeyMaterial> {
  const { publicKey, privateKey } = await generateKeyPair(ALG, {
    modulusLength: 2048,
    extractable: true,
  });
  const privatePkcs8 = await exportPKCS8(privateKey);
  const kid = await kidFromPublicJwk(await exportJWK(publicKey));
  return { kid, privatePkcs8 };
}

async function loadRing(): Promise<KeyRingBundles> {
  const envPem = process.env.JWT_PRIVATE_KEY;
  if (envPem) {
    // 生产口径：单钥 env（轮换走重新部署换 env）
    const normalized = envPem.includes("\\n") ? envPem.replace(/\\n/g, "\n") : envPem;
    const bundle = await buildBundle({ kid: "env", privatePkcs8: normalized });
    // env 路径 kid 由公参重算（"env" 占位不可用于验签选钥）
    return { current: { ...bundle, kid: await kidFromPublicJwk(await exportJWK(bundle.publicKey)) } };
  }
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(KEYRING_REDIS_KEY);
      if (raw) {
        const ring = JSON.parse(raw) as KeyRing;
        const current = await buildBundle(ring.current);
        const previous = ring.previous ? await buildBundle(ring.previous) : undefined;
        return { current, previous };
      }
      // 旧版单钥迁移
      const legacy = await redis.get(LEGACY_KEYPAIR_REDIS_KEY);
      if (legacy) {
        const { kid, privatePkcs8 } = JSON.parse(legacy) as KeyMaterial;
        return { current: await buildBundle({ kid, privatePkcs8 }) };
      }
    } catch {
      /* 读失败走生成路径 */
    }
  }
  // 生成首代并持久化
  const current = await buildBundle(await generateMaterial());
  if (redis) {
    try {
      await persistRing(redis, { current: { kid: current.kid, privatePkcs8: await exportPKCS8(current.privateKey) } });
    } catch {
      /* 持久化失败降级为进程内密钥（重启换钥） */
    }
  }
  return { current };
}

async function persistRing(redis: NonNullable<ReturnType<typeof getRedis>>, ring: KeyRing): Promise<void> {
  // 长期持久化（365d；AOF 已开，重启稳定）
  await redis.set(KEYRING_REDIS_KEY, JSON.stringify(ring), "EX", 365 * 24 * 60 * 60);
}

/** 获取（并缓存）当前密钥环：进程级单例，并发首调共享同一 inflight */
export async function getKeyRing(): Promise<KeyRingBundles> {
  if (cachedRing) return cachedRing;
  if (!inflight) {
    inflight = loadRing()
      .then((ring) => {
        cachedRing = ring;
        return ring;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** 签名用私钥（恒为 current） */
export async function getSigningKey(): Promise<CryptoKey> {
  return (await getKeyRing()).current.privateKey;
}

/** 主站本地验签用公钥（自身令牌恒为 current 代；SSO 侧产品经 JWKS 获取） */
export async function getVerificationKey(): Promise<CryptoKey> {
  return (await getKeyRing()).current.publicKey;
}

/** 当前 kid */
export async function getCurrentKid(): Promise<string> {
  return (await getKeyRing()).current.kid;
}

/** 按 token header 的 kid 选验签公钥：current/previous 命中返回，否则 null（未知 kid = 伪造或跨环境令牌） */
export async function getVerificationKeyByKid(kid: string | undefined): Promise<CryptoKey | null> {
  const ring = await getKeyRing();
  if (kid && kid === ring.current.kid) return ring.current.publicKey;
  if (kid && ring.previous && kid === ring.previous.kid) return ring.previous.publicKey;
  // 无 kid 的历史令牌容忍为 current（仅影响轮换效率，不影响安全）
  return kid ? null : ring.current.publicKey;
}

/** JWKS 公钥集：current + previous（轮换过渡期双公钥并存） */
export async function getPublicJwks(): Promise<{ keys: Array<Record<string, unknown>> }> {
  const ring = await getKeyRing();
  const keys: Array<Record<string, unknown>> = [];
  for (const bundle of [ring.current, ring.previous]) {
    if (!bundle) continue;
    const jwk = await exportJWK(bundle.publicKey);
    keys.push({ kty: jwk.kty, n: jwk.n, e: jwk.e, kid: bundle.kid, alg: ALG, use: "sig" });
  }
  return { keys };
}

/**
 * 轮换（运维入口，scripts/rotate-keys.ts）：current→previous、生成新 current。
 * 过渡期语义：旧 kid 令牌在 previous 被下一次轮换覆盖前仍可验签。
 */
export async function rotateKeyPair(): Promise<{ newKid: string; previousKid: string | null }> {
  const ring = await getKeyRing();
  const previous = { kid: ring.current.kid, privatePkcs8: await exportPKCS8(ring.current.privateKey) };
  const newCurrent = await buildBundle(await generateMaterial());
  const ringData: KeyRing = {
    current: { kid: newCurrent.kid, privatePkcs8: await exportPKCS8(newCurrent.privateKey) },
    previous,
  };
  const redis = getRedis();
  if (redis) {
    await persistRing(redis, ringData);
  }
  cachedRing = { current: newCurrent, previous: ring.previous };
  return { newKid: newCurrent.kid, previousKid: previous.kid };
}

/** 供 tokens.ts 验签按 kid 选钥前解析 header */
export { decodeProtectedHeader };
