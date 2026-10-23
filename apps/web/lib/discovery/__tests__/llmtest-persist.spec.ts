/**
 * T120-13 · llmtest-persist 单测（prisma 桩）：站点域名映射、批 100 事务 upsert、幂等键形状、skipped 原因。
 * 真库（迁移去重 + 重复运行行数不变）见 llmtest-persist.int.spec.ts（RUN_DB_TESTS=1）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildStationIdByDomain,
  persistLlmtestObservations,
  RELIABILITY_UPSERT_BATCH,
  upsertReliabilityObservations,
} from '../llmtest-persist';
import type { LlmtestObservationCreate } from '../llmtest-observations';

const db = {
  aPIStation: { findMany: vi.fn() },
  reliabilityObservation: { upsert: vi.fn((args: unknown) => args) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
};
const asDb = db as never;

const obs = (i: number): LlmtestObservationCreate => ({
  entityType: 'station',
  entityId: `st-${i}`,
  uptimePercent: 99,
  errorRate: 0,
  successCount: 10,
  failureCount: 0,
  windowStart: new Date('2026-10-22T16:00:00Z'),
  windowEnd: new Date('2026-10-23T16:00:00Z'),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('llmtest-persist', () => {
  it('buildStationIdByDomain：只读未软删、按创建升序；website 优先、同域先到先得、www 归一', async () => {
    db.aPIStation.findMany.mockResolvedValue([
      { id: 'a', website: 'https://www.Foo.com/x', baseUrl: 'https://api.foo-gw.com/v1' },
      { id: 'b', website: 'https://foo.com', baseUrl: null },
      { id: 'c', website: null, baseUrl: 'not a url' },
    ]);
    const m = await buildStationIdByDomain(asDb);
    expect(db.aPIStation.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      select: { id: true, website: true, baseUrl: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect([...m.entries()]).toEqual([
      ['foo.com', 'a'],
      ['api.foo-gw.com', 'a'],
    ]);
  });

  it(`upsertReliabilityObservations：250 条 → 3 个事务（${RELIABILITY_UPSERT_BATCH}/${RELIABILITY_UPSERT_BATCH}/50），复合唯一键 where`, async () => {
    const list = Array.from({ length: 250 }, (_, i) => obs(i));
    await expect(upsertReliabilityObservations(asDb, list)).resolves.toBe(250);
    expect(db.$transaction.mock.calls.map((c) => (c[0] as unknown[]).length)).toEqual([100, 100, 50]);
    const first = db.reliabilityObservation.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(first).toEqual({
      where: {
        entityType_entityId_windowStart: {
          entityType: 'station',
          entityId: 'st-0',
          windowStart: new Date('2026-10-22T16:00:00Z'),
        },
      },
      create: obs(0),
      update: {
        uptimePercent: 99,
        errorRate: 0,
        successCount: 10,
        failureCount: 0,
        windowEnd: new Date('2026-10-23T16:00:00Z'),
      },
    });
  });

  it('upsertReliabilityObservations：空数组不开事务', async () => {
    await expect(upsertReliabilityObservations(asDb, [])).resolves.toBe(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('persistLlmtestObservations：有映射者写入、无映射域名 skipped(no_station_mapping)、非法 url 静默忽略', async () => {
    db.aPIStation.findMany.mockResolvedValue([{ id: 'st-x', website: 'https://known.com', baseUrl: null }]);
    const res = await persistLlmtestObservations(
      asDb,
      [
        { url: 'https://known.com', score: 98, isAlive: true, total_checks: 10, pass_count: 9 },
        { url: 'https://unknown.io', score: 50 },
        { url: 'https://unknown.io/again', score: 51 },
        { url: 'ftp://bad' },
      ],
      { at: new Date('2026-10-23T05:00:00Z') },
    );
    expect(res).toEqual({ written: 1, skipped: [{ domain: 'unknown.io', reason: 'no_station_mapping' }] });
    const call = db.reliabilityObservation.upsert.mock.calls[0][0] as { create: LlmtestObservationCreate };
    expect(call.create).toMatchObject({ entityId: 'st-x', successCount: 9, failureCount: 1, uptimePercent: 98 });
    expect(call.create.windowStart.toISOString()).toBe('2026-10-22T16:00:00.000Z');
  });
});
