# TASK-042：备份/恢复演练脚本（pg_dump→restore→逐表行数比对）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S8（生产部署实弹）
- 来源需求：未完成事项 #3 生产级数据策略
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
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-042/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] pg_dump -Fc
2. [ ] createdb + pg_restore
3. [ ] information_schema 行数比对
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 演练输出 diff=0
- [ ] 证据含耗时/体积
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/ops/pg-drill.mjs --source $DATABASE_URL
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-042/`

## 允许修改
- `scripts/ops/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-042/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docker/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-007, TASK-037
- Blocks：TASK-043
- 阻塞条件：CI 镜像无 pg_dump 客户端 → 使用 postgres:16 容器内执行

## 建议执行档位
sonnect　理由：运维脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
