# EVD-B11-01 · 偏差与自我证伪记录

> 版本: v0.17 | 更新: 2026-10-21 | 变更: **按第五轮子智能体 Nit-2 给下方 v0.15 行的替代指向补「紧贴撤回标注」**，并登记由此查出的一项**检测器侧缺陷（假绿）**。Nit-2 的事实：**下一引号内是已被推翻的原句（此处引用只为留存失真现场）**——「现改指现场定位到的实物 `.scratch/final-shellscan.txt`（16:06:40Z，第 2 行）」已被 v0.16 推翻（该文件实为 1042 B、mtime `2026-10-21T01:25:50.154Z`、读数在第 1 行且值为 **异常=0** ⇒ 属**事后基线**而非事发现场，见 `00_` §五 第 26 行），但推翻标注只存在于 v0.16 那一行，与被推翻的句子**不同行**；错值传播检测器 `.scratch/find-stale-claims.mjs` 按**行内 120 字符邻近窗口**找撤回标记，它在 v0.15 行的窗口里找到了 `更正`——**那个词说的是另一处缺陷（不存在的 `b1101-shells.txt`）**，与被推翻的读数归属无关，于是该行被判为 `HISTORICAL` 而未翻红。这是一个**假绿**（与已登记的假零、假缺席同族，但方向相反：该翻红的没翻红）。处置：① 本行与 v0.15 行各补一句**紧贴被推翻内容**的标注，使标记与被标记句同处一个窗口；② 把这缺陷记入 `00_` §五 台账（方法论 15⑥ 那句“检测器自身必须带控制组”被证明**仍不充分**）；③ 配套约束：邻近判定的读数**必须逐行人工判读，不得把一个绿色的总数当作“已清零”**——本轮实际一直接受这条约束，只是这次才把它的**失效模式**写成文字。
>
> 版本: v0.16 | 更新: 2026-10-21 | 变更: **第 26 次证伪：上一轮（v0.15）的替代指向本身是错的**。v0.15 把 52/818 改指 `final-shellscan.txt`（并写 mtime 16:06:40Z / 第 2 行 / 异常=52），实测四项属性**全错**（该文件 1042 B、mtime `2026-10-21T01:25:50.154Z`、SHELLS 在第 1 行、**异常=0**，属「收口门禁五段」的事后基线）；v0.15 另写下一句不实的全称否定（「没有 `b1101-` 前缀产物」——实有 **12** 个，全为 `.log`，只是无一名为 shells）。§五 改为**三层可证性表述**：现存最早载体（`t9-shellscan1.log` 第 1 行 / `u4-scan1.log` 第 2 行，均属第 4/5 次事故）、**10-20 那两次的深扫输出未落盘 ⇒ 标 `证据不足`**、与 `shellmtime2.txt` 里那个「16:11 分钟簇=52」不可混用。取证载体 `.scratch/find-52-carrier2.txt` / `find-stale-claims-BEFORE.txt`；新发现工具缺陷：按 UTF-8 解码去匹配中文标签的扫描器会**静默漏掉** PowerShell 重定向写出（GBK/UTF-16）的载体——上一轮就是这么漏掉 `u4-scan1.log` 的。
>
> 版本: v0.15 | 更新: 2026-10-21 | 变更: **按第四轮子智能体 Minor-2 更正一处不存在的载体引用**：§五 原将 52/818 那组读数归给磁盘上根本不存在的 `b1101-shells.txt`，现改指现场定位到的实物（**已被 v0.16 推翻：下述括号内的指向与读数均为错值**）`.scratch/final-shellscan.txt`（16:06:40Z，第 2 行）并逐字引出读数——**展开标注**：该文件实为 1042 B、mtime `2026-10-21T01:25:50.154Z`、读数在第 1 行且为异常=0，属**事后基线**而非事发现场；本句仅作留存现场，不得当作现行引用。另注：本行更早处的 `更正` 一词说的是 `b1101-shells.txt` 那**另一处**缺陷，与本括号内容无关——邻近窗口判据只判“窗口内有无标记词”，不判“标记词说的是否同一件事”，v0.17 登记的**检测器假绿**正是指此；该缺陷属**第 25 次证伪**（“上一轮的补救文字自己成了新的现行失真”）同族，定位过程与判读载体见 `25_` §9.1 14:00:48 行。
>
> 版本: v0.14 | 更新: 2026-10-21 | 变更: **§六 「本次修复是持久修复」判定被第 5 次自我证伪推翻**（`pnpm store status` 后续改报 `ERR_PNPM_MODIFIED_DEPENDENCY`）；补记第三次事故与第 4 次修复结果；**§五 因果方向再更正（dev 是受害者，第 8 次）**；登 6/7/9 次证伪并指向 `00_` §五 台账

