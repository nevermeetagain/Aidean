/**
 * /api/v1/admin/benchmarks — Benchmark 管理列表 + 手动录入（T-3.4.1）。
 *
 * GET：requireAdminApi → 分页 + modelCode/benchmarkType/verifiedStatus 过滤。
 * POST：requireAdminApi → 手动录入基准测试数据 + 写 AuditLog。
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../lib/features/auth/session';
import { withApi } from '../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.benchmarks.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const modelCode = url.searchParams.get('modelCode');
  const benchmarkType = url.searchParams.get('benchmarkType');
  const verifiedStatus = url.searchParams.get('verifiedStatus');

  const where: Prisma.BenchmarkWhereInput = {};
  if (modelCode) {
    where.model = { modelCode: { contains: modelCode, mode: 'insensitive' } };
  }
  if (benchmarkType) {
    where.benchmarkType = { contains: benchmarkType, mode: 'insensitive' };
  }
  if (verifiedStatus !== null && verifiedStatus !== undefined) {
    where.verifiedStatus = parseInt(verifiedStatus);
  }

  const [items, total] = await Promise.all([
    prisma.benchmark.findMany({
      where,
      orderBy: { testDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        model: {
          select: { modelCode: true, nameDisplay: true },
        },
      },
    }),
    prisma.benchmark.count({ where }),
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
  const ctx = await requireAdminApi("admin.benchmarks.write");

  const body = await req.json();
  const { modelId, benchmarkType, totalScore, testDate, sourceName, scores, sourceType } = body;

  if (!modelId || !benchmarkType || totalScore === undefined) {
    return NextResponse.json(
      { error: 'modelId, benchmarkType, totalScore 为必填' },
      { status: 400 }
    );
  }

  // Verify model exists
  const model = await prisma.aiModel.findFirst({
    where: { id: modelId, deletedAt: null },
    select: { id: true, modelCode: true },
  });

  if (!model) {
    return NextResponse.json({ error: '模型不存在或已删除' }, { status: 404 });
  }

  // Create benchmark
  const benchmark = await prisma.benchmark.create({
    data: {
      modelId,
      benchmarkType,
      totalScore: parseFloat(totalScore),
      testDate: testDate ? new Date(testDate) : new Date(),
      sourceName: sourceName ?? 'admin_manual',
      sourceType: sourceType ?? 'SELF',
      scores: scores ?? {},
      verifiedStatus: 0,
    },
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      tableName: 'benchmarks',
      recordId: benchmark.id,
      action: 1,
      changedFields: ['modelId', 'benchmarkType', 'totalScore', 'sourceName'],
      oldData: Prisma.JsonNull,
      newData: {
        modelId,
        benchmarkType,
        totalScore: parseFloat(totalScore),
        sourceName: sourceName ?? 'admin_manual',
      },
    },
  });

  return { benchmark };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
