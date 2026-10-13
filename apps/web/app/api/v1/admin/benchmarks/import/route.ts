/**
 * POST /api/v1/admin/benchmarks/import — CSV 批量导入 Benchmark（R-20 修复 + R-33 provenance 补全）。
 *
 * 接收 CSV 文本（multipart/form-data 的 file 字段 或 text/csv body）。
 * CSV 格式：modelCode,benchmarkType,totalScore,testDate,sourceName,score1,score2,...
 * importBatchId 幂等：客户端可通过 x-import-batch-id header 传入相同 ID，重复导入时返回已有结果而非创建新行。
 *
 * R-33 provenance：创建 SyncBatch 记录（source='manual'），syncBatchId 写入每条 Benchmark.rawData。
 *
 * 安全：单次最多 500 行；modelCode 不存在则跳过并记录。
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../_lib/audit";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

interface ParsedRow {
  modelCode: string;
  benchmarkType: string;
  totalScore: number;
  testDate?: string;
  sourceName?: string;
  scores: Record<string, number>;
}

function parseCsv(csvText: string): ParsedRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return []; // header + at least 1 row

  const headers = lines[0].split(",").map(h => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < Math.min(lines.length, MAX_ROWS + 1); i++) {
    const cells = lines[i].split(",").map(c => c.trim());
    const modelCode = cells[headers.indexOf("modelCode")] ?? cells[0];
    const benchmarkType = cells[headers.indexOf("benchmarkType")] ?? cells[1];
    const totalScoreStr = cells[headers.indexOf("totalScore")] ?? cells[2];
    const testDate = cells[headers.indexOf("testDate")] ?? cells[3];
    const sourceName = cells[headers.indexOf("sourceName")] ?? cells[4];

    const totalScore = parseFloat(totalScoreStr);
    if (!modelCode || !benchmarkType || isNaN(totalScore)) continue;

    // Extra columns become scores
    const scores: Record<string, number> = {};
    for (let j = 5; j < headers.length && j < cells.length; j++) {
      const key = headers[j] || `score_${j - 4}`;
      const val = parseFloat(cells[j]);
      if (!isNaN(val)) scores[key] = val;
    }

    rows.push({ modelCode, benchmarkType, totalScore, testDate, sourceName, scores });
  }

  return rows;
}

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.benchmarks.write");

  let csvText = "";
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (file instanceof File) {
      csvText = await file.text();
    }
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "CSV 内容为空" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV 解析失败或无有效行" }, { status: 400 });
  }

  // Idempotency: accept client-supplied importBatchId via header; generate if absent.
  const importBatchId = req.headers.get("x-import-batch-id") ?? randomUUID();
  let imported = 0;
  const skipped: string[] = [];

  // If client supplied an importBatchId, check for existing records to avoid duplicates.
  if (req.headers.has("x-import-batch-id")) {
    const existing = await prisma.benchmark.findFirst({
      where: { rawData: { path: ["importBatchId"], equals: importBatchId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({
        importBatchId,
        skippedModels: [],
        imported: 0,
        skipped: 0,
        total: 0,
        message: "Import batch already processed (idempotent skip).",
      });
    }
  }

  // Resolve model codes to IDs
  const modelCodes = [...new Set(rows.map(r => r.modelCode))];
  const models = await prisma.aiModel.findMany({
    where: { modelCode: { in: modelCodes }, deletedAt: null },
    select: { id: true, modelCode: true },
  });
  const modelMap = new Map(models.map((m: { id: string; modelCode: string }) => [m.modelCode, m.id]));

  // R-33: 创建 SyncBatch provenance 记录
  const syncBatch = await prisma.syncBatch.create({
    data: {
      batchCode: `CSV-IMPORT-${importBatchId.slice(0, 8)}`,
      source: "manual",
      sourceUrl: null,
      status: "running",
      totalRecords: rows.length,
      successRecords: 0,
      failedRecords: 0,
      operatorId: ctx.userId,
      operatorNotes: `CSV import: ${rows.length} rows`,
    },
  });

  for (const row of rows) {
    const modelId = modelMap.get(row.modelCode);
    if (!modelId) {
      skipped.push(row.modelCode);
      continue;
    }

    await prisma.benchmark.create({
      data: {
        modelId,
        benchmarkType: row.benchmarkType,
        totalScore: row.totalScore,
        testDate: row.testDate ? new Date(row.testDate) : new Date(),
        sourceName: row.sourceName ?? `import_${importBatchId.slice(0, 8)}`,
        sourceType: "SELF",
        scores: row.scores,
        rawData: {
          importBatchId,
          syncBatchId: syncBatch.id,
          importedAt: new Date().toISOString(),
          importedBy: ctx.userId,
        },
      },
    });
    imported++;
  }

  // R-33: 更新 SyncBatch 最终状态
  await prisma.syncBatch.update({
    where: { id: syncBatch.id },
    data: {
      status: imported > 0 ? "completed" : "failed",
      successRecords: imported,
      failedRecords: skipped.length,
      validationSummary: {
        importBatchId,
        totalRows: rows.length,
        skippedModels: [...new Set(skipped)],
      },
    },
  });

  await writeAudit({
    actorId: ctx.userId,
    tableName: "benchmarks",
    recordId: importBatchId,
    action: 1,
    changedFields: ["import"],
    newData: { imported, skipped: skipped.length, total: rows.length, syncBatchId: syncBatch.id },
    requestId: req.headers.get("x-request-id"),
  });

  return {
    importBatchId,
    syncBatchId: syncBatch.id,
    imported,
    skipped: skipped.length,
    skippedModels: [...new Set(skipped)],
    total: rows.length,
  };
});
