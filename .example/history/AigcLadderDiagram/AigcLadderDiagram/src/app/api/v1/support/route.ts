import { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { errorResponse, successResponse } from "@/lib/api/response";
import { verifyToken } from "@/lib/services/auth.service";

function getToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function createAiReply(content: string) {
  const normalized = content.trim();
  if (normalized.length < 12) {
    return "我是 Aidean 智能客服，已收到您的咨询。为了更快定位问题，请补充业务场景、当前进度、期望目标或报错截图，我们会继续协助。";
  }
  return `我是 Aidean 智能客服，已收到您的咨询：「${normalized.slice(0, 80)}${normalized.length > 80 ? "..." : ""}」。我会先为您生成服务记录，后台顾问会结合模型选型、知识库、数字分身和解决方案能力继续跟进。`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(getToken(request));
    if (!user) {
      return errorResponse("请先登录后查看咨询记录", 401);
    }

    const tickets = await prisma.feedback.findMany({
      where: { userId: user.id, category: "BUSINESS_CONSULTING" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          select: { id: true, userId: true, content: true, createdAt: true },
        },
      },
    });

    return successResponse(tickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return errorResponse("获取咨询记录失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(getToken(request));
    if (!user) {
      return errorResponse("请先登录后发起业务咨询", 401);
    }

    const body = await request.json();
    const content = String(body.content || "").trim();
    const subject = String(body.subject || content.slice(0, 36) || "业务咨询").trim();
    const priority = String(body.priority || "normal");

    if (!content) {
      return errorResponse("咨询内容不能为空", 400);
    }

    const ticket = await prisma.feedback.create({
      data: {
        userId: user.id,
        type: "QUESTION",
        category: "BUSINESS_CONSULTING",
        subject,
        content,
        priority,
        status: "PROCESSING",
        comments: {
          create: {
            userId: user.id,
            content: createAiReply(content),
            isInternal: false,
          },
        },
      },
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          select: { id: true, userId: true, content: true, createdAt: true },
        },
      },
    });

    return successResponse(ticket, "咨询已提交");
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return errorResponse("提交咨询失败");
  }
}
