> 版本: v1.0 | 更新: 2026-10-22 | 变更: B11-09 首版偏差与未验证项记录

# B11-09 偏差与未验证项

## 一、执行过程中的三轮补漏（本卡的教训面）

用户任务书 verbatim 要求「所有引用点改为引用具体文件，包括 middleware.ts、scripts/crawl、测试和脚本，**要全仓 grep**」。实际执行分了三轮才把引用点收敛干净，每一轮暴露的引用面不同：

| 轮次 | 检出工具 | 检出引用形式 | 遗漏数 | 归因 |
|---|---|---|---|---|
| 1 | `Grep` 静态正则 `(from\|export from\|require)\s*['"]…['"]` + `['"]\.\.?/index['"]` 相对形式 | `import … from "<barrel>"` / `require("<barrel>")` / `"../index"` 等 | 7 处 | 只覆盖了显式静态 import；未覆盖 `await import("<dynamic>")` 与 folder-specifier `<path>/index` 变体 |
| 2 | `pnpm --filter web exec tsc --noEmit --incremental false` | `await import("<path>/index")` / `await import("<folder>")` 形式（TS2307） | 4 处（change-log-coverage L28 / field-ownership L26 / features/auth/sync-orchestrator L18 / writer-prices-benchmarks L50） | 初轮 grep 未 include `import(` 关键字与不带 `/index` 后缀的 folder-specifier 变体；tsc 靠类型解析把动态 import 的模块路径也纳入 |
| 3 | `pnpm --filter web exec vitest run` | `readFileSync(new URL("<path>/index.ts", import.meta.url))` 静态扫描用例 / `vi.mock("<folder>", ...)` 运行时字符串层 mock 目标 | 2 处（change-log-coverage L81 / sync-orchestrator L29-30） | tsc 与静态 grep 均不检查非 import 语境的字符串字面量；vitest 靠运行时 I/O 与模块解析把这类「读源文本 / mock 字符串」暴露出来 |

**收敛教训**（不复读项目级记忆，只留本卡现场）：
1. 「全仓 grep」应显式覆盖四种形式：静态 `from` / `export from` / `require` / 动态 `import("<path>")`（不带 `/index` 后缀的 folder specifier 也算 barrel 引用）；
2. 判定级 tsc `--incremental false` 是「静态 import 层」的兜底——用户任务书「不得用缓存态的 typecheck 代替」在此处体现了价值：tsc 抓到了初轮 grep 漏的 4 处动态 import；
3. **vitest 全量跑是「运行时字符串层」的必备门禁**——`readFileSync` 静态扫描用例、`vi.mock` 首参、`vi.importActual` 等属运行时字符串（tsc/grep 全盲），只有真跑测试才能暴露；本卡如果只按用户任务书最低门槛「tsc / lint / docs」跑，就会漏 2 处并把 6 用例 FAIL 提交；
4. **历史文档/证据文件里的引用（`docs/任务规划V0.*/06_validation/*` 与 `apps/web/lib/features/admin/model-change-log.ts:6` doc 注释）不能靠 grep 一把梭**——铁律 4「历史只读」要求把 `docs/**/evidence/**` 排除在改动范围之外，需人工筛读命中；doc 注释层面的字符串（无 import）虽不属代码引用点，但会误导后续读者，作为「观察项」下节单列。

## 二、观察项 / 未处理（不影响本卡验收，留待协调）

1. **`apps/web/lib/features/admin/model-change-log.ts` L6 doc 注释**：
   仍写 `sync writers 已有自己的 ModelChangeLog 写入路径（writers/index.ts）`，实际拆分后是 `writers/model-writers.ts`。
   影响：仅注释措辞与现况不符，代码层无 import 引用；不影响 tsc / vitest / build / gates。
   处理：该文件不在本卡白名单（「被拆 barrel 及其引用点」按代码 import 语境解读，不含 doc 注释里的文件名字符串），未改；如需修，请开卡 B11-09-followup 或并入 B11-04b 之类的 admin 侧卡片顺手带一下。
2. **历史证据 `docs/任务规划V0.2.0–V0.5.0/06_validation/evidence/EVD-BASELINE-V2/*.{mjs,sql}`**：
   内文注释 `// 1:1 SQL of lib/sync/writers/index.ts persistPrices` 属 V0.2–V0.5 时代快照，铁律 4 明令「`.example/history/` 与历史证据只读，永不修改/删除」；不动。
