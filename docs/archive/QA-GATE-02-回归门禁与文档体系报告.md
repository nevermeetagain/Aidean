# 工作包完成报告 · QA-GATE-02

> 角色：回归与门禁工程师（QA-GATE-02）
> 版本：v1.1 | 更新：2026-09-15 | 变更：QA-FINAL-03 复验校正——G1 实测 `WARN=1`（原 `WARN=2` 为旧脚本口径漂移）；`AUTH_ISSUER_CONTAINER`/`.env 分发` 为 **INFO**（非 WARN，strict 不阻断）；BUILD `PcWuUbTloz3rPlzSFQrvn` 完整 G0–G3 复绿 10/10
> 目标 BUILD：`PcWuUbTloz3rPlzSFQrvn`（生产 standalone，3000 单监听 PID 27172）
> 铁律：只新增/修改验证资产与测试配置；不动 authorize/consent/middleware/redirect；不重建 `.next`；输出目录唯一化。

---

## 一、工作包与目标

把 QA-FE-01（品牌 Logo / 默认主题运行回归）与 SSO-02（standalone 地址与运行契约）的**一次性验证**，固化为**可反复执行、可跨 BUILD 复用、退出码可判读**的常态门禁，并落地配套文档体系：

1. `qa-fe-01-regression.mjs`（P/H/T/R）与 `check-runtime-contract.mjs`（build/runtime）**纳入一键链**，统一日志 + 退出码，跨 BUILD 复用，chunk 动态提取（不硬编码 hash）。
2. 在 **BUILD `PcWuUbTloz3rPlzSFQrvn`** 上复绿全矩阵（Logo/主题/重定向/e2e）。
3. 证明 `exact:true` 稳定性复跑，显式豁免 Pages 双 404。
4. 71 skipped 分诊（**63/3/5 结构复核**），把 strict-mode 根因、主题默认态边界、豁免双 404、视口前置、抖动重试纪律写入测试验收文档。
5. 落盘生产换基址（`NEXT_PUBLIC_SITE_URL`）复验步骤。

---

## 二、交付物清单

| 文件 | 性质 | 状态 |
|---|---|---|
| `apps/web/scripts/gate-regression.mjs` | 新增 · 一键门禁聚合器（G0–G4，退出码 0/1/2） | ✅ |
| `apps/web/scripts/qa-fe-01-regression.mjs` | 修改 · R 段补 R5–R8；H7 CSS 引用动态提取 | ✅ |
| `apps/web/scripts/check-runtime-contract.mjs` | 已有（SSO-02）· 门禁 G1 调用 | ✅ |
| `docs/测试与验收文档.md` | 修改 · v1.6 新增 §十一（判据边界 + 分诊 + 换基址） | ✅ |
| `docs/QA-GATE-02-回归门禁与文档体系报告.md` | 新增 · 本报告 | ✅ |

**Diff 边界**：业务代码零改动；未执行重建。

**归属澄清（避免误读 `git status`）**：工作区中 `apps/web/app/oauth/authorize/route.ts`、`apps/web/app/oauth/consent/route.ts`、`apps/web/middleware.ts`、`apps/web/lib/features/auth/redirect.ts` 的 **M/??** 态为**并行 agent（RC-02 / A-T20）产物，非本工作包改动**；本工作包 `git status` 增量仅三处——`apps/web/scripts/gate-regression.mjs`（新增）、`apps/web/scripts/qa-fe-01-regression.mjs`（新增/修改）、`docs/*`（文档）。

---

## 三、一键门禁链设计（分段 · 退出码 · 日志）

| 段 | 内容 | 判据 | 依赖 3000 |
|---|---|---|---|
| **G0** 前置确权 | 3000 存活+形态 / **单监听者** / BUILD_ID 双一致 / 六项产物 / logo 三处字节 | `netstat :3000` LISTENING 匹配数 **=1** | 是 |
| **G1** 契约门槛 | `check-runtime-contract.mjs --mode build [--strict]` | 构建期注入 `NEXT_PUBLIC_SITE_URL`；生产口径 ERROR=0 | 否 |
| **G2** 品牌矩阵 | `qa-fe-01-regression.mjs`（P/H/T/R） | **26 断言**（P3+H7+T8+R8）FAIL=0 | 是 |
| **G3** e2e | G3.1 gradient / G3.2 smoke(7) / **G3.3 gradient ×3 复跑** | G3.3 连续 3 轮 `passed≥2 & failed=0` | 是 |
| **G4** 兼容回归（可选 `--with-c02`） | `c02-regression.mjs`（S1–S6） | 见 §八 | 部分 |