本文件是 `07_原子任务卡全集.md`【范围】与卡面结论的**同卡变更记录**：任何与卡面原文不一致的最终实现，必须在此显式列出证据与理由，不得只在总结里含糊带过。

---

## 一、范围改判：「离线兜底自动写快照」→「显式 `--rate` 人工发布」

- 卡面原文（`07_` SubTask A.1.1【范围】）：「修改 `scripts/crawl/fx_daily.ts`（若需：补 `--seed`/离线兜底分支）」「`seed.ts` 或新建 `seed-fx.ts` 幂等写入当日 USD→CNY 兜底快照」。
- 实测反证（`.scratch/fxnet011.mjs`）：汇率源直连 **HTTP 200**、返回 `6.6757`，DNS 解析全为公网 IP → 「源不可达」在本环境不成立，卡面为它准备的自动兜底分支不是当轮必需。
- 契约反证：`apps/web/lib/features/pricing/fx.ts:6-7` 与 ADR-P005 v0.3（U-15）规定 **无行/超陈旧 → null → fail-closed**；若脚本在源失败时自动写入一个"估定值"，等价于**编造汇率并让它参与计费**，直接破坏该契约。
- 改判结论：不写自动兜底；改为**显式 `--rate <汇率>` 人工发布**，并把该行署名为 `source=manual`、`sourceUrl=https://example.com/manual-fx-rate`，沿用仓内既有"非溯源值"惯例（`e2e/tests/promotion-billing.spec.ts` 用 `source=e2e-fixture` / `example.com`）。
- 落地位置：`scripts/crawl/fx_daily.ts` 的 `FX_SOURCE_MANUAL` / `FX_SOURCE_URL_MANUAL` / `normalizeManualRate()` / `runFxDaily({ manualRate })`；取值校验在**核心层**自守（不只 CLI），故调度器与手工调用同口径。

## 二、证伪撤回 1：「/pricing 币种切换零效果」是误探针

- 原判：切换前后 rows 均 120、首行文本相同、`fx-note` 空 → 记为 DEF-011-01/02 的运行态症状。
- 穿透证据：`apps/web/lib/currency/server.ts` + `index.ts:59-65` + `middleware.ts:16-18` —— 展示币种**只**由部署层国家头（`cf-ipcountry → x-vercel-ip-country → x-geo-country`）决定，且 middleware 会**覆盖客户端自带的 `x-display-currency`（防伪造）**；`/pricing` 页面**不存在**币种切换控件，`audit-inter.json` 里 `before.control` 取到的 `$` 就是默认值。
- 结论：不存在"切换"这个用户动作，原判作废。正确探针见 `runtime-pricing.txt`（按国家头分组 + 统计「价格待核」），其真症状为 **CN 432 条 / US 48 条待核**，修复后双双归 0。

## 三、证伪撤回 2：「`.env` 的 `DATABASE_URL` 端口 5435 属配置陈旧」不成立

- 观察：`apps/web/.env` 与 `.env.local` 均写 `localhost:5435`；本轮一次性库在 55435，5435 无监听 → 曾拟登记为缺陷。
- 反证：`docs/plans/未完成事项回执/03-7.23至7.29.md` L123 记载 **5435 是既有 `aidean-dev-pg` 容器的规范开发端口**（同文件 L84 记录的是 Docker 引擎崩溃期的历史不匹配，非当前缺陷）；且 `git check-ignore -v` 显示 `.env`/`.env.local` 由 `.gitignore:12/13` 排除，**不受版控**，`git ls-files` 仅列出 `.env.example`（5432）。
- 结论：撤回该缺陷候选。正确表述是**环境前提**：本轮所有脚本/服务须以一次性库为准，经环境变量覆盖 `DATABASE_URL`（`.scratch/serve011.mjs`、`.scratch/fxcli011c.mjs` 即为此实现），已在 `15_前提与局限.md` P-1 成立。

## 四、新增消解：Windows 退出码崩溃（被"无入口"掩盖一整轮）

