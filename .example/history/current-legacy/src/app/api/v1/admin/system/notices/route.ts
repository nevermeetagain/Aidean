import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/middleware/auth";

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const isActive = searchParams.get("isActive");
    const isPinned = searchParams.get("isPinned");

    const where: any = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    if (isPinned !== null && isPinned !== undefined) {
      where.isPinned = isPinned === "true";
    }

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, isPinned, isPublished, priority, publishedAt, expiredAt } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || "system",
        isPinned: isPinned || false,
        isPublished: isPublished !== false,
        priority: priority || 0,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        expiredAt: expiredAt ? new Date(expiredAt) : null,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
