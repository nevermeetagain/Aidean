# TASK-085：叠加缺口回补 + 他线归档（B-0' 已裁决 A'：镜像 main 为唯一开发线）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.9.0 状态：**B-0' 已裁决 A'·待回补**｜V0.9.0：用户裁决 A'；Hark 已在镜像落地 8 张核心卡（与他线无重叠文件）；本卡剩工件回补 + 他线冻结 tag；回补生成器后须重生成 contract/*.generated.spec.ts 并核对 E9-07 手补两码

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增（B-0）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-L-015（双端一致）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001、REQ-L-015
- 来源方案：ADR-P008 主线归一与镜像同步

## 目标
镜像 main 补齐他线已有而叠加遗漏的工件（scripts/contract/gen-contract-tests.mjs 及真源、scripts/guard/**、ci.yml e2e-skeleton/lint/ui 步骤）；huaweicloud 打 tag archive/huaweicloud-<YYYYMMDD> 冻结；重生成契约测试与 Hark 手补的 errors.generated.spec.ts（E9-07，含 20004/50012）diff 为空

## 输入
- 文档：`docs/任务规划V0.9.0/23_主线二元分裂与归一方案.md`；`docs/任务规划V0.6.0/19_执行过程记录.md §10`；`docs/任务规划V0.9.0/03_solution/decisions/ADR-P008-主线归一与镜像同步.md`
- 契约：`无（仓库拓扑）`
- 前置任务：无
- 前置状态：B-0' 已裁决 A'（2026-10-19）；执行环境需可读 aideanew/Aidean 且可写 nevermeetagain/Aidean

## 输出
- 新增/修改的文件路径：
  - `scripts/contract/gen-contract-tests.mjs（回补）`
  - `scripts/guard/**（回补）`
  - `.github/workflows/ci.yml（回补）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-085/topology.txt`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-085/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 huaweicloud 工作副本列出叠加遗漏清单：`git diff --stat <mirror-sha> <huaweicloud-sha> -- . ':!docs' ':!.example'`，写入 EVD-085/topology.txt
2. [ ] 仅回补清单内 Agent-Guard 所有权路径（scripts/contract/、scripts/guard/、.github/workflows/ci.yml、package.json scripts 段）；业务源码若有差异另列，不在本卡回补
3. [ ] 回补后在镜像执行：`node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract/`（防漂移可执行）
4. [ ] 依 B-0' 裁决在 EVD-085 写明：A'——huaweicloud 打 tag archive/huaweicloud-<YYYYMMDD> 并冻结；B'——叠加节奏（每切片验收后一次）与禁止镜像侧直接改业务码
5. [ ] 普通快进推送，全程无 --force
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `git merge-base --is-ancestor c2da219 origin/main` exit 0
- [ ] `test -f scripts/contract/gen-contract-tests.mjs` 且重生成后 contract 目录 diff 为空
- [ ] `test -d scripts/guard` exit 0
- [ ] ci.yml 含 e2e-skeleton job 与「重生成契约测试 + git diff --exit-code packages/shared/src/__tests__/contract/」防漂移步骤（2 份 generated spec 头注释所声称的 CI 门，STEP-01 审查 X1）
- [ ] EVD-085 含 B-0' 裁决原文
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
git merge-base --is-ancestor c2da219 origin/main; echo ff=$?; test -f scripts/contract/gen-contract-tests.mjs && node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract/; echo gen=$?; test -d scripts/guard; echo guard=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-085/`

## 允许修改
- `scripts/contract/`
- `scripts/guard/`
- `.github/workflows/ci.yml`
- `package.json`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-085/**`

## 禁止修改
- `apps/**`
- `packages/shared/src/**（除 __tests__/contract 重生成产物）`
- `（任何 --force 推送）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-007, TASK-008, TASK-049, TASK-087, TASK-090
- 阻塞条件：B-0' 未裁决；或遗漏清单含业务源码差异 → 停止回报，另立卡

## 建议执行档位
opus　理由：不可逆仓库操作 + 需读私有 aideanew/Aidean（Hark 不可读）；执行=他线环境，审查=Hark

## 升级条件
出现分叉需三方合并 → 升 fable（全局性冲突）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
