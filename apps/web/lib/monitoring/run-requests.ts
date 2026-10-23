/**
 * T120-12 · 监控「立即运行」意图行（monitor_run_requests）读写单源。
 *
 * 语义（ADR-0011 / contracts/07b）：
 * - POST run 插入 pending 意图行；部分唯一索引 (source_key) WHERE status IN ('pending','running')
 *   使并发重复只成功 1 行，其余撞 P2002 → 调用方映射 10006(429)。
 * - monitor_catalogs 每次执行先 claimPending：逐行条件 UPDATE（WHERE id AND status=pending）CAS 领取
 *   原子领取（pending→running，并发 sidecar 互不重复领取），执行后 complete 回写 done/failed。
 * - 历史保留 90 天，由 monitor_catalogs 顺手 purgeFinished。
 * Redis 锁 lock:monitor:run:{key} 降为可失的快速前置拦截，DB 唯一索引才是防线。
 */
import type { PrismaClient } from "@prisma/client";

export type MonitorRunStatus = "pending" | "running" | "done" | "failed";

export interface MonitorRunRequestRow {
  id: string;
  sourceKey: string;
  status: string;
  requestedBy: string;
  resultCount: number | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/** 契约 MonitorRunRequest 线形（日期转 ISO） */
export interface MonitorRunRequestDto {
  id: string;
  sourceKey: string;
  status: MonitorRunStatus;
  requestedBy: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultCount: number | null;
  error: string | null;
}

export const RUN_REQUEST_RETENTION_DAYS = 90;
export const RUNS_DEFAULT_PAGE_SIZE = 10;
export const RUNS_MAX_PAGE_SIZE = 50;
const ERROR_MAX = 2000;

type Db = Pick<PrismaClient, "monitorRunRequest">;

/** 唯一约束冲突（P2002）鸭子判定：兼容测试桩注入的最小错误形状 */
export function isActiveRunConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

export function toRunRequestDto(row: MonitorRunRequestRow): MonitorRunRequestDto {
  return {
    id: row.id,
    sourceKey: row.sourceKey,
    status: row.status as MonitorRunStatus,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    resultCount: row.resultCount,
    error: row.error,
  };
}

/** 插入 pending 意图行；同源已有活动请求 → 返回 null（调用方 429） */
export async function createRunRequest(
  db: Db,
  input: { sourceKey: string; requestedBy: string }
): Promise<MonitorRunRequestRow | null> {
  try {
    return await db.monitorRunRequest.create({
      data: { sourceKey: input.sourceKey, requestedBy: input.requestedBy, status: "pending" },
    });
  } catch (err) {
    if (isActiveRunConflict(err)) return null;
    throw err;
  }
}

/** 原子领取 pending → running（可限定源）；逐行 CAS 保证并发 sidecar 不重复领取 */
export async function claimPendingRunRequests(
  db: Db,
  opts: { sourceKey?: string; now?: Date } = {}
): Promise<MonitorRunRequestRow[]> {
  const now = opts.now ?? new Date();
  // 原子领取：逐行 CAS（UPDATE … WHERE id=? AND status='pending'），count=1 才算领到；
  // 并发消费者对同一行只有一个能成功（行级写锁 + 条件重评估），无需 raw SQL（守 queryraw-biz=0 铁律）。
  const pending = await db.monitorRunRequest.findMany({
    where: { status: "pending", ...(opts.sourceKey ? { sourceKey: opts.sourceKey } : {}) },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const claimed: MonitorRunRequestRow[] = [];
  for (const { id } of pending) {
    const res = await db.monitorRunRequest.updateMany({
      where: { id, status: "pending" },
      data: { status: "running", startedAt: now },
    });
    if (res.count !== 1) continue;
    const row = await db.monitorRunRequest.findUnique({ where: { id } });
    if (row) claimed.push(row as MonitorRunRequestRow);
  }
  return claimed;
}

/** 执行结束回写（仅 running 行生效，防重复回写覆盖） */
export async function completeRunRequest(
  db: Db,
  id: string,
  outcome: { status: "done"; resultCount: number } | { status: "failed"; error: string },
  now: Date = new Date()
): Promise<void> {
  await db.monitorRunRequest.updateMany({
    where: { id, status: "running" },
    data:
      outcome.status === "done"
        ? { status: "done", resultCount: Math.max(0, Math.trunc(outcome.resultCount)), error: null, finishedAt: now }
        : { status: "failed", error: outcome.error.slice(0, ERROR_MAX), finishedAt: now },
  });
}

/** 运行历史分页（createdAt 倒序） */
export async function listRunRequests(
  db: Db,
  sourceKey: string,
  page: number,
  pageSize: number
): Promise<{ items: MonitorRunRequestDto[]; total: number }> {
  const where = { sourceKey };
  const [rows, total] = await Promise.all([
    db.monitorRunRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.monitorRunRequest.count({ where }),
  ]);
  return { items: rows.map(toRunRequestDto), total };
}

/** 清理保留期外的已结束请求（不新增调度项，由 monitor_catalogs 顺手调用） */
export async function purgeFinishedRunRequests(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RUN_REQUEST_RETENTION_DAYS * 86_400_000);
  const res = await db.monitorRunRequest.deleteMany({
    where: { status: { in: ["done", "failed"] }, finishedAt: { lt: cutoff } },
  });
  return res.count;
}
