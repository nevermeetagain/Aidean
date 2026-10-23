/**
 * 启动期环境变量校验（T120-05 / REQ-NF-003）：zod 分「必需 / 可选」，缺失必需变量时一次性报出变量名。
 *
 * 定位（验收③「不改任何既有读取点的默认值语义」）：
 * - 本模块**只做校验与报告**，不接管任何 process.env 读取点，也不回写/注入默认值。
 *   既有读取点的 ?? / || / !== 语义保持原样（逐条锚点见下方 KEYS 注释）。
 * - 唯一调用点是 apps/web/instrumentation.ts 的 register()（进程启动一次）；
 *   业务代码若要取用校验快照可调 getEnv()，但其结果不参与任何现有分支判定。
 *
 * 分级依据＝以代码读取为准（卡面输入原文），共 24 个被 apps/web 读取的变量：
 *   必需（缺失即启动失败）      DATABASE_URL、JWT_SECRET
 *     —— 与既有行为一致：lib/env-check.ts:8 与 lib/features/apikey/crypto.ts:18 本就在使用点抛错，
 *        本卡只把报错时点提前到启动，避免首个请求才暴露配置缺失。
 *   生产强建议（缺失只告警）    REDIS_URL、NEXT_PUBLIC_SITE_URL、JWT_PRIVATE_KEY、BILLING_NOTIFY_SECRET、ADMIN_API_TOKEN
 *     —— 均有降级分支（直查/localhost 回落/Redis 自动生成密钥环/dev mock 密钥/只认管理员会话），
 *        且 docker-compose.prod.yml 未提供后三项，硬失败会打断既有部署链路 → 只 WARN，交由 T120-04 收口。
 *   可选（有默认值或纯开关）    其余全部；开关语义为字面量比较，故只校验取值形态不改判定。
 *
 * 严格模式关闭的两类场景（否则会把可用环境变成不可用，属新增破坏）：
 *   ① 构建期：NEXT_PHASE === "phase-production-build"（next build 亦设 NODE_ENV=production，
 *      而 builder 阶段仅有 Prisma 占位串，无 JWT_SECRET —— Dockerfile L51 明示）；
 *   ② 单测：NODE_ENV === "test"（vitest 用例自行 stubEnv，缺省即为最小集）。
 */
import { z } from "zod";

/** 必需变量：缺失或仅空白即启动失败（严格模式下抛错，非严格模式下打 error 日志）。 */
export const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"] as const;

/** 生产环境强建议：NODE_ENV=production 且缺失 → 逐条 WARN（不抛错，理由见文件头）。 */
export const PRODUCTION_RECOMMENDED_ENV = [
  "REDIS_URL",
  "NEXT_PUBLIC_SITE_URL",
  "JWT_PRIVATE_KEY",
  "BILLING_NOTIFY_SECRET",
  "ADMIN_API_TOKEN",
] as const;

/** 值形态可校验的开关（="1" 生效 / !=="0" 生效），取值非 0/1 时仅 WARN——判定权仍在读取点。 */
const TOGGLE_ENV = [
  "RUN_DB_TESTS",
  "AIDEAN_ENABLE_MOCK_UPSTREAM",
  "AIDEAN_BYPASS_LOGIN_RATE_LIMIT",
  "AIDEAN_GATEWAY_STREAM_PASSTHROUGH",
] as const;

/**
 * 变量清单（键名即 process.env 读取点；每条对应 apps/web/.env.example 的注释行）。
 * 用途与既有默认值语义：
 *  DATABASE_URL               Prisma 连接串（唯一来源，无回落）
 *  JWT_SECRET                 会话令牌签名 + StationUserKey 派生密钥
 *  REDIS_URL                  缓存/限流/密钥环；缺失 getRedis() 恒 null（lib/db/redis.ts:131）
 *  NEXT_PUBLIC_SITE_URL       OIDC issuer 与 metadataBase；?? http://localhost:3000（构建期内联）
 *  JWT_PRIVATE_KEY            RS256 私钥 PEM；缺失走 Redis 密钥环自动生成（auth/keys.ts:75）
 *  BILLING_NOTIFY_SECRET      支付回调 HMAC 密钥；?? aidean-dev-notify-secret（billing/service.ts:183）
 *  ADMIN_API_TOKEN            sidecar 内部令牌；缺失则 run-due 只认管理员会话（route.ts:40）
 *  SMTP_HOST/SMTP_USER/SMTP_PASS 任一缺失 → 验证码仅打日志（auth/mailer.ts:14-17）
 *  SMTP_PORT                  Number(?? 465)；465 即 secure（mailer.ts:20）
 *  SMTP_FROM                  ?? SMTP_USER（mailer.ts:29，空串不被 ?? 吞掉，故模板保持注释态）
 *  WECHAT_APPID               缺失 → 扫码登录返回未配置（app/api/v1/wechat/qrcode/route.ts:14）
 *  HTTP_PROXY/HTTPS_PROXY（含小写） 仅显式设置且可解析时参与出站策略（lib/security/url-policy.ts:220）
 *  TZ                         cron 解析时区 ?? Asia/Shanghai（admin/script-validation.ts:23、script-executor.ts:385）
 *  RUN_DB_TESTS               ="1" 且具备 DATABASE_URL 才纳入 *.int.spec.ts
 *  AIDEAN_ENABLE_MOCK_UPSTREAM ="1" 才开放 mock 上游路由（route.ts:27）
 *  AIDEAN_BYPASS_LOGIN_RATE_LIMIT ="1" 且非生产才旁路登录限流（auth/constants.ts:142）
 *  AIDEAN_GATEWAY_STREAM_PASSTHROUGH !=="0" 即透传（gateway/service.ts:952）
 *  AIDEAN_DIST_DIR            || .next（next.config.mjs:9）
 *  NODE_ENV                   框架注入：development/production/test
 */
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  JWT_PRIVATE_KEY: z.string().min(1).optional(),
  BILLING_NOTIFY_SECRET: z.string().min(1).optional(),
  ADMIN_API_TOKEN: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z
    .string()
    .regex(/^\d{1,5}$/, "SMTP_PORT 须为端口数字")
    .optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().min(1).optional(),
  WECHAT_APPID: z.string().min(1).optional(),
  HTTP_PROXY: z.string().min(1).optional(),
  HTTPS_PROXY: z.string().min(1).optional(),
  http_proxy: z.string().min(1).optional(),
  https_proxy: z.string().min(1).optional(),
  TZ: z.string().min(1).optional(),
  RUN_DB_TESTS: z.enum(["0", "1"]).optional(),
  AIDEAN_ENABLE_MOCK_UPSTREAM: z.enum(["0", "1"]).optional(),
  AIDEAN_BYPASS_LOGIN_RATE_LIMIT: z.enum(["0", "1"]).optional(),
  AIDEAN_GATEWAY_STREAM_PASSTHROUGH: z.enum(["0", "1"]).optional(),
  AIDEAN_DIST_DIR: z.string().min(1).optional(),
  NODE_ENV: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export interface EnvReport {
  /** 是否按 fail-fast 处置必需变量缺失（见文件头「严格模式关闭的两类场景」）。 */
  strict: boolean;
  /** 必需变量中实际缺失（未设置或纯空白）者。 */
  missingRequired: string[];
  /** 已提供但不符合形态约定的键（只告警，不改判定）。 */
  invalidKeys: string[];
  /** 生产环境强建议而当前缺失者（非生产环境恒为空）。 */
  missingRecommended: string[];
  /** 供抛错/日志使用的中文消息（逐条含变量名）。 */
  errors: string[];
  warnings: string[];
  /** 校验后的快照（缺失与空白一律为 undefined；不回写 process.env）。 */
  values: AppEnv;
}

