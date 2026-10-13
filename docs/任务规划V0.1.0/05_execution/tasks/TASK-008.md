# TASK-008：OIDC 种子端口口径对齐：wechat-rag(AideanBot) 本地回调 3200→3333

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**haiku**

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：REQ-C-02 端口（AideanBot=3333；子平台规范说明 §5 + e2e/web/sso-3333.spec.ts + apps/web/scripts/check-oidc.mjs 均为 3333）
- 来源方案：SOL-S0

## 目标
seed.ts wechat-rag.redirectUris = ['https://wechat-rag.aidean.local/auth/aidean/callback','http://localhost:3333/auth/aidean/callback']，seed 幂等复跑后 check-oidc has3333=true

## 输入
- 文档：`docs/product/modules/子平台规范说明.md §5.0 端口区间（AideanBot 3300–3400）`
- 契约：`无（数据值）`
- 前置任务：无
- 前置状态：U-6 未被否决（默认按用户口径 3333）

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/seed.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-008/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 修改 seed.ts:354 本地回调为 3333
2. [ ] 本地 db:seed 两次，运行 node apps/web/scripts/check-oidc.mjs
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n "localhost:3200" apps/web/prisma/seed.ts` 无输出
- [ ] check-oidc.mjs 输出 has3333: true
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
grep -n "localhost:3333/auth/aidean/callback" apps/web/prisma/seed.ts && node apps/web/scripts/check-oidc.mjs
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-008/`

## 允许修改
- `apps/web/prisma/seed.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-008/**`

## 禁止修改
- `apps/web/prisma/migrations/**`
- `apps/web/prisma/schema.prisma`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-007
- 阻塞条件：用户裁决 U-6 = 其他端口 → 按裁决值执行

## 建议执行档位
haiku　理由：单值替换（seed.ts:354）

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小（<2h，§6.3 过小信号：因所有权仅 Agent-Data 可写 seed，无法并入同刀他卡，保留独立卡并在证据中注明）　约 1h　<2h
