/**
 * TASK-061 · 目录快照 diff：同源相邻两次快照 → 4 类变更事件
 * （REQ-M-005/008；DESIGN-004 §5；契约 CatalogChangeEventSchema）
 *
 * detect(prev, curr, ctx) 为纯函数，产出 listed / delisted / price_changed / model_first_seen。
 * 落库唯一键 (snapshotId, normalizedModelId, kind) 由 DB 强制（cce_snapshot_model_kind_key），
 * 故先按 (normalizedModelId, kind) 合并同源多 external 变体（E9-18 实测 OpenRouter 归一后 95 组）：
 *   · 合并为一条事件，代表 externalModelId 用确定性全序：主变体优先 → lastSeenAt 新 → 字典序兜底（对齐 TASK-066 offerings.ts）；
 *   · 被折叠的全部 externalModelId 随事件透出（DetectedChange.mergedExternalModelIds），由 persist 落 EvidenceChain，
 *     避免「整批因唯一键冲突失败」。
 * 价格：仅当两侧 priceUnit 相同且合法才比较（DESIGN-004 §5「单位不同时不比较」）；
 *   输入或输出 |Δ| ≥ PRICE_CHANGE_THRESHOLD_PCT(=1%) 才记 price_changed；deltaPct 取触发项中绝对值最大者。
 * model_first_seen：normalizedModelId 在「所有源」观测中首次出现（seenNormalizedBefore 由调用方在快照写入前查询提供）。
 * 本文件不落库、不查库；写事件与证据链见同目录 persist.ts。
 */
import { randomUUID } from "node:crypto";
import { PRICE_CHANGE_THRESHOLD_PCT, PRICE_UNITS, type CatalogChangeEvent } from "@aidean/shared";

/** detect 只需观测的以下字段（ProviderModelObservation 的结构子集；价格容忍 string|number 以兼容 Prisma Decimal 行） */
export interface ObsIn {
  externalModelId: string;
  normalizedModelId: string;
  isListed: boolean;
  priceUnit: string | null;
  priceInput: string | number | null;
  priceOutput: string | number | null;
  lastSeenAt?: Date | string;
}

export interface DetectContext {
  sourceKey: string;
  snapshotId: string;
  sourceUrl: string;
  detectedAt: Date;
  seenNormalizedBefore: ReadonlySet<string>;
  idFactory?: () => string;
}

/** 一条检出结果：契约事件 + 被合并进该事件的全部 externalModelId（长度 ≥1；>1 即发生归一合并） */
export interface DetectedChange {
  event: CatalogChangeEvent;
  mergedExternalModelIds: string[];
}


type Kind = CatalogChangeEvent["kind"];
const PRICE_UNITS_LIST = PRICE_UNITS as readonly string[];
const PRICE_RE = /^\d+(\.\d+)?$/;

/** 主变体：去 vendor/ 前缀后不含 `:后缀`（如 `:free` `:beta` `:thinking`），口径对齐 offerings.ts */
const isPrimaryVariant = (externalId: string): boolean =>
  !externalId.slice(externalId.lastIndexOf("/") + 1).includes(":");