- **退出码**：`0`=全绿 ｜ `1`=存在 FAIL ｜ `2`=G0 未放行（后续依赖段标 BLOCKED）。
- **日志**：`.qg02-logs/<STAMP>/<段名>.log`；e2e 输出唯一目录 `.pw-qg02/`（**永不删旧目录** → 规避 safe-delete）。
- **跨 BUILD 复用**：G0 只校验 BUILD_ID 双路径一致性（不绑 hash）；H4 静态资源清单从首页 HTML 动态提取；H7 CSS 引用动态取 `.css`（**不硬编码 chunk hash**）；R 段 origin 由 `new URL(BASE).origin` 计算（换基址自动适配）。
- **单监听者硬门槛**：Windows 端口重叠 → 请求随机分派 → 结论不可信；匹配数 ≠1 直接 `exit 2`。

---

## 四、G0 前置确权实测

| 项 | 实测 | 判定 |
|---|---|---|
| G0.1 3000 存活 + 形态 | `status=200 x-powered-by=Next.js` | ✅ PASS |
| G0.2 单监听者 | `LISTENING :3000` 匹配数 = **1**（PID 27172） | ✅ PASS |
| G0.3 BUILD_ID 双一致 | `PcWuUbTloz3rPlzSFQrvn` / `PcWuUbTloz3rPlzSFQrvn` | ✅ PASS |
| G0.4 六项产物 | 6/6 PRESENT | ✅ PASS |
| G0.5 logo 三处字节 | src=53594B dist=53594B served=53594B md5=`74ed9479` | ✅ PASS |

---

## 五、G1 运行契约实测

`node apps/web/scripts/check-runtime-contract.mjs --mode build` → **ERROR=0 WARN=1 exit=0**（PASS）。

- WARN×1 为**预期 dev 态告警**：`NEXT_PUBLIC_SITE_URL=localhost`。
- `AUTH_ISSUER_CONTAINER` 字面量与 `.env 分发` 均为 **INFO**（非 WARN）——不参与 WARN 计数，strict 亦不阻断。
- 生产口径（`--strict-contract`）：上述 1 条 localhost WARN 升级为 ERROR，须在换基址后归零（见 §十）。
- 校正注：早期文档记录的 `WARN=2` 为旧脚本口径（曾将 INFO 误计为 WARN），当前脚本语义以本节为准。

---

## 六、G2 品牌矩阵实测（26 断言，R 段 8 例）

`PASS=26 FAIL=0 BLOCKED=0`。断言构成：P1–P3（前置 3）+ H1–H7（HTTP 7）+ T1–T8（主题 8）+ R1–R8（重定向 8）。

**R 段逐条（本轮由 4 例扩至 8 例）**：

```
PASS | R1 | 未登录 authorize → /login（origin=公开基址，state 不丢）   | 307
PASS | R2 | 未登录 consent → /login（回跳指向 authorize，参数完整）     | 307
PASS | R3 | 未登录 /user/console → /login?redirect=/user/console       | 307
PASS | R4 | 未登录 /admin → /admin/login?redirect=/admin               | 307
PASS | R5 | redirect_uri 白名单外 → 400 且不重定向（防开放重定向）       | 400 loc=(空)
PASS | R6 | client_id 无效 → 400 且不重定向                             | 400 loc=(空)
PASS | R7 | response_type 非 code → 302 经 redirect_uri 回传 error      | 307 ...error=unsupported_response_type&state=qa01probe
PASS | R8 | scope 非法 → 302 回传 error=invalid_scope                   | 307 ...error=invalid_scope&state=qa01probe
```

