/**
 * TASK-060 · 目录采集器框架（DESIGN-004 §2-§4 / 契约⑦ ProviderModelObservationSchema）
 *
 * 一个 collector = 「拉取原文（safeFetch + 封顶）」+「纯函数 normalize（原文 → 观测[]）」。
 * - 只采公开源，不依赖任何 API Key（keyed 源归 TASK-070，条件 U-M1）。
 * - 价格保留原币 + 单位（priceUnit），不做汇率换算（U-15 未决）；缺字段 / 负数 / 非有限数一律 null，不推断。
 * - 观测的 firstSeenAt/lastSeenAt 由本次 fetchedAt 填充；跨快照的首见/下架判定归 diff（TASK-061）与持久化（TASK-059）。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { readCappedText, safeFetch } from "../../security/url-policy";

/** 采集响应上限：OpenRouter all 视图实测 ~1.0MB、AIHubMix ~0.96MB（2026-10-19），按 DESIGN-004 设 4MB */
export const CATALOG_MAX_BYTES = 4 * 1024 * 1024;

export interface CatalogFetchResult {
  /** 原始响应文本（不落盘：下游只存 sha256 + 字节数 + ≤2KB 采样） */
  text: string;
  /** UTF-8 字节数 */
  bytes: number;
  /** 实际请求 URL */
  url: string;
}

export interface NormalizeContext {
  /** 本次抓取时刻（观测 firstSeenAt/lastSeenAt 填此值） */
  fetchedAt: Date;
}

export interface CatalogCollector {
  /** 源 key（= monitoring_sources.key，registry/seed 键集合一致性由单测断言） */
  readonly key: string;
  /** 默认端点（与 seed monitoringSourcesData.endpoint 一致；运行时以 DB 行 endpoint 为准） */
  readonly defaultEndpoint: string;
  /** 纯函数：原始 JSON → 观测；对单条脏数据跳过而非整批失败 */
  normalize(raw: unknown, ctx: NormalizeContext): ProviderModelObservation[];
}

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

/** 拉取目录原文：经 SSRF 策略（safeFetch）+ 响应体封顶（readCappedText）；非 2xx 抛错（由调度层记 last_error） */
export async function fetchCatalogText(
  endpoint: string,
  opts: { fetchImpl?: FetchImpl; maxBytes?: number; timeoutMs?: number } = {},
): Promise<CatalogFetchResult> {
  const { fetchImpl = (u, i) => safeFetch(u, i), maxBytes = CATALOG_MAX_BYTES, timeoutMs = 30_000 } = opts;
  const res = await fetchImpl(endpoint, {
    headers: { accept: "application/json", "user-agent": "AideanMonitor/1.0 (+catalog)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`catalog fetch ${endpoint} → HTTP ${res.status}`);
  const text = await readCappedText(res, maxBytes);
  return { text, bytes: Buffer.byteLength(text, "utf8"), url: endpoint };
}

/** 采集一次：fetch → JSON.parse → normalize */
export async function collect(
  collector: CatalogCollector,
  endpoint: string = collector.defaultEndpoint,
  opts: { fetchImpl?: FetchImpl; now?: Date } = {},
): Promise<{ fetch: CatalogFetchResult; observations: ProviderModelObservation[] }> {
  const fetched = await fetchCatalogText(endpoint, { fetchImpl: opts.fetchImpl });
  const raw = JSON.parse(fetched.text) as unknown;
  return { fetch: fetched, observations: collector.normalize(raw, { fetchedAt: opts.now ?? new Date() }) };
}

// ---------------------------------------------------------------- 归一工具（DESIGN-004 §4，冻结）

const SUFFIX_RE = /:(free|batch|beta|thinking|extended|nitro|floor|online|exacto)$/;

/** normalizedModelId = 小写 → 去 `vendor/` 前缀 → 去 :free|:batch|:beta|:thinking 等后缀 → 空白转 `-`（只用于关联展示，不自动合并 AiModel） */
export function normalizeModelId(externalId: string): string {
  let s = externalId.trim().toLowerCase();
  const slash = s.lastIndexOf("/");
  if (slash >= 0) s = s.slice(slash + 1);
  while (SUFFIX_RE.test(s)) s = s.replace(SUFFIX_RE, "");
  s = s.replace(/\s+/g, "-");
  return s.slice(0, 200) || externalId.slice(0, 200);
}

const DEC_RE = /^\d+(\.\d+)?$/;

/** 十进制字符串 ×10^shift（精确，无浮点误差），结果去尾随 0；非法/负数 → null */
export function shiftDecimal(value: unknown, shift: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const str = typeof value === "number" ? numberToPlain(value) : value.trim();
  if (str === null || !DEC_RE.test(str)) return null;
  const [intPart, frac = ""] = str.split(".");
  const digits = intPart + frac;
  let pointPos = intPart.length + shift;
  let all = digits;
  if (pointPos > all.length) all = all.padEnd(pointPos, "0");
  if (pointPos < 0) {
    all = "0".repeat(-pointPos) + all;
    pointPos = 0;
  }
  const ip = all.slice(0, pointPos).replace(/^0+(?=\d)/, "") || "0";
  const fp = all.slice(pointPos).replace(/0+$/, "");
  return fp ? `${ip}.${fp}` : ip;
}

/** 有限非负 number → 十进制字符串（最多 6 位小数，对齐 decimal(19,6)；去尾随 0）；否则 null */
export function toDecimalString(n: unknown, scale = 6): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  const fixed = n.toFixed(scale);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

function numberToPlain(n: number): string | null {
  if (!Number.isFinite(n) || n < 0) return null;
  // 避免科学计数：先按 toString，若含 e 则 toFixed(20) 去尾 0
  const s = String(n);
  if (!/e/i.test(s)) return s;
  return n.toFixed(20).replace(/0+$/, "").replace(/\.$/, "");
}

/** 正整数或 null（contextLength） */
export function positiveIntOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
}

/** 截断可空字符串 */
export function strOrNull(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
