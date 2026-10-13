# QA-FE-01 品牌 Logo 与默认主题运行回归报告

> 版本: v1.0 | 更新: 2026-09-14 | 变更: 新 BUILD 976Wf9Ea7-vzV6AID660J 的 HTTP+DOM+存储三层回归与 e2e 稳定体系首版
>
> **历史口径标注（QA-FINAL-03 复核，2026-09-15）**：本报告的 `22/22` 为 R 段 **4 例**时代（P3+H7+T8+R4=22）的脚本断言数，是当时脚本的真实历史结果，**不代表当前脚本语义**。QA-GATE-02 已将 R 段扩至 **8 例**（补 R5–R8：白名单外 400、client_id 无效、response_type、scope 校验），当前 `qa-fe-01-regression.mjs` 断言数为 **26**（P3+H7+T8+R8），同 BUILD `PcWuUbTloz3rPlzSFQrvn` 实测 `PASS=26 FAIL=0`。

工作包：**QA-FE-01 · 品牌 Logo 与默认主题运行回归及 e2e 稳定体系**
角色：质量 / 前端保障工程师
最终状态：**PASS**（脚本 22/22 全绿；e2e gradient 4 轮全绿 + smoke 7/7）
执行窗口：2026-09-14 17:11–17:35（GMT+8）
被测 BUILD：`976Wf9Ea7-vzV6AID660J`（root == standalone 一致）
服务归属：PID 43788（创建 2026-09-14 17:10:10 > BUILD 产物 17:09），`node apps/web/.next/standalone/apps/web/server.js`

---

## 1. 工作包

在新 BUILD 上**独立**证明：standalone 产物可零重建直接恢复服务；logo 字节级正确且无破图；默认主题 indigo 边界正确且三色可切换、可恢复、可回退、可保持；e2e 文本多匹配 flake 已由 `exact:true` 真实止住；控制台无资源 404 与 hydration 错误。交付证据链与可复现回归脚本，不实现业务。

---

## 2. 最终状态

| 段 | 内容 | 结果 |
|---|---|---|
| P | 前置确权（服务/BUILD/logo 字节） | **3/3 PASS** |
| H | HTTP 层（首页/logo/CSS/static/内页/刷新） | **7/7 PASS** |
| T | 主题层（四层断言 × 5 态） | **8/8 PASS** |
| R | 重定向层（authorize/consent/受保护/admin） | **4/4 PASS** |
| S | e2e（console-flow-gradient + smoke） | **PASS**（2 + 7，另 3 轮稳定性复跑全绿） |
| 合计 | — | **22/22 脚本项 PASS，0 FAIL，0 BLOCKED，退出码 0** |

---

## 3. 调查结果

### 3.1 服务归属（零重建即恢复）

- `apps/web/.next/BUILD_ID` = `apps/web/.next/standalone/apps/web/.next/BUILD_ID` = `976Wf9Ea7-vzV6AID660J`；
- 六项产物 **6/6 PRESENT**：BUILD_ID、`.next/static`(54)、`.next/server`(295)、`standalone/.../server.js`(4565B)、`standalone/.../.next/static`(54)、`standalone/.../public/aidean-logo.png`(53594B)；
- 3000 唯一监听者 PID 43788，命令行即 standalone `server.js`，创建时间 17:10:10 **晚于**产物时间 17:09 → **服务的是新 BUILD**，无需重建。

### 3.2 logo 字节链

| 位置 | 字节 | md5 |
|---|---|---|
| 源码 `apps/web/public/aidean-logo.png` | 53594 | `74ed94791f98a76fc420705e0c6cb92c` |
| 产物 `standalone/.../public/aidean-logo.png` | 53594 | 同上 |
| 服务 `GET /aidean-logo.png` | 53594 | 同上 |

三处完全一致 → 破图根因（public 未随 standalone 复制）已由 postbuild 钩子闭环。

