import { NextRequest, NextResponse } from "next/server";
import { getComparisons } from "@/lib/services/model.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
    };
    const result = await getComparisons(params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, description, prompt, evalType, comparisonMode, modelIds } = body;

    if (!userId || !prompt) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        userId,
        title: title || "未命名评测",
        description,
        prompt,
        evalType: evalType || "comparison",
        comparisonMode,
        config: {},
        criteria: {},
      },
    });

    if (modelIds && Array.isArray(modelIds)) {
      await prisma.evaluationModel.createMany({
        data: modelIds.map((modelId: string) => ({
          evaluationId: evaluation.id,
          modelId,
          status: "pending",
        })),
      });
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
