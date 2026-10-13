/**
 * JWKS 密钥轮换运维脚本（M-SSO-FOLLOWUP C2）。
 *
 * 用法：apps/web 下 `node_modules/.bin/tsx.cmd scripts/rotate-keys.ts`
 * 效果：current→previous（旧 kid 令牌过渡期仍可验），生成并启用新 current；
 *       JWKS 端点随即同时输出两代公钥。
 * 前提：REDIS_URL 已配置（轮换状态经 Redis 持久化）；生产可用 JWT_PRIVATE_KEY env 口径替代（重新部署换钥）。
 */
import { rotateKeyPair } from "../lib/features/auth/keys";
import { prisma } from "../lib/db/prisma";

async function main() {
  const { newKid, previousKid } = await rotateKeyPair();
  console.log(`✅ JWKS rotated: new kid=${newKid}, previous kid=${previousKid ?? "（无）"}`);
  console.log("   过渡期内旧 kid 令牌仍可验签；再次轮换将淘汰上一代。");
}

main()
  .catch((e) => {
    console.error("❌ rotate failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
