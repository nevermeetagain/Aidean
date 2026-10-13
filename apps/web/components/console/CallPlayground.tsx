"use client";

/**
 * 控制台「调用测试台」（WP-FE01 §控制台链路）。
 *
 * 解决「模型选择 → 网关调用 → 看懂花费」断链：
 *  1) 模型选择覆盖三源——账户等级映射（Opus/Sonnet/Fable/Haiku）、自定义优先级、系统 free 池；
 *     候选项经 GET /api/v1/models?pageSize=100 解析出**可调用标识 slug**（见 seed：modelCode === slug，
 *     网关 repository.findModelByCode 按 modelCode|slug 解析），未解析出 slug 的配置项显式标注为不可调用而非静默失败；
 *  2) 调用覆盖非流式 + 流式开关；响应**按 content-type 分支**：
 *     - text/event-stream → 增量渲染（取消 / 重试 / 断流恢复）；
 *     - application/json  → 服务端聚合回退路径（现网默认，见 AIDEAN_GATEWAY_STREAM_PASSTHROUGH），单次渲染并显式提示无增量。
 *  3) 花费可解释：客户端实测延迟 + 服务端事实头（计费路径/实扣分→元/模型/站点/渠道/statusCode）+ usage（输入/输出 tokens）。
 *  4) 失败态一律给出可执行动作：余额不足→充值链接；幂等键重复→换键重试；上游/路由失败→可重试。
 *
 * 约束遵守：不引 globals.css / uiStore / ThemeProvider；不新增色值（仅复用既有 slate/primary/border/muted 与语义色）；
 * 禁直连 DB——模型候选经公开 API 取回；动画仅用 motion-safe: 前缀，兼容 prefers-reduced-motion。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";

import { MODEL_TIER_ORDER, PRIORITY_MAX, PRIORITY_MIN, type ModelTier } from "@aidean/shared";

import type { PriorityItem, TierMappingItem } from "../../lib/features/user/service";
import {
  billingPathLabel,
  createStreamAccumulator,
  gatewayErrorHint,
  isSseResponse,
  minorToYuan,
  parseAccessAggregatedBody,
  type GatewayAccessFormat,
  type GatewayErrorHint,
  type NormalizedUsage,
} from "../../lib/features/gateway/stream-parse";

/** 档位中文展示（与 GeneralForm.TIER_LABELS_CN 同口径） */
const TIER_LABELS_CN: Record<ModelTier, string> = {
  OPUS: "Opus 高能级",
  SONNET: "Sonnet 均衡级",
  FABLE: "Fable 创作级",
  HAIKU: "Haiku 轻量级",
};

/** 请求格式选项（问题 5：至少 4 种接入格式，与 shared GATEWAY_ACCESS_FORMATS 同义） */
const FORMAT_OPTIONS: ReadonlyArray<{ value: GatewayAccessFormat; label: string; hint: string }> = [
  { value: "openai", label: "OpenAI Chat", hint: "POST /chat/completions 语义，max_tokens 可选、temperature 0-2" },
  { value: "anthropic", label: "Anthropic Messages", hint: "POST /v1/messages 语义，max_tokens 必填、temperature 0-1" },
  { value: "openai-responses", label: "OpenAI Responses", hint: "POST /responses 语义（input/instructions/max_output_tokens）；服务端聚合返回，暂不支持逐字流式" },
  { value: "gemini", label: "Gemini Native", hint: "generateContent 语义（contents/parts + generationConfig）；服务端聚合返回，暂不支持逐字流式" },
];

/** responses/gemini 需服务端聚合后回写接入体裁（非 SSE 透传） */
function isAggregateOnlyFormat(format: GatewayAccessFormat): boolean {
  return format === "openai-responses" || format === "gemini";
}

/** 单次调用结果（保留最近若干条，供横向比较延迟与花费） */
interface CallRecord {
  requestId: string;
  slug: string;
  format: GatewayAccessFormat;
  stream: boolean;
  ok: boolean;
  latencyMs: number;
  billingPath: string | null;
  quotaYuan: string | null;
  usage: NormalizedUsage | null;
  statusCode: number | null;
  errorTitle?: string;
}

