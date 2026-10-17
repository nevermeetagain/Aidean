# TASK-085：主线归一：工作代码线与 nevermeetagain/Aidean main 双端一致（B-0 裁决落地）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.7.0 状态：**待裁决 B-0**｜V0.7.0 新增：镜像与工作线分裂是本轮最大事实缺口

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增（B-0）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-L-015（双端一致）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-015
- 来源方案：ADR-P008 主线归一与镜像同步

## 目标
B-0 裁决后，nevermeetagain/Aidean main 包含工作代码线全部业务提交（方案B）或书面宣告镜像为唯一真源并归档他线（方案A），`git ls-remote` 两端 HEAD 关系可复核

## 输入
- 文档：`docs/任务规划V0.7.0/23_主线二元分裂与归一方案.md`；`docs/任务规划V0.6.0/19_执行过程记录.md §10`；`docs/任务规划V0.7.0/03_solution/decisions/ADR-P008-主线归一与镜像同步.md`
- 契约：`无（仓库拓扑）`
- 前置任务：无
- 前置状态：用户已裁决 B-0（方案A/B）；方案B 另需：持有 aideanew/Aidean 读权限与 nevermeetagain/Aidean 写权限的同一执行环境

## 输出
- 新增/修改的文件路径：
  - `无业务文件变更（仅 git 引用）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-085/topology.txt`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-085/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 记录两端快照：`git ls-remote https://github.com/nevermeetagain/Aidean.git refs/heads/main` 与 aideanew/Aidean `refs/heads/huaweicloud` 的 sha，写入 EVD-085/topology.txt
2. [ ] 判定血缘：在 huaweicloud 工作副本 `git fetch mirror && git merge-base --is-ancestor mirror/main HEAD; echo $?`（V0.6.0 自述两条历史互不包含 → 预期 1，故不能直接快进推送）
3. [ ] 方案B（快照同步，沿用 77c7952 的 mirror snapshot 惯例）：在镜像 main 的工作副本中，用 huaweicloud 树替换除 docs/任务规划V0.1.0–V0.4.0、V0.7.0 之外的全部路径（`git read-tree`/`git checkout <huaweicloud-sha> -- .` 后恢复上述目录；排除 .example/history/AideanSynapse），提交 `chore: mirror snapshot <huaweicloud-sha>`，普通快进推送
4. [ ] 方案A（镜像为唯一真源）：在 aideanew 侧打 tag `archive/huaweicloud-<YYYYMMDD>`，书面登记后续只在镜像 main 开发；S0/S1 卡按原卡执行
5. [ ] 推送后复核：`ls apps/web/prisma/migrations | tail -2` 与 `git diff --stat <huaweicloud-sha> origin/main -- . ':!docs/任务规划V0.1.0' ':!docs/任务规划V0.2.0' ':!docs/任务规划V0.3.0' ':!docs/任务规划V0.4.0' ':!docs/任务规划V0.7.0'`
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `git merge-base --is-ancestor ffa158c origin/main` exit 0（镜像历史未被改写）
- [ ] 方案B：上述 diff --stat 为空（镜像树 = 工作线树 + 镜像独有规划目录）
- [ ] 方案B：apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/ 存在
- [ ] 方案A：EVD-085 含用户裁决原文与 archive tag 名
- [ ] 全程无 --force
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
git fetch origin && git merge-base --is-ancestor ffa158c origin/main; echo ff=$?; ls apps/web/prisma/migrations | tail -2; git log --oneline -1 origin/main
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-085/`

## 允许修改
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-085/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `（任何 --force 推送）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-001, TASK-007, TASK-008, TASK-049, TASK-076, TASK-086, TASK-087
- 阻塞条件：B-0 未裁决；或非快进（存在分叉）→ 停止回报，不得强推

## 建议执行档位
opus　理由：不可逆的仓库历史操作，影响全部后续卡的基线

## 升级条件
出现分叉需三方合并 → 升 fable（全局性冲突）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
