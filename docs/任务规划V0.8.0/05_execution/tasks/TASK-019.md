# TASK-019：e2e：功能开关端到端（关→入口消失+API 50011→开→恢复）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·e2e 未运行**｜V0.8.0 复核（c2da219）：e2e/admin/feature-flags.spec.ts 新增；本环境未运行（UNKNOWN）（V0.7.0 判定：未开工）；剩余工时 0（原 4h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041
- 来源方案：DESIGN-001

## 目标
e2e/admin/feature-flags.spec.ts 通过：SUPER_ADMIN 关闭 ladder.station → 前台导航无入口、/providers 显示 feature-disabled、GET /api/v1/ladder?type=stations 返回 code 50011 → 重新开启后恢复（测毕还原）

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`FEATURE_DISABLED(50011)`
- 前置任务：TASK-018, TASK-006
- 前置状态：TASK-018 已合并，CI e2e job 可用

## 输出
- 新增/修改的文件路径：
  - `e2e/admin/feature-flags.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-019/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 admin-setup 登录态
2. [ ] finally 中恢复开关
3. [ ] workers=1（全局状态）
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1` 通过
- [ ] 测后 feature_flags 状态与测前一致
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-019/`

## 允许修改
- `e2e/admin/feature-flags.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-019/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-018, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-020
- 阻塞条件：UI testid 与契约⑥不符 → 判 FAIL 回 TASK-018

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h
