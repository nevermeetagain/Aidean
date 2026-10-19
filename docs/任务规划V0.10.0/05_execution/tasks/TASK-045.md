# TASK-045：UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-4 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：#70 / R-84
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
/products/[slug] 有截图时渲染画廊（懒加载、点击放大、SafeImage 兜底），无截图不渲染；后台 ProductsManager 可增删排序截图

## 输入
- 文档：`contracts/04-resources.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`ProductIntroScreenshotSchema`；`ImageRefSchema`
- 前置任务：TASK-044
- 前置状态：TASK-044 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(site)/products/[slug]/page.tsx`
  - `apps/web/components/site/ProductScreenshots.tsx`
  - `apps/web/components/admin/ProductsManager.tsx（或其 intro 子编辑器）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-045/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 画廊组件
2. [ ] 后台编辑条目
3. [ ] tsc/lint
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] 人工：无截图产品页面与现状逐像素一致（截图对比证据）
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-045/`

## 允许修改
- `apps/web/app/(site)/products/[slug]/**`
- `apps/web/components/site/ProductScreenshots.tsx`
- `apps/web/components/admin/ProductsManager.tsx`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-045/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-044
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-046
- 阻塞条件：U-4 未裁决 → 不执行

## 建议执行档位
opus　理由：展示页视觉设计，主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h
