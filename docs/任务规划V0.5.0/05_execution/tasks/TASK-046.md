# TASK-046：S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：AGENTS 铁律3
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
合作产品内容配置文档与 API 文档 products 契约节登记 screenshots 字段；门禁全 PASS

## 输入
- 文档：`docs/product/design/合作产品内容配置.md`
- 契约：`ProductIntroScreenshotSchema`
- 前置任务：TASK-045
- 前置状态：TASK-045 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/product/design/合作产品内容配置.md`
  - `docs/architecture/API接口文档.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-046/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] 登记
3. [ ] 升版本头
4. [ ] 门禁
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-046/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/product/design/合作产品内容配置.md`
- `docs/architecture/API接口文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-046/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.5.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-045
- 资源锁串行（同文件，须在其后执行）：TASK-009, TASK-013, TASK-020, TASK-025, TASK-031, TASK-036, TASK-052, TASK-054
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：登记类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小（<2h，§6.3 过小信号：Agent-Docs 独占文档路径，无法并入 TASK-045（Agent-App）；保留独立卡）　约 1h　<2h
