# TASK-031：S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

## 归属
- 所属切片：S4（限时优惠计费生效（需求 §3.6））
- 来源需求：AGENTS 铁律2/3
- 来源方案：DESIGN-002

## 目标
API接口文档登记 API-008..011；网关计费时序契约增「生效价解析」节；术语表增「生效价」

## 输入
- 文档：`contracts/01-api.contract.ts`
- 契约：`ENDPOINTS API-008..011`
- 前置任务：TASK-030
- 前置状态：TASK-030 通过

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/API接口文档.md`
  - `docs/architecture/API架构设计方案.md`
  - `docs/architecture/网关计费时序契约.md`
  - `docs/governance/术语表.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-031/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] 登记
3. [ ] 双向锚
4. [ ] 升版本头
5. [ ] 门禁
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
`docs/任务规划V0.1.0/06_validation/evidence/EVD-031/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/architecture/API接口文档.md`
- `docs/architecture/API架构设计方案.md`
- `docs/architecture/网关计费时序契约.md`
- `docs/governance/术语表.md`
- `docs/文档索引.md`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-031/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.1.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-030
- 资源锁串行（同文件，须在其后执行）：TASK-013, TASK-020, TASK-025
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：登记类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
