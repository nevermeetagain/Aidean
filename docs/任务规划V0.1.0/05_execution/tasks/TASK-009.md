# TASK-009：S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：AGENTS.md 铁律2/3
- 来源方案：ADR-P001

## 目标
API接口文档 §4 列全 25 码（含 HTTP 状态与前端展示）并登记 /system/ready；API架构设计方案对应节互引锚；check-docs-rule/facts 全 PASS

## 输入
- 文档：`contracts/02-errors.contract.ts`；`contracts/01-api.contract.ts`
- 契约：`ERROR_CODES`；`ENDPOINTS[API-001]`
- 前置任务：TASK-003, TASK-004, TASK-005
- 前置状态：TASK-001/002/003 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/API接口文档.md`
  - `docs/architecture/API架构设计方案.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-009/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] §4 码表改为全段单表（码位|标识|HTTP|语义|前端展示），删除「与 errors.ts 双源对齐」措辞，改为「唯一源 packages/shared/src/errors.ts」
3. [ ] §5.7 系统 增 GET /api/v1/system/ready
4. [ ] 两文档文首版本头升版
5. [ ] 运行文档门禁
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs` exit 0
- [ ] `node scripts/check-docs-facts.mjs` 全 PASS（若计数漂移，同步更新期望值由 Agent-Guard 处理并记录）
- [ ] §4 表行数 = 25
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-009/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/architecture/API接口文档.md`
- `docs/architecture/API架构设计方案.md`
- `docs/文档索引.md`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-009/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.1.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-003, TASK-004, TASK-005
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-006, TASK-040
- 阻塞条件：计数漂移来源无法归因到本切片 → 停止上报

## 建议执行档位
haiku　理由：按冻结契约填表

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
