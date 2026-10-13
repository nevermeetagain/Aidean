# TASK-013：S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性））
- 来源需求：AGENTS 铁律3/6
- 来源方案：ADR-P003

## 目标
数据库文档 model_prices 行改为「部分唯一索引 WHERE is_current」，迁移数 16→17；未完成事项目录登记缺陷与闭环证据

## 输入
- 文档：`docs/architecture/数据库文档.md`
- 契约：`M-001`
- 前置任务：TASK-012
- 前置状态：TASK-012 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/数据库文档.md`
  - `docs/plans/未完成事项目录.md`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-013/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] 改约束描述与迁移清单
3. [ ] 升版本头
4. [ ] 跑文档门禁
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS
- [ ] 数据库文档出现 20261014000000 迁移名
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-013/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/architecture/数据库文档.md`
- `docs/plans/未完成事项目录.md`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-013/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.1.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-012
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：登记类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
