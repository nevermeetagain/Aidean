import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chartType = searchParams.get("chartType") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const chartWhere: any = {};
    if (chartType) {
      chartWhere.chartType = chartType;
    }

    const charts = await prisma.ladderChart.findMany({
      where: chartWhere,
      include: {
        rankings: {
          include: {
            model: {
              include: {
                vendor: { select: { id: true, name: true, nameCn: true, logoUrl: true, brandColor: true } },
                prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
                scores: true,
              },
            },
          },
          orderBy: { rankPosition: "asc" },
        },
      },
    });

    return NextResponse.json({ items: charts, total: charts.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
