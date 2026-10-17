# P3 完整任务书——守卫/测试/CI 线（Agent-Guard 的外部卡）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 本书自包含：19 张卡（其中条件卡 3 张），合计 76h。按「序」执行（全局拓扑序）。

## 范围
你只做本书列出的卡。写入范围：.github/、scripts/（不含 check-docs-*）、apps/web/scripts/、e2e/、playwright.config.ts、vitest.config.ts、package.json/lock、docker/、deploy/、packages/shared/src/__tests__/contract/。

## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`。开工前 `git fetch && git status`，基线为 `ffa158c`（业务树=77c7952）；先确认 TASK-085（主线归一）已完成；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**未获用户 APPROVE 不得开工**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.7.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。

## 1. 执行顺序

| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |
|---|---|---|---|---|---|---|---|
| 1 | TASK-004 | S0 | 契约测试生成器（从 shared 契约自动生成契约测试） | sonnect | 8h | ★001(Hark) | — |
| 2 | TASK-005 | S0 | 步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封 | sonnect | 4h | ★003(P1) | — |
| 3 | TASK-007 | S0 | 守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖） | sonnect | 6h | ★085(Hark) | — |
| 4 | TASK-019 | S2 | e2e：功能开关端到端（关→入口消失+API 50011→开→恢复） | sonnect | 4h | ★018(Hark)、★006(Hark) | — |
| 5 | TASK-024 | S3 | e2e：收藏端到端（收藏→控制台可见→取消→未登录引导） | sonnect | 4h | ★023(Hark)、★006(Hark) | — |
| 6 | TASK-030 | S4 | 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | sonnect | 6h | ★029(Hark)、★006(Hark) | — |
| 7 | TASK-035 | S5 | e2e：搜索（命中/无结果/键盘跳转/移动端） | sonnect | 3h | ★034(Hark)、★006(Hark) | U-5 |
| 8 | TASK-037 | S6 | e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | sonnect | 5h | ★006(Hark) | — |
| 9 | TASK-038 | S6 | 单测覆盖率基线测量（web/shared，不设阈值） | sonnect | 3h | 004 | — |
| 10 | TASK-039 | S6 | 千级模型天梯量级基线（只测量，不优化） | sonnect | 6h | ★006(Hark) | — |
| 11 | TASK-042 | S8 | 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | sonnect | 5h | ★006(Hark) | U-3 |
| 12 | TASK-049 | S4 | 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | sonnect | 3h | ★085(Hark) | — |
| 13 | TASK-050 | S0 | CI 门禁补齐：lint + @aidean/ui 单测进入 verify job | sonnect | 2h | 007 | — |
| 14 | TASK-062 | S10 | 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→wr | sonnect | 3h | ★061(P1) | — |
| 15 | TASK-065 | S10 | E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | sonnect | 4h | 062、★064(Hark)、037、★006(Hark) | — |
| 16 | TASK-075 | S11 | e2e：模型详情页基准弹窗与测评示例 | sonnect | 3h | ★074(Hark)、★006(Hark) | — |
| 17 | TASK-079 | S3 | e2e：筛选「全部」全选/全不选 + 价格页档位一致 | sonnect | 2h | ★078(Hark)、★006(Hark) | — |
| 18 | TASK-083 | S8 | 上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验） | sonnect | 3h | 042 | U-3 |
| 19 | TASK-084 | S6 | 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | haiku | 2h | ★006(Hark) | — |

## 2. 跨线等待
- 你要等待的他人卡：TASK-001(Hark)、TASK-003(P1)、TASK-006(Hark)、TASK-018(Hark)、TASK-023(Hark)、TASK-029(Hark)、TASK-034(Hark)、TASK-061(P1)、TASK-064(Hark)、TASK-074(Hark)、TASK-078(Hark)、TASK-085(Hark)
- 等你完成才能开工的他人卡：TASK-006(Hark)、TASK-009(P2)、TASK-020(P2)、TASK-025(P2)、TASK-031(P2)、TASK-036(P2)、TASK-043(Hark)、TASK-052(P2)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-004：契约测试生成器（从 shared 契约自动生成契约测试）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-004/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-01 / §9.4 契约测试
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
- 来源方案：ADR-P001

