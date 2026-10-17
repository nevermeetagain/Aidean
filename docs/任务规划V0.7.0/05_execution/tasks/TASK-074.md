# TASK-074：UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-010 / REQ-F-059 / REQ-L-013
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059、REQ-L-013
- 来源方案：需求文档 §3.2；台账 #67

## 目标
详情页基准以弹窗呈现（点击基准名打开，含来源与核验状态），历史测评区块展示多模型回答并排示例，page.tsx:374 占位文案消失

## 输入
- 文档：`docs/product/requirements/需求文档.md:44-46,180`；`docs/product/design/界面交互文档.md`；`apps/web/app/(site)/models/[slug]/page.tsx:342-374`
- 契约：`既有 GET /api/v1/models/[id]、/api/v1/evaluations（只读，不改契约）`
- 前置任务：TASK-067
- 前置状态：TASK-067 已合并（同文件串行）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/models/BenchmarkDialog.tsx（新建）`
  - `apps/web/components/models/EvaluationExamples.tsx（新建）`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `e2e/model-detail-benchmark.spec.ts 由 TASK-075 编写`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-074/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 设计：弹窗结构（基准名/分数/来源/核验徽标/演示数据标识）与四态（加载/空/错误/成功）
2. [ ] 实现 BenchmarkDialog，复用 @aidean/ui Dialog
3. [ ] EvaluationExamples 读取已公开的历史测评，空数据时显示空态而非「即将上线」
4. [ ] 移除 page.tsx:374 占位
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'` exit=1
- [ ] `pnpm --filter web exec tsc --noEmit` exit 0
- [ ] `pnpm --filter web lint` exit 0
- [ ] TASK-075 的 e2e 全绿（弹窗可开关、示例区块四态）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && ! grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-074/`

## 允许修改
- `apps/web/components/models/BenchmarkDialog.tsx`
- `apps/web/components/models/EvaluationExamples.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-074/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/app/api/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-067
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-075
- 阻塞条件：需新增 API 字段 → 停止，提契约变更

## 建议执行档位
opus　理由：核心前台 UI 设计与实现（详情页是天梯主路径的落点）

## 升级条件
交互口径不明 → 升 fable 裁决；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h
