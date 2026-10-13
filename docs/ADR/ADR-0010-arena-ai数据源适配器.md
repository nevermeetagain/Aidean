# ADR-0010：arena.ai 数据源适配器——Cloudflare 拦截降级策略

> 状态：接受 | 日期：2026-10-09 | 关联：R-71 聚合采集策略、R-30 交叉验证框架

## 一、背景

1. Artificial Analysis (arena.ai) 是 AI 模型基准评测领域的权威排行榜，提供 intelligence_index、coding_index、agentic_index 等评测维度，是 Aidean 平台 benchmarkScore 的重要数据源。
2. 实测 `https://artificialanalysis.ai/leaderboard` 返回 HTTP 403（Cloudflare 反爬保护），浏览器和 HTTP 客户端均无法直接访问。
3. 同时发现 `https://artificialanalysis.ai/api/leaderboard` 返回 404，API 端点已变更或下线。
4. OpenRouter API（`https://openrouter.ai/api/v1/models`）的响应中包含 `benchmarks.artificial_analysis` 字段，内含 intelligence_index、coding_index、agentic_index 等评测数据——这是 Artificial Analysis 排行榜数据的 API 分发渠道。

## 二、决策

**新建 `ArenaAIAdapter`（`apps/web/lib/sync/adapters/arena-ai.ts`），通过 OpenRouter API 间接获取 arena.ai 排行榜数据。**

### 2.1 降级策略

```
arena.ai 直接访问 → Cloudflare 403 拦截 → 降级
    ↓
OpenRouter API /v1/models → 提取 benchmarks.artificial_analysis → 成功
```

### 2.2 数据流

1. 调用 `GET https://openrouter.ai/api/v1/models`（OpenRouter 公开 API，无需认证）
2. 遍历 `data[]`，筛选包含 `benchmarks.artificial_analysis` 字段的模型（实测 308/469 模型有此字段）
3. 提取 `intelligence_index` 作为 `benchmarkScore`
4. 提取 `coding_index`、`agentic_index` 等子维度写入 `benchmarks[].scores`
5. 映射为 `RawModelData[]`，`sourceName` 标记为 `"arena-ai"`

### 2.3 字段映射

| OpenRouter 嵌套字段 | RawModelData 字段 | 说明 |
|---|---|---|
| `id` | `modelCode` | OpenRouter 格式 `vendor/model-name` |
| `name` | `nameDisplay` | 人类可读名称 |
| `id` split by `/` | `vendorName` | 提取厂商名 |
| `context_length` | `contextLength` | 上下文窗口大小 |
| `benchmarks.artificial_analysis.intelligence_index` | `benchmarkScore` | 智能指数 |
| `architecture.input_modalities` 包含 `image` | `isMultiModal` | 多模态判定 |
| `benchmarks.artificial_analysis` 全部字段 | `benchmarks[].scores` | 保留所有子维度 |

### 2.4 同时增强 OpenRouterAdapter

OpenRouterAdapter 原本未提取 `benchmarks.artificial_analysis` 字段。本次同步增强 OpenRouterAdapter，使其在采集价格数据的同时也提取 benchmark 数据，避免 ArenaAIAdapter 重复请求同一 API。

## 三、替代方案

1. **使用 Cloudflare 绕过技术（headless browser + TLS 指纹伪装）**：否决。违反目标网站 ToS，维护成本高，且 Cloudflare 持续升级反爬策略会导致适配器频繁失效。
2. **使用 HuggingFace Space Gradio API 作为替代源**：探查中发现 HuggingFace 上的 lmsys/arena Space 有 Gradio API，但该 API 需要特定参数格式且数据更新延迟较大。OpenRouter API 更稳定且数据格式标准化。
3. **放弃 arena.ai 数据**：否决。benchmarkScore 是 13 维排名系统的核心维度，缺失将导致排名失准。
4. **直接使用 OpenRouterAdapter 提取 benchmark 数据，不新建 ArenaAIAdapter**：否决。分离关注点——OpenRouterAdapter 职责是价格+元数据采集，ArenaAIAdapter 职责是 benchmark 采集。即使数据来源相同，语义边界应清晰。

## 四、影响

- 新增 1 个适配器文件（188 行）+ 1 个测试文件（127 行，7 个测试用例）
- OpenRouterAdapter 增强（新增 benchmark 字段提取逻辑）
- 采集管线从 10 个适配器扩展到 11 个
- 308 个模型获得 artificial_analysis benchmark 数据
- benchmarkScore 通过 mapper 写入 `ModelScore` 表，参与 13 维加权排名计算（R-72）

## 五、风险与缓解

| 风险 | 缓解措施 |
|---|---|
| OpenRouter API 变更或下线 | `testConnection()` 定期检测，失败时 graceful degradation 返回空数组 |
| OpenRouter benchmark 数据更新延迟 | 在 `sourceName` 中标记 `"arena-ai"`，admin 可在交叉验证报告中看到数据时效性 |
| OpenRouter 与 arena.ai 原始数据存在差异 | OpenRouter 是 arena.ai 的官方 API 分发渠道，数据应一致；如发现差异，cross-validator 会标记冲突 |

## 六、验证

- `ArenaAIAdapter.testConnection()` → true（实测 2026-10-09，OpenRouter API 可达且有 arena 数据）
- `ArenaAIAdapter.fetch({ limit: 5 })` → 5 个模型，benchmarkScore 和 benchmarks 字段映射正确
- 单元测试 7/7 通过（mock 数据验证映射逻辑 + 降级策略 + 错误处理）
- TypeScript 类型检查通过
