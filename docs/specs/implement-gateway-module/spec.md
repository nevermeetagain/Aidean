# 统一计费网关模块 Spec

> change-id: `implement-gateway-module` | 语言: 中文 | 版本: v1 | 创建: 2026-08-28 | 更新: 2026-08-28

---

## 为什么（Why）

- MVP 四模块（天梯图 → 用户系统 → 余额 → **统一计费网关**）的最后一环：需求文档 §3.6「一次充值，通吃平台接入的所有大模型服务平台」，§7 明确网关属 MVP；前序 [implement-billing-module](../implement-billing-module/spec.md) 已交付 hold 预扣/捕获与幂等双录，本模块为其唯一资金消费方。
- 现状缺口：`lib/features/gateway` 为占位；schema v2.0 网关域表（station_keys / station_billing_rules / user_model_priorities / user_tier_mappings / user_free_quotas / user_quota_usages / custom_channels / usage_logs）全部就绪未接线；shared 无 gateway 契约；API 文档 §5.4 端点行为早期口径未与 v2.0 schema 对齐。
- **v2.0 schema 约束下的口径收敛（无表支撑的能力移出 MVP，登记移交）**：
  - 无 `user_api_keys` 表 → 网关鉴权 MVP 仅 JWT 会话；API Key 模式（API 文档 §2 第二行）标注第二阶段。
  - 无 `station_apis` 表 → 「用户自有 Key」唯一形态为 `custom_channels`（FREE_PROXY 路径，不扣余额）；§5.4 的 /user/station-apis 行删除。
  - 流式（stream）透传涉及 SSE 改写与流内降级，MVP 收敛为非流式（入口 stream=true → 40000 明确提示），流式列入移交项。
- 上游现实约束：真实平台凭据/网络不可控 → 上游调用以 HTTP 客户端薄封装承接；dev 提供本地 mock 上游端点（仅非生产注册），使 e2e 可全链路取证。

---

## 变更清单（What Changes）

- 实装 `lib/features/gateway`：路由链构造（请求模型链首 → 等级映射/优先级合并去重 → free 兜底）、渠道供给（station_keys 加权轮询 + 失败计数/冷却）、协议适配（OpenAI/Anthropic 入口双格式 + 上游协议中转）、计费接线（估算预扣 → 按实捕获/失败 void + 免费额度记账）、usage_logs 落库。
- 新增 API 路由：`POST /api/v1/gateway/chat`（核心）、`/api/v1/user/custom-channels`（GET/POST/PUT/DELETE，Key 不回显）、`GET /api/v1/user/usage`。
- dev-only mock 上游：`/api/v1/_mock/upstream/chat`（NODE_ENV!=='production' 注册），供 e2e 与本地联调。
- shared 契约扩展：`gateway.schema.ts`（OpenAI/Anthropic 入口请求判别 union、上游响应、usage、网关信封）+ 相关常量。
- 错误码先登记后实现：3xxxx 段新增 30002 无可用路由 / 30003 全部候选失败 / 30004 上游错误；API 文档 §5.4 修正为 v2.0 口径（删 station-apis 与 model-config 旧行，标注 API Key 第二阶段）并新增 custom-channels/usage 行。
- API 文档 §5.4 重写（铁律 2 锚点互引 + 铁律 3 版本锚 v1.6）。

---

## 影响面（Impact）

- Affected specs: [implement-billing-module](../implement-billing-module/spec.md)（hold/capture/void/postEntry 消费方）；[establish-dev-workflow](../establish-dev-workflow/checklist.md)（Phase 3 进度 4/4 → MVP 收官）。
- Affected code:
  - 新建类：`apps/web/lib/features/gateway/**`（service/repository/adapters/usage/__tests__）、`apps/web/app/api/v1/gateway/chat/route.ts`、`apps/web/app/api/v1/user/{custom-channels,usage}/**`、`apps/web/app/api/v1/_mock/upstream/chat/route.ts`
  - 修改类：`packages/shared/src/schemas/gateway.schema.ts`、`packages/shared/src/constants/gateway.constants.ts`、`apps/web/app/api/v1/_lib/errors.ts`、`docs/architecture/API接口文档.md`

---

## ADDED Requirements

### Requirement: 优先级路由链

网关 SHALL 为每次请求构造确定性候选链：请求模型链首（若显式指定）；其后合并用户两形态配置——等级映射（tier_mappings，按 OPUS>SONNET>FABLE>HAIKU 固定序映射优先级 1/2/3/4）与专业版优先级（priorities，1~99 升序，同模型取更优值）——去重后升序排列；free 模型（user_free_quotas 按账户等级，当期额度未耗尽者）恒列链尾；不可配置、只读兜底。链为空 SHALL 抛 30002。

#### Scenario: 双形态合并与 free 兜底

- **WHEN** 用户 tier_mappings 绑定 M1→OPUS、priorities 配置 M2→10、free 配额含 M3
- **THEN** 链序为 [M1(1), M2(10), M3(尾)]；M1 同时出现在两表时取更优优先级且不重复出现

