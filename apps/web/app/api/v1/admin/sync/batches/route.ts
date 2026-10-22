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
import { parseIntParam, parsePagination } from '../../../../../../lib/http/pagination';
import { SyncOrchestrator } from '../../../../../../lib/sync/sync-orchestrator';
import { ADAPTER_REGISTRY } from '../../../../../../lib/sync/sources/adapters';
import { ApiError, ERROR_CODES } from '../../../_lib/errors';
import { writeAudit } from '../../../_lib/audit';
import { withApi } from '../../../_lib/handler';
import type { SyncConfig, SyncSource } from '../../../../../../lib/sync/types/sync';
import type { SyncAdapter } from '../../../../../../lib/sync/adapters/base';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.sync.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：非法整数串显式 400（不再 500，也不静默回退）；
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ['page', 'pageSize'] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== '' && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const status = url.searchParams.get('status');

  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.syncBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
