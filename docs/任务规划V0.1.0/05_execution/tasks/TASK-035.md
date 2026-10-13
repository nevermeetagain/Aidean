# TASK-035：e2e：搜索（命中/无结果/键盘跳转/移动端）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- 来源方案：SOL-S5

## 目标
e2e/web/search.spec.ts 通过（含 mobile project）

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-034, TASK-006
- 前置状态：TASK-034 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/web/search.spec.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-035/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 种子模型名作为查询词
2. [ ] Esc 关闭
3. [ ] mobile 视口
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-035/`

## 允许修改
- `e2e/web/search.spec.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-035/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-034, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-036
- 阻塞条件：testid 不符 → FAIL 回 TASK-034

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
