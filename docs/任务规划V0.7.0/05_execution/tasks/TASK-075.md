# TASK-075：e2e：模型详情页基准弹窗与测评示例

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-059
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059
- 来源方案：同 074

## 目标
e2e 覆盖：打开/关闭基准弹窗、演示数据标识、测评示例空态与有数据态

## 输入
- 文档：`docs/任务规划V0.7.0/05_execution/tasks/TASK-074.md`
- 契约：`无`
- 前置任务：TASK-074, TASK-006
- 前置状态：TASK-074、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/model-detail-benchmark.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-075/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 基于既有 e2e 登录/种子工具编写 4 个用例
2. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g model-detail-benchmark` 全绿
- [ ] 用例数 ≥4
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g model-detail-benchmark
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-075/`

## 允许修改
- `e2e/model-detail-benchmark.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-075/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-074, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：074 未合并

## 建议执行档位
sonnect　理由：按 074 验收写 e2e，模式既有

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
