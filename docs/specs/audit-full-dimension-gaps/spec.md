# 项目全维状态审计 Spec

> change-id: audit-full-dimension-gaps | 创建: 2026-09-07 | 断面: f7d39b2

## Why
建设期（MVP→CI→品牌→Docker→M-PERF→M-WIDE/M-LADDER→M-SSO→天梯 v2.1）已全部收官并推送，项目处于"建设期→发布期"换挡点，但完成/遗留状态散落在 9 份文档中，无一张全局决策底表；且存在 spec 体系外欠账（admin 雏形无验收、e2e 回归断档）。需要全维审计固化结论，为下一步（部署/支付/二期立项）提供排序依据。

## What Changes
- 新建 `docs/项目状态审计.md`（v1.0，带版本锚）：五维（界面/功能/数据/交互/发布事务）× 三态（✅已验收/🟡落码未验收/⬜未做）台账 + 推荐行动序
- 注册进 `docs/文档索引.md`（索引升版）
- 同步 agent 项目记忆摘要
- **不改动任何代码**（纯文档交付）

## Impact
- Affected specs: 无（本 spec 为元文档/审计类）
- Affected code: 无
- Affected docs: `docs/项目状态审计.md`（新建）、`docs/文档索引.md`（升版）

## ADDED Requirements
### Requirement: 五维审计台账
`docs/项目状态审计.md` SHALL 按界面/功能/数据/交互/发布事务五维列出全部功能项，每项标注三态之一，并附依据（文档章节/commit/验收记录）。

#### Scenario: 读者决策
- **WHEN** 用户阅读审计文档
- **THEN** 能在 5 分钟内得出"哪些能直接收尾、哪些有外部依赖、哪些需立项评审"的结论

### Requirement: 推荐行动序
审计文档 SHALL 给出带依赖关系的行动序（欠账清理→P0 部署→支付渠道→二期评审），每步标注前置条件。

### Requirement: 双向锚点（铁律 2）
审计文档中每项结论 SHALL 引用来源文档相对路径；`文档索引.md` 注册行反向链接审计文档。

## 验收口径
- [ ] 五维台账覆盖本对话分析的全部条目，无遗漏
- [ ] 三态标注与 git log / README §8.5 / 各 spec checklist 交叉一致
- [ ] 版本锚齐全，索引注册完成，tsc/build 不受影响（纯文档）
