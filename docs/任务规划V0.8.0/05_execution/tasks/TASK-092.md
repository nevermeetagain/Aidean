# TASK-092：UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛选全选/价格档位（截图 + 五态核对）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工（Hark 核心）**｜V0.8.0 新增：UI 卡此前只有代码证据

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026 / §4 UX States
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-026、REQ-F-041、REQ-F-042、REQ-F-052、REQ-F-058
- 来源方案：V0.5.0 contracts UX States

## 目标
018/023/078 三张 UI 卡的五态（空/加载/错误/无权限/成功）在 :3000 运行态逐一截图核对，输出 PASS/FAIL/UNKNOWN

## 输入
- 文档：`docs/任务规划V0.5.0/contracts/（UX States）`
- 契约：`UX States：FeatureFlags、Favorites、LadderFilter`
- 前置任务：TASK-086, TASK-023, TASK-078, TASK-018
- 前置状态：TASK-086 已跑通 :3000 运行态

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 UX States 契约列出 3 页 × 5 态检查表
2. [ ] 逐态截图（桌面 1440 + 移动 390）
3. [ ] 不符项写缺陷单并回指原卡
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 检查表 15 格全部有截图或明确 N/A 理由
- [ ] 每个 FAIL 有对应缺陷单
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(ls docs/任务规划V0.8.0/06_validation/evidence/EVD-092/*.png | wc -l) -ge 15; echo shots_ok=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`

## 允许修改
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-086, TASK-023, TASK-078, TASK-018
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：运行态起不来 → UNKNOWN

## 建议执行档位
opus　理由：UI 质量判断属核心验收，且为执行方以外的独立判定者

## 升级条件
≥3 格 FAIL → 回到原 UI 卡返工；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
