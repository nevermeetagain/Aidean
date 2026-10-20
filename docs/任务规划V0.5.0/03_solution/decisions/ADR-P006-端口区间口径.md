# ADR-P006 · 端口区间口径（待裁决，不代用户决定）

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档（任务规划V0.2.0）——登记用户 2026-10-14 端口口径与既有文档/外部仓的冲突，状态 PENDING

## 三方口径对照（逐条证据）
| 项目 | 用户 2026-10-14 指令 | 本仓《子平台规范说明》§5.0（2026-09-29 管理者口径） | 外部仓自述（2026-10-14 只读抓取 AGENTS.md） | 结论 |
|---|---|---|---|---|
| Aidean（本仓） | 3000–3100 | 3000–3100 | — | **一致**（代码：dev 默认 3000、Dockerfile 3000、playwright 3000） |
| AideanFleet（aideanew/AideanFleet@a9a24ed） | 3100–3200 | 3100–3200 | 控制台 3100（AGENTS.md:25、.env.example:16）；`FLEET_UI_PORT=3333`（.env.example:18） | 区间一致；3333 越界（文档已登记） |
| AideanBotHot（aideanew/BotHot@13acacc） | 3200–3300 | 3200–3300 | 前端宿主 3200、后端 3300（AGENTS.md 端口表 L41-42）；BotHot ci.yml:287「主平台 OIDC 白名单已登记 bothot redirect_uri」 | 一致；**本仓 seed.ts:354 的 localhost:3200 回调即 BotHot** |
| AideanBot（WeChatRag） | **未列出** | 3300–3400；frontend 3333 | 仓库 `aideanew/AideanBot` 返回 Repository not found（私有/改名/不存在，无法核验） | **P-2 待裁决**：本仓 e2e/web/sso-3333.spec.ts、单测 oauth-redirect-origin.spec.ts:59 / redirect.spec.ts:38、qa-fe-01-regression.mjs:320 仍以 3333 为 AideanBot 回调 |
| AideanThesis（nevermeetagain/AideanThesis@ebd6667） | **3000–3100** | 3400–3500 | 「固定端口 Web 3400 / API 3401 / PG 3402 / Redis 3403；禁止绑定 3400–3500 之外」（AGENTS.md:49） | **P-1 冲突**：用户口径与 Aidean 区间重叠，且与 Thesis 自身 AGENTS.md 矛盾 |

## 待裁决变量
- **P-1**：AideanThesis 区间取 3000–3100（用户本次口径，需同时说明与 Aidean 如何共存）还是 3400–3500（其仓内 AGENTS.md 与本仓文档）。对本仓的影响仅限文档与端口守卫区间表（TASK-007 的 port-ranges.json），**不影响本仓代码**。
- **P-2**：AideanBot 是否仍存在/仍需 3333 回调。方案 A：保留 → TASK-008 在 seed 追加 3333（不删 3200）；方案 B：已由 BotHot 取代 → seed 不改，sso-3333 e2e 另立卡处置。

## 本规划的处理
- 未裁决前：TASK-007 只把已一致的区间（Aidean/Fleet/BotHot）写成 ERROR 级断言，P-1/P-2 相关输出 WARN；TASK-008 为条件卡。
- 撤销 V0.1.0 的 U-6「AideanBot=3333、seed 3200 是缺陷」假设——证据见上表 BotHot 行。
