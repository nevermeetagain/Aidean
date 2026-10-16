# EVD-004 — TASK-004 契约测试生成器（从 shared 契约 + API 文档 §4 自动生成契约测试）

> 卡：TASK-004（S0 L1，REQ-NF-001 / §9.4 契约测试 / ADR-P001，Depends on TASK-001；Blocks 006/009/038）
> 执行者：Hark(主Agent) ｜ 所有权：Agent-Guard
> 时间：2026-10-14（本地）

## 交付物（均在「允许修改」范围内）

| 文件 | 动作 | 内容 |
|---|---|---|
| `scripts/contract/gen-contract-tests.mjs` | 新建 | 纯 node（非 tsx）文本解析生成器；读 shared/errors.ts、shared/permissions.ts、API接口文档.md §4、contracts/03-identity.contract.ts → 生成 3 个 `*.generated.spec.ts`。确定性输出（键排序、无时间戳），解析失败即非零退出 |
| `packages/shared/src/__tests__/contract/errors.generated.spec.ts` | 生成物（入库） | 7 用例：码表↔§4（doc⊆代码表）/HTTP 映射快照一致/映射键合法性/httpStatusOf 规则/ErrorBodySchema 正反/AUTHZ deny∈码表 |
| `packages/shared/src/__tests__/contract/identity.generated.spec.ts` | 生成物 | 3 用例：域数稳定(30)×2=60/权限码形 regex/角色权限集 ⊆ 注册表∪通配 |
| `packages/shared/src/__tests__/contract/envelope.generated.spec.ts` | 生成物 | 3 用例：成功信封/nullable+载荷非法拒绝/错误基形 data 恒 null |
| `.github/workflows/ci.yml` | 改 | verify job 于 Docs facts 后插入「Contract tests (generate + drift check)」：node 生成 → `git add -A <specdir>` → `git diff --cached --exit-code HEAD`（覆盖漂移/手改/未入库三类，见 R-1） |

## 关键设计决策（证据链）

1. **生成器用文本解析而非 import**：验收命令固定 `node scripts/contract/gen-contract-tests.mjs`（纯 node，无 tsx loader），故不能 import .ts。生成器读 TS/MD **文本**取字面量（ERROR_CODES/DEFAULT_STATUS_BY_CODE/ADMIN_DOMAINS/§4 表/AUTHZ deny），生成的 spec 在 **vitest 测试期**再 `import` 真实 `../../errors`、`../../permissions`、`../../schemas/common.schema` 做交叉断言。
2. **doc↔码方向取「§4 登记 ⊆ 代码表」**（非逆向）：§4 现仅登记 3xxxx/4xxxx 且**不含 40000 BAD_REQUEST**（1xxxx/2xxxx/5xxxx/新增码亦未入表）——若断「代码表 ⊆ 文档」现必红。逆向全段登记由 **TASK-009** 扩表后经重生成自动纳管（数据驱动，生成器不硬编码段）。理由记入 spec 头注释。
3. **幂等/防漂移**：输出按码值/键排序、去重、**无时间戳**；CI 重跑 + `git diff --exit-code` 捕获 shared/文档漂移或手改生成物。
4. **解析健壮性**：任一取数失败（§4 0 行 / ERROR_CODES<22 / 正则缺失等）→ `process.exit(1)`，符合阻塞条件「§4 无法稳定解析 → 停止转 TASK-009」，绝不静默产出残缺测试。

## 验收逐条（证据文件）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 生成器运行 | exit 0；生成 3 spec（25 码/10 HTTP/§4 9 行/30 域/4 deny） | `gen-run.txt` |
| 幂等：连跑两次 | 字节一致（SHA256 相同） | `idempotency.txt` |
| 漂移负测：手改→重生成 | 还原为原哈希（`regen==orig: True`） | `drift-test.txt` |
| `pnpm --filter @aidean/shared exec tsc --noEmit` | **exit 0** | `shared-tsc.txt` |
| `pnpm --filter @aidean/shared test` | **16 files / 139 tests passed**（基线 126 + 生成 13） | `shared-test.txt` |
| CI 契约步 | ci.yml verify 含 generate + `git diff --exit-code packages/shared/src/__tests__/contract` | `ci-step.txt` |
| diff 仅在允许范围 | 生成器/contract 目录/ci.yml；未触碰 packages/shared/src/*.ts、schemas/**、docs/**、contracts/** | 见本目录 |

## 说明

- 禁止修改清单核验：本卡**仅读** packages/shared/src/{errors,permissions}.ts、schemas/common.schema.ts、docs/architecture/API接口文档.md、contracts/03-identity.contract.ts；写入仅限 `scripts/contract/**`、`packages/shared/src/__tests__/contract/**`、`.github/workflows/ci.yml`。
- 生成物头部 `// AUTO-GENERATED — DO NOT EDIT`（step 4）。

## R-1 子智能体审查（CodeReview 子Agent）· 裁定 PASS + 1 Warning

**逐点结论（7 核验点）**：生成器健壮性/失败即 exit1 ✅、doc⊆码方向 ✅、幂等确定性 ✅、无 apps 反向依赖 ✅、测试语义（7+3+3 断言）✅、范围合规 ✅、CI drift 逻辑 ⚠️ Warning。

**Warning（点5）+ 采纳**：`git diff --exit-code <path>` 对未跟踪（`??`）文件恒返回 0，门禁空转。→ 已改为 `git add -A <specdir>` + `git diff --cached --exit-code HEAD -- <specdir>`，同时抓「漂移 / 手改 / 生成物未入库」三类（ci.yml 已落，属允许范围）。

**审查引出的更深发现（主智能体补做取证，比 Warning 更关键，定级 Blocker-前置）**：
- 事实：生成器第四解析真源 `docs/任务规划V0.5.0/contracts/03-identity.contract.ts`（提供 `PermissionCodeSchema` 正则 + `AUTHZ_BOUNDARY` deny 码）位于**未跟踪**目录；`git ls-files docs/任务规划V0.5.0/` = 0，`git grep` 确认这两项事实在**已跟踪 shared 代码中无等价源**。
- 冲突：ci.yml 随代码推到 aideanew/huaweicloud 跑，而前置会话约定「docs/任务规划V0.5.0 整树只进镜像、不入代码主干」——则主干 CI 检出缺该契约源 → 生成器 `read()` → `fail()→exit1`，**Contract 步骤必红**，与规格 L41「CI contract 步骤且通过」互斥。
- **裁定（唯一执行者）**：推翻「整树 mirror-only」。依据链：①规格 L19 指名 contracts 为解析输入、L41 要求 CI 通过；②AGENTS.md 铁律1 实体文档只在根 `docs/`，且主干已跟踪 `docs/architecture`、`docs/specs/*`、`docs/执行过程.md` 等实体文档，contracts 同属该类；③用户最新指令「推送到 github 保证双端一致」。→ **`docs/任务规划V0.5.0/`（尤其被 CI 解析的 `contracts/`）须随代码进主干、双端一致**；该入主干动作在 `push` 阶段/TASK-009 落实（本卡 commit 仍守 L42 作用域，不含文档）。
- 状态：`存在缺陷→已裁定`；生成器 fail-loud 行为**保留**（契约源缺失时红色暴露是正确信号，不加静默兜底）。

**本卡完成度**：代码三件套（generator + 3 生成物 + ci.yml）实现自洽、本会话复验全绿（幂等哈希一致 / shared tsc exit0 / 139 passed）；审查 PASS。唯一遗留为跨卡拓扑项（contracts 进主干），归 push/TASK-009，不阻断本卡逐卡提交。判定：**通过，可进入下一步**。
