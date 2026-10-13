# ADR-0009：新增 quanzil.com 数据源适配器

> 状态：接受 | 日期：2026-10-09 | 关联：R-71 聚合采集策略、R-30 交叉验证框架

## 一、背景

1. Aidean 平台采用聚合采集策略（R-71），以 OpenRouter 为主源，多个独立数据源作为交叉验证源。
2. quanzil.com 是一个 AI 模型 API 聚合平台，提供 367 个模型的定价数据，包含 `model_ratio`（输入价格比率）、`completion_ratio`（输出/输入价格比）、`vendor_id`（厂商标识）等字段。
3. 实测 `https://quanzil.com/api/pricing` 端点返回 200，响应包含 367 个模型 + 24 个厂商 + `group_ratio` + `supported_endpoint` 元数据，数据结构完整且稳定。
4. 现有数据源中，OpenRouter 覆盖 469 个模型，但价格数据精度受上游更新延迟影响；quanzil.com 可作为价格交叉验证源，提升定价数据可信度。

## 二、决策

**新建 `QuanzilAdapter`（`apps/web/lib/sync/adapters/quanzil.ts`），作为聚合采集管线的交叉验证源。**

### 2.1 端点选择

- 主端点：`GET https://quanzil.com/api/pricing`（无需认证，返回全量定价数据）
- 排除端点：`/api/models`（401 需认证）、`/v1/models`（401 需认证）、`/api/v1/models`（404 不存在）

### 2.2 字段映射

| quanzil 字段 | RawModelData 字段 | 映射规则 |
|---|---|---|
| `model_name` | `modelCode` | 直接映射 |
| `model_name` | `nameDisplay` | 直接映射 |
| `vendor_id` → `vendors[]` | `vendorName` | 查 vendors 数组匹配 vendor_id → vendor_name |
| `model_ratio × 2` | `inputPrice` | model_ratio 是 $/1K tokens 基准比率，× 2 转换为 $/1M tokens |
| `model_ratio × completion_ratio × 2` | `outputPrice` | 输出价格 = 输入价格 × completion_ratio |
| `supported_endpoint` | `isMultiModal` / `isReasoning` / `isCodingOptimized` | 检查 endpoint 列表包含 image/reasoning/coding |
| `created_at` | `publishedAt` | ISO 时间戳直接映射 |
| `usage_count` | `popularityScore` | 归一化为 0-100 分值 |

### 2.3 集成方式

- 注册到 `ADAPTER_REGISTRY`（`/api/v1/admin/sync/batches` route），支持 admin UI 手动触发
- 加入 `crawl_models.ts` 的 `additionalAdapters` 列表，作为 OpenRouter 的交叉验证源
- 不设为主源：OpenRouter 仍是主源（469 模型覆盖更广），quanzil 作为价格交叉验证

### 2.4 容差配置

Cross-validator 对 `inputPrice` / `outputPrice` 已有 5% 容差（R-30），quanzil.com 与 OpenRouter 的价格差异在此范围内自动标记为 `auto_resolved`，超出则标记为 `unresolved` 供 admin 决策。

## 三、替代方案

1. **使用 quanzil.com 作为主源**：否决。OpenRouter 覆盖 469 模型 > quanzil 367 模型，且 OpenRouter API 更成熟、社区维护更活跃。
2. **爬取 quanzil.com 网页**：否决。`/api/pricing` JSON API 已提供完整数据，无需 HTML 爬取，避免脆弱的 CSS selector 依赖。
3. **不接入 quanzil.com**：否决。多源交叉验证是 R-71 的核心设计目标，增加数据源提升数据可信度。

## 四、影响

- 新增 1 个适配器文件（183 行）+ 1 个测试文件（162 行，7 个测试用例）
- 采集管线从 9 个适配器扩展到 11 个
- quanzil.com 数据每日凌晨 2 点随 `crawl_models.ts` 自动采集
- 交叉验证报告自动包含 quanzil.com 与 OpenRouter 的价格比对结果

## 五、验证

- `QuanzilAdapter.testConnection()` → true（实测 2026-10-09）
- `QuanzilAdapter.fetch({ limit: 5 })` → 5 个模型，字段映射正确
- 单元测试 7/7 通过（mock 数据验证映射逻辑）
- TypeScript 类型检查通过
