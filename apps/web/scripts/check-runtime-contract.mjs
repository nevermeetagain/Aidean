#!/usr/bin/env node
/**
 * SSO-02 发布运行契约校验器（供 REL-02 在构建链与部署链调用）
 *
 * 背景：主平台对外地址由 **构建期** 变量 NEXT_PUBLIC_SITE_URL 决定（Next 会把 NEXT_PUBLIC_*
 * 内联进客户端 bundle 与 Edge middleware bundle），而数据库/缓存/签名密钥属 **运行期** 变量。
 * 二者混用会导致两类事故：
 *   ① 构建期漏注入 → AUTH_ISSUER 回落 http://localhost:3000 → 生产重定向指向 localhost（不可达）；
 *   ② 运行期漏注入 → standalone 不携带 .env（Next standalone 不拷贝 .env）→ 登录/DB 路径 500。
 *
 * 用法：
 *   node apps/web/scripts/check-runtime-contract.mjs --mode build   [--env-path apps/web/.env.local]
 *   node apps/web/scripts/check-runtime-contract.mjs --mode runtime [--env-path apps/web/.env.local]
 *   node apps/web/scripts/check-runtime-contract.mjs --mode all --strict
 *
 * 注意：自解析 flag 命名为 --env-path（而非 --env-file），因 Node 22+ 原生支持
 * --env-file（加载 env 文件到 process.env），同名会导致脚本参数被 Node 拦截。
 * 实测 Node 24 下 `node script.js --env-file <absent>` 直接报 `not found exit=9`，
 * 脚本根本收不到该参数——下方 exit 2 分支仅为防御性兜底（实际不可达），
 * 文档/调用方一律以 --env-path 为准，不得依赖 exit2 语义。
 *
 * 退出码：0=通过；1=存在 ERROR（缺必需变量或生产口径违规）；2=参数错误。
 * --strict 时 WARN 亦计为失败（用于生产发布门禁）。
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const argv = process.argv.slice(2);
const pick = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const MODE = pick("--mode", "all");
const envFileArg = pick("--env-path", "apps/web/.env.local");
const ENV_FILE = /^(?:[A-Za-z]:[\\/]|[\\/])/.test(envFileArg)
  ? envFileArg
  : resolve(ROOT, envFileArg);
const STRICT = argv.includes("--strict");

if (argv.includes("--env-file")) {
  // 防御性兜底：Node 原生 --env-file 在参数解析期即拦截（实测 exit 9），本分支实际不可达；
  // 保留仅为防 Node 行为变化时静默误用。权威参数为 --env-path。
  console.error("[FATAL] --env-file 已被 Node 原生参数占用（会被 Node 拦截而非本脚本），请改用 --env-path");
  process.exit(2);
}
if (!["build", "runtime", "all"].includes(MODE)) {
  console.error(`[FATAL] --mode 只能是 build|runtime|all，得到 ${MODE}`);
  process.exit(2);
}

/** 解析 .env（非注释 KEY=VALUE；进程环境优先） */
function parseEnvFile(p) {
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const fileEnv = parseEnvFile(ENV_FILE);
const env = { ...fileEnv, ...process.env };

const rows = [];
const add = (kind, key, status, detail) => {
  rows.push({ kind, key, status, detail });
  const c = { OK: "\x1b[32m", WARN: "\x1b[33m", ERROR: "\x1b[31m", INFO: "\x1b[36m" }[status] ?? "";
  console.log(`${c}${status.padEnd(5)}\x1b[0m | ${kind.padEnd(7)} | ${key.padEnd(26)} | ${detail}`);
};

const isLocalhost = (v) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(v ?? "");
const isHttp = (v) => /^https?:\/\//i.test(v ?? "");

console.log(`\n===== SSO-02 发布运行契约校验（mode=${MODE}${STRICT ? " strict" : ""}） =====`);
console.log(`env 源: ${ENV_FILE} ${existsSync(ENV_FILE) ? "(存在)" : "(缺失，仅用进程环境)"}\n`);

// ---------------- 构建期契约 ----------------
if (MODE === "build" || MODE === "all") {
  const v = env.NEXT_PUBLIC_SITE_URL;
  if (!v) {
    add("BUILD", "NEXT_PUBLIC_SITE_URL", "ERROR",
      "缺失 → AUTH_ISSUER 将回落 http://localhost:3000，生产重定向不可达");
  } else if (!isHttp(v)) {
    add("BUILD", "NEXT_PUBLIC_SITE_URL", "ERROR", `非法（须 http(s):// 绝对地址）：${v}`);
  } else if (isLocalhost(v)) {
    add("BUILD", "NEXT_PUBLIC_SITE_URL", env.NODE_ENV === "production" ? "ERROR" : "WARN",
      `当前为本地地址 ${v}（dev 可用；生产构建必须替换为公开域名，否则登录重定向指向 localhost）`);
  } else {
    add("BUILD", "NEXT_PUBLIC_SITE_URL", "OK", `${v}（将内联进客户端与 Edge bundle 作为 AUTH_ISSUER）`);
  }
  add("BUILD", "AUTH_ISSUER_CONTAINER", "INFO",
    "编译期字面量 http://host.docker.internal:3000（容器网段/域名变更须改代码并重新构建）");
}

// ---------------- 运行期契约 ----------------
if (MODE === "runtime" || MODE === "all") {
  const required = [
    ["DATABASE_URL", "登录/会话/配置读库（缺失 → 登录路径 500）"],
    ["REDIS_URL", "授权码一次性消费/限流（缺失 → code 兑换失败）"],
    ["JWT_SECRET", "令牌签名密钥（缺失/占位值 → 安全风险）"],
  ];
  for (const [k, why] of required) {
    const v = env[k];
    if (!v) add("RUNTIME", k, "ERROR", `缺失 → ${why}`);
    else if (/change-me|placeholder|password@|your-/i.test(v) && k === "JWT_SECRET") {
      add("RUNTIME", k, env.NODE_ENV === "production" ? "ERROR" : "WARN", "仍为占位值，生产必须替换");
    } else {
      add("RUNTIME", k, "OK", "已注入");
    }
  }
  add("RUNTIME", ".env 分发", "INFO",
    "Next standalone **不拷贝 .env**：运行期变量必须由容器/进程环境显式注入，不可依赖仓库内 .env");
}

// ---------------- 推导与提示 ----------------
const issuer = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
console.log("\n----- 推导 -----");
console.log(`AUTH_ISSUER（对外宣告 + Location 生成基址） = ${issuer}`);
console.log(`JWKS 自取基址（middleware，Edge 内联）      = ${issuer}/.well-known/jwks.json`);
console.log(`AUTH_ISSUERS_ACCEPTED（验签接受）           = [${issuer}, http://host.docker.internal:3000]`);
console.log("提示：middleware 在容器内自取 JWKS，要求容器内可解析上述域名（否则受保护页 fail-closed 307）。");

// ---------------- 汇总 ----------------
const errs = rows.filter((r) => r.status === "ERROR").length;
const warns = rows.filter((r) => r.status === "WARN").length;
console.log(`\n===== 汇总 =====`);
console.log(`ERROR=${errs} WARN=${warns}（strict 时 WARN 也失败）`);
const failed = errs > 0 || (STRICT && warns > 0);
console.log(`退出码 ${failed ? 1 : 0}\n`);
process.exit(failed ? 1 : 0);
