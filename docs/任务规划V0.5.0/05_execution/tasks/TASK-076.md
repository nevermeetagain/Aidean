# TASK-076：后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs 全写入面 + 通用版等级固定序

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：V0.5.0 新增（FIX-04/05/11）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-054 / REQ-F-055 / REQ-F-062
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-054、REQ-F-055、REQ-F-062
- 来源方案：功能设计文档 §五 D-2=C

## 目标
vitest 用例证明：sync 写入器只 SET sync 字段；人工与 sync 写操作均写 model_change_logs；通用版等级序 Opus>Sonnet>Fable>Haiku 与专业版默认映射 1/2/3/4

## 输入
- 文档：`docs/product/design/功能设计文档.md:233-281`；`docs/product/requirements/需求文档.md:66,90-92`；`apps/web/lib/sync/writers/index.ts`；`apps/web/lib/features/admin/model-change-log.ts`
- 契约：`无新增`
- 前置任务：无
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/admin/__tests__/field-ownership.spec.ts（新建）`
  - `apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts（新建）`
  - `apps/web/lib/features/gateway/__tests__/tier-order.spec.ts（新建）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-076/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 逐字段列出 sync 字段集合与人工字段集合（来自功能设计文档表）
2. [ ] 对 writers 做 mock prisma 断言 update data 键 ⊆ sync 字段
3. [ ] 枚举全部写入面（grep modelChangeLog.create），每个写入面一条断言
4. [ ] 发现缺陷 → 记录到证据并停止，不修业务代码（另立卡）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts` 全绿或失败用例已登记为缺陷
- [ ] 证据含写入面清单（文件:行）
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-076/`

## 允许修改
- `apps/web/lib/features/admin/__tests__/field-ownership.spec.ts`
- `apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts`
- `apps/web/lib/features/gateway/__tests__/tier-order.spec.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-076/**`

## 禁止修改
- `apps/web/lib/sync/writers/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：测试失败即业务缺陷 → 停止并登记，不得改业务代码

## 建议执行档位
sonnect　理由：只读核验 + 单测补齐，不改业务逻辑

## 升级条件
发现资金/数据覆盖缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
