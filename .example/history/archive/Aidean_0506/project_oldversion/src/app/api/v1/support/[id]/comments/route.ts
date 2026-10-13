import { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { errorResponse, successResponse } from "@/lib/api/response";
import { verifyToken } from "@/lib/services/auth.service";

function getToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function createFollowUpReply(content: string) {
  return `已继续记录您的补充信息：「${content.slice(0, 70)}${content.length > 70 ? "..." : ""}」。智能客服会先整理关键诉求，人工顾问可在后台反馈列表中继续处理并回复。`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(getToken(request));
    if (!user) {
      return errorResponse("请先登录后继续咨询", 401);
    }

    const body = await request.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return errorResponse("回复内容不能为空", 400);
    }

    const ticket = await prisma.feedback.findFirst({
      where: { id: params.id, userId: user.id, category: "BUSINESS_CONSULTING" },
      select: { id: true },
    });

    if (!ticket) {
      return errorResponse("咨询记录不存在", 404);
    }

    await prisma.feedbackComment.create({
      data: {
        feedbackId: ticket.id,
        userId: user.id,
        content,
        isInternal: false,
      },
    });

    await prisma.feedbackComment.create({
      data: {
        feedbackId: ticket.id,
        userId: user.id,
        content: createFollowUpReply(content),
        isInternal: false,
      },
    });

    const updated = await prisma.feedback.update({
      where: { id: ticket.id },
      data: { status: "PROCESSING" },
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          select: { id: true, userId: true, content: true, createdAt: true },
        },
      },
    });

    return successResponse(updated, "回复已提交");
  } catch (error) {
    console.error("Error creating support comment:", error);
    return errorResponse("提交回复失败");
  }
}