## 目标
`node scripts/contract/gen-contract-tests.mjs` 生成 packages/shared/src/__tests__/contract/*.generated.spec.ts，覆盖码表↔文档§4、HTTP 映射、权限注册表↔seed-rbac、信封 round-trip，并接入 CI

## 输入
- 文档：`contracts/02-errors.contract.ts`；`contracts/03-identity.contract.ts`；`docs/architecture/API接口文档.md §4`
- 契约：`ERROR_CODES`；`ErrorBodySchema`；`PermissionCodeSchema`；`AUTHZ_BOUNDARY`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/contract/gen-contract-tests.mjs（新建）`
  - `packages/shared/src/__tests__/contract/*.generated.spec.ts（生成物，入库）`
  - `.github/workflows/ci.yml（新增 contract 生成+diff 校验步骤）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-004/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 生成器读取 packages/shared/src/errors.ts 与 permissions.ts（tsx 动态 import），生成表驱动 spec
2. [ ] 解析 docs/architecture/API接口文档.md §4 码表（仅 3xxxx/4xxxx 已登记段 + 本规划新增登记后全段），生成「文档登记 ⊇ 代码码表」断言
3. [ ] CI 增步：生成后 `git diff --exit-code packages/shared/src/__tests__/contract` 防手改
4. [ ] 生成物头部写 `// AUTO-GENERATED — DO NOT EDIT`
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 生成器幂等：连续运行两次 git diff 为空
- [ ] `pnpm --filter @aidean/shared test` 全绿
- [ ] CI verify job 含 contract 步骤且通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-004/`

## 允许修改
- `scripts/contract/**`
- `packages/shared/src/__tests__/contract/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-004/**`

## 禁止修改
- `packages/shared/src/*.ts`
- `packages/shared/src/schemas/**`
- `docs/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-006, TASK-009, TASK-038
- 阻塞条件：API接口文档 §4 码表格式无法稳定解析 → 停止，提给 Agent-Docs 先规范表格（TASK-009）

## 建议执行档位
sonnect　理由：脚本+生成测试；断言口径已由契约冻结

## 升级条件
生成断言与契约语义冲突 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-005：步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-005/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-F-05 用户系统 / REQ-NF-01 统一错误
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
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
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-005/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-005/`

## 允许修改
- `e2e/web/walking-skeleton.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-005/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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
小　约 4h　≥2h


---

#### TASK-007：守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-007/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：§9.4 自动化守卫 / REQ-C-02 端口（Aidean 3000–3100，用户 2026-10-14 口径；子平台区间以 P-1/P-2 裁决为准）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-005、REQ-C-006、REQ-NF-006、REQ-M-010
- 来源方案：SOL-S0

## 目标
`node scripts/guard/run-all.mjs` 四项检查全 PASS 并接入 CI verify job

## 输入
- 文档：`AGENTS.md 铁律`；`docs/governance/目录结构文档.md`
- 契约：`contracts/03-identity.contract.ts AUTHZ_BOUNDARY（敏感字段名清单）`
- 前置任务：TASK-085
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `scripts/guard/root-pollution.mjs`
  - `scripts/guard/secret-scan.mjs`
  - `scripts/guard/module-boundary.mjs`
  - `scripts/guard/port-consistency.mjs`
  - `scripts/guard/run-all.mjs`
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-007/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] root-pollution：根目录文件白名单 = 当前 git ls-files 根级文件集合，新增根级文件即失败
2. [ ] secret-scan：git ls-files 全量扫描私钥头/AKIA/sk-[A-Za-z0-9]{20,}/password= 明文模式，.env.example 豁免
3. [ ] module-boundary：packages/** 不得 import apps/**；apps/web/components/** 不得 import @prisma/client 或 lib/db/**
4. [ ] port-consistency：Aidean 自身入口（apps/web/package.json dev/start、playwright baseURL、Dockerfile EXPOSE/PORT、auth/constants.ts AUTH_ISSUER 默认值）全部 ∈ 3000–3100；seed.ts OIDC localhost 回调端口逐一必须落在 scripts/guard/port-ranges.json 登记区间内——区间表初值只登记已确认项（Aidean 3000–3100、BotHot 3200–3300、AideanFleet 3100–3200），P-1/P-2 未裁决项输出 WARN 不失败
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 四脚本在当前 HEAD 全部 exit 0（端口项允许 WARN，WARN 清单写入证据）
- [ ] 人为加入根级文件/私钥样本/3500 端口回调时对应脚本 exit 1（负向测试证据）
- [ ] CI verify job 含 guard 步骤
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/guard/run-all.mjs
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-007/`

## 允许修改
- `scripts/guard/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-007/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：TASK-004, TASK-006
- Blocks：TASK-043, TASK-050
- 阻塞条件：现存代码违反模块边界（非新引入）→ 不改代码，登记为白名单例外并上报

## 建议执行档位
sonnect　理由：确定性脚本

## 升级条件
误报率高无法收敛 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-019：e2e：功能开关端到端（关→入口消失+API 50011→开→恢复）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041
- 来源方案：DESIGN-001

## 目标
e2e/admin/feature-flags.spec.ts 通过：SUPER_ADMIN 关闭 ladder.station → 前台导航无入口、/providers 显示 feature-disabled、GET /api/v1/ladder?type=stations 返回 code 50011 → 重新开启后恢复（测毕还原）

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`FEATURE_DISABLED(50011)`
- 前置任务：TASK-018, TASK-006
- 前置状态：TASK-018 已合并，CI e2e job 可用

## 输出
- 新增/修改的文件路径：
  - `e2e/admin/feature-flags.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-019/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 admin-setup 登录态
2. [ ] finally 中恢复开关
3. [ ] workers=1（全局状态）
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1` 通过
- [ ] 测后 feature_flags 状态与测前一致
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-019/`

## 允许修改
- `e2e/admin/feature-flags.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-019/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-018, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-020
- 阻塞条件：UI testid 与契约⑥不符 → 判 FAIL 回 TASK-018

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h


---

#### TASK-024：e2e：收藏端到端（收藏→控制台可见→取消→未登录引导）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
- 来源方案：SOL-S3

## 目标
e2e/web/favorites.spec.ts 通过：登录用户收藏模型→控制台收藏 Tab 出现→取消后消失；匿名点击跳登录；他人收藏 DELETE 得 40000

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`AUTHZ_BOUNDARY（他人收藏）`
- 前置任务：TASK-023, TASK-006
- 前置状态：TASK-023 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/web/favorites.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-024/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两个测试用户
2. [ ] API 级越权断言
3. [ ] 清理数据
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-024/`

## 允许修改
- `e2e/web/favorites.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-024/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-023, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-025
- 阻塞条件：testid 不符 → FAIL 回 TASK-023

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h


---

#### TASK-030：计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-F-07
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
e2e/tests/promotion-billing.spec.ts：建优惠（priceInput=0）→ 网关调用 → 用户余额不变且 usage_log quotaMinor=0 → 删除优惠 → 再调用 → 按原价扣费（逐分断言）

## 输入
- 文档：`e2e/tests/gateway-flow.spec.ts（参照）`
- 契约：`EffectivePriceSchema`；`PromotionPriceCreateSchema`
- 前置任务：TASK-029, TASK-006
- 前置状态：TASK-029 已合并；CI 注入 AIDEAN_ENABLE_MOCK_UPSTREAM=1

## 输出
- 新增/修改的文件路径：
  - `e2e/tests/promotion-billing.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-030/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] admin 建优惠
2. [ ] 用户调网关
3. [ ] 查余额/流水
4. [ ] 清理
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1` 通过（TASK-037 收敛后改为根配置）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-030/`

## 允许修改
- `e2e/tests/promotion-billing.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-030/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-029, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-031
- 阻塞条件：mock-upstream 未在 CI 启用 → 停止交 TASK-006 补 env

## 建议执行档位
sonnect　理由：E2E 脚本（mock-upstream 已有）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-035：e2e：搜索（命中/无结果/键盘跳转/移动端）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-5 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
e2e/web/search.spec.ts 通过（含 mobile project）

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-034, TASK-006
- 前置状态：TASK-034 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/web/search.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-035/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 种子模型名作为查询词
2. [ ] Esc 关闭
3. [ ] mobile 视口
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-035/`

## 允许修改
- `e2e/web/search.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-035/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-034, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-036
- 阻塞条件：testid 不符 → FAIL 回 TASK-034

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-037：e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / 未完成事项 #36
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-006、REQ-NF-005
- 来源方案：SOL-S6

## 目标
root config 新增 project `flows`（testDir e2e/tests，排除 smoke 重复），package.json test:e2e 指向根配置；`--list` 总数 = 收敛前两配置去重并集，并产出唯一基线表

## 输入
- 文档：`playwright.config.ts`；`e2e/playwright.config.ts`；`package.json:16`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `playwright.config.ts`
  - `e2e/playwright.config.ts（删除或改为 re-export）`
  - `package.json`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-037/e2e-baseline.md`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-037/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 收敛前 `--list` 两配置各记录
2. [ ] 合并 projects
3. [ ] 收敛后 `--list` 对账
4. [ ] CI e2e job 改用根配置
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test --list --config playwright.config.ts` 总数 = 收敛前去重并集（证据表逐文件对账）
- [ ] `pnpm test:e2e` 使用根配置
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test --list --config playwright.config.ts
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-037/`

## 允许修改
- `playwright.config.ts`
- `e2e/playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-037/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**/*.spec.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-007, TASK-050
- Blocks：TASK-065
- 阻塞条件：合并后 smoke 重复执行导致登录限流 → 保留 workers=1 并登记