- 现象：脚本主体写库成功后，进程退出时崩于 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`，退出码 `3221226505`（0xC0000409）。
- 根因：入口用同步 `process.exit(code)`，此时 undici 的 keep-alive 句柄仍在关闭队列中。
- 影响面：`apps/web/lib/features/admin/script-executor.ts` 以子进程非零退出记 `ScriptExecution.status=2`（失败）→ 调度器会**每天误报采集失败**，且 `docker/scheduler/entrypoint.sh` 的 `run-due` 链路同样中招。
- 修复：改为 `process.exitCode = code` + 5s `unref` 兜底强退（正常路径自然排空，实测未等满 5s）。
- 为何此前未现：该脚本从来没有 npm 入口、也没有调度注册（DEF-011-01 的两个未接线点），即"从未被真实跑过"，故崩溃长期不可见。

## 五、环境事故归档：pnpm 包目录被清空（非代码缺陷；属仓内既有已知故障类）

- 现象：`node_modules/.pnpm/@prisma+client@6.19.3_.../node_modules/@prisma/client` 存在但**条目数 0**；`require.resolve("@prisma/client")` 从 `apps/web` 上下文 `MODULE_NOT_FOUND`；`next dev` 亦崩于 `MODULE_NOT_FOUND`。受损面：**包目录总数 818、异常 52**。**该读数分三层，逐层注明可证性**：① 磁盘上现存最早载体是 `t9-shellscan1.log` 第 1 行（`2026-10-21T02:06:56.360Z`，本地 10:06:56），同读数复现于 `u4-scan1.log` 第 2 行（`03:32:50.735Z`，本地 11:32:50）——两者属本卡后面的**第 4 / 第 5 次事故**，签名同为 `entries=0`；② **本小节所述 10-20 那两次事故当时的深扫输出未落盘**（`.scratch` 顶层 10-20 时段只有 mtime 探针 `shellmtime2.txt`），故该次的 52/818 标 `证据不足`，**不得再写成“精确扫描显示”**；③ 与 `52/818` **不同源**的是 `shellmtime2.txt`（10-20T16:17:50Z）第 1–3 行「`BAD(包级)=152` / mtime 分钟簇 `{16:11:52, 13:59:15, 06:39:85}` / `entries=0 的个数=151`」——那里的 **52 是 16:11 分钟簇的条目数，不是 52/818 的那个 52**，两个数字不可混用。
  （**两次更正**：本行原写的扫描产物名 `b1101-shells.txt` 磁盘上不存在（`Test-Path` = **False**）——第四轮 Minor-2 为真；但我 v0.15 为此写下的两条替代依据**本身又错**：一、全称否定「没有 `b1101-` 前缀产物」不实（实有 **12** 个，全为 `.log`，mtime 10-20 23:16:59–23:55:04）；二、改指的 `final-shellscan.txt` 经实测是 **异常=0** 的事后基线（1042 B / 第 1 行 / mtime 10-21T01:25:50.154Z，与 `final-gates/test/build/gates7.log` 9:22:25→9:24:33 同窗）。⇒ **第 26 次证伪**；载体 `.scratch/find-52-carrier2.txt`（全 11 文件 / 16 行 SHELLS 读数逐条列出）与 `.scratch/find-stale-claims-BEFORE.txt`（错值传播图）。）
- 时序（仅时间相关，非因果证明）：两次事故均观察于某次 `pnpm --filter web build` 之后；第一次发生时 `next dev` 仍在运行、`.next` 被两个进程同时使用。
- 修复：`pnpm install --frozen-lockfile --force --prefer-offline --config.confirm-modules-purge=false`（818 包全部离线重链、`downloaded 0`，postinstall `prisma generate` 成功）→ 解析恢复；`pnpm-lock.yaml` blob 与 HEAD 完全一致（`git hash-object` = `git rev-parse HEAD:pnpm-lock.yaml` = `9898d2b6…40564`），故修复**未引入依赖变更**。
- **既有故障类已建档**：本现象**不是新问题**，而是仓内已记录、至少五次复现的同类环境病：《开发环境搭建》v1.4 §五（store 条目整树失内容、next@15.0.0 空壳 8.0K/正常 113M、28+ 包）、台账 `03-7.23至7.29.md` §7.27、`specs/rebuild-admin-console-and-harden-auth/checklist.md` L87-89（next 包第三次/第四次/第五次损坏、styled-jsx 空壳）。其记录的**常见诱因**为“`node_modules` 被外部复制/压缩/清理后硬链接失效”，与本轮观测（目录与链接结构仍在、包体文件全缺）一致。本卡原先把它当“未知新缺陷”排查，是**未先检索知识库**的流程失误（关联 §二中误探针同属“先动手后查档”）。
- **因果证伪**：见 §六 矩阵 D/E —— 在 dev 已停止的环境下单独跑 `next build`（exit=0, 26s），构建后扫描**异常仍为 0**。因此本文件 v0.11 版本所写的「`next build` 与 `next dev` 并发导致空壳」这一推断**不成立，予以撤回**；具体触发者（杀软/外部工具/并发会话）标记为 `待确认`，不得再凭时序下因果结论。
- 保留的操作性约定（降级为"回避未知风险"，而非"已证明的因果"）：仍在 build 前停 dev、build 后跑一次空壳扫描；理由是它能让 `.next` 状态单一、并能在事故第一时间被发现，**不代表它消除了根因**。
- **第三次事故与时间簇（2026-10-20T16:11:09–10Z，本地 00:11）**：`next dev` 崩于 `Cannot find module 'next/dist/pages/_app'`；修正版 mtime 探针（`shellmtime2_011.mjs`）得 BAD(包级)=152，其中 **52 个真实空壳目录的 mtime 全落在 16:11:09–10** 这一分钟簇，与 `serve011.out`(00:11:07) / `s-dev.log`(00:11:11) **同窗**。→ **第 8 次自我证伪**：原判「dev 启动把包目录清了」因果方向倒置——本轮 dev 启动成功（`Ready in 1388ms`）且就绪后立即复扫**异常=0**，而 `next/dist/pages/_app` 缺失恰是 next 包被清空的**后果**；dev 是**受害者**不是加害者。删除者身份仍为 `待确认`（不重现，见 `12_` §三 第 5 项）。
- 证据学后果：事故使"真实采集 exit 0"这条早期证据不可复现，因此本卡在修复后的环境里**重做了全部四项验收**（见 `verify.txt` 与 `b1101-gates2.log`），早期结论不再单独引用。

## 六、受控实验矩阵 A→E（空壳诱因排查）

| 步 | 操作 | 观测 | 推出 |
|---|---|---|---|
| A | 事故发生后，以修正版探针全量扫描 | 条目=818、定位到包目录=818、**异常=52**；`@prisma/client`/`source-map-js`/`postcss` 从 `apps/web` 均 FAIL | 受损面远大于 prisma；原探针报 0 属假确认 |
| B | `pnpm install --frozen-lockfile --force --prefer-offline` | `resolved 818, reused 818, downloaded 0, added 818`；postinstall `✔ Generated Prisma Client (v6.19.3)` | 离线重链可修复，不需网络 |
| C | 扫描 + 解析 | **异常=0**；`@prisma/client`/`postcss` 从 `apps/web` OK | 环境恢复 |
| D | **dev 已停**前提下单独 `pnpm --filter web build` | exit=0，26s | 复现条件与首次事故不同（无并发） |
| E | 紧接 D 后扫描 | **异常=0** | `next build` 本身不是充分诱因；并发假设也未再现 |

未排除项：扫描只能在调用间隙采样，无法看到“是谁把目录清空”；两次事故的现场快照均未及早保存。因此本卡只能给出“已排除项”，不能给出单个根因。

### 补充诊断（矩阵之后补做，属前一轮取证遗漏项）

- `pnpm store path` → `E:\.pnpm-store\v3`（仅 `files/` 256 分片，无 `index/` 层）；registry = `https://registry.npmmirror.com`；HTTP(S)_PROXY 为空（git 的 10808 代理与 pnpm 无关）。
- **原判定被推翻（第 5 次自我证伪）**：本文件 v0.13 据一次 `pnpm store status` = `Packages in the store are untouched`（exit=0）推出「受损面只在项目 `node_modules` 层，故**本次修复是持久修复**」。随后同一命令改报 **`ERR_PNPM_MODIFIED_DEPENDENCY`**（exit=-1，列出 `@emnapi/runtime@1.10.0`、`@next/env@15.0.0`）——即该结论所据的读数不稳定，**单次读数不能支撑「持久」这类时间全称词**，v0.13 的判定作废。
- **现行结论（可复现）**：空壳与 store MUTATED 是同一次事件的**两个表征**，不是两层独立损坏。第 4 次修复（`pnpm install --frozen-lockfile --force --prefer-offline --config.confirm-modules-purge=false`）在 **`downloaded 0` / `reused 818` / 21.2s / exit=0** 下同时消解两者：修后 `shellscan2` 异常=**0**、`pnpm store status` = untouched / exit=0；postinstall `prisma generate` 成功。因此属「硬链/元数据不一致」亚型，而非《开发环境搭建》v1.4 记录的「store 条目内容被截断」亚型（后者必需重新下载，不可能 `downloaded 0`）。
- 残余读数：修复后包级异常仍剩 **1 项** = `@prisma+client@…/.prisma`，经核对为 **Prisma 生成目录本就无 `package.json`** 的探针假阳性（已计入 `02_` §五 非缺陷表），不得当作未愈。
- 门禁侧既有拦截：`scripts/check-gates.ps1` 的 `store-check`（L215-231）已在台账 §7.27 之后作为“空壳前置阻断”接入；本轮应走 `pnpm gates` 而非拆散跑单项（拆跑会漏 store-check）——记为方法论修正。
- 待确认：同一工作区存在多个代理工具目录（`.openclaw/`、`.box-agent/`、`.box-agent-scratch/`）与多个常驻第三方 node 进程，它们是否会并发清理/重写 `node_modules` 尚未取证；属环境面而非代码面，不影响本卡放行（见 `15_前提与局限.md`）。

