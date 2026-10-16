# TASK-004：契约测试生成器（从 shared 契约自动生成契约测试）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：REQ-NF-01 / §9.4 契约测试
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
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
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-004/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.5.0/06_validation/evidence/EVD-004/`

## 允许修改
- `scripts/contract/**`
- `packages/shared/src/__tests__/contract/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-004/**`

## 禁止修改
- `packages/shared/src/*.ts`
- `packages/shared/src/schemas/**`
- `docs/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
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