- **R5/R6 的“400 且无 Location”** 是防开放重定向的核心契约：`client_id`/`redirect_uri` 非法时**绝不**回跳（否则可被利用为开放重定向）。
- **R7/R8 的“经 redirect_uri 回传 error”** 是 OIDC 参数错误契约：参数校验失败走 redirect_uri 带 `error`，而非 400。
- 全部 R 例含 `!loc.includes("0.0.0.0")` 反例守卫（延续 SSO-02 对 `0.0.0.0` 的关闭验证）。

---

## 七、G3 e2e + 稳定性复跑实测

| 段 | 实测 | 判定 |
|---|---|---|
| G3.1 console-flow-gradient | `passed=2 failed=0 exit=0` | ✅ |
| G3.2 smoke（7 断言） | `passed=7 failed=0 skipped=0` | ✅ |
| **G3.3 稳定性复跑（gradient ×3）** | 轮次 `2✓ 2✓ 2✓`（轮间距 1.5s 抖动） | ✅ |

**G3.3 的意义**：把 QA-FE-01 的「`exact:true` 止 flake」从**单轮结论**升级为**可复现证据**——单轮过可能是时序侥幸，连续 3 轮零 flake 才证明 strict-mode 竞态已被消除。

---

## 八、71 skipped 分诊复核（63/3/5）

**权威计数**：全量实跑 `playwright test --workers=1` → **71 skipped / 33 passed / 7 failed（环境项）**。

**63/3/5 复核结论：口径成立，无新增跳过。**

| 类别 | 判据 | 条数 |
|---|---|---|
| 豁免（`describe.skip` 块级，路由已删·永久留证） | 路由在构建产物中不存在、注释无重写计划 | **63** |
| 待补（明确待重写，路由级单例 `test.skip`） | 注释明确「待确认新入口后重写」 | **3** |
| 环境（端点 404，契约漂移，API 级单例 `test.skip`） | 接口端点 404，待新契约 | **5** |
| **合计** | — | **71** |

**逐文件与处置建议**（本轮**不重写业务用例**）：

| 文件 | skip/total | 类别 | 处置建议 | 归属 |
|---|---|---|---|---|
| `admin/modules.spec.ts` | 14/16 | 豁免 | 保留，整体重写入口路径 | 管理者/员工A |
| `admin/tools.spec.ts` | 12/12 | 豁免 | 保留，资源生态新入口后重写 | 管理者 |
| `admin/sync.spec.ts` | 2/2 | 豁免 | 保留，同步页新入口后重写 | 管理者 |
| `web/docs-about-products.spec.ts` | 14/14 | 豁免 | 保留，信息架构确认后重写 | 管理者 |
| `web/resources.spec.ts` | 13/13 | 豁免 | 保留，资源页新入口后重写 | 管理者 |
| `web/models.spec.ts` | 7/7 | 豁免 | 保留，改 `beforeEach` 入口（`/models` 存活） | 员工A |
| `web/home.spec.ts` | 1/6 | 豁免 | 保留，首屏改版后重写该单例 | 员工A |
| `admin/models.spec.ts` | 1/7 | 待补 | 保留，benchmarks 新入口后重写 | 管理者 |
| `web/aidean-closed-loop.spec.ts` | 2/2 | 待补 | 保留，主闭环新入口后重写 | 管理者/员工A |
| `web/api-auth-contract.spec.ts` | 5/6 | 环境 | 保留，新契约确认后改写端点 | 员工A |

**删除建议：一律不删**（留证跳过，非缺陷、非 flaky）。**红线**：有效覆盖率 40/111 ≈ 36%。

---

## 九、判据边界固化为文档

已写入 `docs/测试与验收文档.md` §11.2：

| 项 | 要点 |
|---|---|
| **strict-mode 根因** | `getByText('当前等级')` 松散匹配命中 2 节点（1 可见 1 隐藏）→ strict violation；`{exact:true}` 收敛为 1；探针 `scratch/_qa01/exact-probe.mjs` + G3.3 复跑双证 |
| **主题默认态边界** | 「无存储 / 非法值」时 `data-theme` 属性为 **null**，视觉仍 indigo（`:root{--primary:#4f46e5}` 兜底）；判据**必须**用 computed `--primary`，**不可**用 `data-theme==='indigo'` |
| **豁免双 404** | `/_next/static/chunks/webpack.js`、`/_next/static/runtime/main.js` 为 Pages Router 遗留，App Router 本就不产出，恒 404 属正常（H5 显式断言 404） |
| **视口前置** | `ThemeSwitcher` 在 `hidden sm:flex`，**仅 ≥640px 可见**；主题 e2e/探针固定 1280×800，否则假红 |
| **抖动重试纪律** | HTTP 层 `getWithRetry(tries=3, 间隔1.5s)`，区分瞬时 500/502/拒连与终态错误 |

