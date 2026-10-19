# TASK-006：e2e-skeleton 实跑：本地复现 ci.yml e2e-skeleton 全步骤（PG16+Redis7、迁移重放、seed、build、:3000、smoke+walking-skeleton）+ Actions 首轮绿 run（U-25）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0：job 已存在未执行；Actions 是否启用待 U-25（用户在仓库 Settings → Actions 开启），本地实跑部分不受阻

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：CI 真库骨架在关键路径上，是 35 张卡的上游

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-NF-03 测试可复现 / 未完成事项 #36
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
- 来源方案：SOL-S0

## 目标
085 已回补 ci.yml e2e-skeleton job（:130-236），但仓库 Actions 运行记录为 0、从未执行。本卡：在 Hark 环境以 embedded PG16 + Redis 按该 job 步骤实跑，修正 job 中不可执行的步骤；U-25（启用 Actions）裁决后取得首轮 run 结论

## 输入
- 文档：`.github/workflows/ci.yml（现状：e2e 不进 CI 注释）`；`docs/engineering/开发环境搭建.md`
- 契约：`SystemReadySchema`
- 前置任务：无
- 前置状态：TASK-005 已合并

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml（新增 job）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-006/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] services: postgres:16（POSTGRES_DB=aidean）、redis:7；env 注入 DATABASE_URL/REDIS_URL/JWT 相关与 AIDEAN_ENABLE_MOCK_UPSTREAM=1、AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1（仅测试，constants.ts:141 双条件保护）
2. [ ] 步骤：pnpm install --frozen-lockfile → prisma migrate deploy → db:seed → seed-navigation-menu → seed-rbac → build → start -p 3000 & → 轮询 ready ≤60s → playwright --project=smoke,web（walking-skeleton）
3. [ ] 失败上传 playwright-report 为 artifact
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] GitHub Actions e2e-skeleton job 绿
- [ ] job 日志可见 `migrate deploy` 应用 16 条迁移
- [ ] 端口恒为 3000（与 playwright baseURL 一致）
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-006/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-006/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-030, TASK-035, TASK-037, TASK-039, TASK-042, TASK-065, TASK-075, TASK-084
- 阻塞条件：seed 依赖外网（上游采集）导致 CI 不稳定 → 停止，在证据中列出外网调用点

## 建议执行档位
opus　理由：真库 CI 是全部集成验收的上游，失败面大、不可逆度高

## 升级条件
连续 2 次 CI 红且非产品缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
