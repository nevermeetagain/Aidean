# TASK-037：e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / 未完成事项 #36
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-006、REQ-NF-005
- 来源方案：SOL-S6

## 目标
root config 新增 project `flows`（testDir e2e/tests，排除 smoke 重复），package.json test:e2e 指向根配置；`--list` 总数 = 收敛前两配置去重并集，并产出唯一基线表

## 输入
- 文档：`playwright.config.ts`；`e2e/playwright.config.ts`；`package.json:16`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `playwright.config.ts`
  - `e2e/playwright.config.ts（删除或改为 re-export）`
  - `package.json`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-037/e2e-baseline.md`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-037/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 收敛前 `--list` 两配置各记录
2. [ ] 合并 projects
3. [ ] 收敛后 `--list` 对账
4. [ ] CI e2e job 改用根配置
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test --list --config playwright.config.ts` 总数 = 收敛前去重并集（证据表逐文件对账）
- [ ] `pnpm test:e2e` 使用根配置
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test --list --config playwright.config.ts
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-037/`

## 允许修改
- `playwright.config.ts`
- `e2e/playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-037/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**/*.spec.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-007, TASK-050
- Blocks：TASK-065
- 阻塞条件：合并后 smoke 重复执行导致登录限流 → 保留 workers=1 并登记

## 建议执行档位
sonnect　理由：测试配置整理

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