const tsMs = (v: Date | string | undefined): number => {
  if (!v) return 0;
  const t = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** 确定性全序：a 应排在 b 前（作代表）返回负 */
function memberOrder(a: ObsIn, b: ObsIn): number {
  const pa = isPrimaryVariant(a.externalModelId);
  const pb = isPrimaryVariant(b.externalModelId);
  if (pa !== pb) return pa ? -1 : 1;
  const ta = tsMs(a.lastSeenAt);
  const tb = tsMs(b.lastSeenAt);
  if (ta !== tb) return tb - ta;
  return a.externalModelId < b.externalModelId ? -1 : a.externalModelId > b.externalModelId ? 1 : 0;
}

/** 从成员中确定性地选出代表行（排序首） */
function pickRepresentative(members: readonly ObsIn[]): ObsIn {
  return members.reduce((best, m) => (memberOrder(m, best) < 0 ? m : best), members[0]);
}

/** number → 普通十进制串（避免科学计数；负/非有限 → null） */
function plainNumber(n: number): string | null {
  if (!Number.isFinite(n) || n < 0) return null;
  const s = String(n);
  if (!/e/i.test(s)) return s;
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

/** 价格 → 十进制数值（非法/负 → null） */
function toPriceNum(v: string | number | null): number | null {
  if (v === null) return null;
  const s = typeof v === "number" ? plainNumber(v) : v.trim();
  if (s === null || !PRICE_RE.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 价格 → 契约 PriceStr（十进制串，非法/负 → null） */
function toPriceStr(v: string | number | null): string | null {
  if (v === null) return null;
  const s = typeof v === "number" ? plainNumber(v) : v.trim();
  return s !== null && PRICE_RE.test(s) ? s : null;
}

/** 单字段相对变化 %（两侧任一未知 → null；0→正=+100，正→0=-100，0→0=0） */
function fieldDeltaPct(prev: string | number | null, curr: string | number | null): number | null {
  const b = toPriceNum(prev);
  const a = toPriceNum(curr);
  if (b === null || a === null) return null;
  if (b === 0 && a === 0) return 0;
  if (b === 0) return 100;
  if (a === 0) return -100;
  return ((a - b) / b) * 100;
}

const isValidUnit = (u: string | null): boolean => u !== null && PRICE_UNITS_LIST.includes(u);

type PricePayload = {
  priceUnit: (typeof PRICE_UNITS)[number];
  before: { input: string | null; output: string | null };
  after: { input: string | null; output: string | null };
  deltaPct: number;
};

/** 判定一条 prev→curr 是否构成 price_changed；单位不同/非法单位/无字段越阈 → null */
function decidePrice(prevRow: ObsIn, currRow: ObsIn): PricePayload | null {
  if (prevRow.priceUnit !== currRow.priceUnit) return null; // 单位不同不比较（DESIGN-004 §5）
  if (!isValidUnit(currRow.priceUnit)) return null; // price_changed 需合法单位
  const dIn = fieldDeltaPct(prevRow.priceInput, currRow.priceInput);
  const dOut = fieldDeltaPct(prevRow.priceOutput, currRow.priceOutput);
  const hits = [dIn, dOut].filter((x): x is number => x !== null && Math.abs(x) >= PRICE_CHANGE_THRESHOLD_PCT);
  if (hits.length === 0) return null;
  const deltaPct = hits.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), hits[0]);
  return {
    priceUnit: currRow.priceUnit as PricePayload["priceUnit"],
    before: { input: toPriceStr(prevRow.priceInput), output: toPriceStr(prevRow.priceOutput) },
    after: { input: toPriceStr(currRow.priceInput), output: toPriceStr(currRow.priceOutput) },
    deltaPct: Number(deltaPct.toFixed(4)),
  };
}


interface Group {
  normalizedModelId: string;
  kind: Kind;
  members: ObsIn[];
  prevById: Map<string, ObsIn>;
  currById: Map<string, ObsIn>;
}

const prevOf = (g: Group, m: ObsIn): ObsIn => g.prevById.get(m.externalModelId) ?? m;
const currOf = (g: Group, m: ObsIn): ObsIn => g.currById.get(m.externalModelId) ?? m;

/** price_changed 组内只在“确有越阈变化”的成员里择代表；其余 kind 直接全体择代表 */
function chooseRepresentative(g: Group): ObsIn {
  if (g.kind === "price_changed") {
    const qualifying = g.members.filter((m) => decidePrice(prevOf(g, m), currOf(g, m)) !== null);
    return pickRepresentative(qualifying.length ? qualifying : g.members);
  }
  return pickRepresentative(g.members);
}

function buildEvent(g: Group, id: string, ctx: DetectContext, detectedAt: string): DetectedChange | null {
  const rep = chooseRepresentative(g);
  const mergedExternalModelIds = [...new Set(g.members.map((m) => m.externalModelId))].sort();
  const base = {
    id,
    sourceKey: ctx.sourceKey,
    snapshotId: ctx.snapshotId,
    externalModelId: rep.externalModelId,
    normalizedModelId: g.normalizedModelId,
    detectedAt,
    sourceUrl: ctx.sourceUrl,
  };
  if (g.kind !== "price_changed") return { event: { ...base, kind: g.kind }, mergedExternalModelIds };
  const payload = decidePrice(prevOf(g, rep), currOf(g, rep));
  if (!payload) return null; // 组内无成员越阈 → 不产 price_changed
  return { event: { ...base, kind: "price_changed", ...payload }, mergedExternalModelIds };
}

/**
 * 纯函数 diff：对同源相邻两次快照产出 4 类事件（已按 (normalizedModelId, kind) 合并，保证落库不撞唯一键）。
 */
export function detect(prev: readonly ObsIn[], curr: readonly ObsIn[], ctx: DetectContext): DetectedChange[] {
  const prevById = new Map<string, ObsIn>();
  for (const o of prev) if (!prevById.has(o.externalModelId)) prevById.set(o.externalModelId, o);
  const currById = new Map<string, ObsIn>();
  for (const o of curr) if (!currById.has(o.externalModelId)) currById.set(o.externalModelId, o);

  const groups = new Map<string, Group>();
  const add = (kind: Kind, member: ObsIn): void => {
    const key = `${kind}\u0000${member.normalizedModelId}`;
    const existing = groups.get(key);
    if (existing) existing.members.push(member);
    else groups.set(key, { normalizedModelId: member.normalizedModelId, kind, members: [member], prevById, currById });
  };

  for (const c of curr) {
    const p = prevById.get(c.externalModelId);
    if (c.isListed && (!p || !p.isListed)) add("listed", c); // 本次在列、上次不在列（或缺席）
    if (p && p.isListed && c.isListed) add("price_changed", c); // 两侧都在列才可能比价格
    if (c.isListed && !ctx.seenNormalizedBefore.has(c.normalizedModelId)) add("model_first_seen", c); // 全目录首见
  }
  for (const p of prev) {
    const c = currById.get(p.externalModelId);
    if (p.isListed && (!c || !c.isListed)) add("delisted", p); // 上次在列、本次不在
  }

  const idFactory = ctx.idFactory ?? randomUUID;
  const detectedAt = ctx.detectedAt.toISOString();
  const out: DetectedChange[] = [];
  for (const key of [...groups.keys()].sort()) {
    const dc = buildEvent(groups.get(key)!, idFactory(), ctx, detectedAt);
    if (dc) out.push(dc);
  }
  return out;
}
