# 文件清单与交叉映射（aidean-closure）

> Route D（文件增强）：以工作区文档为主证据，辅以真实代码穿透与 git 状态实测。基准 HEAD `806eba6`，分支 `fix/acceptance-closure-20260917`，断面日期 2026-09-18。

## 一、证据源清单

| 文件 | 角色 | 关键内容 |
|---|---|---|
| `docs/未完成事项目录.md` v1.4 | 全量未完成台账（#1–#26） | #2/#3/#5/#6 P0；#7/#9/#10/#25/#26 已关闭 |
| `docs/项目状态审计.md` v2.12 | 五维审计 + §10.6.1–10.6.22 过程记录 | RW-3 收口轮、D1–D8 缺陷修复、commit 链 |
| `docs/验收复核-20260917.md` v1.5 | 基于 806eba6 的只读复核 + §2.2–2.4 实测轮 | 509 单测、导航/资讯/控制台三规格收口、台账重定性 |
| `docs/验收方案-质量治理.md` v1.1 | Q1/Q2/G1 原子任务 | 编译器入口、skip 台账、门禁前置 |
| `docs/验收方案-身份支付.md` v1.2 | A1/A2/P1/P2 | 撤销契约、真实支付、微信状态机 |
| `docs/验收方案-数据部署.md` v1.1 | D1/D2/R1 | 迁移双路径、备份恢复、CI/TLS/HA |
| `docs/验收方案-性能扩展.md` v1.1 | L1/H1/H2 | 分页竞态、容量基准、未穿透模块 |
| `docs/验收方案-资金网关.md` v1.0 | F1/F2/W1/W2/C1 | 资金不变量、评估幂等、网关协议 |
| `docs/文档索引.md` v1.29 | 文档真源目录 | 三规格登记状态 |
| `docs/assets/reference/补充.txt` | 用户原始需求（两批） | 资讯/合作/关于/文档/导航需求源 |
| `docs/specs/redesign-nav-content-pages/tasks.md` v4 | 全勾收口 | T1–T8 + 验证归档 |
| `docs/specs/news-admin-cms/tasks.md` v1.1 | 全勾收口 | T1–T6，20/20 运行时验收 |
| `docs/specs/redesign-console-workspace/{tasks,checklist}.md` v1.1 | 全勾收口 | 五标签工作区；遗留 `.next-renamed-*` 待清理 |

## 二、代码穿透实测（本会话）

| 代码点 | 实测结论 | 关联任务 |
|---|---|---|
| `apps/web/middleware.ts:26-33` | RS256 + createRemoteJWKS + fail-closed，与台账 #24 关闭一致 | 已关闭项复核通过 |
| `apps/web/app/api/v1/wechat/qrcode/route.ts:13-30` | `STATE_INIT` 注释桩，状态机未实现 | P2.1 真实缺口确认 |
| `apps/web/lib/features/billing/service.ts:200-204` | production 分支显式抛「支付渠道尚未接入」 | P1.1 真实缺口确认 |
| `apps/web/lib/features/billing/service.ts:78-107` | postEntryInTx DEBIT 有余额守卫；capture 路径不复核（静态发现维持） | F1.1 待隔离复现 |
| `apps/web/lib/features/auth/session.ts:23-40` | getSession 仅 verifyAccess，不回库查 status/ver/deletedAt | A1.1 契约缺口确认 |
| `apps/web/lib/features/auth/repository.ts:24-36` | USER_SELECT/PROFILE_SELECT 均未投影 deletedAt | A1.3 佐证 |
| `apps/web/components/ladder/LadderBoard.tsx:100-178` | 工作树已含 loadMoreSeqRef 序号守卫 + AbortController + 穷尽判定 | L1.1 疑似已修复未验收（工作树演进超前于验收基线） |
| `apps/web/prisma/migrations/` | 5 个迁移（0000/0001/0002 加密/0003 删列/news），空库重放证据仅覆盖前两个 | D1.1 缺口确认 |
| `apps/web/package.json:34` | `next: 14.2.5`，与 ADR-0001 锁定 Next 15 + Tailwind 4 冲突 | Q1.2 必须裁决 |

## 三、git 状态实测（2026-09-18）

- 分支 `fix/acceptance-closure-20260917`，HEAD `806eba6`（docs: 部署 runbook + 备份恢复脚本 + 支付渠道指南）。
- 工作树 **84 项未提交**：42 modified + 42 untracked，含三个已收口规格的全部代码、六份验收方案、ADR-0003、登录方案两文档、`apps/web/.next-renamed-1789617260/` 遗留目录。
- 推论：最近三轮交付（导航改版/资讯后台化/控制台工作区）**只存在于工作树**，未形成 commit，存在丢失风险；push 按用户纪律须逐次批准。
