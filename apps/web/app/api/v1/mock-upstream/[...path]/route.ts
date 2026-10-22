/**
 * POST /api/v1/mock-upstream/[...path] — dev/e2e 专用 mock 上游（Task G.4.1）。
 *
 * 目录不可用 `_mock` 命名：Next.js App Router 以 `_` 开头目录为私有文件夹，不生成路由。
 * 改用 mock-upstream + 运行时守卫双保险。
 *
 * catch-all 形态：网关 callUpstream 以站点 baseUrl 拼接端点后缀
 * （OpenAI {base}/chat/completions / Anthropic {base}/v1/messages），
 * 本路由捕获全部后缀并按路径回吐对应协议形状，使站点 baseUrl
 * 只需指向 http://localhost:3000/api/v1/mock-upstream 即可双格式复用。
 *
 * **运行时守卫**：仅当 AIDEAN_ENABLE_MOCK_UPSTREAM=1 时可用，否则 404——
 * 生产环境默认无此环境变量，网关降级链不会触达本路由（等价"生产无 mock"验收口径）。
 *
 * 行为：
 * - query.delay_ms：模拟上游延迟（默认 0）；
 * - query.fail_rate：0~1 失败率（Math.random < fail_rate → 500）；
 * - body.echo（可选）：固定回复文本，默认 "Mock upstream reply"。
 * - 路径含 /v1/messages → Anthropic 形状响应；否则 OpenAI 形状。
 * usage：prompt = ceil(messages JSON 长度/4)；completion = ceil(echo 长度/4)。
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (process.env.AIDEAN_ENABLE_MOCK_UPSTREAM !== "1") {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const delayMs = Math.max(0, Number(url.searchParams.get("delay_ms") ?? 0) || 0);
  const failRate = Math.min(1, Math.max(0, Number(url.searchParams.get("fail_rate") ?? 0) || 0));
  let body: { messages?: unknown[]; echo?: string; stream?: boolean } = {};
  try {
    body = (await req.json()) as { messages?: unknown[]; echo?: string; stream?: boolean };
  } catch {
    body = {};
  }

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  if (failRate > 0 && Math.random() < failRate) {
    return NextResponse.json({ error: { message: "Mock upstream failure", type: "mock_error" } }, { status: 500 });
  }

  const echo = typeof body.echo === "string" && body.echo.length > 0 ? body.echo : "Mock upstream reply";
  const promptTokens = Math.ceil(JSON.stringify(body.messages ?? []).length / 4);
  const completionTokens = Math.ceil(echo.length / 4);
  const isAnthropicPath = url.pathname.endsWith("/v1/messages");

  // 流式回放（透传联调用）：请求 stream=true 时按 SSE 行协议分片回吐，
  // 帧形态与真实上游一致（OpenAI delta/usage 末帧/DONE；Anthropic message 事件流）。
  // query.sse_mode 控制三态：usage（尾帧带 usage，缺省）/ no_usage（尾帧缺失，验 ESTIMATED）/
  // abort（中途断流，验 ABORTED）。
  if (body.stream === true) {
    const sseMode = url.searchParams.get("sse_mode") ?? "usage";
    const encoder = new TextEncoder();
    const openAiFrames: string[] = [
      `data: ${JSON.stringify({ choices: [{ delta: { role: "assistant", content: "" } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: echo } }] })}\n\n`,
    ];
    if (sseMode === "usage") {
      openAiFrames.push(
        `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } })}\n\n`
      );
    }
    openAiFrames.push(sseMode === "abort" ? "" : "data: [DONE]\n\n");

    const anthropicFrames: string[] = [
      `data: ${JSON.stringify({ type: "message_start", message: { usage: { input_tokens: promptTokens, output_tokens: 0 } } })}\n\n`,
      `data: ${JSON.stringify({ type: "content_block_delta", delta: { text: echo } })}\n\n`,
    ];
    if (sseMode === "usage") {
      anthropicFrames.push(
        `data: ${JSON.stringify({ type: "message_delta", usage: { output_tokens: completionTokens } })}\n\n`
      );
    }
    anthropicFrames.push(
      sseMode === "abort" ? "" : `data: ${JSON.stringify({ type: "message_stop" })}\n\n`
    );

    const frames = isAnthropicPath ? anthropicFrames : openAiFrames;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) {
          if (frame) controller.enqueue(encoder.encode(frame));
        }
        if (sseMode === "abort") controller.error(new Error("mock upstream aborted"));
        else controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
    });
  }

  if (isAnthropicPath) {
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      type: "message",
      role: "assistant",
      model: "mock-model",
      content: [{ type: "text", text: echo }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: promptTokens, output_tokens: completionTokens },
    });
  }

  return NextResponse.json({
    id: `mock-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "mock-model",
    choices: [{ index: 0, message: { role: "assistant", content: echo }, finish_reason: "stop" }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
  });
}

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