### 3.3 flake 根因确证（探针反证）

在真实 `/user/console` DOM 上统计 `getByText` 匹配数：

| 文本 | loose 匹配 | loose 可见 | exact 匹配 | loose 行为 | exact 行为 |
|---|---|---|---|---|---|
| 账户余额 | 1 | 1 | 1 | OK | OK |
| **当前等级** | **2** | 1 | 1 | **THROW（strict mode violation: resolved to 2 elements）** | OK |
| 今日 Token 用量 | 1 | 1 | 1 | OK | OK |

→ `当前等级` 在页面上存在**两处文本节点**（一处隐藏），非 exact 断言进入 strict mode 抛错；`exact:true` 收敛为 1 个元素 → **该修复是必要的，而非偶然通过**（反证命中 1/3）。

### 3.4 主题默认态的确权（重要边界）

`uiStore` 初值 `theme:"indigo"`；`hydrateUiFromStorage()` 仅在**命中有效存储值**时写 `document.documentElement.dataset.theme`。因此「无存储」态的 `html[data-theme]` 属性**缺省**（`null`），视觉 indigo 由 `:root { --primary:#4f46e5 }` 承担。若仅以属性判定会误判为「默认主题缺失」——故本包采用 **computed `--primary`** 作为视觉真值。

---

## 4. 执行过程

| 步骤 | 动作 | 结果 |
|---|---|---|
| S1 | 只读确权（BUILD/六项产物/logo 三处/3000 归属/进程） | 全部齐备，服务在线 |
| S2 | 读实现：`SiteHeader`(logo 103×28) / `ThemeSwitcher` / `uiStore` / `ThemeProvider` / `globals.css` 三变体 | 契约确认 |
| S3 | 读 `git diff`：`console-flow-gradient` 三处 `exact:true` + **AUTH-01 的 authorize/consent/middleware 改动** | 发现并核实 AUTH 修复已入新 BUILD |
| S4 | HTTP 探测（首页/logo/CSS/static 11 条/豁免 2 条/内页 7 页/刷新 5 轮） | 全绿 |
| S5 | 重定向探测（authorize/consent/user/admin） | 全绿 + `noZero` |
| S6 | 落盘一键脚本 `qa-fe-01-regression.mjs`（P/H/T/R/S 五段） | 新增 |
| S7 | 运行脚本（P/H/T/R） | **22/22 PASS，退出码 0** |
| S8 | 运行 e2e（S 段） | gradient 2/2、smoke 7/7 |
| S9 | 根因探针 `exact-probe.mjs` | 确证 loose 抛错、exact 收敛 |
| S10 | gradient 稳定性复跑 ×3 | 2/2、2/2、2/2 |

---

## 5. 设计决策

- **D1 复用不重建**：3000 已由现有 standalone 产物服务且归属可证（PID/时间/命令行三重），依 §9.1「优先复用，禁止重建」执行；本包**未触碰 `.next`**。
- **D2 主题四层断言**：DOM(`aria-pressed`) + `localStorage` + `html[data-theme]` + `getComputedStyle('--primary')`。理由见 §3.4——属性缺省 ≠ 主题缺失，必须用 computed 变量收口。
- **D3 静态清单动态提取**：从首页 HTML 正则提取 `/_next/static/**`，不硬编码 chunk hash，使脚本跨 BUILD 复用。
- **D4 瞬时抖动重测**：任一资源首次非期望码时 1.5s 后重测，最多 3 次；两次仍非 200 才判 FAIL——区分「并发 install/build 造成的瞬时 500/502」与终态失败。
- **D5 唯一输出目录**：`.pw-qa01/<label>-<ts>`，规避宿主 safe-delete 对既有目录批量删除的拦截（承 BUILD-RT-01 R1）。
- **D6 必要性反证**：以 loose vs exact 对照探针证明修复必要，而非「跑一次通过」的弱证据。

---

## 6. 实际修改（仅验证资产）

