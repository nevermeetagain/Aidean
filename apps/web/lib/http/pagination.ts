/**
 * 共享分页参数解析（B11-11 / DEF-011-15 / Q-11-05=A）。
 *
 * 背景：后台列表端点普遍写 `Math.max(1, parseInt(searchParams.get('page'), 10))`。
 * 非数字串（`?page=abc`）→ `parseInt` 得 NaN，而 `Math.max/Math.min` 不接管 NaN，
 * NaN 直送 Prisma 的 `skip/take` → HTTP 500 + code=50000（运行态已实证）。
 *
 * 本模块是该类参数的**唯一解析口径**：
 *   - `Number.parseInt(raw, 10)` + `Number.isFinite` 双步（与原 `executions` 的 `toInt()` 同语义，
 *     故 `"10abc"` → 10、`"1e3"` → 1、`" 7"` → 7，与历史 parseInt 写法行为兼容，不引入破坏性变化）；
 *   - 不可解析 / 缺省 / 空串 → 回退默认值；可解析 → 钳制到 [min, max]；
 *   - `skip` 额外以 INT32 上限封顶（防止超大页码让 `(page-1)*pageSize` 溢出 Prisma Int / 失去精度）；
 *   - 输出恒为有限正整数，**结构上不可能把 NaN/Infinity 送进 Prisma**。
 *
 * 零依赖（仅标准库），纯函数，无 I/O。不是 barrel（ADR-0002）：消费方直接 import 本文件。
 * 接入范式与逐端点单测模板见 docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-11/handoff.md。
 */

/** Prisma `skip` 的安全上限（PostgreSQL OFFSET 足够，但保持在 32 位有符号整数内以兼容 Prisma Int 校验） */
export const MAX_SAFE_SKIP = 2_147_483_647;

/** 可作为参数来源的对象：URLSearchParams / URL（含 NextRequest.nextUrl）/ Request */
export type SearchParamsSource = URLSearchParams | URL | Request;

/** 统一取出 URLSearchParams（Request 才需要解析 url，其余零拷贝） */
export function toSearchParams(source: SearchParamsSource): URLSearchParams {
  if (source instanceof URLSearchParams) return source;
  if (source instanceof URL) return source.searchParams;
  return new URL(source.url).searchParams;
}

/**
 * 解析十进制整数参数：`Number.parseInt(raw, 10)`，非有限值（NaN）→ fallback。
 * `null`/`undefined`/空串/纯空白/非数字串 → fallback。
 */
export function parseIntParam(raw: string | null | undefined, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** 整数钳制到 [min, max]（调用方保证 min ≤ max 且均为有限整数） */
export function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export interface PaginationOptions {
  /** 页码参数名，默认 `page` */
  pageKey?: string;
  /** 每页条数参数名，默认 `pageSize` */
  pageSizeKey?: string;
  /** 页码缺省/非法时的回退值，默认 1 */
  defaultPage?: number;
  /** 每页条数缺省/非法时的回退值，默认 20（与《API架构设计方案》§五「pageSize 默认 20」一致） */
  defaultPageSize?: number;
  /** 每页条数下限，默认 1 */
  minPageSize?: number;
  /** 每页条数上限，默认 100（后台列表惯用封顶） */
  maxPageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  /** Prisma `skip`（= (page-1)*pageSize，封顶 MAX_SAFE_SKIP） */
  skip: number;
  /** Prisma `take`（= pageSize） */
  take: number;
}

function assertIntOption(name: string, v: number, min: number): void {
  if (!Number.isInteger(v) || v < min) {
    // 编程错误（配置写错），而非用户输入：直接抛出，让单测/启动期暴露
    throw new RangeError(`[pagination] 选项 ${name} 必须是 ≥${min} 的整数，收到 ${String(v)}`);
  }
}

/**
 * 解析 `page`/`pageSize` → `{page, pageSize, skip, take}`。
 *
 * 规则：
 *   page     = max(1, parseIntParam(page, defaultPage))，再按 skip 上限封顶；
 *   pageSize = clamp(parseIntParam(pageSize, defaultPageSize), minPageSize, maxPageSize)。
 */
export function parsePagination(source: SearchParamsSource, options: PaginationOptions = {}): Pagination {
  const {
    pageKey = "page",
    pageSizeKey = "pageSize",
    defaultPage = 1,
    defaultPageSize = 20,
    minPageSize = 1,
    maxPageSize = 100,
  } = options;
  assertIntOption("defaultPage", defaultPage, 1);
  assertIntOption("minPageSize", minPageSize, 1);
  assertIntOption("maxPageSize", maxPageSize, minPageSize);
  assertIntOption("defaultPageSize", defaultPageSize, minPageSize);
  if (defaultPageSize > maxPageSize) {
    throw new RangeError(`[pagination] defaultPageSize(${defaultPageSize}) 不得大于 maxPageSize(${maxPageSize})`);
  }

  const params = toSearchParams(source);
  const pageSize = clampInt(parseIntParam(params.get(pageSizeKey), defaultPageSize), minPageSize, maxPageSize);
  // 页码上限由 skip 上限反推：保证 (page-1)*pageSize ≤ MAX_SAFE_SKIP
  const maxPage = Math.floor(MAX_SAFE_SKIP / pageSize) + 1;
  const page = clampInt(parseIntParam(params.get(pageKey), defaultPage), 1, maxPage);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export interface LimitOptions {
  /** 参数名，默认 `limit` */
  key?: string;
  /** 缺省/非法时的回退值 */
  defaultLimit: number;
  /** 下限，默认 1 */
  min?: number;
  /** 上限 */
  max: number;
}

/**
 * 解析单一条数参数（如 intelligence 的 `?limit=`）→ 有限整数，钳制到 [min, max]。
 * 返回值可直接作 Prisma `take`。
 */
export function parseLimit(source: SearchParamsSource, options: LimitOptions): number {
  const { key = "limit", defaultLimit, min = 1, max } = options;
  assertIntOption("min", min, 0);
  assertIntOption("max", max, min);
  assertIntOption("defaultLimit", defaultLimit, min);
  if (defaultLimit > max) {
    throw new RangeError(`[pagination] defaultLimit(${defaultLimit}) 不得大于 max(${max})`);
  }
  return clampInt(parseIntParam(toSearchParams(source).get(key), defaultLimit), min, max);
}

/**
 * 解析可选整数过滤参数（如 `?status=1`）：缺省或不可解析 → `undefined`（视为不过滤），
 * 绝不返回 NaN。
 */
export function parseOptionalInt(source: SearchParamsSource, key: string): number | undefined {
  const raw = toSearchParams(source).get(key);
  if (raw === null) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}