## 七、第 4 次自我证伪：验证探针自身的假确认

- 缺陷：早期探针（`prismares011.mjs` 及 `shellscan011.mjs` 初版）写成 `let v = "FAIL"; try { v = "OK"; r.resolve(spec) } catch {}` —— 把置 OK 放在 `resolve()` **之前**，解析抛异常时输出仍为 OK。我据此在前一轮宣称"已修复"，属于**自我制造的假确认**。
- 修正：改为先 `r.resolve(spec)` 再 `v = "OK"`（`.scratch/shellscan2_011.mjs:35-41`）；同时把版本切分从 `lastIndexOf("@")` 改为 `/^(.+?)@(\d[^_]*)/`，避免 peer 后缀里的 `@` 带偏包名。
- 修正后的真相分三层：① 受损时异常数=52（原探针报 0）；② 修复后异常数=0（该结论来自修正后的探针，可信）；③ `source-map-js` 从 `apps/web` 根解析 FAIL 是 **pnpm 依赖隔离的正常现象**（它是 postcss 的传递依赖，apps/web 未直接声明），**不是**损坏证据 —— 核验方提出的该项不确定结论至此消解。
- 方法论沉淀：任何"判定通过"的探针必须做一次**反向自检**（让被探对象故意失败，确认输出会翻红）。本条与 §二中"币种切换误探针"、§三中"5435 陈旧误判"同族，均为**探针质量缺陷**，已一并写入 `25_执行记录.md`。

