/**
 * TASK-101 · 每日汇率采集（公开免费源 → 日汇率快照表 fx_daily_rates）。
 *
 * 口径（26 号裁决 U-15 / ADR-P005 v0.3 / TASK-047 契约）：
 * - 每天（Asia/Shanghai 自然日，`fxDateOf`）每币对一行；047 契约币对仅 USD→CNY（1 USD = rate CNY）。
 * - 幂等：唯一键 (rate_date, base, quote)，`INSERT … ON CONFLICT DO NOTHING`（createMany skipDuplicates）——
 *   同一天重跑**不产生第二条，也不改写当日已有值**（「每天只用一个汇率」，当日计费与展示读同一行）。
 * - 源失败（网络错误 / 非 2xx / 非法 JSON / 币对不符 / 数值非法或越出合理区间）：不写库，前一日快照原样保留
 *   （读侧 getDailyFx 在 fxMaxStaleDays 内回退），进程以非零码退出供调度器告警。
 * - 写前用契约 `FxDailyRateSchema` 校验整行。
 *
 * 数据源：Frankfurter（https://frankfurter.dev，开源、无需 API Key、无配额，混合汇率可免费商用，允许本地落库缓存），
 *   端点 `https://api.frankfurter.dev/v2/rate/usd/cny` → `{"date":"YYYY-MM-DD","base":"USD","quote":"CNY","rate":6.6761}`。
 *   可用 FX_DAILY_SOURCE_URL 覆盖（如自建实例）。
 *
 * 退出码：0 = 已写入或当日已存在（幂等）；1 = 源失败/数值非法（未写库）；2 = 参数错误或数据库错误。
 *
 * 用法：
 *   pnpm --filter web exec tsx ../../scripts/crawl/fx_daily.ts            # 拉取并写入当日快照
 *   pnpm --filter web exec tsx ../../scripts/crawl/fx_daily.ts --dry-run  # 只拉取校验，不写库
 */
import {
  FxDailyRateSchema,
  fxDateOf,
  type FxDailyRate,
} from "../../packages/shared/src/utils/price-normalization";

export const FX_SOURCE = "frankfurter";
export const FX_SOURCE_URL_DEFAULT = "https://api.frankfurter.dev/v2/rate/usd/cny";
export const FX_PAIR = { base: "USD", quote: "CNY" } as const;
/** USD→CNY 合理区间（防源返回错位/单位错误的值，如 0.14 或 714）：越界即拒绝，不写库 */
export const FX_SANE_RANGE = { min: 1, max: 20 } as const;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 64 * 1024;

export class FxSourceError extends Error {
  constructor(
    public readonly kind: "http" | "network" | "parse" | "pair" | "value",
    message: string,
  ) {
    super(message);
    this.name = "FxSourceError";
  }
}

