# EVD-077 — TASK-077 OIDC 安全红线回归测试

> 卡：TASK-077（S0，REQ-F-056 / FIX-06 / 子平台SSO接入指南 §6-§7；Depends on TASK-001）
> 执行者：Hark(主Agent) ｜ 所有权：Agent-API
> 时间：2026-10-14（本地）

## 交付物（均在「允许修改」范围内）

| 文件 | 动作 | 内容 |
|---|---|---|
| `apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts` | 新建 | 三条红线失败路径 + 机制层用例（共 12 用例）：R1 PKCE 仅 S256（含 verifyPkce 机制单测、pkceRequired 强制）、R2 refresh 重放整链撤销（含 refresh_replay 告警断言）、R3 host-only Cookie |

## 三条红线 → 真实代码证据锚定（红不成立即安全缺陷，须停机）

| 红线 | 实现位置 | 判据 |
|---|---|---|
| R1 PKCE plain 拒 | `app/oauth/authorize/route.ts:72-74` `challengeMethod!=="S256"`→ redirect `error=invalid_request`；`lib/features/oauth/codes.ts:77-82` `verifyPkce` 仅 `BASE64URL(SHA256(verifier))===challenge` | plain/缺 method 均被拒，S256 放行 |
| R2 refresh 重放整链失效 | `app/oauth/token/route.ts:88-91` `consumeRefreshToken` 非 ok（含 replayed）→ `400 invalid_grant`；`repository.ts:160-175` 旧轮换代复用 → `revokeRefreshChain(chainId)` + 结构化告警 | gen0 重放 invalid_grant；合法代 gen1 同链被撤销 |
| R3 host-only Cookie | `constants.ts:146-153` `baseCookieOptions()` 返回 `{httpOnly,sameSite:"lax",secure,path:"/"}` **无 domain**；login/refresh/register 路由一致引用 | Set-Cookie 无 `Domain=`，含 HttpOnly + SameSite=lax |

指南 §6 L215/L218、§7 L229 明确对应语义，红线**全部成立**（非缺陷，无需上报 opus）。

## 测试策略（复用同域既有风格，避免臆造）

- **R1** 仿 `oauth-redirect-origin.spec.ts`：vi.mock session/clients/codes，真调 `authorize` GET，断回跳 query 携 `error=invalid_request` 且无 `code`。
- **R2** 仿 `refresh-replay-alert.spec.ts`：**真 tokens（keys.ts 离线 RS256）+ 真 repository + 内存 prisma**，真调 `/oauth/token` POST 三次——忠实复现"签发→消费轮换→旧值重放→整链撤销"，不 mock 令牌格式。stderr 实测出现 `{"tag":"auth-security","event":"refresh_replay",...}` 告警，佐证真重放检测命中。
- **R3** 仿 `routes-auth.spec.ts`：doMock service/rate-limit，真调 `login` POST，断 `res.headers.getSetCookie()` 序列化后的 Cookie 串。

## 验收逐条（证据文件）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 目标 spec 运行 | **12 passed** | `vitest-target.txt` |
| auth 全目录回归（防 mock 污染） | **46 files / 373 tests passed**（含既有 refresh-replay-alert 2） | `vitest-authdir.txt` |
| `pnpm --filter web exec tsc --noEmit` | **exit 0** | `web-tsc.txt` |
| diff 仅在允许范围 | 仅新增 `oidc-redlines.spec.ts`；auth 源码零改动 | `scope.txt` |

## 苏格拉底式拷问 / 反证

