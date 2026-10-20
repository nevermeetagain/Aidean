# EVD-037 摘要：e2e 配置口径收敛

> 卡片：TASK-037 | 执行：助手 C | 日期：2026-10-20 | 结论：PASS（静态收敛与门禁）

## 1. 目标

把两套 Playwright 配置收敛为根 `playwright.config.ts` 唯一真源，同时不破坏仍引用
`e2e/playwright.config.ts` 的旧脚本与端口守卫。

## 2. 变更

| 文件 | 变更 |
|---|---|
| `playwright.config.ts` | 新增 `flows` project：`testDir ./e2e/tests`、排除 `smoke.spec.ts`、`workers: 1`、`locale zh-CN`；顶部注释声明根配置唯一 |
| `package.json` | `test:e2e` 改为 `playwright test --config playwright.config.ts` |
| `e2e/playwright.config.ts` | 降级为 re-export 兼容壳：复用根配置，`testDir`/`globalSetup`/各 project `testDir` 按仓库根绝对化；保留 `http://localhost:3000` 端口锚点 |
| `.github/workflows/ci.yml` | e2e-skeleton 两步 playwright 显式带 `--config playwright.config.ts` |

## 3. 验收

- 根配置 `--list`：**211 tests / 44 files**。
- 兼容壳 `--list`：**211 tests / 44 files**，与根配置一致。
- 并集对账：150 + 68 − 7（smoke 重复）= **211**；文件 30 + 15 − 1 = **44**；`flows` = 68 − 7 = **61**。
- 逐文件对账：`e2e/tests` 15 个文件，除 smoke 转入 smoke project 外，其余 14 个文件用例数完全一致；见 `e2e-baseline.md`。
- `node scripts/check-docs-rule.mjs`：exit 0。
- `node scripts/check-docs-facts.mjs`：14/14 assertions passed，exit 0。
- `node scripts/guard/run-all.mjs`：4/4 守卫通过。
- `git diff --name-only`：仅上述 4 个允许文件。

## 4. 决策与说明

1. **保留兼容壳而非删除**：`apps/web/scripts/qa-fe-01-regression.mjs`、`gate-regression.mjs` 与
   `scripts/guard/port-consistency.mjs` 仍读取 `e2e/playwright.config.ts`；删除会让守卫降级或旧脚本失效。
2. **绝对路径**：兼容壳以 `--config e2e/playwright.config.ts` 运行时，Playwright 会以该文件目录解析
   `testDir`；因此统一按仓库根 `path.resolve`，避免解析到 `e2e/e2e/tests`。
3. **`workers: 1`**：与旧 `test:e2e` 子配置一致，规避登录 IP 限流（20 次/600 秒）。
4. **不保留 `webServer`**：根配置既有约定是测试不自起服务；旧脚本本就要求外部 `:3000` 已启动；
   CI 的 e2e-skeleton 在 job 内启动 `next start`。兼容壳因此只做配置复用，不改变启动策略。
5. **卡面标题的「138+64」已过时**：实测收敛前为 150 + 68，去重并集 211；以实测为准，已在基线表记录。
6. **文档漂移**：`docs/engineering/测试与验收文档.md` 仍是双配置旧口径，但不在本卡允许修改范围；
   未改动，登记为后续文档卡处理项。
7. **全量执行**：本机 Redis `:6379` 未监听、`:3000/api/v1/system/ready` 返回 503，全量 e2e 不作为本卡
   验收；卡面验收命令为 `--list`，CI 在 PG16 + Redis7 服务容器就绪后执行真实用例。

## 5. 证据

- `e2e-baseline.md`：前后计数、并集公式、逐文件对账。
- `list-root-before.txt` / `list-e2e-before.txt`：收敛前两配置 `--list` 原始输出。
- `list-root-after.txt` / `list-e2e-after.txt`：收敛后两配置 `--list` 原始输出。
- `verify.txt`：命令、结果、门禁与环境说明。
- `scope.txt`：`git diff --name-only` 范围。