/** 写库端口：生产为 Prisma，单测为内存实现 */
export interface FxStore {
  /** 插入当日快照；唯一键冲突时不写（返回 false） */
  insertIfAbsent(row: FxDailyRate): Promise<boolean>;
  /** 读某日已存快照（用于幂等时回报当日值） */
  findByDate(rateDate: string): Promise<{ rate: string } | null>;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

/** 数值 → 十进制串（≤8 位小数，去尾零；契约 Decimal(18,8)） */
export function toDecimalString(n: number): string {
  const s = n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

/** 解析并校验源响应，返回 1 USD = ? CNY 的十进制串；任何不合规抛 FxSourceError */
export function parseFrankfurterRate(body: string): { rate: string; sourceDate: string | null } {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new FxSourceError("parse", "源响应不是合法 JSON");
  }
  const o = (json ?? {}) as Record<string, unknown>;
  const base = String(o.base ?? "").toUpperCase();
  const quote = String(o.quote ?? "").toUpperCase();
  if (base !== FX_PAIR.base || quote !== FX_PAIR.quote) {
    throw new FxSourceError("pair", `源币对不符：${base || "∅"}/${quote || "∅"}，期望 USD/CNY`);
  }
  const raw = o.rate;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new FxSourceError("value", `汇率非法：${String(raw)}`);
  if (n < FX_SANE_RANGE.min || n > FX_SANE_RANGE.max) {
    throw new FxSourceError("value", `汇率 ${n} 越出合理区间 [${FX_SANE_RANGE.min}, ${FX_SANE_RANGE.max}]`);
  }
  const sourceDate = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  return { rate: toDecimalString(n), sourceDate };
}

export interface RunOptions {
  fetchImpl: FetchLike;
  store: FxStore | null; // null = dry-run
  now?: () => Date;
  sourceUrl?: string;
  log?: (line: string) => void;
}

export type RunResult =
  | { status: "inserted"; row: FxDailyRate; sourceDate: string | null }
  | { status: "exists"; rateDate: string; rate: string | null }
  | { status: "dry-run"; row: FxDailyRate; sourceDate: string | null };

/** 核心流程：取日 → 拉源 → 校验 → 幂等写。源失败抛 FxSourceError（调用方非零退出，库不变）。 */
export async function runFxDaily(opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? (() => new Date());
  const log = opts.log ?? (() => {});
  const sourceUrl = opts.sourceUrl ?? FX_SOURCE_URL_DEFAULT;
  const fetchedAt = now();
  const rateDate = fxDateOf(fetchedAt);

  if (opts.store) {
    const existing = await opts.store.findByDate(rateDate);
    if (existing) {
      log(`[fx_daily] ${rateDate} USD/CNY 已有快照 ${existing.rate}，不重复拉取（幂等）`);
      return { status: "exists", rateDate, rate: existing.rate };
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let body: string;
  try {
    const res = await opts.fetchImpl(sourceUrl, { signal: ctrl.signal, headers: { accept: "application/json", "user-agent": "AideanFx/1.0" } });
    if (!res.ok) throw new FxSourceError("http", `源返回 HTTP ${res.status}`);
    body = await res.text();
  } catch (e) {
    if (e instanceof FxSourceError) throw e;
    throw new FxSourceError("network", `源不可达：${(e as Error)?.message ?? String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  if (body.length > MAX_BODY_BYTES) throw new FxSourceError("parse", `源响应过大（${body.length} 字节）`);

  const { rate, sourceDate } = parseFrankfurterRate(body);
  const row = FxDailyRateSchema.parse({
    rateDate,
    base: FX_PAIR.base,
    quote: FX_PAIR.quote,
    rate,
    source: FX_SOURCE,
    sourceUrl,
    fetchedAt: fetchedAt.toISOString(),
  });

  if (!opts.store) {
    log(`[fx_daily] DRY-RUN ${rateDate} USD/CNY=${rate}（源日期 ${sourceDate ?? "∅"}），未写库`);
    return { status: "dry-run", row, sourceDate };
  }
  const inserted = await opts.store.insertIfAbsent(row);
  if (!inserted) {
    const existing = await opts.store.findByDate(rateDate);
    log(`[fx_daily] ${rateDate} 并发写入已存在 ${existing?.rate ?? "?"}，本次不覆盖`);
    return { status: "exists", rateDate, rate: existing?.rate ?? null };
  }
  log(`[fx_daily] 写入 ${rateDate} USD/CNY=${rate}（源 ${FX_SOURCE} 日期 ${sourceDate ?? "∅"}）`);
  return { status: "inserted", row, sourceDate };
}

// ------------------------------------------------------------------ CLI
async function createPrismaStore(): Promise<{ store: FxStore; close: () => Promise<void> }> {
  const { prisma } = await import("../../apps/web/lib/db/prisma");
  const day = (d: string) => new Date(`${d}T00:00:00Z`);
  return {
    store: {
      async insertIfAbsent(row) {
        const r = await prisma.fxDailyRate.createMany({
          data: [
            {
              rateDate: day(row.rateDate),
              base: row.base,
              quote: row.quote,
              rate: row.rate,
              source: row.source,
              sourceUrl: row.sourceUrl,
              fetchedAt: new Date(row.fetchedAt),
            },
          ],
          skipDuplicates: true,
        });
        return r.count === 1;
      },
      async findByDate(rateDate) {
        const r = await prisma.fxDailyRate.findUnique({
          where: { rateDate_base_quote: { rateDate: day(rateDate), base: FX_PAIR.base, quote: FX_PAIR.quote } },
          select: { rate: true },
        });
        return r ? { rate: r.rate.toString() } : null;
      },
    },
    close: () => prisma.$disconnect(),
  };
}

async function main(argv: string[]): Promise<number> {
  const unknown = argv.filter((a) => a !== "--dry-run" && a !== "--help" && a !== "-h");
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("用法: tsx scripts/crawl/fx_daily.ts [--dry-run]\n  每日 USD/CNY 汇率快照（Frankfurter，无 Key）→ fx_daily_rates；同日重跑幂等。");
    return 0;
  }
  if (unknown.length) {
    console.error(`[fx_daily] 未知参数：${unknown.join(" ")}`);
    return 2;
  }
  const dryRun = argv.includes("--dry-run");
  const sourceUrl = process.env.FX_DAILY_SOURCE_URL || FX_SOURCE_URL_DEFAULT;
  const { safeFetch } = await import("../../apps/web/lib/security/url-policy");
  const fetchImpl: FetchLike = (url, init) => safeFetch(url, init as RequestInit) as unknown as ReturnType<FetchLike>;

  let close: () => Promise<void> = async () => {};
  try {
    let store: FxStore | null = null;
    if (!dryRun) {
      const p = await createPrismaStore();
      store = p.store;
      close = p.close;
    }
    const r = await runFxDaily({ fetchImpl, store, sourceUrl, log: (l) => console.log(l) });
    console.log(JSON.stringify(r));
    return 0;
  } catch (e) {
    if (e instanceof FxSourceError) {
      console.error(`[fx_daily] 源失败（${e.kind}）：${e.message}；未写库，保留前一日快照`);
      return 1;
    }
    console.error(`[fx_daily] 失败：${(e as Error)?.stack ?? String(e)}`);
    return 2;
  } finally {
    await close();
  }
}

const isEntry = (() => {
  try {
    return typeof process !== "undefined" && !!process.argv[1] && /fx_daily\.ts$/.test(process.argv[1]);
  } catch {
    return false;
  }
})();
if (isEntry) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
