# TASK-083：上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-3 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-03）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：REQ-F-053
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-053
- 来源方案：需求文档:69

## 目标
脚本列出 seed 中全部 verifiedStatus=1 行并要求 docs 审核记录逐条覆盖，缺一即 exit 1

## 输入
- 文档：`docs/product/requirements/需求文档.md:69`；`apps/web/prisma/seed.ts:531`
- 契约：`无`
- 前置任务：TASK-042
- 前置状态：U-3 已裁决（进入上线准备）

## 输出
- 新增/修改的文件路径：
  - `scripts/release/check-seed-review.mjs（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-083/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 解析 seed.ts 收集行键
2. [ ] 比对审核记录文件（路径由 U-3 裁决时确定，默认 docs/plans/上线前seed审核.md）
3. [ ] CI 中仅在 release 分支启用
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 审核记录缺失时 `node scripts/release/check-seed-review.mjs` exit 1
- [ ] 全覆盖时 exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/release/check-seed-review.mjs; echo exit=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-083/`

## 允许修改
- `scripts/release/check-seed-review.mjs`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-083/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-3 未裁决

## 建议执行档位
sonnect　理由：脚本 + 清单，无业务决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
