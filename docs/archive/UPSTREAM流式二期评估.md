# UPSTREAM 流式二期评估

> 版本: v1.0 | 更新: 2026-09-16 | 变更: 首次评估（CLOSER-07 T5），结论：不建议 MVP 实施

## 1. 现状

`gatewayOrchestrator.executeChat`（`lib/features/gateway/service.ts`）中，UPSTREAM 计费路径
（用户自有 Key 直调上游站）在 `stream=true` 时**显式跳过**：

```
if (rule?.billingMode === "UPSTREAM") {
  if (body.stream === true) {
    lastError = "UPSTREAM 站暂不支持流式直连（二期），已跳过该候选";
    lastPath = "UPSTREAM";
    continue;  // 跳过该候选，按既有"换站→降级"序续行
  }
  ...
}
```

FREE_PROXY（自定义渠道）分支同理：仅 `callUpstream`（非流式直调），不进入
`callUpstreamAggregated` 或 `callUpstreamStream` 分派。两者在 `stream=true` 时，
用户最终回落到 PLATFORM 站的聚合路径（`callUpstreamAggregated` 攒流为非流式 JSON）。

## 2. 聚合 vs 透传：交互差异

| 维度 | callUpstreamAggregated（现行 PLATFORM stream=true） | callUpstreamStream（二期透传） |
|---|---|---|
| 客户端体验 | 攒流完毕后一次性返回完整 JSON（非 SSE） | 首字节即推送 SSE，边收边发 |
| 首字节延迟 | = 上游完整响应时间（可能数秒~数十秒） | ≈ 上游首字节时间（数百 ms） |
| 计费时序 | hold → capture（同步，响应完整后一次结算） | hold → CAPTURING → settle（异步，流结束后终态化） |
| 幂等锚点 | requestId（usage_log upsert） | requestId + `:stream-final`（长窗口标记 hold） |
| 中断处理 | 上游失败 → void + 换 Key/站；客户端断连无影响 | 客户端断连 → settle(true) ABORTED，按已产出 capture |
| usage 来源 | 上游响应 JSON.usage（归一 parseUpstreamUsage） | SSE 尾帧 usage（createStreamMeter absorbOpenAI/absorbAnthropic） |

## 3. 幂等语义：无 hold 即无 `:stream-final` 锚

UPSTREAM 路径的核心特征是**不 hold/capture**（不扣平台余额）。现行 PLATFORM 透传的
幂等设计依赖 `:stream-final` 标记 hold（1 分兜底冻结）作为长窗口锚——
UPSTREAM 路径无此 hold，意味着：

- **终态化无锚点**：`finalizeStreamUsageLog` 以 requestId 为唯一键回填 usage_log。
  UPSTREAM 流式可复用此路径（requestId 已在 insertUsageLog 时落库），不依赖 hold。
- **断连兜底缺失**：PLATFORM 透传在客户端断连时，settle(true) 会 captureHold 已产出量。
  UPSTREAM 无 hold，断连时**无 capture 可执行**——但仍需 finalizeStreamUsageLog
  （按已产出 tokens 写 usage_log，quotaMinor=0）。**语义上可行**（UPSTREAM 不扣平台余额，
  断连不产生平台账面损失），但需确认 settle 中 `billingPath === "UPSTREAM"` 时跳过 hold/capture
  分支（现行 settle 仅判 `PLATFORM` 和 `FREE_QUOTA`，需加 UPSTREAM 兜底）。

## 4. 计量口径

| 场景 | 现行（非流式） | 二期（流式透传） |
|---|---|---|
| usage 来源 | 上游响应 JSON.usage（parseUpstreamUsage 归一） | SSE 尾帧 usage（createStreamMeter） |
| 尾帧缺失 | 不适用（非流式响应必有 usage 或按 0 记） | 按已产出字符高估估算（`text.length` tokens） |
| quotaMinor | 0n（UPSTREAM 免扣） | 0n（同口径） |
| usage_log | isStream=false | isStream=true，finalize=OK/ESTIMATED/ABORTED |

