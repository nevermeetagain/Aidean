# TASK-024：e2e：收藏端到端（收藏→控制台可见→取消→未登录引导）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·e2e 未运行**｜V0.8.0 复核（c2da219）：e2e/web/favorites.spec.ts 新增；本环境未运行（UNKNOWN）（V0.7.0 判定：未开工）；剩余工时 0（原 4h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
- 来源方案：SOL-S3

## 目标
e2e/web/favorites.spec.ts 通过：登录用户收藏模型→控制台收藏 Tab 出现→取消后消失；匿名点击跳登录；他人收藏 DELETE 得 40000

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`AUTHZ_BOUNDARY（他人收藏）`
- 前置任务：TASK-023, TASK-006
- 前置状态：TASK-023 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/web/favorites.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-024/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两个测试用户
2. [ ] API 级越权断言
3. [ ] 清理数据
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-024/`

## 允许修改
- `e2e/web/favorites.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-024/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-023, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-025
- 阻塞条件：testid 不符 → FAIL 回 TASK-023

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h
