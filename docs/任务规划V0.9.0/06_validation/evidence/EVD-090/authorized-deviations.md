# EVD-090 授权偏离与合并决策记录

> 版本: v0.9 | 更新: 2026-10-19 | 变更: TASK-090 执行期，记录两处卡面自相矛盾（规划缺陷）的管理者授权偏离与 huaweicloud→镜像合并策略。

## 背景：卡面自相矛盾（规划缺陷）

TASK-090「目标」明写要收口 `check-docs-rule`（admin 域/页数）与 `check-docs-facts` **全部红项**（含 lib/features/pricing、新增 spec 带来的计数变化），并要求 `API接口文档 §4` 登记 20004/50012；但其「允许修改」仅放开 `docs/architecture/**`、`docs/product/**`、`docs/governance/**`、`EVD-090/**`，**未含** `scripts/check-docs-facts.mjs` 与 `packages/**`。经实测核验：

- `check-docs-facts` 当前 5 项红全是**代码目录计数**（lib-features/aidean-ui-refs/route/page/spec），期望值硬编码在 `scripts/check-docs-facts.mjs`，改文档无法转绿，**必须编辑该脚本**。
- `API接口文档 §4` 是 `gen-contract-tests.mjs` 生成 `errors.generated.spec.ts` 的 `DOC_REGISTERED` 的**唯一源**（正则从 §4 三列码表抽取并冻结进 spec）。登记 20004/50012 会使 `DOC_REGISTERED` 9→11，**必须重生成并提交 `packages/shared/src/__tests__/contract/errors.generated.spec.ts`**，否则 CI 的 `gen → git diff --exit-code` 漂移门会红（`packages/**` 属 090 禁改）。

二者均为「目标要求」与「允许范围」互斥，属卡面规划缺陷，非本执行者臆断扩权。

## 管理者授权（两次 AskUserQuestion 裁决，原话摘录）

1. **facts 脚本**：「选第二个，按授权偏离处理。090 的目标里明写要收口 check-docs-facts 的全部红项，允许范围却漏了这个脚本。这是卡面自相矛盾，是规划缺陷，由我授权。」
2. **§4↔契约（重生成 + 最小改动）**：选择「授权 090 兼做契约重生成并提交 `packages/shared/.../errors.generated.spec.ts`；§4 只补 20004/50012 两行，favorites/feature-flags 以文本写进 §5」。

据此，090 实际改动 = 卡面允许（docs/architecture·product）+ 两处授权偏离（facts 脚本、errors 生成契约）。

## huaweicloud → 镜像合并决策（卡面 Execution Steps 1/2）

- huaweicloud 本地分支可读（`refs/heads/huaweicloud`、tag `archive/huaweicloud-20261019`），不触发「不可读→镜像直接执行」的降级分支。
- `git diff nm-main huaweicloud -- docs/`（排除 `任务规划*`）显示两线在 10 个文档上分叉：huaweicloud 携带 009/013/020/025 的**目标态文档内容**（§4 全量 25 码单表、§5.4.2 收藏、§7.10/§7.11 架构锚、§九 favorites 激活、§3.9/§3.10 功能开关与收藏、术语表功能开关词条等），但**其数字口径基于 huaweicloud 代码线**（如「68 model」「spec=167」），与镜像实测代码（72 model、spec=170）不一致。
- **决策（按管理者「最小改动 + 数字以镜像实测为准」）**：不整体 `checkout huaweicloud -- docs/`（避免把 68 等陈旧数字灌入而反向打破 `check-docs-rule` 的 model 锚）。本卡仅做 gate 收口所需的最小编辑：`check-docs-rule` 走镜像 `功能设计文档 §3.5`→37/33；`check-docs-facts` 走镜像 `errors` 脚本→实测值；§4 补 20004/50012 两行；§5 补 favorites/feature-flags 端点文本。**huaweicloud 的富内容与双向架构锚（§九 / §7.10 / §7.11 / §3.9·§3.10 / 术语表）留给各自拥有权限与资源锁的 009/013/020/025 逐卡合入**（符合卡面资源锁链 009·013·020·025 均在 090 之后）。

## 结果

- `check-docs-rule` exit 0 / `check-docs-facts` 14/14 exit 0 / §4 含 20004·50012 / §5 含 favorites·feature-flags / 回归四连全绿。
- 提交仅含：`docs/architecture/API接口文档.md`、`docs/product/design/功能设计文档.md`、`scripts/check-docs-facts.mjs`（偏离①）、`packages/shared/src/__tests__/contract/errors.generated.spec.ts`（偏离②）、本 EVD 目录。
- 无 `docs/任务规划V0.*/**` 实体规划文档改动（EVD 目录为卡面明确允许的证据落点）。
