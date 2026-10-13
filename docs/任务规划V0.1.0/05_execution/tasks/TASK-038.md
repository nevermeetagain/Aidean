# TASK-038：单测覆盖率基线测量（web/shared，不设阈值）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / §9.1 基线指标
- 来源方案：SOL-S6

## 目标
引入 @vitest/coverage-v8（与 vitest 主版本匹配的 devDependency）并产出 web/shared 行/分支覆盖率首次测量值写入证据；CI 只上报不卡阈值

## 输入
- 文档：`apps/web/vitest.config.ts`
- 契约：`无`
- 前置任务：TASK-004
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/vitest.config.ts`
  - `apps/web/package.json`
  - `packages/shared/package.json（仅 devDependencies/脚本）`
  - `pnpm-lock.yaml`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-038/coverage-baseline.md`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-038/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 安装与 vitest 2.1.x 匹配的 coverage-v8
2. [ ] coverage.reporter=text-summary,json-summary
3. [ ] 记录数值
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run --coverage` exit 0 并输出 Lines/Branches 百分比
- [ ] 测试总数不变（1081）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run --coverage
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-038/`

## 允许修改
- `apps/web/vitest.config.ts`
- `apps/web/package.json`
- `packages/shared/package.json`
- `pnpm-lock.yaml`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-038/**`

## 禁止修改
- `apps/web/lib/**`
- `apps/web/app/**`
- `packages/shared/src/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-004
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：新增 devDependency 被视为技术栈偏离 → 停止待 U-10 裁决

## 建议执行档位
sonnect　理由：测量类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
