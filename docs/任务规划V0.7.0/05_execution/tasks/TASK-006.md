# TASK-006：CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-006/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：CI 真库骨架在关键路径上，是 35 张卡的上游

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-03 测试可复现 / 未完成事项 #36
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
- 来源方案：SOL-S0

## 目标
push/PR 时 e2e-skeleton job 在全新 PG16 上 `prisma migrate deploy` 重放 16 条迁移、seed、build、`next start -p 3000`、等待 /system/ready=200 后跑 smoke + walking-skeleton，全部通过

## 输入
- 文档：`.github/workflows/ci.yml（现状：e2e 不进 CI 注释）`；`docs/engineering/开发环境搭建.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-005, TASK-004, TASK-009
- 前置状态：TASK-005 已合并

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml（新增 job）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-006/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] services: postgres:16（POSTGRES_DB=aidean）、redis:7；env 注入 DATABASE_URL/REDIS_URL/JWT 相关与 AIDEAN_ENABLE_MOCK_UPSTREAM=1、AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1（仅测试，constants.ts:141 双条件保护）
2. [ ] 步骤：pnpm install --frozen-lockfile → prisma migrate deploy → db:seed → seed-navigation-menu → seed-rbac → build → start -p 3000 & → 轮询 ready ≤60s → playwright --project=smoke,web（walking-skeleton）
3. [ ] 失败上传 playwright-report 为 artifact
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] GitHub Actions e2e-skeleton job 绿
- [ ] job 日志可见 `migrate deploy` 应用 16 条迁移
- [ ] 端口恒为 3000（与 playwright baseURL 一致）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-006/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-006/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-005, TASK-004, TASK-009
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-010, TASK-019, TASK-024, TASK-030, TASK-035, TASK-037, TASK-039, TASK-042, TASK-065, TASK-075, TASK-079, TASK-084
- 阻塞条件：seed 依赖外网（上游采集）导致 CI 不稳定 → 停止，在证据中列出外网调用点

## 建议执行档位
opus　理由：真库 CI 是全部集成验收的上游，失败面大、不可逆度高

## 升级条件
连续 2 次 CI 红且非产品缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h