| 类型 | 路径 | 说明 |
|---|---|---|
| 新增（验证资产） | `apps/web/scripts/qa-fe-01-regression.mjs` | 一键回归：P 前置 / H HTTP / T 主题 / R 重定向 / S e2e，含日志与退出码 |
| 新增（验证资产） | `scratch/_qa01/exact-probe.mjs` | strict-mode 多匹配根因探针 |
| 新增（文档） | `docs/QA-FE-01-品牌与主题运行回归报告.md` | 本报告 |
| 临时取样 | `scratch/_qa01/_home.html`、`_logo.png`、`_static_refs.txt`、`_h_*.txt`、`_page.html` | HTTP 取样 |
| 输出目录 | `.pw-qa01/<label>-<ts>` | e2e 唯一输出 |

**未修改任何实现文件**：`authorize/route.ts`、`consent/route.ts`、`middleware.ts`、`uiStore.ts`、`ThemeProvider.tsx`、`ThemeSwitcher.tsx`、`SiteHeader.tsx`、`globals.css` 全部保持原样。未重建 `.next`，未清理无关文件，未提交。

---

## 7. 测试（回归矩阵）

命令：

```bash
# 全量（P/H/T/R）
node apps/web/scripts/qa-fe-01-regression.mjs
# 仅 e2e 段（gradient + smoke）
node apps/web/scripts/qa-fe-01-regression.mjs --only S --with-e2e
# 根因探针
node scratch/_qa01/exact-probe.mjs
```

| # | 项 | 期望 | 实测 | 判定 |
|---|---|---|---|---|
| P1 | 3000 存活 | 200 | 200，`X-Powered-By: Next.js` | PASS |
| P2 | BUILD_ID 双路径一致 | 同值 | `976Wf9Ea7-vzV6AID660J` / 同 | PASS |
| P3 | logo 三处字节一致 | 53594B/同 md5 | src=dist=served=53594B/`74ed9479` | PASS |
| H1 | 首页 | 200 html | 200，95086B | PASS |
| H2 | logo | 200 image/png 53594B | 200，`image/png`，53594B，md5 同 | PASS |
| H3 | 首页 logo 引用 + `#4f46e5` | 均存在 | true / true | PASS |
| H4 | `/_next/static/**` 逐条 | 全 200 | **11/11** | PASS |
| H5 | 豁免 2 条 Pages 遗留 | 404 | `chunks/webpack.js=404`、`runtime/main.js=404` | PASS |
| H6 | 内页头部（logo+品牌色） | 7/7 | /models /products /pricing /docs /roadmap /partners /about 全 200 | PASS |
| H7 | 刷新稳定性 5 轮×3 资源 | 全 200 | 15/15 全 200 | PASS |
| T1 | 无存储默认=indigo | 属性缺省 + `#4f46e5` + indigo pressed + stored null | `data-theme=null`、`--primary=#4f46e5`、pressed=true、stored=null | PASS |
| T2 | 切换 teal | teal / `#0d9488` / stored | 全符 | PASS |
| T3 | 切换 orange | orange / `#ea580c` / stored | 全符 | PASS |
| T4 | 切换 indigo | indigo / `#4f46e5` / stored | 全符 | PASS |
| T5 | 有效值恢复（预置 teal） | teal | `data-theme=teal`、`--primary=#0d9488`、stored=teal | PASS |
| T6 | 无效值回退（预置 purple） | 属性缺省 + `#4f46e5` | 全符，indigo pressed=true | PASS |
| T7 | 刷新保持（teal→reload） | teal 保持 | 全符 | PASS |
| T8 | 控制台无资源 404 / 无 hydration | 0 / 0 | `badStatic=[]`、`hydrationErrors=0` | PASS |
| R1 | 未登录 authorize | 307，origin=公开基址，state 不丢 | 307 `http://localhost:3000/login?redirect=/oauth/authorize…state=qa01probe`，`noZero=true` | PASS |
| R2 | 未登录 consent | 307 → login(回跳 authorize，参数完整) | 307，redirect 解码含 `/oauth/authorize` + state | PASS |
| R3 | 未登录 /user/console | 307 → `/login?redirect=/user/console` | 全符 | PASS |
| R4 | 未登录 /admin | 307 → `/admin/login?redirect=/admin` | 全符 | PASS |
| S1 | e2e console-flow-gradient | 全绿 | passed=2 failed=0 exit=0 | PASS |
| S2 | e2e smoke | 7/7 | passed=7 failed=0 exit=0 | PASS |
| S3 | gradient 稳定性复跑 ×3 | 全绿 | 2/2、2/2、2/2（4.6s/4.5s/4.2s） | PASS |

