# TASK-005：步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·e2e 未运行**｜V0.8.0 复核（c2da219）：e2e/web/walking-skeleton.spec.ts 新增 147 行；本环境无 PG16/Redis/浏览器服务，未运行（UNKNOWN）（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 4h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-F-05 用户系统 / REQ-NF-01 统一错误
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
- 来源方案：SOL-S0

## 目标
e2e/web/walking-skeleton.spec.ts 在 :3000 真实服务上串起：POST /auth/register→POST /auth/login→POST /user/api-keys（鉴权写）→/user/console 可见新 Key→匿名 GET /user/api-keys 得 401 且信封四要素齐全→/system/ready 200

## 输入
- 文档：`contracts/02-errors.contract.ts`；`contracts/03-identity.contract.ts`
- 契约：`ErrorBodySchema`；`SystemReadySchema`；`AUTHZ_BOUNDARY[0]`
- 前置任务：TASK-003
- 前置状态：TASK-003 已合并；本地/CI 有 PG16+Redis 且已 migrate deploy + seed

## 输出
- 新增/修改的文件路径：
  - `e2e/web/walking-skeleton.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-005/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 e2e/fixtures.ts 的登录辅助；邮箱用时间戳唯一
2. [ ] 断言错误体用 ErrorBodySchema.parse（从 @aidean/shared 导入）
3. [ ] 清理：测试末尾 DELETE 创建的 api-key
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] 无 DB 时该 spec 因 ready 503 明确失败（非超时）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-005/`

## 允许修改
- `e2e/web/walking-skeleton.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-005/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-003
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-006, TASK-009
- 阻塞条件：注册需邮箱验证码且无测试旁路 → 停止，改用 seed 用户并在证据中注明

## 建议执行档位
sonnect　理由：E2E 脚本，复用既有端点

## 升级条件
2 次失败 → 升 opus 排查环境 vs 产品缺陷；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h
