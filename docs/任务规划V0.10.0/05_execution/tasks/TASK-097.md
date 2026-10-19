# TASK-097：天梯生效价读侧加固 + 缓存失效：价格行排序/脏行排除、优惠写入后清天梯缓存

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0 新增

> 历史（V0.4.0→V0.5.0）：V0.10.0 新增（review-ext12 D4/D5）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-038 / REQ-NF-003
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038、REQ-F-063
- 来源方案：review-ext12 D4/D5

## 目标
ladder 价格读取只取 isCurrent=true 且 sourceType≠PROMOTION 的当前价 + 窗口内 PROMOTION 行并按 effectiveFrom desc 排序；优惠 POST/PATCH/DELETE 与价格写入后调用 invalidateLadderCache 并 revalidatePath 天梯页，优惠结束后至多 1 次 TTL（≤ 优惠截止时刻对齐的缓存期）不再显示优惠价

## 输入
- 文档：`docs/任务规划V0.9.0/06_validation/evidence/EVD-093/`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-096
- 前置状态：TASK-093 已合并；TASK-096 已合并（同改 promotions 路由）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/ladder/repository.ts`
  - `apps/web/lib/features/ladder/service.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/`
  - `apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-097/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] repository 价格 where/orderBy 修正，脏行（PROMOTION 且 isCurrent=true）不得当当前价
2. [ ] 缓存 TTL 取 min(LADDER_CACHE_TTL, 最近优惠起止时刻 - now)
3. [ ] 写路由调用 invalidateLadderCache
4. [ ] 单测：脏行不挤出正确价、窗口边界缓存过期
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] ladder 单测全绿且新增 ≥3 例
- [ ] web tsc exit 0
- [ ] `node scripts/check-docs-facts.mjs` exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/ladder && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-097/`

## 允许修改
- `apps/web/lib/features/ladder/`
- `apps/web/app/api/v1/admin/prices/promotions/`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-097/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/pricing/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-096
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029
- 阻塞条件：排名口径需改（价格排序以外）→ 停

## 建议执行档位
opus　理由：对外价格展示正确性 + 缓存一致性

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 3h　≥2h