/** 空白串视同未设置（与既有读取点的真值判定保持一致："" 与空白均为「未配置」）。 */
function normalize(source: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(EnvSchema.shape)) {
    const raw = source[key];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    out[key] = trimmed.length > 0 ? raw : undefined;
  }
  return out;
}

/** 严格模式：构建期与单测期不 fail-fast（理由见文件头）。 */
export function shouldStrictValidate(source: Record<string, string | undefined> = process.env): boolean {
  if (source.NEXT_PHASE === "phase-production-build") return false;
  const nodeEnv = (source.NODE_ENV ?? "").trim();
  return nodeEnv !== "test";
}

/** 纯函数式校验：不抛错，供 getEnv() 与单测复用。 */
export function validateEnv(
  source: Record<string, string | undefined> = process.env,
  opts: { production?: boolean; strict?: boolean } = {}
): EnvReport {
  const normalized = normalize(source);
  const production = opts.production ?? normalized.NODE_ENV === "production";
  const strict = opts.strict ?? shouldStrictValidate(normalized);

  const missingRequired = REQUIRED_ENV.filter((k) => normalized[k] === undefined);
  const parsed = EnvSchema.safeParse(normalized);
  /** key → zod 报错原文（必需变量缺失另有中文消息，故此处剔除） */
  const invalidReason = new Map<string, string>();
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key || (REQUIRED_ENV as readonly string[]).includes(key)) continue;
      if (!invalidReason.has(key)) invalidReason.set(key, issue.message);
    }
  }
  const invalidKeys = [...invalidReason.keys()];
  const missingRecommended = production
    ? PRODUCTION_RECOMMENDED_ENV.filter((k) => normalized[k] === undefined)
    : [];

  const errors: string[] = [];
  if (missingRequired.length > 0) {
    errors.push(
      `缺失必需环境变量：${missingRequired.join("、")}（用途见 apps/web/.env.example 对应注释行）`
    );
  }
  const warnings: string[] = [];
  for (const key of invalidKeys) {
    warnings.push(`${key} 已设置但形态不符（${invalidReason.get(key)}）；读取点仍按原语义处理`);
  }
  for (const key of missingRecommended) {
    warnings.push(`生产环境建议配置 ${key}（当前缺失，将走开发降级分支）`);
  }
  for (const key of TOGGLE_ENV) {
    if (production && normalized[key] !== undefined && normalized[key] !== "0") {
      warnings.push(`${key}=${normalized[key]} 在生产环境属危险开关，请确认非误配`);
    }
  }

  const values = (parsed.success ? parsed.data : (normalized as AppEnv)) as AppEnv;
  return { strict, missingRequired, invalidKeys, missingRecommended, errors, warnings, values };
}

let cached: EnvReport | null = null;

/**
 * 启动期一次性校验（instrumentation 调用）。
 * 严格模式下必需变量缺失 → 抛错，消息含全部缺失变量名；非严格模式 → console.error 后继续。
 */
export function getEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const report = validateEnv(source);
  cached = report;
  for (const w of report.warnings) console.warn(`[env] ${w}`);
  if (report.errors.length > 0) {
    const message = `环境变量校验失败（apps/web/lib/config/env.ts）：${report.errors.join("；")}`;
    if (report.strict) throw new Error(message);
    console.error(`[env] ${message}`);
  }
  return report.values;
}

/** 最近一次 getEnv() 的报告（未调用则为 null），供就绪探针/排障读取。 */
export function getLastEnvReport(): EnvReport | null {
  return cached;
}

/** 单测隔离用：清空进程级缓存。 */
export function resetEnvCacheForTest(): void {
  cached = null;
}
