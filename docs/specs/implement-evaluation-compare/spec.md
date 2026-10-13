# 对比测评（EVAL-01）实现 Spec

> change-id: `implement-evaluation-compare` | 语言: 中文 | 版本: v1.1 | 创建: 2026-09-15 | 更新: 2026-09-17
> 状态：实现完成 + RW-3 集成收口（#26 仲裁定论 billingExempt 落地、D1–D7 七项缺陷修复、G6 18/18 全绿、门禁双向绿、浏览器取证 5/5）

---

## 为什么（Why）

对比测评是「免费看数据、付费比数据」商业闭环的另一半。域桩（types/schema/repository/service 四个 TODO）、数据表（Evaluation/EvaluationModel）、计费原语（billing hold/capture/void）、配置键（pricing.evalPerModel=2 元/模型）均已就位，本包补齐完整用户能力：Dock 暂存 → 创建即跑 → 并排详情 → 历史回看，账本铁律贯穿。

## 状态机（Evaluation.status）

| 值 | 语义 | 进入 | 退出 |
|---|---|---|---|
| 0 | 待执行 | 建单（事务内 Evaluation + N 占位 EvaluationModel 行） | 1（CAS） |
| 1 | 执行中 | CAS 0→1（hold 前） | 2/3（CAS 收口） |
| 2 | 已完成 | 结算成功：capture(成功数×单价) + results + winner | — |
| 3 | 失败 | 全败 void / 余额不足建单即败 / 崩溃对账无结果 | — |

列级状态（EvaluationModel.status）：`pending` → `completed | error`（单列失败只污该列）。

## 四端点契约

### POST /api/v1/evaluations（创建即跑）
- 鉴权：requireUserApi（未登录 401 code=10004）；tier=NORMAL → 403 code=10008「对比测评为付费用户能力」。
- 请求体：`{ prompt: string(1..2000), modelIds: string[2..6], idempotencyKey?: string(≤64) }`。
- 流程：幂等键查重（命中返回既有单 idempotent=true）→ 模型存在性校验（全部未删除，否则 40000）→ 建单（cost=N×单价，分）→ CAS 0→1 → hold 总额（requestId=`eval:<id>`；余额不足 40001 → 建单即败 status=3）→ 并行 executeChat（每模型 requestId=`eval:<id>:<modelId>`，60s 超时，非流式）→ 结算。
- 响应：`{ evaluation: EvaluationDetail, idempotent: boolean }`。客户端轮询 GET /[id] 至终态。
- 错误：40000 参数/模型非法、40001 余额不足、403 免费用户、401 未登录。

### GET /api/v1/evaluations?page=&pageSize=（我的分页）
- 鉴权：requireUserApi。参数：page≥1、pageSize 1..50。
- 响应：`{ rows: EvaluationListRow[], total, page, pageSize }`（createdAt 倒序）。
- 错误：40000 参数非法、401 未登录。

### GET /api/v1/evaluations/demo?limit=（公开示例）
- 公开（无鉴权）；仅 isPaid=false 预置示例；limit 1..10 默认 3。
- 响应：`{ items: EvaluationDetail[] }`。

### GET /api/v1/evaluations/[id]（详情）
- 鉴权：requireUserApi；本人 或 isPaid=false 示例可见；他人付费单 403。
- 读路径惰性对账：status=1 且 startedAt 超过 2×60s → 按网关 usage_logs 前缀 `eval:<id>:%` 实况补偿后返回。
- 响应：`{ evaluation: EvaluationDetail }`（models[] 含 response/status/errorMessage/tokens/latency）。

## 计费与对账规则

1. **hold**：`billingService.hold(userId, "eval:<id>", N×perModelMinor)`——requestId 幂等，可用额（balance−held）不足 40001。
2. **结算**（复用 billing 原生差额解冻语义）：
   - 全成功：`captureHold("eval:<id>", N×perModelMinor)` → 实扣总额，held 清零；
   - 部分成功 k/N：`captureHold("eval:<id>", k×perModelMinor)` → 实扣成功份额，失败份额（N−k）×单价自动解冻（= 单败 void 差额）；
   - 全败：`voidHold("eval:<id>")` → 全额解冻，status=3「已全额退还」。
3. **建单即败**：hold 失败（40001）→ 单保留 status=3 + errorMsg，不留悬浮冻结。
4. **崩溃遗留对账**（读路径触发）：status=1 超时 → `usage_logs` 前缀计数 k：k>0 → capture(k×单价) + status=2；k=0 → void + status=3。billing 调用幂等容错（已捕获/已作废视作成功）。
5. **三账平衡断言**（每笔终态）：`Σledger(DEBIT) == 实扣金额 == capture 额；held 终态 == 0（全败/部分败差额解冻）；balance 复原量 == void 额`——金额全用分（minor）整数。

## winner 判定

规则常量 `WINNER_RULE = { preferCompleteResponse: true, tieBreak: "longest" }`：错误列剔除 → 完整响应（非空）优先 → 响应最长。全败返回 null。

## 越界边界

- 不改 schema（零迁移）；executeChat/网关/console 页归角色1；e2e 归角色3；docs/architecture/API接口文档.md 归角色1。
- 评估域 hold/capture 独占用户计费（¥2/模型 × N）；网关 executeChat 经 `opts.billingExempt=true` 跳过自身 hold/capture（#26 仲裁定论 2026-09-17，需求 §3.3「按次扣费」由评估域独占落地）。
