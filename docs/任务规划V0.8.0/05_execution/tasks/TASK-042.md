# TASK-042：备份/恢复演练脚本（pg_dump→restore→逐表行数比对）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-14 scripts/db/backup.sh、restore.sh 已存在，改为在既有脚本上扩展逐表行数比对与演练记录

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #3 生产级数据策略
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-004
- 来源方案：SOL-S8

## 目标
scripts/ops/pg-drill.mjs 在 CI PG 上完成 dump→新库 restore→68 模型对应表行数逐表一致，输出耗时与备份体积

## 输入
- 文档：`docs/engineering/部署运维文档.md`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/ops/pg-drill.mjs`
  - `.github/workflows/ci.yml（可选 workflow_dispatch 步骤）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-042/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 scripts/db/backup.sh、restore.sh 既有实现上扩展（restore.sh:56-59），不另写一套
2. [ ] pg_dump -Fc
3. [ ] createdb + pg_restore
4. [ ] information_schema 行数比对
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 演练输出 diff=0
- [ ] 证据含耗时/体积
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/ops/pg-drill.mjs --source $DATABASE_URL
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-042/`

## 允许修改
- `.github/workflows/ci.yml`
- `scripts/db/**`
- `scripts/ops/**`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-042/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docker/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-007, TASK-037, TASK-050
- Blocks：TASK-043, TASK-052, TASK-083
- 阻塞条件：CI 镜像无 pg_dump 客户端 → 使用 postgres:16 容器内执行

## 建议执行档位
sonnect　理由：运维脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
