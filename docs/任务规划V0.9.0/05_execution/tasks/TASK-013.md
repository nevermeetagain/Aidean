# TASK-013：S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-012 移出卡集

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：AGENTS 铁律3/6
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
数据库文档 model_prices 行改为「部分唯一索引 WHERE is_current」，迁移数 16→17；未完成事项目录登记缺陷与闭环证据

## 输入
- 文档：`docs/architecture/数据库文档.md`
- 契约：`M-001`
- 前置任务：无
- 前置状态：TASK-012 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/数据库文档.md`
  - `docs/plans/未完成事项目录.md`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-013/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-013/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/architecture/数据库文档.md`
- `docs/plans/未完成事项目录.md`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-013/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.9.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：TASK-009, TASK-090
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：登记类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
