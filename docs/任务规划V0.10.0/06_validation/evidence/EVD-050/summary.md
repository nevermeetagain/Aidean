# EVD-050 摘要：CI verify job 本地复现 + coverage 忽略

> 卡片：TASK-050 | 执行：助手 C | 日期：2026-10-20 | 结论：PASS

## 1. 环境与口径

- OS：Windows 11（10.0.26100）
- Node：v24.12.0；pnpm：9.15.9
- CI 目标：ubuntu-latest + Node 20 + 仓库 `packageManager` 指定版本；本地版本更高，结论按本地口径记录。
- 环境变量：`CHECKPOINT_DISABLE=1`；`DATABASE_URL=postgresql://placeholder:***@127.0.0.1:5432/placeholder?schema=public`；`CI=1`。
- `actions/checkout`、`pnpm/action-setup`、`actions/setup-node` 由 CI 提供，本地以现有工作树复现其后的全部 `run` 行。

## 2. 逐步结果

| # | ci.yml verify 步骤 | 命令 | exit |
|---:|---|---|---:|
| 1 | Install dependencies | `pnpm install --frozen-lockfile` | 0 |
| 2 | Docs rule | `node scripts/check-docs-rule.mjs` | 0 |
| 3 | Docs facts | `node scripts/check-docs-facts.mjs` | 0 |
| 4 | Guard rails | `node scripts/guard/run-all.mjs` | 0 |
| 5 | Contract tests | 生成 → `git add -A` → `git diff --cached --exit-code HEAD` | 0 |
| 6 | Prisma generate | `pnpm --filter web exec prisma generate` | 0 |
| 7 | Typecheck (shared) | `pnpm --filter @aidean/shared exec tsc --noEmit` | 0 |
| 8 | Typecheck (web) | `pnpm --filter web exec tsc --noEmit` | 0 |
| 9 | Lint (web) | `pnpm --filter web lint` | 0 |
| 10 | Unit tests (shared) | `pnpm --filter @aidean/shared test` | 0 |
| 11 | Unit tests (ui) | `pnpm --filter @aidean/ui test` | 0 |
| 12 | Unit tests (web) | `pnpm --filter web test` | 0 |
| 13 | Production build | `pnpm --filter web build` | 0 |

`verify-job.txt` 中每个命令均记录 `exit=0`；共 13 个步骤、15 条命令。

## 3. 关键输出

- 安装：lockfile up to date，`Already up to date`；postinstall Prisma Client 生成成功。
- Docs facts：`All 14 assertions passed.`
- Guards：`RESULT: PASS (4/4 守卫通过)`；module-boundary 保留 1 条既有 warning，不改变退出码。
- Contract tests：生成物无 drift，`git diff --cached --exit-code` 为 0。
- 单测：shared **243 passed / 23 files**；ui **4 passed / 1 file**；web **1377 passed + 5 skipped / 139 files + 2 skipped**。
- Build：`Compiled successfully`，静态页 29/29，`postbuild-standalone.mjs` 完成，exit 0。
- Lint：0 error；保留既有 `SafeImage.tsx` `<img>` warning（基线 1 warning）。
- Build 日志中的 placeholder DB 认证失败来自静态生成期间 ladder/models 的降级路径（`SSR 取数失败，降级空排行`），与 CI 的占位 `DATABASE_URL` 口径一致，未导致非零退出。

## 4. Coverage 验收

```bash
pnpm --filter web exec vitest run --coverage
```

- exit 0，输出见 `coverage.txt`。
- `.gitignore` 第 20 行新增 `apps/web/coverage/`；`git check-ignore -v apps/web/coverage` 命中该行。
- 运行后 `git status --short` 未出现 `apps/web/coverage`（目录存在但已被忽略）。

## 5. 卡面验证命令

```bash
grep -q 'apps/web/coverage' .gitignore && test -s docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt && ! grep -E 'exit=[1-9]' docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt; echo exit=$?
```

结果：`exit=0`。

## 6. Diff 范围

- 跟踪文件：仅 `.gitignore`。
- 证据：仅 `docs/任务规划V0.10.0/06_validation/evidence/EVD-050/`。
- 未修改 `apps/**`、`packages/**`、冻结契约与历史规划目录。

## 7. 结论

ci.yml verify job 的 13 个步骤在本地全部 exit 0；coverage 产物已通过 `.gitignore` 隔离，满足卡面验收。无需登记 FAIL 归属卡。
