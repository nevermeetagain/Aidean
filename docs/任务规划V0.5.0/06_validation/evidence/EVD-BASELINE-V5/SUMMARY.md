# Aidean 只读门禁复跑（V0.5 规划期）· SUMMARY

- 仓库：`/workspace/work/aidean/repo`，HEAD = `cd5b1a9c3c31f65abb60ea696a473957d6bf82d2`（main）
- 环境：Node v22.23.3 / npm 10.9.9 / pnpm 9.0.0（系统已带，`/usr/bin/pnpm`，与 `packageManager: pnpm@9.0.0` 一致，所以没有执行 corepack enable 或 npm i -g）；aarch64，2 核，7 GB 内存；无 PG/Redis/Docker；无 `.env.local`
- 对照基线：`docs/任务规划V0.4.0/06_validation/evidence/EVD-BASELINE-V4/`（main@bfb3aef，业务树 = 77c7952）
- 复跑时间：2026-10-14 17:28–17:45（UTC+8）
- 只读性：全程**没有改动任何已跟踪文件**。收尾时 `git diff --quiet` 通过，tracked_modified=0，ls-files=7287（见 `10-git-final.log`）。运行过程中生成的 `apps/web/next-env.d.ts`、`tsconfig.tsbuildinfo`、`.next/`、`.turbo/`、`playwright-report/`、`node_modules/` 都在 .gitignore 范围内。
- 计时方式：每条命令都通过 `run.sh` 包装，日志末行记录 `exit=… secs=…`，`_timings.txt` 汇总全部计时。耗时较长的命令用 nohup 放到后台执行，原因是沙箱单条前台命令的上限为 120s。

## 汇总表

| # | 命令 | 退出码 | 耗时 | 结果 / 关键计数 | 与 V0.4.0 是否一致 | 日志 |
|---|---|---|---|---|---|---|
| 1a | `git rev-parse HEAD` | 0 | <2s | cd5b1a9 | 基线为 bfb3aef（后续提交仅涉及 docs，符合预期） | 01-git-head.log |
| 1b | `git status --porcelain \| wc -l` | 0 | — | **1**，仅一个已存在的未跟踪 `docs/任务规划V0.4.0/_generator/__pycache__/`。复跑期间另有一个进程写入了未跟踪的 `docs/任务规划V0.5.0/`，收尾时为 2 | 基线未记录此项 | 01 / 10-git-final.log |
| 1c | `git ls-files \| wc -l` | 0 | — | 7287 | 基线未记录此项 | 01-git-head.log |
| 1d | `git diff --stat 77c7952 HEAD -- . ':!docs'` | 0 | — | 空（0 行） | ✅ 一致（codediff.txt 同为 0 字节） | 01-git-head.log |
| 2a | `pnpm install --frozen-lockfile`（第 1 次，`timeout 112`） | 124 | 112s | 被沙箱 120s 上限截断，当时已下载约 297/590 个包。超时与 lockfile 无关 | 基线未记录 | 02b-pnpm-install.log |
| 2b | `pnpm install --frozen-lockfile`（第 2 次，后台执行） | **0** | 68s | Lockfile is up to date，+590 packages，postinstall `prisma generate` 成功（Prisma 6.19.3）。没有触发 `--no-frozen-lockfile` 回退 | 基线未记录 | 02c-pnpm-install-bg.log |
| 3a | `pnpm --filter web exec prisma validate`（无 env） | **1** | 2s | P1012：`Environment variable not found: DATABASE_URL`（schema.prisma:47） | 环境差异：基线本来就带假 DATABASE_URL 运行 | 03a-prisma-validate.log |
| 3b | `DATABASE_URL=postgresql://u:p@localhost:5432/x npx prisma validate`（apps/web，即基线命令） | 0 | 2s | schema valid 🚀 | ✅ 一致 | 03b-prisma-validate-dburl.log |
| 3c | `pnpm --filter web exec prisma generate` | 0 | 3s | 生成 Prisma Client v6.19.3。schema 为 apps/web/prisma/schema.prisma，package.json 未配置 `prisma.schema` 字段，走默认路径 | 基线未记录 | 03c-prisma-generate.log |
| 4 | `pnpm typecheck`（turbo → web `tsc --noEmit`） | 0 | 125s（tsc 本身 2m3s，与 lint 并发） | 0 个错误 | ✅ 一致（基线 exit 0，48s；本次耗时更长是因为与 lint 并行在 2 核机器上） | 04-typecheck.log |
| 5 | `pnpm lint`（turbo → `next lint`） | 0 | 123s | 0 error / 1 warning：`components/common/SafeImage.tsx:19:14 @next/next/no-img-element` | 基线未记录 | 05-lint.log |
| 6 | `pnpm test`（turbo → web `vitest run`） | 0 | 78s | **112 个文件全部通过 / 1081 个用例全部通过，0 失败** | ✅ 一致（基线 112 文件 / 1081 用例，107s） | 06-test.log |
| 7a | `node scripts/check-docs-rule.mjs` | 0 | 0.2s | PASS；model=68，enum=37，admin API 域=36，admin 页面=32，Next 15.0.x | ✅ 一致（输出与 docsrule.txt 逐字相同） | 07a-docs-rule.log |
| 7b | `node scripts/check-docs-facts.mjs` | 0 | 1.2s | 14/14 assertions passed | ✅ 一致（输出与 docsfacts.txt 逐字相同） | 07b-docs-facts.log |
| 7c | 合约自检：`tsc -p contracts/tsconfig.json`；`tsx selfcheck-monitoring.ts`；`tsx selfcheck.ts`（位于 docs/任务规划V0.4.0/contracts） | 0/0/0 | 3s | collisions=[]，tiers=5，endpoints=5；total=25，web=22，mism=0，failurePaths=14 | ✅ 一致（JSON 输出与 contracts-selfcheck.txt 逐字相同） | 07d-contracts-selfcheck.log |
| 7d | `pnpm contract:check`（check-runtime-contract.mjs --mode all） | **1** | 0.5s | ERROR=4：NEXT_PUBLIC_SITE_URL、DATABASE_URL、REDIS_URL、JWT_SECRET 缺失（无 `.env.local`）。WARN=0 | 基线未执行此项，失败原因是本沙箱缺环境变量 | 07c-contract-check.log |
| 8 | `timeout 900 pnpm build`（next build + postbuild-standalone） | **0** | 207s | Compiled successfully；29/29 静态页生成；standalone 拷贝完成。有 3 处 SSR 取数降级（ladder/models、providers、ladder/stations：DATABASE_URL 无效，Prisma 报错后降级为空列表），不阻断构建。另有 Edge Runtime setImmediate 警告和 turbo `@aidean/ui#build no output files` 警告 | 基线未执行 build | 08-build.log |
| 9 | `npx playwright test --config e2e/playwright.config.ts --list` | 0 | 4s | **Total: 64 tests in 14 files**（testDir e2e/tests） | 基线未记录。补充：根目录配置 `npx playwright test --list` 列出 138 tests / 26 files（09b） | 09-e2e-list.log |
| — | PGlite 002_monitoring.sql 约束探针（基线 #9） | 未跑 | — | 基线没有保存脚本，只有结果，且需要额外安装 PGlite | 未复核 | — |
| — | curl 外部端点探针（基线 #10） | 未跑 | — | 外部网络探针，不属于门禁 | 未复核 | — |
| — | `_generator/gen*.py`（基线 #11/#12） | 未跑 | — | 会覆写 docs 下的已跟踪文件，违反只读约束 | 未复核 | — |