interface ApiModel {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  modelType: string;
}

export interface CallPlaygroundProps {
  /** 账户余额（元，SSR 注入；分→元已由 userService 统一） */
  balanceYuan: string;
  /** 账户等级映射四档（modelId + nameDisplay） */
  tiers: Record<ModelTier, TierMappingItem[]>;
  /** 自定义优先级全量（含 free 只读行） */
  priorities: PriorityItem[];
  /** 该等级生效中的免费额度模型（含刷新周期） */
  freeQuotas: ReadonlyArray<{ modelId: string; modelName: string; resetCycle: "DAY" | "WEEK" | "MONTH" }>;
}

/** 幂等键：优先 crypto.randomUUID（localhost/https 均可用），退化到时间戳+随机 */
function newRequestId(): string {
  const cryptoObj = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return `web-${cryptoObj.randomUUID()}`;
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const FIELD_CLS =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary";
const LABEL_CLS = "block text-xs font-medium text-slate-500";
const SECTION_CLS = "rounded-lg border border-border bg-card p-5";

export function CallPlayground({ balanceYuan, tiers, priorities, freeQuotas }: CallPlaygroundProps) {
  // ---------- 模型候选（客户端经公开 API 解析 modelId → 可调用 slug） ----------
  const [models, setModels] = useState<ApiModel[] | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/models?page=1&pageSize=100", { signal: controller.signal })
      .then(async (res) => (await res.json()) as { code?: number; data?: { items?: ApiModel[] } })
      .then((envelope) => {
        if (controller.signal.aborted) return;
        const items = envelope?.data?.items;
        if (envelope?.code === 0 && Array.isArray(items)) {
          setModels(items);
        } else {
          setModelsError("模型清单加载失败，可手动输入模型标识继续调用");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setModelsError(err instanceof Error ? err.message : "模型清单加载失败");
      });
    return () => controller.abort();
  }, []);

  const modelById = useMemo(() => {
    const map = new Map<string, ApiModel>();
    for (const m of models ?? []) map.set(m.id, m);
    return map;
  }, [models]);

  /** 候选分组：档位 / 优先级 / free / 全部（组内去重后各自可读） */
  const groups = useMemo(() => {
    const resolve = (modelId: string, modelName: string) => {
      const hit = modelById.get(modelId);
      return { modelId, modelName, slug: hit?.slug ?? null, vendor: hit?.vendor ?? "" };
    };
    const tierGroups = MODEL_TIER_ORDER.map((tier) => ({
      key: `tier-${tier}`,
      label: `${TIER_LABELS_CN[tier]}（等级映射）`,
      rows: (tiers[tier] ?? []).map((item) => resolve(item.modelId, item.modelName)),
    }));
    const priorityRows = priorities
      .filter((row) => !row.readOnly)
      .map((row) => resolve(row.modelId, row.modelName))
      .map((row) => ({ ...row, priority: priorities.find((p) => p.modelId === row.modelId)?.priority ?? null }));
    const freeRows = freeQuotas.map((q) => ({
      ...resolve(q.modelId, q.modelName),
      resetCycle: q.resetCycle,
    }));
    const allRows = (models ?? []).map((m) => ({
      modelId: m.id,
      modelName: m.name,
      slug: m.slug,
      vendor: m.vendor,
    }));    return { tierGroups, priorityRows, freeRows, allRows };
  }, [modelById, models, tiers, priorities, freeQuotas]);

  // ---------- 表单状态 ----------
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState("");
  const [format, setFormat] = useState<GatewayAccessFormat>("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [prompt, setPrompt] = useState("你好，请用一句话介绍你自己。");
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);
  const [streamEnabled, setStreamEnabled] = useState(false);

  // ---------- 运行态 ----------
  const [running, setRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [text, setText] = useState("");
  const [usage, setUsage] = useState<NormalizedUsage | null>(null);
  const [usageKnown, setUsageKnown] = useState(false);
  const [mode, setMode] = useState<"sse" | "json" | null>(null);
  const [meta, setMeta] = useState<{
    requestId: string;
    billingPath: string | null;
    quotaMinor: number | null;
    modelId: string | null;
    stationId: string | null;
    channelId: string | null;
    statusCode: number | null;
    latencyMs: number | null;
  } | null>(null);
  const [error, setError] = useState<{ title: string; detail: string; hint: GatewayErrorHint } | null>(null);
  const [records, setRecords] = useState<CallRecord[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingTextRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  /** 增量渲染节流：每帧至多一次 setState（长流下避免逐 chunk 重渲染） */
  const scheduleText = useCallback((next: string) => {
    pendingTextRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingTextRef.current !== null) {
        setText(pendingTextRef.current);
        pendingTextRef.current = null;
      }
    });
  }, []);

  const effectiveSlug = manualSlug.trim() || slug;

  const clampTemperature = useCallback(
    (value: number, fmt: GatewayAccessFormat) => {
      if (!Number.isFinite(value)) return 0.7;
      const max = fmt === "anthropic" ? 1 : 2;
      return Math.min(max, Math.max(0, value));
    },
    []
  );

  const resetResult = useCallback(() => {
    setText("");
    setUsage(null);
    setUsageKnown(false);
    setMode(null);
    setMeta(null);
    setError(null);
    setCancelled(false);
  }, []);

  const runCall = useCallback(async () => {
    const target = effectiveSlug;
    if (!target) {
      setError({
        title: "未选择模型",
        detail: "请先选择或手动输入模型标识（slug / modelCode）。",
        hint: { title: "未选择模型", action: "从上方候选组选择，或手动输入可调用标识。", retryable: false },
      });
      return;
    }
    if (!prompt.trim()) {
      setError({
        title: "用户消息为空",
        detail: "请输入要发送给模型的消息内容。",
        hint: { title: "用户消息为空", action: "填写用户消息后重试。", retryable: false },
      });
      return;
    }

    resetResult();
    setRunning(true);

    const requestId = newRequestId();
    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = performance.now();

    const tokens = Math.min(1_000_000, Math.max(1, Math.round(maxTokens)));
    const temp = clampTemperature(temperature, format);
    // responses/gemini 走服务端聚合（非 SSE 透传）：即使用户勾选流式也不传 stream（入体可后向转换）。
    const streaming = streamEnabled && !isAggregateOnlyFormat(format);
    const sys = systemPrompt.trim();
    // 形态判别护栏：网关按顶层 system/stop_sequences 判定 anthropic，
    // 故 OpenAI 形态把系统提示并入 messages（role=system），绝不发顶层 system。
    const body: Record<string, unknown> =
      format === "openai"
        ? {
            model: target,
            messages: [...(sys ? [{ role: "system", content: sys }] : []), { role: "user", content: prompt }],
            max_tokens: tokens,
            temperature: temp,
            ...(streaming ? { stream: true } : {}),
          }
        : format === "anthropic"
          ? {
              model: target,
              messages: [{ role: "user", content: prompt }],
              max_tokens: tokens,
              temperature: temp,
              ...(sys ? { system: sys } : {}),
              ...(streaming ? { stream: true } : {}),
            }
          : format === "openai-responses"
            ? {
                model: target,
                input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
                ...(sys ? { instructions: sys } : {}),
                max_output_tokens: tokens,
                temperature: temp,
              }
            : /* gemini */ {
                model: target,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
                generationConfig: { maxOutputTokens: tokens, temperature: temp },
              };

    let statusCode: number | null = null;
    let billingPath: string | null = null;
    let quotaMinor: number | null = null;
    let modelId: string | null = null;
    let stationId: string | null = null;
    let channelId: string | null = null;
    let finalText = "";
    let finalUsage: NormalizedUsage | null = null;
    let ok = false;
    let errorTitle: string | undefined;

    try {
      const res = await fetch("/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": requestId },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      statusCode = res.status;
      billingPath = res.headers.get("x-aidean-billing-path");
      const quotaHeader = res.headers.get("x-aidean-quota-minor");
      quotaMinor = quotaHeader === null ? null : Number(quotaHeader);
      modelId = res.headers.get("x-aidean-model-id") || null;
      stationId = res.headers.get("x-aidean-station-id") || null;
      channelId = res.headers.get("x-aidean-channel-id") || null;

      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        // 失败一律为统一信封（{code,message}），与成功体（裸上游格式）分开处理
        const envelope = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
        const code = envelope?.code ?? 50000;
        const hint = gatewayErrorHint(code, envelope?.message);
        setError({
          title: hint.title,
          detail: `${envelope?.message ?? "调用失败"}（HTTP ${res.status}${envelope?.code ? ` / code ${envelope.code}` : ""}）`,
          hint,
        });
        errorTitle = hint.title;
        return;
      }

      if (isSseResponse(contentType)) {
        // ---- 流式透传：增量渲染 + usage 尾帧归一（缺失即提示以流水为准） ----
        setMode("sse");
        // SSE 透传仅 openai/anthropic 进入（responses/gemini 已剔 stream→走 JSON 分支）；映射回上游 GatewayFormat。
        const accumulator = createStreamAccumulator(format === "anthropic" ? "anthropic" : "openai");
        const reader = res.body?.getReader();
        if (!reader) throw new Error("响应体不可读（缺少可读流）");
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulator.push(decoder.decode(value, { stream: true }));
          scheduleText(accumulator.snapshot().text);
        }
        accumulator.finish();
        const snap = accumulator.snapshot();
        finalText = snap.text;
        if (accumulator.hasUsage()) {
          // 缓存命中/推理 tokens 上游可缺省，按「有则带」合并（与 @aidean/shared NormalizedUsage 同口径）
          finalUsage = {
            promptTokens: snap.promptTokens,
            completionTokens: snap.completionTokens,
            ...(snap.cachedTokens === undefined ? {} : { cachedTokens: snap.cachedTokens }),
            ...(snap.reasoningTokens === undefined ? {} : { reasoningTokens: snap.reasoningTokens }),
          };
          setUsage(finalUsage);
          setUsageKnown(true);
        } else {
          setUsageKnown(false);
        }
        scheduleText(finalText);
      } else {
        // ---- 聚合回退：服务端已把上游流攒流归一，客户端单次渲染 ----
        setMode("json");
        const payload = (await res.json().catch(() => null)) as unknown;
        const parsed = parseAccessAggregatedBody(format, payload);
        finalText = parsed.text;
        finalUsage = parsed.usage;
        setText(finalText);
        setUsage(parsed.usage);
        setUsageKnown(parsed.usage !== null);
      }
      ok = true;
    } catch (err: unknown) {
      // 主动取消不是错误：AbortError 单独收敛为「已取消」态
      if (controller.signal.aborted) {
        setCancelled(true);
        errorTitle = "已取消";
      } else {
        const hint = gatewayErrorHint(50000, "网络异常");
        setError({
          title: "网络异常",
          detail: err instanceof Error ? err.message : "请求未完成",
          hint,
        });
        errorTitle = "网络异常";
      }
    } finally {
      const latencyMs = Math.round(performance.now() - t0);
      if (abortRef.current === controller) abortRef.current = null;
      setRunning(false);
      setMeta({
        requestId,
        billingPath,
        quotaMinor,
        modelId,
        stationId,
        channelId,
        statusCode,
        latencyMs,
      });
      setRecords((prev) =>
        [
          {
            requestId,
            slug: target,
            format,
            stream: streamEnabled,
            ok,
            latencyMs,
            billingPath,
            quotaYuan: quotaMinor === null ? null : minorToYuan(quotaMinor),
            usage: finalUsage,
            statusCode,
            errorTitle,
          },
          ...prev,
        ].slice(0, 5)
      );
    }
  }, [
    clampTemperature,
    effectiveSlug,
    format,
    maxTokens,
    prompt,
    resetResult,
    scheduleText,
    streamEnabled,
    systemPrompt,
    temperature,
  ]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const insufficient = error?.hint.recharge === true;
  const outputPlaceholder = running ? "等待首个数据块…" : "调用结果将在此展示";
  // 前端预检闸门（WP-FE01）：现网后端在「付费候选因余额不足被跳过」时不回传 40001，
  // 而是收敛为 30003「网关全部候选失败: 无可用路由」（见 service.ts 的 skipPaid 分支未写 lastError），
  // 前端无法据错误码识别余额不足。故据 SSR 余额先行提示，保证「余额不足有引导」可达；
  // 仍允许发起调用——免费额度（FREE_QUOTA）候选不依赖余额。
  const balanceMinor = Math.round(Number(balanceYuan) * 100);
  const balanceEmpty = Number.isFinite(balanceMinor) && balanceMinor <= 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="call-playground">
      {/* ---------------- 左：请求编排 ---------------- */}
      <section aria-label="调用参数" className={SECTION_CLS}>
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">调用测试台</h2>
          <span className="text-xs text-slate-500">
            余额 <span className="font-medium tabular-nums text-slate-700">¥{balanceYuan}</span>
          </span>
        </header>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          请求模型恒为链路首位；账户等级映射与自定义优先级决定后续降级候选。计费与链路事实由响应头回传，花费明细可在余额页对账。
        </p>

        {/* 模型选择 */}
        <div className="mt-4 space-y-3">
          <div>
            <label className={LABEL_CLS} htmlFor="playground-model">
              模型（按档位 / 优先级 / 免费额度分组）
            </label>
            <select
              id="playground-model"
              data-testid="playground-model"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={models === null && modelsError === null}
              className={`${FIELD_CLS} mt-1`}
            >
              <option value="">
                {models === null && modelsError === null ? "模型清单加载中…" : "请选择模型"}
              </option>
              {groups.tierGroups.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {group.rows.length === 0 ? (
                    <option value="" disabled>
                      —（该档位暂无绑定模型）
                    </option>
                  ) : (
                    group.rows.map((row) => (
                      <option key={`${group.key}-${row.modelId}`} value={row.slug ?? ""} disabled={!row.slug}>
                        {row.modelName}
                        {row.slug ? "" : "（未解析到可调用标识）"}
                      </option>
                    ))
                  )}
                </optgroup>
              ))}
              <optgroup label="自定义优先级">
                {groups.priorityRows.length === 0 ? (
                  <option value="" disabled>
                    —（暂无自定义优先级）
                  </option>
                ) : (
                  groups.priorityRows.map((row) => (
                    <option key={`prio-${row.modelId}`} value={row.slug ?? ""} disabled={!row.slug}>
                      {row.modelName}
                      {row.priority === null ? "" : `（优先级 ${row.priority}）`}
                      {row.slug ? "" : "（未解析到可调用标识）"}
                    </option>
                  ))
                )}
              </optgroup>
              <optgroup label="免费额度模型（free 池）">
                {groups.freeRows.length === 0 ? (
                  <option value="" disabled>
                    —（当前等级无免费额度模型）
                  </option>
                ) : (
                  groups.freeRows.map((row) => (
                    <option key={`free-${row.modelId}`} value={row.slug ?? ""} disabled={!row.slug}>
                      {row.modelName}
                      {`（${row.resetCycle} 刷新）`}
                      {row.slug ? "" : "（未解析到可调用标识）"}
                    </option>
                  ))
                )}
              </optgroup>
              <optgroup label={`全部可用模型（${groups.allRows.length}）`}>
                {groups.allRows.map((row) => (
                  <option key={`all-${row.modelId}`} value={row.slug}>
                    {row.modelName}
                    {row.vendor ? ` · ${row.vendor}` : ""}
                  </option>
                ))}
              </optgroup>
            </select>
            {modelsError ? (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {modelsError}
              </p>
            ) : null}
          </div>

          <div>
            <label className={LABEL_CLS} htmlFor="playground-manual-model">
              或手动输入模型标识（slug / modelCode，覆盖上方选择）
            </label>
            <input
              id="playground-manual-model"
              data-testid="playground-manual-model"
              value={manualSlug}
              onChange={(event) => setManualSlug(event.target.value)}
              placeholder="例如 claude-3-7-sonnet"
              className={`${FIELD_CLS} mt-1`}
            />
          </div>

          {/* 请求格式 */}
          <div>
            <span className={LABEL_CLS}>请求格式</span>
            <div
              role="group"
              aria-label="请求格式"
              className="mt-1 inline-flex overflow-hidden rounded-lg border border-border bg-card"
            >
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  aria-pressed={format === option.value}
                  data-testid={`playground-format-${option.value}`}
                  onClick={() => setFormat(option.value)}
                  className={`px-3.5 py-1.5 text-sm transition-colors ${
                    format === option.value
                      ? "bg-primary text-[var(--primary-foreground)]"
                      : "text-slate-600 hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 数值参数 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS} htmlFor="playground-max-tokens">
                max_tokens（{format === "anthropic" ? "必填" : "可选"}）
              </label>
              <input
                id="playground-max-tokens"
                type="number"
                min={1}
                max={1_000_000}
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
                className={`${FIELD_CLS} mt-1 tabular-nums`}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="playground-temperature">
                temperature（0-{format === "anthropic" ? 1 : 2}）
              </label>
              <input
                id="playground-temperature"
                type="number"
                min={0}
                max={format === "anthropic" ? 1 : 2}
                step={0.1}
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
                className={`${FIELD_CLS} mt-1 tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS} htmlFor="playground-system">
              系统提示（可选）
            </label>
            <textarea
              id="playground-system"
              rows={2}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder={
                format === "openai"
                  ? "将以 role=system 消息并入 messages（避免被判定为 Anthropic 形态）"
                  : format === "openai-responses"
                    ? "将以顶层 instructions 字段发送"
                    : format === "gemini"
                      ? "将以 systemInstruction.parts[].text 发送"
                      : "将以顶层 system 字段发送"
              }
              className={`${FIELD_CLS} mt-1 resize-y`}
            />
          </div>

          <div>
            <label className={LABEL_CLS} htmlFor="playground-prompt">
              用户消息
            </label>
            <textarea
              id="playground-prompt"
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className={`${FIELD_CLS} mt-1 resize-y`}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={streamEnabled && !isAggregateOnlyFormat(format)}
              disabled={isAggregateOnlyFormat(format)}
              data-testid="playground-stream-toggle"
              onChange={(event) => setStreamEnabled(event.target.checked)}
            />
            流式请求（stream=true）
            <span className="text-xs text-slate-400">
              {isAggregateOnlyFormat(format)
                ? "Responses/Gemini 接入格式由服务端聚合返回，暂不支持逐字流式"
                : "流式透传开启时逐块增量展示；未开启时服务端聚合为一次性结果"}
            </span>
          </label>
        </div>

        {/* 余额预检闸门：余额为 0 时提示付费模型将失败，但放行免费额度调用 */}
        {balanceEmpty ? (
          <p
            data-testid="playground-balance-warning"
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs leading-relaxed text-amber-700"
          >
            当前账户余额为 ¥{balanceYuan}，付费模型会因预扣失败而调用失败（后端可能回报「无可用路由」）。
            如需调用付费模型请先
            <Link href="/user/balance" className="mx-1 font-medium underline">
              前往充值
            </Link>
            ；仅使用免费额度（free 池）模型时可直接调用。
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runCall}
            disabled={running}
            data-testid="playground-run"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {running ? "调用中…" : "发起调用"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={!running}
            data-testid="playground-cancel"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            取消
          </button>
          <button
            type="button"
            onClick={runCall}
            disabled={running}
            data-testid="playground-retry"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重试（换幂等键）
          </button>
        </div>
      </section>

      {/* ---------------- 右：结果与花费 ---------------- */}
      <section aria-label="调用结果" className={SECTION_CLS}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">结果与花费</h2>
          <span className="text-xs text-slate-500" data-testid="playground-status" aria-live="polite">
            {running ? "调用中…" : cancelled ? "已取消" : error ? "失败" : mode ? "成功" : "空闲"}
          </span>
        </header>

        {/* 事实头：延迟 / 计费路径 / 实扣 / 链路标识 */}
        {meta ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border bg-muted px-3 py-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">客户端实测延迟</dt>
              <dd className="tabular-nums font-medium text-slate-700" data-testid="playground-latency">
                {meta.latencyMs === null ? "—" : `${meta.latencyMs} ms`}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">HTTP 状态</dt>
              <dd className="tabular-nums font-medium text-slate-700">{meta.statusCode ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">计费路径</dt>
              <dd className="font-medium text-slate-700" data-testid="playground-billing-path">
                {billingPathLabel(meta.billingPath)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">本次实扣</dt>
              <dd className="tabular-nums font-medium text-slate-700" data-testid="playground-charge">
                {meta.quotaMinor === null ? "以流水为准" : `¥${minorToYuan(meta.quotaMinor)}`}
              </dd>
            </div>
            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>requestId：{meta.requestId}</span>
              {meta.modelId ? <span>model：{meta.modelId.slice(0, 8)}</span> : null}
              {meta.stationId ? <span>station：{meta.stationId.slice(0, 8)}</span> : null}
              {meta.channelId ? <span>channel：{meta.channelId.slice(0, 8)}</span> : null}
            </div>
          </dl>
        ) : null}

        {/* 错误态：标题 + 明细 + 可执行动作 */}
        {error ? (
          <div
            role="alert"
            data-testid="playground-error"
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm"
          >
            <p className="flex items-center gap-2 font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-red-700/90">{error.detail}</p>
            <p className="mt-2 text-xs text-red-700">{error.hint.action}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {insufficient ? (
                <Link
                  href="/user/balance"
                  data-testid="playground-recharge-link"
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  前往充值
                </Link>
              ) : null}
              {error.hint.retryable ? (
                <button
                  type="button"
                  onClick={runCall}
                  disabled={running}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
                >
                  重试
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 已取消态 */}
        {cancelled && !error ? (
          <p
            data-testid="playground-cancelled"
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-700"
          >
            已取消本次调用；已产生的上游输出按服务端结算口径计入本次调用，可点击「重试」以新的幂等键重新发起。
          </p>
        ) : null}

        {/* 输出区 */}
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className={LABEL_CLS}>模型输出</span>
            {mode === "sse" ? (
              <span className="text-[11px] text-slate-400">SSE 增量渲染</span>
            ) : mode === "json" ? (
              <span className="text-[11px] text-slate-400" data-testid="playground-aggregate-note">
                服务端聚合回退（当前无增量，含流式请求）
              </span>
            ) : null}
          </div>
          <pre
            data-testid="playground-output"
            aria-live="polite"
            className="mt-1 min-h-[120px] max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
          >
            {text}
            {running ? (
              <span aria-hidden="true" className="ml-0.5 inline-block text-primary motion-safe:animate-pulse">
                ▌
              </span>
            ) : null}
            {!text && !running ? <span className="text-slate-400">{outputPlaceholder}</span> : null}
          </pre>
        </div>

        {/* 用量 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {usage && usageKnown ? (
            <>
              <span data-testid="playground-usage">
                输入 {usage.promptTokens.toLocaleString()} · 输出 {usage.completionTokens.toLocaleString()} tokens
              </span>
              {usage.cachedTokens !== undefined ? <span>缓存命中 {usage.cachedTokens.toLocaleString()}</span> : null}
              {usage.reasoningTokens !== undefined ? <span>推理 {usage.reasoningTokens.toLocaleString()}</span> : null}
            </>
          ) : (
            <span data-testid="playground-usage-unknown">未捕获到用量，本次花费以余额页流水为准</span>
          )}
        </div>

        {/* 近期调用记录 */}
        {records.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">近期调用</h3>
            <ul className="mt-1 divide-y divide-border" data-testid="playground-records">
              {records.map((record) => (
                <li key={record.requestId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    {record.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Ban className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    )}
                    {record.slug}
                  </span>
                  <span className="text-slate-500">
                    {record.format} · {record.stream ? "流式" : "非流"} · {record.latencyMs} ms ·{" "}
                    {record.quotaYuan === null ? "以流水为准" : `¥${record.quotaYuan}`}
                    {record.errorTitle ? ` · ${record.errorTitle}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          优先级取值域 {PRIORITY_MIN}-{PRIORITY_MAX}；网关为 API 中转面，成功响应体为上游原始格式（无统一信封），
          计费事实经 x-aidean-* 响应头暴露。
        </p>
      </section>
    </div>
  );
}
