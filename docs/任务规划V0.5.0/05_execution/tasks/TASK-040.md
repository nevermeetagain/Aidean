# TASK-040：需求文档 v1.15 对齐代码事实与用户裁决

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：§3 需求基线复核 C-1..C-6
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-023、REQ-F-024、REQ-F-027、REQ-F-042、REQ-F-048
- 来源方案：ADR-P004

## 目标
需求文档 v1.15：§3.5 JWT 有效期、§3.9/§3.10 功能开关实装口径（后台域表中「功能开关 ✅GET/PATCH」改为实测）、§3.11 导航、§六 MVP（微信扫码/在线支付暂停）、§3.2 计价展示口径（¥/M 与汇率，按 U-15）与代码/裁决一致，并在文末链接统一追溯矩阵

## 输入
- 文档：`docs/任务规划V0.5.0/03_需求基线复核.md`；`docs/product/requirements/需求文档.md`
- 契约：`contracts/03-identity.contract.ts TOKEN_TTL`
- 前置任务：TASK-009
- 前置状态：U-1/U-2/U-11 已裁决

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求文档.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-040/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 逐条按裁决改写
2. [ ] 保留上一版摘要行
3. [ ] 门禁
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0（核心文档版本头）
- [ ] C-1..C-6 每条在文中有对应修订或「保持原文+裁决注记」
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-040/`

## 允许修改
- `docs/product/requirements/需求文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-040/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.5.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-009
- 资源锁串行（同文件，须在其后执行）：TASK-020, TASK-025, TASK-031
- Blocks：TASK-041
- 阻塞条件：U-1/U-2/U-11 任一未裁决 → 只改无争议条目并标「待裁决」

## 建议执行档位
opus　理由：需求口径修订（需用户裁决 U-1/U-2/U-11），影响全局范围

## 升级条件
涉及范围增删 → 升 fable（需求终裁）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
