# TASK-038：单测覆盖率基线测量（web/shared，不设阈值）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / §9.1 基线指标
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-008
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
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-038/coverage-baseline.md`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-038/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.8.0/06_validation/evidence/EVD-038/`

## 允许修改
- `apps/web/vitest.config.ts`
- `apps/web/package.json`
- `packages/shared/package.json`
- `pnpm-lock.yaml`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-038/**`

## 禁止修改
- `apps/web/lib/**`
- `apps/web/app/**`
- `packages/shared/src/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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
