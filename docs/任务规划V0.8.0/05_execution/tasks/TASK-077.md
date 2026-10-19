# TASK-077：OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整链 / host-only Cookie

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：oidc-redlines.spec.ts（330 行）通过（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 4h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-06）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-F-056
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-056
- 来源方案：子平台SSO接入指南

## 目标
三条红线各有至少一个失败路径用例：plain 被拒、重放 refresh 后整链失效、Set-Cookie 不含 Domain=

## 输入
- 文档：`docs/product/modules/子平台SSO接入指南.md:55,89,141,215-229`；`apps/web/lib/features/auth/repository.ts:59,67`
- 契约：`既有错误码（invalid_request / invalid_grant）`
- 前置任务：TASK-001
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-077/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 定位 authorize/token 处理函数
2. [ ] plain → 400 invalid_request
3. [ ] 同一 refresh 用两次 → 第二次 invalid_grant 且同链 access 失效
4. [ ] Cookie 断言无 Domain 属性
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts` 全绿或失败用例已登记为安全缺陷
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-077/`

## 允许修改
- `apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-077/**`

## 禁止修改
- `apps/web/lib/features/auth/*.ts（只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：红线不成立 → 停止并登记安全缺陷，交 Hark/opus

## 建议执行档位
sonnect　理由：按接入指南写回归测试

## 升级条件
安全缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h
