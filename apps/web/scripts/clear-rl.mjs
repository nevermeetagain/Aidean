#!/usr/bin/env node
/**
 * C-01-1 放行纪律固化：清 `rl:login:*` 一键脚本（只读 DB，仅清 Redis 限流键）。
 *
 * 为什么需要：`apps/web/lib/rate-limit.ts` 为固定窗口（LOGIN_IP_RATE_LIMIT=20 / 600s），
 * 根配置本地 workers=14 并发跑 e2e >20 次登录 → 429 雪崩（非回归）。
 * 纪律：**每次 e2e 运行前必须先清 `rl:login:*`**。本脚本把该纪律变成一行命令，
 * 不再依赖人记/口头传达。
 *
 * 用法：node apps/web/scripts/clear-rl.mjs
 * 退出码：0 = 已清（或本就为空）；3 = Redis 不可达（fail-open，不阻断，但会告警）
 */
import IORedis from "ioredis";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function redisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  // 回落：从 apps/web/.env[.local] 读 REDIS_URL
  for (const f of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(resolve(__dirname, "..", f), "utf8");
      const m = txt.match(/^\s*REDIS_URL\s*=\s*"?([^"\n]+)"?/m);
      if (m) return m[1].trim();
    } catch { /* ignore */ }
  }
  return "redis://localhost:6379";
}

const r = new IORedis(redisUrl(), { maxRetriesPerRequest: 1, lazyConnect: true });
try {
  await r.connect();
  const pong = await r.ping();
  console.log(`PING -> ${pong}`);
  const [next, keys] = await r.scan("0", "MATCH", "rl:login:*", "COUNT", "1000");
  const found = keys || [];
  if (found.length) {
    const n = await r.unlink(...found);
    console.log(`SCAN rl:login:* -> ${found.length} keys | UNLINK -> ${n} removed`);
  } else {
    console.log("SCAN rl:login:* -> 0 keys | UNLINK -> 0 (本就为空，等效成功)");
  }
  const [, after] = await r.scan("0", "MATCH", "rl:login:*", "COUNT", "1000");
  console.log(`AFTER -> ${(after || []).length} keys`);
  await r.quit();
  process.exit(0);
} catch (e) {
  console.error(`REDIS-ERR(fail-open，不阻断): ${e.message}`);
  try { await r.quit(); } catch { /* ignore */ }
  process.exit(3);
}