## 首个错误

1. 按时间顺序，第一个非零退出是 **pnpm install 第 1 次（exit 124）**。原因是沙箱前台命令 120s 上限导致超时，不是依赖问题。第 2 次重试通过 `--frozen-lockfile`，exit 0。
2. 第一个真实的门禁错误是 **`pnpm --filter web exec prisma validate` 的 exit 1**：`P1012 Environment variable not found: DATABASE_URL`（apps/web/prisma/schema.prisma:47）。带上基线所用的假 DATABASE_URL 后，validate 通过。
3. `pnpm contract:check` exit 1，ERROR=4，均为缺少环境变量，按要求不做修复。

## 与 V0.4.0 的不一致之处

1. **HEAD 不同**：本次为 cd5b1a9，基线为 bfb3aef。两者在业务代码上没有差异（对 77c7952 的非 docs diff 为空）。
2. **prisma validate 命令形式**：基线带 `DATABASE_URL=...`。按本次指定的形式不带 env 运行会失败，带上之后结果一致。
3. **耗时**：tsc 为 125s，基线 48s，原因是与 lint 并发且只有 2 核。vitest 为 78s，基线 107s。计数完全一致。
4. **基线未覆盖的门禁**：install、lint、`contract:check`、build、e2e `--list` 在 V0.4.0 证据中没有记录，无法比对。本次结果为 lint 0 错 1 警告，build 通过，contract:check 因缺 env 失败，e2e 列出 64 条。
5. **docs-facts 的 spec-count 口径**：断言值 151 = 38 e2e + 113 unit。本次实测 e2e/*.spec.ts 有 39 个（admin 17、tests 14、web 8），apps/web/*.spec.ts* 有 112 个，vitest 实际运行 112 个文件。总数 151 相同，断言通过，但 e2e/unit 的拆分与描述文字差 ±1。
6. **docs-facts 的 aidean-ui-refs 描述**：文字写的是「= 61」，而 expected/actual 都是 62。这一处在基线里就存在，属于描述文字没有同步更新，断言本身通过。
7. **工作区状态**：porcelain 起始为 1（已存在的 `__pycache__`）。复跑期间，另一个并行进程在仓库内新建了未跟踪目录 `docs/任务规划V0.5.0/`（不是本任务写入），收尾时 porcelain 为 2。已跟踪文件始终未被修改。

## 重试记录
- pnpm install：第 1 次超时（沙箱限制），第 2 次成功，共 2 次，没有使用 `--no-frozen-lockfile`。
- 其余命令均只执行 1 次。
