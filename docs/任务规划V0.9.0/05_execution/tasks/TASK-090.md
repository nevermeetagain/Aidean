# TASK-090：文档层回灌：把他线 S0–S3 的文档同步内容（API 文档/数据库文档/功能设计/术语）合入镜像 docs/（排除规划目录）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：REQ-L-015（双端一致）/ AGENTS.md 铁律 1、6
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-012、REQ-L-015
- 来源方案：V0.8.0 24_叠加同步与开发线裁决.md

## 目标
TASK-009/013/020/025 要求的文档改动在镜像 docs/ 中可见，且 docs-rule/docs-facts 两个检查 exit 0；另：API接口文档 §4 登记 20004 MONITOR_SOURCE_NOT_FOUND / 50012 MONITOR_SOURCE_CREDENTIAL_MISSING（E9-15）；以执行时实测为准收口 check-docs-rule（admin 域/页数）与 check-docs-facts 全部红项（含本轮新增 lib/features/pricing、6 个 spec 文件带来的计数变化），使 057 的门禁验收转绿

## 输入
- 文档：`docs/任务规划V0.9.0/24_叠加同步与开发线裁决.md`；`docs/architecture/API接口文档.md`；`docs/architecture/数据库文档.md`
- 契约：`无`
- 前置任务：TASK-085
- 前置状态：TASK-085 已完成（可读 huaweicloud docs/）

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/**`
  - `docs/product/**`
  - `docs/governance/**（仅版本头与登记）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-090/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 列出 huaweicloud 与镜像 docs/（排除 docs/任务规划*）的差异文件
2. [ ] 逐文件合入；遇镜像侧独有改动则两侧保留并在文末登记冲突
3. [ ] 运行 docs-rule / docs-facts
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0
- [ ] API接口文档含 `/api/v1/user/favorites` 与 `/api/v1/admin/feature-flags`
- [ ] docs/任务规划* diff 为空
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0
- [ ] API接口文档 §4 含 20004 与 50012 行
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && grep -q '/api/v1/user/favorites' docs/architecture/API接口文档.md && grep -q 'feature-flags' docs/architecture/API接口文档.md; echo exit=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-090/`

## 允许修改
- `docs/architecture/`
- `docs/product/`
- `docs/governance/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-090/**`

## 禁止修改
- `docs/任务规划V0.*/**`
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-088
- 阻塞条件：huaweicloud docs/ 不可读 → 改为按 009/013/020/025 原卡在镜像直接执行

## 建议执行档位
haiku　理由：按清单合并文本，不做领域判断

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
