# TASK-021：收藏契约落地（favorites.schema.ts）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：沿用（V0.4.0 重核：bfb3aef 业务树=77c7952，无代码 delta；V0.2.0 判定 = 沿用）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13 收藏（需求 §二 免费注册用户「收藏」）
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
- 来源方案：SOL-S3

## 目标
packages/shared/src/schemas/favorites.schema.ts 导出 FavoriteCreate/ListQuery/Item/ListResponse/DeleteResponse，单测覆盖非法 refType 与超长 note

## 输入
- 文档：`contracts/01-api.contract.ts §S3`
- 契约：`Favorite*`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/favorites.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/favorites.spec.ts`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-021/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-021/`

## 允许修改
- `packages/shared/src/schemas/favorites.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/favorites.spec.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-021/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014
- Blocks：TASK-022
- 阻塞条件：U-8 否决收藏 → 整刀 S3 取消

## 建议执行档位
sonnect　理由：冻结稿原样落地

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
