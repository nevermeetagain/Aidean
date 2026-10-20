# TASK-070：公开定价页采集：SiliconFlow、DeepSeek 等官方公开定价/文档页（无 API Key）

> **2026-10-20 变更（27_核心与非核心重划分）**：改写——不使用 API Key，改为采集 SiliconFlow / DeepSeek 等公开定价页与文档页（遵守条款与 robots，不抓需登录页）；执行者改为助手 A

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**助手 A** ｜ 建议档位：**sonnect** ｜ U-M1 已裁决（不提供 Key，采公开页），本卡可直接执行；**以下正文已按 U-M1 改写（2026-10-20，Hark），旧 keyed 口径作废**

> V0.10.0 状态：**可执行**（U-M1 已裁决）

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 中等难度适配器，外包

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/010/016
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-010、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
新建 `apps/web/lib/monitoring/public-pricing/`：每源一个 collector，把**公开**定价页/文档页正文（HTML/Markdown）解析为观测项（externalModelId、normalizedModelId、displayName、原币 + 单位的 priceInput/priceOutput/priceCacheRead、contextLength），再经现有 normalize 输出，供 062 调度调用 `persistCatalogSnapshot`（TASK-098）落库。无 API Key、无凭证分支：源 `authRequired=false`，不存在 `MONITOR_KEY_*` 与 `credential_missing` 路径。

首批源（只抓公开、无需登录的页面；遵守 robots 与条款，tosStatus 未确认前记 `pending`）：
| key | 页面 | 价格币种/单位 |
|---|---|---|
| siliconflow-pricing | https://siliconflow.cn/pricing | CNY / 每百万 Token（`cny_per_1m_tokens`） |
| deepseek-pricing | https://api-docs.deepseek.com/zh-cn/quick_start/pricing | 页面同时给 CNY 与 USD 时取 CNY；缓存命中价写 priceCacheRead |

（目录接口 `api.siliconflow.cn/v1/models`、`api.deepseek.com/models` 无 Key 实测 401，**不使用**。）

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`26_用户裁决记录.md` U-M1；`27_核心与非核心重划分.md`
- 契约：`MonitoringSourceSchema`、`PRICE_UNITS`（packages/shared，只读，不改）
- 前置任务：TASK-099；TASK-098（Hark，已在 origin/main）
- 前置状态：U-M1 已裁决

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/public-pricing/**`（collector、解析器、fixtures、单测）
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-070/`

## Execution Steps
1. [ ] 每源 collector：`fetch(url)` 由调用方注入（单测注入 fixture，**卡内不联网**）；解析失败或解析出 0 条 → 返回 `{ ok:false, reason }`，不得返回空列表冒充成功（空目录由 098 守卫兜底，但采集器自己也要报错）
2. [ ] 每源 fixture：保存一份公开页面正文的**节选**（只含价格表部分，≤50KB），文件头注明来源 URL 与保存日期
3. [ ] 单测：每源 ≥3 例（正常解析出 ≥N 条且币种/单位正确；页面结构变化 → ok:false；缓存命中价/上下文长度缺省时为 null 而非 0）
4. [ ] 价格以十进制字符串保留原值，**不做汇率换算、不改单位**（归一属 Hark 的 047/048）
5. [ ] 运行「验证命令」，完整输出存证据目录

## 验收标准
- [ ] vitest 全绿，新增 ≥6 例
- [ ] 无 `MONITOR_KEY_`、无 `credential_missing` 分支（`grep -rn "MONITOR_KEY_\|credential_missing" apps/web/lib/monitoring/public-pricing` = 0）
- [ ] 单测不联网（fetch 全部注入）
- [ ] web tsc 0、lint 0、`node scripts/check-docs-facts.mjs` 0（新增 spec 文件时同步 facts 计数断言）
- [ ] diff 仅落在「允许修改」范围内

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/public-pricing && node scripts/guard/secret-scan.mjs
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-070/`

## 允许修改
- `apps/web/lib/monitoring/public-pricing/**`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-070/**`
- `scripts/check-docs-facts.mjs`（仅 spec 计数断言 +N）

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-099
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-071
- 阻塞条件：无（U-M1 已裁决）

## 建议执行档位
sonnect　理由：按既有 collector 框架（060）加公开页解析源，模式已定

## 升级条件
厂商 ToS/robots 禁止抓取、或页面需登录/有反爬挑战 → 该源停止并回报（其余源继续）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h
