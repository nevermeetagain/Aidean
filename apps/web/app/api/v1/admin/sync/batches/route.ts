/**
 * GET  /api/v1/admin/sync/batches — list sync batches
 * POST /api/v1/admin/sync/batches — trigger a new sync (dry-run or real)
 *
 * R-26 修复：POST 现在接通 SyncOrchestrator，不再只创建空壳 batch 记录。
 * SyncOrchestrator 内部创建 SyncBatch 并执行完整 sync 生命周期：
 * adapter.fetch → mapper.mapModel → writer.writeBatch → 更新 batch 状态。
 *
 * R-47 多源扩展：POST body 新增 additionalSources 字段（string[]），
 * 按 adapter name 选择额外数据源传入 SyncOrchestrator.additionalAdapters，
 * 自动执行多源交叉验证（CrossValidator），冲突报告写入 validationSummary。
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { SyncOrchestrator } from '../../../../../../lib/sync/sync-orchestrator';
import { ADAPTER_REGISTRY } from '../../../../../../lib/sync/sources/adapters';
import { writeAudit } from '../../../_lib/audit';
import { withApi } from '../../../_lib/handler';
import type { SyncConfig, SyncSource } from '../../../../../../lib/sync/types/sync';
import type { SyncAdapter } from '../../../../../../lib/sync/adapters/base';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.sync.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const status = url.searchParams.get('status');

  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.syncBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { changeLogs: true } },
      },
    }),
    prisma.syncBatch.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.sync.write");

  const body = await req.json();
  const { source, sourceUrl, dryRun, additionalSources } = body as {
    source?: string;
    sourceUrl?: string;
    dryRun?: boolean;
    additionalSources?: string[];
  };

  if (!source) {
    return NextResponse.json({ error: 'source is required' }, { status: 400 });
  }

  // 构建 SyncConfig
  const config: SyncConfig = {
    source: source as SyncSource,
    sourceUrl: sourceUrl ?? undefined,
    dryRun: dryRun ?? false,
    batchSize: 500,
    options: {},
  };

  // 选择主 adapter
  const primaryFactory = ADAPTER_REGISTRY[source] ?? ADAPTER_REGISTRY.openrouter;
  const adapter = primaryFactory();

  // 选择额外 adapters（用于交叉验证，R-47）
  const additionalAdapters: SyncAdapter[] = (additionalSources ?? [])
    .map(name => ADAPTER_REGISTRY[name])
    .filter(Boolean)
    .map(factory => factory());

  const orchestrator = new SyncOrchestrator(adapter, additionalAdapters);

  // 执行同步 — orchestrator 内部创建 SyncBatch 记录 + 完整生命周期
  const result = await orchestrator.execute(config);

  // 补充 operatorId（orchestrator 默认设 null，admin 触发需记录操作者）
  if (result.batchId) {
    await prisma.syncBatch.update({
      where: { id: result.batchId },
      data: { operatorId: ctx.userId },
    }).catch(() => void 0); // 不阻塞响应
  }

  // 写审计日志
  await writeAudit({
    actorId: ctx.userId,
    tableName: 'sync_batches',
    recordId: result.batchId,
    action: 1,
    changedFields: [source, ...(additionalSources ?? []), dryRun ? 'dry-run' : 'real'],
    oldData: Prisma.JsonNull,
    newData: {
      batchId: result.batchId,
      source,
      additionalSources: additionalSources ?? [],
      status: result.status,
      totalRecords: result.totalRecords,
      successRecords: result.successRecords,
      failedRecords: result.failedRecords,
      skippedRecords: result.skippedRecords,
    },
  });

  // Fetch validationSummary for the response (R-66: conflict report UI)
  const batchRow = await prisma.syncBatch.findUnique({
    where: { id: result.batchId },
    select: { validationSummary: true },
  });

  return {
    batchId: result.batchId,
    status: result.status,
    totalRecords: result.totalRecords,
    successRecords: result.successRecords,
    failedRecords: result.failedRecords,
    skippedRecords: result.skippedRecords,
    errors: result.errors.slice(0, 10),
    validationSummary: batchRow?.validationSummary ?? null,
  };
});