## 建议执行档位
sonnect　理由：测试配置整理

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

#### TASK-038：单测覆盖率基线测量（web/shared，不设阈值）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / §9.1 基线指标
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-008
- 来源方案：SOL-S6

## 目标
引入 @vitest/coverage-v8（与 vitest 主版本匹配的 devDependency）并产出 web/shared 行/分支覆盖率首次测量值写入证据；CI 只上报不卡阈值

## 输入
- 文档：`apps/web/vitest.config.ts`
- 契约：`无`
- 前置任务：TASK-004
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/vitest.config.ts`
  - `apps/web/package.json`
  - `packages/shared/package.json（仅 devDependencies/脚本）`
  - `pnpm-lock.yaml`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-038/coverage-baseline.md`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-038/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 安装与 vitest 2.1.x 匹配的 coverage-v8
2. [ ] coverage.reporter=text-summary,json-summary
3. [ ] 记录数值
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run --coverage` exit 0 并输出 Lines/Branches 百分比
- [ ] 测试总数不变（1081）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run --coverage
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-038/`

## 允许修改
- `apps/web/vitest.config.ts`
- `apps/web/package.json`
- `packages/shared/package.json`
- `pnpm-lock.yaml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-038/**`

## 禁止修改
- `apps/web/lib/**`
- `apps/web/app/**`
- `packages/shared/src/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-004
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：新增 devDependency 被视为技术栈偏离 → 停止待 U-10 裁决

## 建议执行档位
sonnect　理由：测量类

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-039：千级模型天梯量级基线（只测量，不优化）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：未完成事项 #17 / R-83（千级）/ §9.1
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-007
- 来源方案：SOL-S6

## 目标
在 CI 临时库生成 1000 模型（脚本，不进 seed）后测 GET /api/v1/ladder?type=models p50/p95（20 次）与 /models 首屏 HTML 字节数，写入基线证据

## 输入
- 文档：`scripts/test/benchmark/`；`e2e/perf/`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/test/benchmark/ladder-1k.mjs`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-039/ladder-1k-baseline.md`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-039/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 批量插入 1000 AiModel+benchmark（仅临时库，结束 TRUNCATE 回滚）
2. [ ] autocannon 不可用则用 node fetch 循环计时
3. [ ] 记录 p50/p95/HTML 字节
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 证据含命令、原始样本与 p50/p95
- [ ] 脚本对非临时库（DATABASE_URL 不含 ci/test 标识）拒绝运行
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/test/benchmark/ladder-1k.mjs --dry-run
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-039/`

