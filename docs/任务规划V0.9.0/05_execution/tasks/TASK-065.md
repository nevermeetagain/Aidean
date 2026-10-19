# TASK-065：E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/013
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
e2e/admin/monitoring.spec.ts 在测试库 + MONITOR_FIXTURE_DIR 下跑通：登录管理员→进入 /admin/monitoring→运行 openrouter→变更流出现 ≥1 条 listed 事件；未授权用户见 forbidden 态

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`MONITORING_UX_STATES`
- 前置任务：TASK-062, TASK-064, TASK-037, TASK-006
- 前置状态：TASK-062、TASK-064 已合并；e2e 唯一配置（TASK-037）与 CI e2e job（TASK-006）已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/admin/monitoring.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-065/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 e2e/fixtures.ts 登录助手
2. [ ] fixture 模式运行脚本而非外网
3. [ ] 断言五态 testid 至少 ready/forbidden/empty 三态
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `npx playwright test e2e/admin/monitoring.spec.ts` 通过（CI e2e job）
- [ ] --list 计数 +≥3
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
npx playwright test e2e/admin/monitoring.spec.ts --config playwright.config.ts
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-065/`

## 允许修改
- `e2e/admin/monitoring.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-065/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-062, TASK-064, TASK-037, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：CI 无 PG 服务 → 标记 待其他员工完成（依赖 TASK-006）

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