3. **`scripts/crawl/monitor_catalogs.ts` L32**：本卡对该文件只改了 import 行（`"../../apps/web/lib/monitoring/public-pricing"` → `".../public-pricing/registry"`），无业务逻辑改动，符合白名单「scripts/crawl/** import 行除外」例外条款。

## 三、未验证项（诚实标「待确认」，禁写「通过」）

1. **运行态冒烟**（`next dev` 起服 + 手动访问 `/pricing`、`/admin` 相关页面）：本卡未做，因拆分仅为「同层重命名 + 引用重指向」，类型与静态分析已闭环，`next build` 亦通过（静态生成 33 页）；运行面等价性由 tsc + vitest 1492 用例覆盖。
2. **`middleware.ts` Edge 侧运行时行为**（`display.ts` 是否在 Edge runtime 加载正常）：tsc 已按 `next.config.mjs` 的 Edge 目标验证；vitest 的 `display-currency.spec.ts` 覆盖了 `withDisplayCurrencyHeader` / `resolveDisplayCurrencyFromHeaders` / `parseDisplayCurrency` 五条解析路径；`next build` 输出段显示 `Middleware 160 kB` 打包成功。未在真 Edge 容器（如 Vercel）跑；标「待确认」，风险低。
3. **`public-pricing/registry.ts` 删除的 26 行 re-export**：静态与 vitest 全绿；`monitor_catalogs.ts` 与 `public-pricing.spec.ts` 已直接引 concrete（`./types` / `./deepseek` / `./siliconflow`），未见依赖被删除 re-export 汇出的消费者；标「待确认」：如果后续新加 collector 想走 barrel-style 汇出，应显式指 concrete 而非依赖 `registry.ts`（这本来就是 ADR-0002 的意图）。
4. **RK-11-09 环境脆弱性**（node_modules 空壳导致 build exit=1）：本卡 `next build` 一次通过，未触发；未跑归档修复命令 `pnpm install --frozen-lockfile --force --prefer-offline --config.confirm-modules-purge=false`。深扫 `shellscan2_011.mjs` 亦未跑（不必要，且浅扫器 `shellscan011.mjs` 已弃用不采信）；标「待确认」：下轮如撞 RK-11-09，先执行归档修复命令一次打回再复跑。
5. **UI 线后续卡（B11-04a/04b/03b/05）依赖**：Q-11-04=A 只解 DEF-011-14；DEF-011-06（admin 表单原生元素混用）与 DEF-011-03（协议/能力矩阵错误态/空态不分离，原生 `<table>` 未归零）与本卡无耦合；后续卡按任务书顺序推进。

## 四、提交面（工作树纪律）

本卡 `git add` 严格按路径显式暂存，排除以下**非我改动**的工作树脏文件：
- `pnpm-lock.yaml`（M，改动来源不明，非本卡引入，属前段工作遗留；不并入本卡提交）
- `apps/web/prisma/seed.ts`（M，B11-02 价格分层 DEF-011-02 的产物，非白名单；留给助手乙/Hark）
- `apps/web/prisma/seed/`（??，同上，B11-02 相关目录）
- `.openclaw/`、`.openclaw-attachments/`、`delivery/`（??，非本卡范畴）

本卡 add 的路径清单（`git add -- <paths>`）：
- `apps/web/middleware.ts`
- `apps/web/lib/currency/`（含 `display.ts` 重命名 + `server.ts` + `__tests__/display-currency.spec.ts`）
- `apps/web/lib/monitoring/public-pricing/`（含 `registry.ts` 重命名与内容重构）
- `apps/web/lib/sync/`（含 `mappers/model-mappers.ts` 重命名、`writers/model-writers.ts` 重命名、`sync-orchestrator.ts`、`__tests__/sync-orchestrator.spec.ts`、`__tests__/writer-prices-benchmarks.spec.ts`、`writers/__tests__/persist-prices*.spec.ts`）
- `apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts` + `field-ownership.spec.ts`
- `apps/web/lib/features/auth/__tests__/sync-orchestrator.spec.ts`
- `scripts/crawl/monitor_catalogs.ts`（仅 import 行）
- `docs/governance/目录结构文档.md`（v3.23 → v3.24）
- `docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-09/`（本目录）

## 五、推送面（长期规则）

- 唯一同步目标：**本地 = nevermeetagain/main**（origin = HTTPS + 凭据管理器）。
- 不建分支、不强推、**不碰 aideanew**（本机 remote `aideanew` 为旧 SSH 别名镜像，非项目仓库；98/110 分叉属历史遗留，按用户长期规则不处理）。
- 推送前必执行 `git pull --rebase origin main`；如遇推送挂起（GCM 无头），**停下向用户索取可用 PAT**，绝不写入 config/URL/日志/记忆。
- 报告措辞：只写「本地 = nevermeetagain/main `0 0`」，禁「双端一致 / 三端同步」旧措辞（该措辞曾在记忆 `41c4857b` 中误导本会话早前判断，已当场纠正并更新记忆）。