## 八、显式遗留（不阻塞本卡放行）

1. `clearDailyFxCache()`（`fx.ts:50-52`）全仓无调用方 → 跨进程采集后 Web 进程最长 10 分钟才反映新汇率（`runtime-pricing.txt` §三实测 15:12:05 pending=432 → 15:12:50 pending=0）。设计可接受，但必须文档化；即时失效需 Redis pub/sub，属后续批。
2. 本卡未新增公开端点，故未触碰 `docs/API接口文档.md`；端点/错误码同步统一在 B11-RTM 卡收口（避免 R10-01 双写）。

## 九、第 6–7 次自我证伪（mtime 归因探针与「兜底常量」怀疑）

- **第 6 次（探针层级假设错误）**：首版 `.scratch/shellmtime_011.mjs` 直接以「`.pnpm` 下一层目录 = 包目录」作判定，于是把 `ajv/dist` 等正常子目录也当作包，报出 **BAD=2409** 与一个并不存在的「15:48 大簇」。该结论曾一度写入分析过程 → **已撤回**，重写的 `shellmtime2_011.mjs` 与 `shellscan2_011.mjs` 取同口径（区分 scoped / 非 scoped 目录名）后得 BAD(包级)=**152**，时间簇变为 `{16:11:52, 13:59:15, 06:39:85}`。**教训**：同一现象的两个探针必须声明同一口径，否则“修好了探针”也会被误读成“修好了环境”。
- **第 7 次（无据推定造假缺陷）**：因写入值 `6.6757` 与早前 DRY-RUN 输出一致，一度推定「脚本内置兜底常量冒充公开源」。反证：`fx_daily.ts` 全文无兜底常量（源失败即抛 `FxSourceError` 并非零退出）；独立 `fetch('https://api.frankfurter.dev/v2/rate/usd/cny')` 返回 `HTTP 200 {"date":"2026-10-20","base":"USD","quote":"CNY","rate":6.6757}` 与写入值**逐位一致**；而 DRY-RUN 与写入的差异只因为探针显式传了 `--dry-run`。→ **缺陷候选撤回**，登记于 `02_` §五 非缺陷表。
- 台账本体以 `00_深度分析.md` §五 为单一真源（铁律 1），本节只展开与 EVD-B11-01 相关的三项（第 5/6/7/8 次）。
