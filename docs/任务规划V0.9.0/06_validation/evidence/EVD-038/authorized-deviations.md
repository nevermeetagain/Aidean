# EVD-038：偏差记录（authorized-deviations）

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-038 收尾记录

## D-1 阻塞条件「新增 devDependency → 待 U-10 裁决」不触发

- 卡面 L74 阻塞条件：新增 devDependency 被视为技术栈偏离 → 停止待 U-10 裁决。
- 判据（实测）：`docs/任务规划V0.9.0/03_需求基线复核.md` §3.4 未知登记册 L57 明记 **U-7/U-8/U-9/U-10 = NON_BLOCKING｜卡内已写默认假设**。
- 结论：U-10 已被上游处置为非阻断，且「装与 vitest 主版本匹配的 coverage-v8 并测量」即卡内默认假设本身。故本卡按默认方案执行，不触发停止等待。
- 技术栈锁定（铁律5 / ADR-0001）不受影响：`@vitest/coverage-v8` 是既有 vitest 生态的官方覆盖率 provider，非引入新框架/语言。

## D-2 coverage-v8 版本号取自 lock 实测，非 package.json range

- web `package.json` 写 `vitest ^2.1.9` → lock 实测 **2.1.9**；shared `package.json` 写 `vitest ^3.2.4` → lock 实测已解析为 **3.2.7**。
- coverage provider 须与 vitest 主/次版本对齐，故按 lock 实测精确装 `@2.1.9`（web）/`@3.2.7`（shared），而非笼统 range，避免 provider/runtime 版本错配。

## D-3 pnpm 别名语法失败→改精确版本重试（净无残留）

- 首次 `pnpm add -D "@vitest/coverage-v8@npm:^2.1.9"` 被 pnpm 9.15.9 误解析（将 `^2.1.9` 当作包名向 registry 请求）→ `ERR_PNPM_FETCH_404`，**干净回滚**（`git status` 确认 package.json/lock 未被污染）。
- 改用去别名的精确版本 `@vitest/coverage-v8@2.1.9` / `@3.2.7` 重试，两次 EXIT=0。最终 lock 新增 6 项 coverage-v8 相关条目。

## D-4 coverage 报告产物重定向至 gitignored `.scratch/`（树卫生）

- 根 `.gitignore` 无 `coverage` 条目，`apps/web/coverage` 未被忽略；`.gitignore` 不在本卡允许路径 → 不改。
- 为保持受控树干净，测量时以 CLI `--coverage.reportsDirectory=../../.scratch/038/coverage-{web,shared}` 将产物写入已 gitignore 的 `.scratch/`。**不改变覆盖率计算与测试执行**，仅改变写盘位置；`text-summary` 到 stdout 的内容与卡面命令一致。
- 提交的 `apps/web/vitest.config.ts` 中 `reportsDirectory` 保留默认 `"./coverage"`（供 CI/本地按需运行时自然落地，不入库）。

## D-5 「测试总数不变（1081）」按实测勘误

- 卡面 1081 为旧基线数。实测 plain 与 --coverage 两侧 web=1210 passed|5 skipped(1215)、shared=210 passed，启用覆盖率前后一致 → 验收意图满足。数字以实测为准（详见 `coverage-baseline.md` 勘误①）。

## 范围声明

本卡改动仅落 4 个允许文件（`apps/web/vitest.config.ts`、`apps/web/package.json`、`packages/shared/package.json`、`pnpm-lock.yaml`）+ EVD-038/**。未触碰禁止路径（`apps/web/lib/**`、`app/**`、`packages/shared/src/**`、契约、历代规划、AGENTS.md）。两个 `packages/shared/src/__tests__/contract/*.generated.spec.ts` 为 CRLF/LF EOL 幻影，内容未变，永不入库。
