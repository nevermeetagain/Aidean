# TASK-020：S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 任务规划V0.2.0（基于 main@59e83dd 复核；未实现需求核查/统一规划体系）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.1.0→V0.2.0：沿用（V0.2.0 已对 main@59e83dd 复核前提仍成立）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：AGENTS 铁律2/3
- RTM 追溯（V0.2.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041
- 来源方案：DESIGN-001

## 目标
API接口文档登记 API-002/003/004 与 50011；API架构设计方案互引锚；功能设计文档 §3.9 改为已实装；术语表增「功能开关」

## 输入
- 文档：`contracts/01-api.contract.ts`
- 契约：`ENDPOINTS API-002..004`
- 前置任务：TASK-019
- 前置状态：TASK-019 通过

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/API接口文档.md`
  - `docs/architecture/API架构设计方案.md`
  - `docs/product/design/功能设计文档.md`
  - `docs/governance/术语表.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.2.0/06_validation/evidence/EVD-020/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] 登记端点
3. [ ] 双向锚
4. [ ] 升版本头
5. [ ] 跑门禁
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.2.0/06_validation/evidence/EVD-020/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/architecture/API接口文档.md`
- `docs/architecture/API架构设计方案.md`
- `docs/product/design/功能设计文档.md`
- `docs/governance/术语表.md`
- `docs/文档索引.md`
- `docs/任务规划V0.2.0/06_validation/evidence/EVD-020/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.2.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.2.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/**（上一版规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-019
- 资源锁串行（同文件，须在其后执行）：TASK-013
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：登记类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