## 允许修改
- `scripts/test/benchmark/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-039/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `apps/web/prisma/seed*.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：需改业务代码才能测 → 停止

## 建议执行档位
sonnect　理由：测量脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-042：备份/恢复演练脚本（pg_dump→restore→逐表行数比对）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-3 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-14 scripts/db/backup.sh、restore.sh 已存在，改为在既有脚本上扩展逐表行数比对与演练记录

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #3 生产级数据策略
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-004
- 来源方案：SOL-S8

## 目标
scripts/ops/pg-drill.mjs 在 CI PG 上完成 dump→新库 restore→68 模型对应表行数逐表一致，输出耗时与备份体积

## 输入
- 文档：`docs/engineering/部署运维文档.md`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/ops/pg-drill.mjs`
  - `.github/workflows/ci.yml（可选 workflow_dispatch 步骤）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-042/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 scripts/db/backup.sh、restore.sh 既有实现上扩展（restore.sh:56-59），不另写一套
2. [ ] pg_dump -Fc
3. [ ] createdb + pg_restore
4. [ ] information_schema 行数比对
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 演练输出 diff=0
- [ ] 证据含耗时/体积
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/ops/pg-drill.mjs --source $DATABASE_URL
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-042/`

## 允许修改
- `.github/workflows/ci.yml`
- `scripts/db/**`
- `scripts/ops/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-042/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docker/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-007, TASK-037, TASK-050
- Blocks：TASK-043, TASK-052, TASK-083
- 阻塞条件：CI 镜像无 pg_dump 客户端 → 使用 postgres:16 容器内执行

## 建议执行档位
sonnect　理由：运维脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

#### TASK-049：存量价格行口径盘点脚本（只读：币种×计价单位×来源）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-19 去掉对 006 的依赖（只需 DATABASE_URL）；grep 验收改为「文件存在 ∧ grep exit=1」

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b（为 U-15 裁决提供数据）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005

## 目标
`node scripts/audit/price-normalization-audit.mjs` 对任意库输出 model_prices 中 is_current=true 行按 billing_currency × billing_unit × source_type 的计数表与 5 条样例，退出码恒 0

## 输入
- 文档：`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`无（只读盘点）`
- 前置任务：TASK-085
- 前置状态：TASK-006 已合并（CI 有 seed 后的 PG16）

## 输出
- 新增/修改的文件路径：
  - `scripts/audit/price-normalization-audit.mjs（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-049/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 用 @prisma/client 只读查询（无写语句；脚本内 grep 自检无 create/update/delete）
2. [ ] 输出 markdown 表到 stdout
3. [ ] 在 CI seed 后库运行一次并存证
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] seed 后库输出含 USD 与 CNY 两行，合计 = is_current 行总数
- [ ] `test -f scripts/audit/price-unit-census.mjs` exit 0 且对其 grep 违规模式 exit=1（exit=2 视为失败）
- [ ] 输出按 (priceCurrency, billingUnit, source) 三维分组计数
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/audit/price-normalization-audit.mjs
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-049/`

## 允许修改
- `scripts/audit/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-049/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无 DATABASE_URL → 打印用法后 exit 0 并在证据注明

## 建议执行档位
sonnect　理由：只读统计脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-050：CI 门禁补齐：lint + @aidean/ui 单测进入 verify job

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-050/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-03 测试可复现 / §9.4 守卫（ci.yml 现无 lint 与 packages/ui 测试步骤）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-006
- 来源方案：SOL-S0

## 目标
CI verify job 新增 `pnpm --filter web lint`（0 error）与 `pnpm --filter @aidean/ui exec vitest run`（4 例）两步，任一失败阻断合并

## 输入
- 文档：`.github/workflows/ci.yml:47-69`；`11_基线指标.md §11.2（lint 0 error/1 warning、ui 4 例）`
- 契约：`无（CI 配置）`
- 前置任务：TASK-007
- 前置状态：TASK-006/007 已合并（同文件资源锁）

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-050/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 Typecheck(web) 之后插入 Lint(web) 步骤
2. [ ] 在 Unit tests(shared) 之后插入 Unit tests(ui) 步骤
3. [ ] 本地按 CI 顺序复跑两命令
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] CI verify job 日志含 Lint(web) 与 Unit tests(ui) 两步且均成功
- [ ] lint 输出 0 error（既有 1 warning SafeImage.tsx:19 允许）
- [ ] @aidean/ui 4 tests passed
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web lint && pnpm --filter @aidean/ui exec vitest run
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-050/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-050/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-007
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：lint 在 CI Node 20 下出现本地无的 error → 不改业务代码，登记并上报

## 建议执行档位
sonnect　理由：CI 配置追加两个既有命令，确定性

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-062：调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/010
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-009、REQ-M-010
- 来源方案：DESIGN-004 / ADR-P007

## 目标
`npx tsx scripts/crawl/monitor_catalogs.ts --source openrouter --dry-run` 输出观测数；非 dry-run 写库；任一源异常记 monitoring_sources.lastError 且退出码仍为 0（部分成功）、全部失败退出码 1

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`scripts/crawl/crawl_llmtest.ts（范式）`；`apps/web/lib/features/admin/script-executor.ts（调度执行器）`
- 契约：`MonitoringSourceSchema`
- 前置任务：TASK-061
- 前置状态：TASK-061 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/crawl/monitor_catalogs.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-062/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 参数：--source <key|all> --dry-run --limit N
2. [ ] 按 enabled 且 authRequired=false（或凭证已配置）的源顺序执行；每源 try/catch
3. [ ] 更新 monitoring_sources.lastRunAt/lastStatus/lastError/lastCount
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `npx tsx scripts/crawl/monitor_catalogs.ts --help` exit 0
- [ ] --dry-run 在无 DB 环境下对 fixture 模式（MONITOR_FIXTURE_DIR）输出 3 源计数
- [ ] 人工断网时退出码 1 且 stderr 含每源错误
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-062/`

## 允许修改
- `scripts/crawl/monitor_catalogs.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-062/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-061
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065
- 阻塞条件：无

## 建议执行档位
sonnect　理由：薄封装脚本，沿用 crawl_llmtest.ts 范式

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-065：E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/013
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
e2e/admin/monitoring.spec.ts 在测试库 + MONITOR_FIXTURE_DIR 下跑通：登录管理员→进入 /admin/monitoring→运行 openrouter→变更流出现 ≥1 条 listed 事件；未授权用户见 forbidden 态

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`MONITORING_UX_STATES`
- 前置任务：TASK-062, TASK-064, TASK-037, TASK-006
- 前置状态：TASK-062、TASK-064 已合并；e2e 唯一配置（TASK-037）与 CI e2e job（TASK-006）已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/admin/monitoring.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-065/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-065/`

## 允许修改
- `e2e/admin/monitoring.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-065/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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


---

#### TASK-075：e2e：模型详情页基准弹窗与测评示例

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-059
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059
- 来源方案：同 074

## 目标
e2e 覆盖：打开/关闭基准弹窗、演示数据标识、测评示例空态与有数据态

## 输入
- 文档：`docs/任务规划V0.7.0/05_execution/tasks/TASK-074.md`
- 契约：`无`
- 前置任务：TASK-074, TASK-006
- 前置状态：TASK-074、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/model-detail-benchmark.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-075/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 基于既有 e2e 登录/种子工具编写 4 个用例
2. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g model-detail-benchmark` 全绿
- [ ] 用例数 ≥4
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g model-detail-benchmark
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-075/`

## 允许修改
- `e2e/model-detail-benchmark.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-075/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-074, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：074 未合并

## 建议执行档位
sonnect　理由：按 074 验收写 e2e，模式既有

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-079：e2e：筛选「全部」全选/全不选 + 价格页档位一致

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-058
- 来源方案：同 078

## 目标
e2e 断言两条行为

## 输入
- 文档：`docs/任务规划V0.7.0/05_execution/tasks/TASK-078.md`
- 契约：`无`
- 前置任务：TASK-078, TASK-006
- 前置状态：TASK-078、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-filter-all.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-079/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 全选/全不选各一例；pricing 档位与 RECHARGE_TIERS 一致一例
2. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g ladder-filter-all` 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g ladder-filter-all
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-079/`

## 允许修改
- `e2e/ladder-filter-all.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-079/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-078, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：e2e 编写

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-083：上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-3 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-03）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：REQ-F-053
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-053
- 来源方案：需求文档:69

## 目标
脚本列出 seed 中全部 verifiedStatus=1 行并要求 docs 审核记录逐条覆盖，缺一即 exit 1

## 输入
- 文档：`docs/product/requirements/需求文档.md:69`；`apps/web/prisma/seed.ts:531`
- 契约：`无`
- 前置任务：TASK-042
- 前置状态：U-3 已裁决（进入上线准备）

## 输出
- 新增/修改的文件路径：
  - `scripts/release/check-seed-review.mjs（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-083/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 解析 seed.ts 收集行键
2. [ ] 比对审核记录文件（路径由 U-3 裁决时确定，默认 docs/plans/上线前seed审核.md）
3. [ ] CI 中仅在 release 分支启用
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 审核记录缺失时 `node scripts/release/check-seed-review.mjs` exit 1
- [ ] 全覆盖时 exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/release/check-seed-review.mjs; echo exit=$?
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-083/`

## 允许修改
- `scripts/release/check-seed-review.mjs`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-083/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-3 未裁决

## 建议执行档位
sonnect　理由：脚本 + 清单，无业务决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-084：核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**haiku**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-12）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-012 / REQ-L-014
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-014、REQ-NF-012
- 来源方案：需求文档:41；未完成事项目录.md:46

## 目标
e2e 断言 /models 与 /providers 无 footer；输出 #19 收口证据或缺口清单

## 输入
- 文档：`docs/product/requirements/需求文档.md:41`；`docs/plans/未完成事项目录.md:46`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-no-footer.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-084/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两页各断言 footer 不存在
2. [ ] #19 逐项对照代码，结果写证据
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g ladder-no-footer` 全绿或失败已登记
- [ ] 证据含 #19 逐项结论
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g ladder-no-footer
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-084/`

## 允许修改
- `e2e/ladder-no-footer.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-084/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：取证型 e2e 断言 + 台账核对

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---