### Requirement: 双模式渠道供给

每个候选模型的可用站点（APIStation.baseUrl 非空且 models 蕴含该模型）SHALL 依次取 Key：优先用户 custom_channels（isActive，FREE_PROXY 路径，不扣余额、不限额度）；否则平台 station_keys（ACTIVE 且冷却已过，按 weight 加权轮询）。Key 调用失败 SHALL 递增 failureCount 并按阈值进入 COOLDOWN，成功 SHALL 清零；站点级失败 SHALL 切换下一站点/下一候选（自动降级）。

#### Scenario: Key 池分流与冷却

- **WHEN** 同站双 Key（weight 1:1）连续调用，Key A 连续失败达阈值
- **THEN** 两次调用按权重交替取 Key；A 进入 COOLDOWN 后请求全部落在 B，冷却期满自动恢复

### Requirement: 协议兼容与中转

入口 SHALL 同时接受 OpenAI（/chat/completions 语义）与 Anthropic（/v1/messages 语义）两种请求格式（按 body 形态判别），响应转回入口同格式；上游仅支持其中一种格式时 SHALL 自动协议转换（字段级映射：model/messages/max_tokens/system/temperature ↔ system prompt、stop、usage 名称差异）。MVP 非流式：入口 stream=true SHALL 返回 40000 明确提示（提示语注明流式暂未开放）。

#### Scenario: Anthropic 入口 → OpenAI 上游中转

- **WHEN** 入口收到 Anthropic 格式请求，命中上游为仅 OpenAI 格式站点
- **THEN** 网关转换字段后调用上游 /chat/completions，响应转换回 Anthropic 格式返回，usage 语义对齐（prompt_tokens↔input_tokens 等）

### Requirement: 计费接线（预扣-捕获/释放）

平台 Key 路径 SHALL 在调用上游前以「输入估算成本 + max_tokens(缺省 4096)×输出单价」高估预扣 hold（requestId 作幂等键），余额不足（40001）SHALL 移除该候选继续降级（free 候选不受限）；上游 2xx 后按 response.usage 实际 tokens 计费 `（输入单价×prompt + 输出单价×completion）× markupRate × tokenMultiplier`（单价取模型 CNY 现价，分取整）并 captureHold（差额自动释放）；上游失败/异常 SHALL voidHold 全额解冻。custom_channels 路径不预扣不扣费。全部资金操作 SHALL 复用 billing 模块幂等原语。

#### Scenario: 预扣高估与差额释放

- **WHEN** 实际消耗 1.50 元、预扣 2.00 元
- **THEN** 钱包余额按 1.50 元扣减、held 归零、CONSUME 流水一条；usage_logs 记 quotaMinor=150 分、billingPath=PLATFORM
- **AND** 上游 5xx 时余额与 held 均恢复原值（void），usage_logs 记 error

### Requirement: 免费额度记账

free 模型调用 SHALL 校验当期额度（periodStart 周期起点，used + 本次 tokens ≤ quotaTokens），通过则 UPSERT user_quota_usages 累加并记 usage_logs（billingPath=FREE_QUOTA，quotaMinor=0）；额度耗尽的 free 模型 SHALL 不进入候选链。

#### Scenario: 额度耗尽自动出链

- **WHEN** free 模型当期额度已用尽且用户无其他配置
- **THEN** 候选链不含该模型，链空时返回 30002（而非 40001）

### Requirement: 用量明细与配置路由

`GET /api/v1/user/usage` SHALL 返回本人 usage_logs 分页（默认 20 条/页，按时间倒序，含模型/站点/tokens/费用/计费路径）；custom-channels CRUD SHALL 仅操作本人数据、apiKey 写入不回显（响应恒为掩码）；未登录一律 10004。

#### Scenario: 自有渠道密钥不回显

- **WHEN** 创建 custom_channel 后执行 GET 列表
- **THEN** apiKey 字段为掩码（如 `sk-****last4`），任何接口不返回明文

### Requirement: 文档同步与错误码先行

API 文档 SHALL 重写 §5.4 网关段（v2.0 口径：gateway/chat + custom-channels + usage；删 station-apis；API Key 行标注第二阶段），§4 登记 30002~30004 后回填 errors.ts；文首版本锚 v1.6；§5.4 末尾锚点互引（铁律 2）。

#### Scenario: 铁律核验

- **WHEN** 对 API 文档执行版本锚/锚点/码位 grep
- **THEN** 版本锚 v1.6 含 2026-08-28；§5.4 含互引锚点；errors.ts 与文档 3xxxx 码位一致

---

## MODIFIED Requirements

（无——A.2 交付的 /user/priorities、/user/tier-mappings 即两形态配置端点，§5.4 旧 model-config 合并行由本模块删除并以其替代，属文档修正非接口变更）

---

## REMOVED Requirements

（无）