- 「R2 用内存 prisma 是否等价真实轮换？」→ repository 逻辑真跑（findUnique/update/updateMany 语义在内存表中忠实实现 rotatedAt/revokedAt 流转），且合法代 gen1 被撤销即证明 `revokeRefreshChain` 覆盖全链，非仅单行。
- 「R1 断言 error 走 redirect 而非 400，是否与任务书『400 invalid_request』冲突？」→ authorize 为浏览器交互流（RFC 6749 §4.1.2.1），错误经 redirect_uri 回传；「400」出现在 client/redirect_uri 非法的**非重定向**分支（防开放重定向）。任务书 step2『400』系简写，红线实质是「plain 被拒 + error=invalid_request」，已满足并附 S256 对照证伪「源于方法而非缺 challenge」。
- 「login 路由 doMock 是否遮蔽真实 Cookie 逻辑？」→ 仅打桩 service（返回 profile）与限流（放行），Cookie 种下走真实 `res.cookies.set(...,baseCookieOptions())` + Next 真实序列化，`Domain` 缺席由选项对象驱动，测得的是序列化后的真实响应头。

## R-1 子智能体审查（CodeReview）与修复闭环

- **初审结论**：PASS（0 Blocker / 2 Major / 3 Minor，无假绿）——三红线失败路径均真实命中生产码位，但相对源码存在覆盖缺口。
- **逐条采纳并落地（仅动测试文件，不越界改源码）**：
  - Major-1：codes mock 由「全桩」改为 `vi.mock(..., importOriginal)`，保留真 `verifyPkce`/`s256Challenge`；新增机制单测——`verifyPkce(v, s256(v))===true`、plain 兜底 `verifyPkce(v,v)===false`、长度门 `<43`/`>128` 均拒（锚 `codes.ts:77-82`）。
  - Major-2：新增 authorize `pkceRequired=true` 且缺 `code_challenge` → `invalid_request` + `error_description≈required`（锚 `authorize/route.ts:68-71`，并证检查先于登录态）。
  - Minor-1：R1 case3 补 `state==="st-1"` 与 `code===null` 断言。
  - Minor-2：R2 主用例加 `console.error` spy，断言末次重放触发 `{tag:"auth-security",event:"refresh_replay",chainId:gen0.jti}`（锚 `repository.ts:160-175`），`finally` 还原。
  - Minor-3：R1 回跳状态码由 `[302,307,308]` 收紧为 `toBe(307)`（`NextResponse.redirect` 默认值，实测通过）。
- **修复后验证**：目标 spec **12 passed**；web `tsc --noEmit` **exit 0**；auth 全目录 **46 files / 373 passed**（无 mock 污染）。
- **完成度判定**：三红线 + 机制层覆盖闭合，审查缺口清零 → **通过，可进入下一步**。

## R-2 复审（CodeReview 二次确认）

- **结论**：**PASS（0 Blocker / 0 Major / 4 Minor）**，逐条排除假绿：307 断言经兄弟 spec 与官方 `RedirectStatusCode.TemporaryRedirect` 双证；`importOriginal` 若静默失败则 verifyPkce 4 条必红（实测绿，反证真实现）；R2 告警 spy 精确锚 `chainId=gen0.jti`（削弱整链撤销或删告警均会红）；R3 双层（机制无 domain 键 + 效果逐条 `!/Domain=/i`）。
- **采纳 3 条 Minor 并落地**（仅动测试文件）：
  - Minor-1：Case4 补 `expect(sessionMock.getSession).not.toHaveBeenCalled()`，让"检查先于登录态"标题与断言一致（锁 route L68-71 早于 L82）。
  - Minor-2：`beforeEach` 对 `getActiveClient` 先 `mockReset()` 再设默认，消除 `clearAllMocks` 不清 Once 队列的跨用例串味隐患。
  - Minor-3：告警 JSON 解析前加 `startsWith('{"tag":"auth-security"')` 守卫，防文案误命中导致 `JSON.parse` 抛错。
- **未采纳**：Minor-4（`JWT_SECRET` 在 RS256 下不生效但无害，与同域既有 spec 保持一致，保留）。
- **复验**：目标 spec 仍 **12 passed**；`tsc --noEmit` **exit 0**；auth 全目录 **46 files / 373 passed**。
- **终判**：审查缺口清零、假绿风险排除 → **通过，提交本卡**。
