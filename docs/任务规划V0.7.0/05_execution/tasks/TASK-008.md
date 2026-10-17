# TASK-008：OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**haiku** ｜ **条件卡：待 P-2（AideanBot 3333 回调是否保留）裁决后下发**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-008/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-C-02 端口 / P-2（AideanBot 是否仍需 3333 回调）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-006
- 来源方案：SOL-S0

## 目标
seed.ts wechat-rag.redirectUris 与 P-2 裁决一致：方案A（AideanBot 仍在用）= [wechat-rag.aidean.local, localhost:3200, localhost:3333]；方案B（AideanBot 已由 BotHot 取代）= 保持现状 [wechat-rag.aidean.local, localhost:3200]，sso-3333 e2e 的去留另行立卡（Agent-Guard 所有，本卡不改 e2e）

## 输入
- 文档：`docs/product/modules/子平台规范说明.md §5.0 端口区间`；`BotHot AGENTS.md 端口表（3200 前端宿主，外部仓 aideanew/BotHot@13acacc）`
- 契约：`无（数据值）`
- 前置任务：TASK-085
- 前置状态：P-2 已由用户裁决

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/seed.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-008/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 方案A：seed.ts:354 redirectUris 追加 'http://localhost:3333/auth/aidean/callback'（不删 3200）
2. [ ] 本地 db:seed 两次（upsert 幂等），运行 node apps/web/scripts/check-oidc.mjs
3. [ ] 方案B：不改代码，证据目录写入裁决原文
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 方案A：`grep -c "localhost:3200/auth/aidean/callback\|localhost:3333/auth/aidean/callback" apps/web/prisma/seed.ts` 两个回调均命中；check-oidc has3333=true
- [ ] 方案B：git diff 为空且证据含裁决记录
- [ ] TASK-007 端口守卫对 seed 回调无 ERROR
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
grep -n "auth/aidean/callback" apps/web/prisma/seed.ts && node scripts/guard/port-consistency.mjs
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-008/`

## 允许修改
- `apps/web/prisma/seed.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-008/**`

## 禁止修改
- `apps/web/prisma/migrations/**`
- `apps/web/prisma/schema.prisma`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：TASK-058
- Blocks：无
- 阻塞条件：P-2 未裁决 → 不执行（条件卡）

## 建议执行档位
haiku　理由：单值替换（seed.ts:354）

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小（<2h，§6.3 过小信号：因所有权仅 Agent-Data 可写 seed，无法并入同刀他卡，保留独立卡并在证据中注明）　约 1h　<2h