**失败项**：无。**豁免项**：`/_next/static/chunks/webpack.js` 与 `/_next/static/runtime/main.js` 预期 404（Pages Router 遗留路径，App Router 构建本就不产出），已在 H5 显式断言并说明。

---

## 8. 集成验证

- **服务集成**：standalone `server.js` 直接服务静态与页面，logo/CSS/chunk 三链路一致；
- **主题集成**：`ThemeProvider`(mount hydrate) → `uiStore`(state+storage+dataset) → `globals.css`(`[data-theme]` 覆盖 `--primary`) 三环贯通，computed 变量与 DOM/存储三层同源；
- **鉴权集成（黑盒）**：middleware 守卫 `/user/*`、`/admin/*`；`/oauth/authorize`、`/oauth/consent` 不被 middleware 拦截而由路由自身做登录态判定；四类未登录跳转 origin 均落在公开基址；
- **跨包集成**：AUTH-01 的 RC-02 修复（origin 由 `url.origin` → `AUTH_ISSUER`）**在新 BUILD 中生效**，SSO-01 遗留的 standalone `0.0.0.0` Location 未再出现（`noZero=true`）。

---

## 9. 证据

| ID | 证据 | 值 |
|---|---|---|
| E1 | BUILD_ID 双路径 | `976Wf9Ea7-vzV6AID660J` == `976Wf9Ea7-vzV6AID660J` |
| E2 | 3000 归属 | PID 43788，`node ...\.next\standalone\apps\web\server.js`，created 2026-09-14 17:10:10 |
| E3 | logo md5 | `74ed94791f98a76fc420705e0c6cb92c`（源/产物/服务三者一致） |
| E4 | 首页 | 200，`Content-Length: 95086`，`X-Powered-By: Next.js` |
| E5 | static 清单 | 11 条全 200（10 JS + 1 CSS `5c3507e0658ff287.css`） |
| E6 | 豁免 404 | `chunks/webpack.js=404`、`runtime/main.js=404` |
| E7 | 主题计算值 | `--primary`：`#4f46e5`(缺省/indigo) / `#0d9488`(teal) / `#ea580c`(orange) |
| E8 | 探针 | `当前等级` loose=2 → strict violation；exact=1 → OK |
| E9 | 重定向 | R1–R4 均 307，origin=`http://localhost:3000`，无 `0.0.0.0` |
| E10 | e2e | gradient 2/2（4 轮）、smoke 7/7 |
| E11 | 脚本退出码 | 0（PASS=22 FAIL=0 BLOCKED=0） |

---

## 10. 遗留问题