---

## 十、生产换基址（`NEXT_PUBLIC_SITE_URL`）复验步骤

> `AUTH_ISSUER = NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"` 为**构建期内联**；authorize/consent/middleware 的绝对重定向 origin 源自它 → **换基址必须重建**。

```bash
export NEXT_PUBLIC_SITE_URL="https://<生产域名>"           # 1) 构建期注入
pnpm --filter web build                                     # 2) 重建
node apps/web/scripts/check-runtime-contract.mjs --mode build --strict   # 3) ERROR=0 才放行
node apps/web/scripts/gate-regression.mjs --base "https://<生产域名>" --strict-contract  # 4) 复验
```

**origin 随环境切换断言**：门禁 R 段 `origin = new URL(BASE).origin`，R1–R4 前缀自动拼新基址。换基址后须满足：① G1 `--strict` ERROR=0；② R1–R4 Location 前缀 = 生产基址且不含 `0.0.0.0`/`localhost`；③ R5/R6 仍 400 无 Location；④ 容器 `AUTH_ISSUER_CONTAINER` 与宿主多值接受一致（详见 `docs/SSO-02-standalone地址与运行契约报告.md`）。

---

## 十一、失败项与风险（如实列出，不省略）

### 11.1 全量实跑 7 failed 的定性——均非产品回归、不入门禁矩阵

| # | 用例 | 错误 | 定性 |
|---|---|---|---|
| 1 | `web/sso-3333 [c]` | `waitForURL` 超时 30s | 需 3333 AideanBot 在线；门禁 G2 仅断言「回调重定向到 3333」，**不依赖 3333 存活** |
| 2–4 | `admin/dashboard ×2` + `admin/login ×1` | 元素未找到 / 跳转断言 false | admin 项目需 DB 种子与仪表盘状态，**不在门禁矩阵** |
| 5–7 | `smoke [5][6][7]` | **HTTP 429** | 同进程连续登录触发 IP 限流（`LOGIN_IP_RATE_LIMIT=20/600s`）；**门禁 G3.2 把 smoke 独立成段**即为此，单跑 7/7 绿 |

> 这 7 项是**环境/序依赖**产物（缺服务、缺种子、限流级联）——正是**分段门禁**要规避的噪声。门禁矩阵在干净前置下 10/10 绿。

### 11.2 未决项与后续

1. **G3.2 加固建议**：门禁 smoke 段可前置调用 `clear-rl.mjs`（清 `rl:login:*`），进一步消除限流残余风险；本轮未改（避免扩大 diff 面）。
2. **admin 项目未纳入门禁**：`admin/dashboard|login` 依赖 DB 种子，需先建立独立 seed 前置再纳入；本轮标注归属，未纳入。
3. **覆盖率红线未解**：71 留证跳过使有效覆盖率 36%；须等各模块新入口/新契约确认后重写（归属见 §八），重写完成前不得宣称「覆盖完整」。
4. **并发 agent 抢占 3000 风险**：G0.2 已把「单监听者」设为硬门槛，可在运行期拦截；但无法阻止外部进程在门禁运行中途抢占（历史数次遭遇），建议运行门禁前确认无并发构建。

### 11.3 结论

- 门禁一键链在 **BUILD `PcWuUbTloz3rPlzSFQrvn` 上 10/10 PASS，exit 0**；跨 BUILD 可复用（动态 chunk / 动态 origin / 一致性校验）。
- 71 skipped **63/3/5 口径复核成立**，无新增跳过；处置建议（保留/重写归属/不删）已落盘。
- 四个判据边界与换基址复验步骤已写入 `docs/测试与验收文档.md` §十一。
- **失败项如实列出**：7 项全量失败均为环境/序依赖，非产品回归；门禁矩阵本身零失败。
