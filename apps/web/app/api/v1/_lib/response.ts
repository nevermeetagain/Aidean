/**
 * API v1 统一响应封装：信封四要素 {code, message, data, requestId}。
 *
 * 约定见 docs/architecture/API接口文档.md §4「统一响应」：
 * - 成功固定 code=0、message="ok"；
 * - 错误时 data 恒为 null，message 为人类可读文案；
 * - 所有响应携带 x-request-id 头，便于日志追踪（优先透传入站值，否则自动生成）。
 */
import { NextResponse } from "next/server";

import { DEFAULT_STATUS_BY_CODE } from "./errors";

/** 信封主体（与 @aidean/shared 的 envelope() 校验形一致） */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T | null;
  requestId: string;
}

export interface ApiResponseInit extends ResponseInit {
  /** 透传入站 requestId；缺省时自动生成并写入 x-request-id 响应头 */
  requestId?: string;
}

/** 自动生成请求追踪 ID */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

function toEnvelopeResponse<T>(
  body: ApiEnvelope<T>,
  status: number,
  init?: ApiResponseInit
): NextResponse<ApiEnvelope<T>> {
  // 从 init 中剥离 requestId 后合并标准 ResponseInit，保证响应头恒有 x-request-id
  const { requestId: _ignored, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  headers.set("x-request-id", body.requestId);
  return NextResponse.json(body, { ...rest, status, headers });
}

/** 成功响应：{code:0,message:"ok",data,requestId} */
export function successResponse<T>(
  data: T,
  init?: ApiResponseInit
): NextResponse<ApiEnvelope<T>> {
  return toEnvelopeResponse(
    { code: 0, message: "ok", data, requestId: init?.requestId ?? generateRequestId() },
    init?.status ?? 200,
    init
  );
}

/**
 * 错误响应：{code,message,data:null,requestId}，恒四要素。
 * HTTP 状态推断优先级：显式 statusOverride > 业务码映射（DEFAULT_STATUS_BY_CODE）>
 * 默认规则：50000 → 500（服务器侧故障），其余 → 400（客户端侧问题）。
 */
export function errorResponse(
  code: number,
  message: string,
  requestId?: string,
  statusOverride?: number
): NextResponse<ApiEnvelope<never>> {
  const status =
    statusOverride ?? DEFAULT_STATUS_BY_CODE[code] ?? (code === 50000 ? 500 : 400);
  return toEnvelopeResponse<never>(
    { code, message, data: null, requestId: requestId ?? generateRequestId() },
    status
  );
}