| ID | 级别 | 说明 | 处置 |
|---|---|---|---|
| L1 | 已闭环 | SSO-01 遗留：standalone 未登录 authorize 的 `0.0.0.0` Location | **已由 AUTH-01 修复并在本 BUILD 实测通过**（R1/R2 `noZero=true`），可标记闭环 |
| L2 | 低 | H7 中 CSS 文件名 `5c3507e0658ff287.css` 为本次 BUILD 的 hash；换 BUILD 需同步（H4 已动态覆盖全量，H7 仅稳定性子集） | 保持现状；如需跨 BUILD 稳态，可将 H7 资源改为从首页动态取首条 CSS |
| L3 | 低 | 工作区新增 `test-results*`、`.pw-qa01/**` 输出目录持续增长 | 依「不清理无关文件」约束未删；建议由 CI 定期清理或改用临时目录 |
| L4 | 说明 | 「无存储」态 `html[data-theme]` 属性缺省（非显式 `indigo`） | 属既定实现语义（hydrate 不写默认属性），computed 视觉正确，**非缺陷**；若要求 SSR 期即带属性，需改 `app/layout.tsx`，须另立提案 |
| L5 | 外部 | AUTH-01 的 `authorize/consent/middleware` 仍为**未提交**工作区态（`M`），BUILD 已含其修复但 git 未落库 | 见 §12 建议 1 |

---

## 11. 风险

- **R-a 端口归属漂移（环境级）**：执行期观测到 REL-01 相关容器（`rel01-pg`/`rel01-pg-r`）在线、AUTH-01 改动处于工作区未提交态；若任一方在本机再次构建/起服，3000 归属会变，本报告结论需以 **P 段重跑**复核（BUILD_ID 一致方可复用结论）。
- **R-b 双监听者假设（平台级）**：Windows 允许同端口重叠绑定。本次经 `netstat` 确认 3000 **唯一**监听者；若并发 agent 另拉 `next dev`，请求可能随机分派，e2e 会非确定性——验证前必须先确认单监听者。
- **R-c 依赖瞬态（平台级，承 BUILD-RT-01 R2）**：`.pnpm` 在并发 install 窗口内可能瞬时清空，导致 standalone 惰性 `require` 抛错、页面瞬时 500/502。本脚本的 D4 重测机制会把「抖动」与「终态失败」区分开。
- **R-d 主题断言视口依赖**：`ThemeSwitcher` 位于 `hidden … sm:flex` 容器，仅 ≥640px 可见。本回归固定 `1280×800`；若未来在移动视口做主题断言需另设可见性前置。

---

## 12. 对其他工作包的影响

| 包 | 影响 |
|---|---|
| **AUTH-01** | 消费其 Contract 成功；**未发现实现缺陷**。其 RC-02 修复（`origin → AUTH_ISSUER`）在本 BUILD 得到运行态证据（R1/R2）；其 `M` 态改动建议尽快落库（见建议 1） |
| **BUILD-RT-01** | 复用其 standalone 产物与 postbuild 钩子，产物断言 6/6 复现；本次 chunk hash 与其报告一致 → 构建稳定 |
| **SSO-01** | 其遗留 L1（`0.0.0.0` Location）可凭本报告 R 段证据**标记闭环** |
| **前端（WAIT）** | 本包 **0 FAIL** → 无返工触发 |
| **经理** | 22/22 + e2e 全绿，矩阵可作终验依据 |

---

## 13. 下一步建议

1. **（高）AUTH-01 落库**：提交 `apps/web/app/oauth/authorize/route.ts`、`apps/web/app/oauth/consent/route.ts`、`apps/web/middleware.ts`——否则运行产物已含修复而 git 未记录，重建即可能回退。
2. **（高）纳入门禁**：将 `node apps/web/scripts/qa-fe-01-regression.mjs` 加入回归一键链（与 `c02-regression.mjs` 并列），作为品牌/主题/静态资源回归基线。
3. **（中）文档同步**：把 §3.3 的 strict-mode 根因与 §3.4 的主题默认态边界写入 `docs/测试与验收文档.md`，避免后续重复误判。
4. **（中）生产口径复验**：`NEXT_PUBLIC_SITE_URL` 指向公开域名后复跑 R 段，确认 origin 断言随环境正确切换。
5. **（低）环境纪律**：串行化并发 agent 的 install/build/起服（承 BUILD-RT-01 D4），并在验证前断言 3000 单监听者。
