/**
 * T120-13 · reliability_observations 真库集成测（PG16；门控 RUN_DB_TESTS=1 ∧ DATABASE_URL）。
 * 验收：① 迁移 20261024020000 在含重复数据的库上成功（去重保留最新 + 建唯一索引）；
 *       ② 同批 persist 跑两次行数不变（逐键 upsert 幂等），第二次覆盖指标；
 *       ③ 待删重复 >1000 → 迁移中止且不删任何行（任务卡阻塞条件：破坏性删除先报用户）。
 * 造数需临时拆掉唯一索引：经 `prisma db execute`（子进程）执行 SQL，不在仓内引入原生 SQL 客户端调用（守 queryraw-biz=0）。
 * 运行：RUN_DB_TESTS=1 DATABASE_URL=postgresql://... pnpm -C apps/web exec vitest run lib/discovery/__tests__/llmtest-persist.int.spec.ts
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_ENABLED = process.env.RUN_DB_TESTS === '1' && !!process.env.DATABASE_URL;
const suite = DB_ENABLED ? describe : describe.skip;

const WEB_ROOT = path.resolve(__dirname, '../../..');
const MIGRATION = path.join(WEB_ROOT, 'prisma/migrations/20261024020000_reliability_obs_unique/migration.sql');
const INDEX = 'reliability_observations_entity_type_entity_id_window_start_key';

function dbExec(args: string[], input?: string): void {
  execFileSync('npx', ['prisma', 'db', 'execute', ...args, '--url', process.env.DATABASE_URL as string], {
    cwd: WEB_ROOT,
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

suite('reliability_observations（T120-13 · 真库）', () => {
  let prisma: any;
  const tag = `it-t12013-${Date.now()}`;
  const ws = new Date('2026-10-22T16:00:00Z');
  const we = new Date('2026-10-23T16:00:00Z');

  beforeAll(async () => {
    prisma = (await import('../../db/prisma')).prisma;
  });

  afterAll(async () => {
    await prisma.reliabilityObservation.deleteMany({ where: { entityId: { startsWith: tag } } });
    await prisma.aPIStation.deleteMany({ where: { name: tag } });
    await prisma.$disconnect();
  });

  it('① 含重复数据 → 迁移去重保留最新并建唯一索引', async () => {
    dbExec(['--stdin'], `DROP INDEX IF EXISTS "${INDEX}";`);
    const base = { entityType: 'station', successCount: 1, failureCount: 0, windowStart: ws, windowEnd: we };
    await prisma.reliabilityObservation.createMany({
      data: [
        { ...base, entityId: `${tag}-dup`, uptimePercent: 10, createdAt: new Date('2026-10-23T01:00:00Z') },
        { ...base, entityId: `${tag}-dup`, uptimePercent: 20, createdAt: new Date('2026-10-23T02:00:00Z') },
        { ...base, entityId: `${tag}-dup`, uptimePercent: 30, createdAt: new Date('2026-10-23T03:00:00Z') },
        { ...base, entityId: `${tag}-solo`, uptimePercent: 40 },
      ],
    });
    dbExec(['--file', MIGRATION]);
    const rows = await prisma.reliabilityObservation.findMany({
      where: { entityId: { startsWith: tag } },
      orderBy: { entityId: 'asc' },
      select: { entityId: true, uptimePercent: true },
    });
    expect(rows).toEqual([
      { entityId: `${tag}-dup`, uptimePercent: 30 },
      { entityId: `${tag}-solo`, uptimePercent: 40 },
    ]);
    await expect(
      prisma.reliabilityObservation.create({ data: { ...base, entityId: `${tag}-dup` } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('② 同批 persist 跑两次行数不变，第二次覆盖指标', async () => {
    const { persistLlmtestObservations } = await import('../llmtest-persist');
    await prisma.aPIStation.create({
      data: { name: tag, displayName: tag, description: tag, website: `https://${tag}.example.com` },
    });
    const at = new Date('2026-10-23T05:00:00Z');
    const items = [{ url: `https://${tag}.example.com`, score: 90, total_checks: 10, pass_count: 9 }];
    const r1 = await persistLlmtestObservations(prisma, items, { at });
    const station = await prisma.aPIStation.findFirst({ where: { name: tag }, select: { id: true } });
    const count1 = await prisma.reliabilityObservation.count({ where: { entityId: station.id } });
    const r2 = await persistLlmtestObservations(prisma, [{ ...items[0], score: 95 }], { at });
    const after = await prisma.reliabilityObservation.findMany({ where: { entityId: station.id } });
    expect(r1.written).toBe(1);
    expect(r2.written).toBe(1);
    expect(count1).toBe(1);
    expect(after).toHaveLength(1);
    expect(after[0].uptimePercent).toBe(95);
    await prisma.reliabilityObservation.deleteMany({ where: { entityId: station.id } });
  });

  it('③ 待删重复 > 1000 → 迁移 RAISE 中止，零删除', async () => {
    dbExec(['--stdin'], `DROP INDEX IF EXISTS "${INDEX}";`);
    const base = { entityType: 'station', entityId: `${tag}-bulk`, successCount: 1, failureCount: 0, windowStart: ws, windowEnd: we };
    await prisma.reliabilityObservation.createMany({ data: Array.from({ length: 1002 }, () => base) });
    expect(() => dbExec(['--file', MIGRATION])).toThrow();
    expect(await prisma.reliabilityObservation.count({ where: { entityId: `${tag}-bulk` } })).toBe(1002);
    await prisma.reliabilityObservation.deleteMany({ where: { entityId: `${tag}-bulk` } });
    dbExec(['--file', MIGRATION]); // 恢复唯一索引
  });
});
