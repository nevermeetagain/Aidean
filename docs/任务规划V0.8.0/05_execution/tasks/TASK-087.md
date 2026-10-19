# TASK-087：V0.5.0 规划树文件名 mojibake 修复（24 个双编码文件名 git mv 为正字 + 引用修正）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.8.0 状态：**未开工**｜V0.7.0 新增

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：REQ-L-016（文档文件名可读、相对链接可解析）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-016
- 来源方案：V0.7.0 02_事实基线 §2.4 D7-04

## 目标
docs/任务规划V0.5.0 下所有文件名可被 UTF-8 正确显示，且 V0.5.0 内相对链接 0 悬空

## 输入
- 文档：`docs/任务规划V0.8.0/02_事实基线.md §2.4`；`docs/任务规划V0.8.0/06_validation/evidence/EVD-BASELINE-V7/mojibake-map.txt`
- 契约：`无`
- 前置任务：TASK-085
- 前置状态：TASK-085 已完成（避免与 aideanew 侧同树改名冲突）

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.5.0/（仅文件名，不改 contracts/ 与 database/）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-087/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 mojibake-map.txt 逐条 `git mv`（不可逆解码的 13 个按内容首行标题人工定名）
2. [ ] 删除与 V0.4.0 内容字节一致的重复 03_solution 文件前先确认引用
3. [ ] 运行链接检查脚本（`node scripts/check-docs-rule.mjs`）
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `git ls-files docs/任务规划V0.5.0 | grep -cP '[鍔娣瑙浜鏁鍨渚鎵椋钀鑷宸澶閲绔绗闇浠]'` 输出 0
- [ ] docs-rule、docs-facts exit 0
- [ ] contracts/、database/ diff 为空
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
git ls-files docs/任务规划V0.5.0 | grep -cP '[鍔娣瑙浜鏁鍨渚鎵椋钀鑷宸澶閲绔绗闇浠]'; node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-087/`

## 允许修改
- `docs/任务规划V0.5.0/`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-087/**`

## 禁止修改
- `docs/任务规划V0.5.0/contracts/**`
- `docs/任务规划V0.5.0/database/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：aideanew 侧 CI 以 mojibake 路径硬引用任何文件 → 停止回报

## 建议执行档位
haiku　理由：机械重命名，无领域决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
