# TASK-001：错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：packages/shared/src/errors.ts 新建（26 处码定义）；types/index.ts 旧表删除；system.schema.ts SystemReady；单测证据 docs/任务规划V0.8.0/06_validation/evidence/EVD-BASELINE-V8/web-vitest.txt / shared-vitest.txt（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 6h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-NF-01 契约唯一源（开发流程.md §五.2）/ REQ-F-09 功能开关 / REQ-F-13 收藏
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
- 来源方案：ADR-P001

## 目标
packages/shared/src/errors.ts 成为唯一错误码源（25 码），旧 types/index.ts ErrorCode 删除，shared 单测断言码值无重复且含 22 个既有码原值

## 输入
- 文档：`contracts/02-errors.contract.ts`；`contracts/01-api.contract.ts §S0`；`docs/architecture/API接口文档.md §4`
- 契约：`ERROR_CODES`；`DEFAULT_STATUS_BY_CODE`；`httpStatusOf`；`ErrorBodySchema`；`ERROR_PRESENTATION`；`SystemReadySchema`
- 前置任务：TASK-085
- 前置状态：HEAD=77c7952 基线全绿（shared vitest 118 / web vitest 1081）

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/errors.ts（新建）`
  - `packages/shared/src/schemas/system.schema.ts（新建）`
  - `packages/shared/src/types/index.ts（删除 ErrorCode/ErrorCodeValue）`
  - `packages/shared/src/index.ts（导出）`
  - `packages/shared/src/__tests__/errors.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-001/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 将 contracts/02-errors.contract.ts 的 ERROR_CODES/DEFAULT_STATUS_BY_CODE/httpStatusOf/ErrorBodySchema/ERROR_PRESENTATION/FAILURE_PATHS 原样落入 packages/shared/src/errors.ts
2. [ ] 将 contracts/01-api.contract.ts 的 SystemReadySchema 落入 schemas/system.schema.ts
3. [ ] 删除 packages/shared/src/types/index.ts 中 ErrorCode/ErrorCodeValue（全仓 0 引用，先 grep 复核）
4. [ ] index.ts 增加 export * from "./errors" 与 "./schemas/system.schema"，确认无命名冲突（ErrorCode 类型名在 web errors.ts:97 仍为本地类型，不受影响）
5. [ ] 新增 errors.spec.ts：码值唯一、22 既有码与 apps/web/app/api/v1/_lib/errors.ts 逐值相等（读取对象比对）、httpStatusOf 映射表驱动断言
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` 退出码 0
- [ ] `pnpm --filter @aidean/shared test` 全绿且用例数 ≥ 118+新增
- [ ] `grep -rn "ErrorCode =" packages/shared/src` 无输出（旧表已删）
- [ ] contracts 自检脚本 selfcheck.ts 输出 mism=0、dup=[]
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-001/`

## 允许修改
- `packages/shared/src/errors.ts`
- `packages/shared/src/schemas/system.schema.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/errors.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-001/**`

## 禁止修改
- `apps/**`
- `apps/web/prisma/migrations/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-002, TASK-004, TASK-014, TASK-021, TASK-026, TASK-032, TASK-044, TASK-056, TASK-077, TASK-082
- 阻塞条件：发现 ErrorCode 旧表在仓内存在任何运行时引用（grep 非 0）→ 停止并提 ADR

## 建议执行档位
opus　理由：契约语义与唯一源裁决，影响全端，不可逆度高

## 升级条件
需改动任一既有码值或 HTTP 映射 → 升 fable（推翻已上线契约）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 0h　<2h