计量口径与 PLATFORM 透传**完全一致**（createStreamMeter 已按 format 分派 OpenAI/Anthropic
尾帧解析），无需新增解析逻辑。

## 5. 风险

1. **上游兼容性**：用户自填的上游站（baseUrl）可能不支持 SSE 流式（部分 OpenAI 兼容 API
   仅返回非流式 JSON）。需 `callUpstreamStream` 失败时 fallback 到 `callUpstream`（非流式），
   或在上游不支持流式时返回错误。现行 FREE_PROXY 分支无此 fallback。

2. **密钥解密在流式上下文**：UPSTREAM 流式需在 `callUpstreamStream` 调用前 `decryptSecret`
   （与现行非流式分支一致）。`decryptSecret` 是同步 CPU 操作（<1ms），不引入流式首字节延迟。

3. **station_user_keys 密文列兼容**：T3 后 CustomChannel 已加密，station_user_keys 本就加密。
   两者均已在 `executeChat` 读侧 decrypt，流式分支复用同一解密路径，无额外风险。

4. **并发双写**：UPSTREAM 路径无 hold，但 `insertUsageLog` 以 requestId 幂等 upsert。
   流式 + 非流式双写（MVP 接受上游可能被调用两次）在 UPSTREAM 路径同样存在——
   但因 quotaMinor=0n，双写不产生重复扣费，仅重复 usage_log 行（upsert 兜底）。

## 6. 工作量评估

| 工作项 | 预计 | 说明 |
|---|---|---|
| executeChat UPSTREAM 分支加 stream=true 透传分派 | 0.5d | 移除 `continue`，加 `callUpstreamStream` 分支 |
| settle 加 UPSTREAM billingPath 兜底（跳过 hold/capture） | 0.2d | settle 函数加 `if (billingPath === "UPSTREAM")` 分支 |
| callUpstreamStream 失败 fallback 到 callUpstream | 0.3d | 上游不支持流式时的降级 |
| 测试（stream-passthrough.spec 扩展 UPSTREAM 用例） | 0.5d | 4-6 例：正常流/尾帧缺失/断连/上游不支持流式 |
| 文档同步 | 0.2d | 网关计费时序契约 §2 五态表 FREE_PROXY/UPSTREAM 行 |
| **合计** | **~1.7d** | — |

## 7. 结论

**不建议 MVP 实施。** 理由：

1. **UPSTREAM 路径的核心价值是"用户自有 Key 直调上游、不扣平台余额"**，流式与否不影响
   这一核心价值——用户可通过非流式调用获得相同结果（仅首字节延迟较高）。
2. **风险/收益不对称**：1.7d 工作量不大，但上游兼容性风险（用户自填站可能不支持 SSE）
   需额外 fallback 逻辑，且测试覆盖面扩大。MVP 阶段 UPSTREAM 用户量有限，流式需求不迫切。
3. **PLATFORM 透传优先级更高**：二期透传（PASSTHROUGH_ENABLED）目前仍为 `false`，
   PLATFORM 路径的透传尚未启用。应先收敛 PLATFORM 透传（已有完整实现 + 测试），
   再评估 UPSTREAM 流式扩展。
4. **降级序已兜底**：`stream=true` 跳过 UPSTREAM 候选后，用户回落 PLATFORM 聚合路径
   （callUpstreamAggregated），功能不受损——仅计费路径从 UPSTREAM 变为 PLATFORM（扣平台余额）。
   若用户坚持 UPSTREAM + 流式，可建议其使用非流式调用。

**建议时机**：PLATFORM 透传（PASSTHROUGH_ENABLED=true）正式启用并稳定运行 1 个迭代周期后，
再评估 UPSTREAM 流式扩展。届时可复用 createStreamMeter + finalizeStreamUsageLog 全套基础设施，
工作量与风险均收敛。
