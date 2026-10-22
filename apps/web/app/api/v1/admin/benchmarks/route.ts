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
import { parseOptionalInt, parseIntParam, parsePagination } from '../../../../../lib/http/pagination';
import { ApiError, ERROR_CODES } from '../../_lib/errors';
import { withApi } from '../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.benchmarks.read");

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
  if (verifiedStatus !== null && verifiedStatus !== "") {
    const parsedVerifiedStatus = parseOptionalInt(url, 'verifiedStatus');
    if (parsedVerifiedStatus === undefined) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, '参数 verifiedStatus 必须为整数');
    }
    where.verifiedStatus = parsedVerifiedStatus;
  }

  const [items, total] = await Promise.all([
    prisma.benchmark.findMany({
      where,
      orderBy: { testDate: 'desc' },
      skip,
      take,
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
