# TASK-039：千级模型天梯量级基线（只测量，不优化）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：未完成事项 #17 / R-83（千级）/ §9.1
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-007
- 来源方案：SOL-S6

## 目标
在 CI 临时库生成 1000 模型（脚本，不进 seed）后测 GET /api/v1/ladder?type=models p50/p95（20 次）与 /models 首屏 HTML 字节数，写入基线证据

## 输入
- 文档：`scripts/test/benchmark/`；`e2e/perf/`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/test/benchmark/ladder-1k.mjs`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-039/ladder-1k-baseline.md`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-039/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 批量插入 1000 AiModel+benchmark（仅临时库，结束 TRUNCATE 回滚）
2. [ ] autocannon 不可用则用 node fetch 循环计时
3. [ ] 记录 p50/p95/HTML 字节
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 证据含命令、原始样本与 p50/p95
- [ ] 脚本对非临时库（DATABASE_URL 不含 ci/test 标识）拒绝运行
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/test/benchmark/ladder-1k.mjs --dry-run
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-039/`

## 允许修改
- `scripts/test/benchmark/**`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-039/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `apps/web/prisma/seed*.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：需改业务代码才能测 → 停止

## 建议执行档位
sonnect　理由：测量脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
