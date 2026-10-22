# EVD-B11-06 偏离与裁决记录

> 版本: v0.1 | 更新: 2026-10-22 | 变更: 首版——B11-06 会话探针收敛（DEF-011-08，Q-11-02=B）的设计取舍、相对任务卡的偏离、已知残余与未取证面

读数权威载体：同目录 `verify.txt`（门禁与运行态真实输出 + 退出码）、`netfail.txt`（前后对比原始 JSON）。本文件只讲“为什么这样做、哪里与卡不一致、还有什么没证明”，不复制读数。

## 一、裁决前提

- 用户 2026-10-22 裁决 **Q-11-02 = B**：不改 `/api/v1/auth/me` 契约（匿名仍 401），在客户端收敛。`verify.txt` §8 的 curl 读数证明契约未变（`HTTP=401`、`code=10004`）。
- 12_ 的风险条：“B 无法把 auth/me 的 401 降到 0，除非探针本身被省略”。本卡选择**省略**——但省略需要一个“不登录就不必探”的依据，而令牌 Cookie 是 HttpOnly、站点页受 ISR 约束不能在 RSC 读 `cookies()`。

## 二、设计取舍（苏格拉底式追问留档）

| 追问 | 结论 |
|---|---|
| 只做模块级缓存/单飞够不够？ | 不够。缓存只能把“每组件一次”降到“每次整页加载一次”；游客每次整页加载仍有 1 条 `auth/me` 401（ISR 页无服务端会话信息）。卡的验收是 401 = 0，所以必须有“无会话则不探”的信号。 |
| 信号从哪来？ | middleware 能读 HttpOnly Cookie 且已覆盖全部站点页与 API（TASK-102 的 matcher）。由它把“access/refresh 令牌 Cookie 是否存在”镜像为非 HttpOnly 的 `aidean_session_hint=1`。客户端无提示 ⇒ 零请求定案匿名。 |
| 提示 Cookie 会成为安全面吗？ | 不会。它只表达存在性、不含令牌；伪造它只会让客户端多发一次 `auth/me` 并得到 401。鉴权判定仍只在服务端验签。 |
| 会不会污染 ISR/CDN 缓存？ | 状态一致时**不写 Set-Cookie**（`verify.txt` §8 游客 `GET /` 无 set-cookie、`x-nextjs-cache: HIT`）。只有“刚登录后首个请求”或“令牌已清而提示残留”两种过渡态才写一次。 |
| 老会话（上线前已登录、尚无提示）会被误判匿名吗？ | 不会。首个整页请求经过 middleware 即在**同一个文档响应**上写入提示，脚本执行时已可读。 |
| access 15min 过期而 refresh 有效时？ | 原实现直接显示“登录”（未续期）。现在有提示时 401 → 先 `refreshSession()`（复用既有同 tab 单飞 + 跨 tab 5s 锁）→ 成功再探一次。这是**功能改进**，不是回归。 |
| SWR 的 `revalidateOnFocus` 去掉会丢功能吗？ | 换成按需复核：只在“提示与已知态矛盾”或“已登录态超过 5min”时探测；游客聚焦零请求。别的标签页登录/登出由 BroadcastChannel（storage 事件兜底）即时同步，运行态已证（`verify.txt` §7：B 标签不刷新即切为“登录”，且 0 次 auth/me）。 |
| 飞行中登出会不会被旧的 200 结果回写成“已登录”？ | 代际计数丢弃过期结果（单测 ⑧）。收藏层同样有代际，会话切换时旧身份的收藏映射不回写。 |
| 为什么 store 不放 `stores/`？ | 核心是框架无关的 `lib/features/auth/session-store.ts`（vitest `include` 只覆盖 `lib/**`，放这里才能被全量门禁测到）；React 绑定是薄薄的 `hooks/useSession.ts`。没有用 zustand：`useSyncExternalStore` 已足够，且省去一个依赖面。 |

## 三、相对任务卡 / 派单的偏离

1. **改了 `apps/web/middleware.ts`**。卡的【范围】列了候选文件，没列 middleware。理由见 §二：没有存在性信号就不能把游客 401 降到 0。改动只是“附加/清除一枚提示 Cookie”，**放行/拦截判定不变**——既有 `middleware.spec.ts` 10 例全绿，新 `middleware-session-hint.spec.ts` 第 5 例明确断言守卫页仍 307。未改任何 API route 文件，也没改管理端表单组件。
2. **`HeaderSession` 去掉了 SWR**（`swr` 依赖仍被 `ReportsBoard`/`UsageStatsPanel` 使用，`package.json` 未动）。
3. **管理端 `AdminLoginForm` / `AdminLogoutButton` 未接入 store**（派单要求避开管理端表单组件）。影响：管理端登出不会**即时**广播给其他站点标签页；那些标签页会在下一次聚焦时依提示 Cookie 自愈（提示已被 middleware 在后续请求上清掉），或在下一次整页加载时自愈。管理端登录后整页跳转，middleware 写提示，不受影响。
4. **卡的验证命令 `node .scratch/inter011b.mjs` 本工作树不存在**（`.scratch/` 未入库）。改用同目录 `netfail-probe.mjs`，对同一四页（`/`、`/models`、`/pricing`、`/ladder`）、在**同一环境下分别构建修前（7f1fa22）与修后**取前后对比，口径是 Playwright 的 `response.status ≥ 400` + `requestfailed`。
5. **`pnpm test:e2e` 全量未跑**：只定向复跑了与本卡直接相关的 `e2e/web/favorites.spec.ts`（3/3）和 `e2e/tests/auth-guard.spec.ts`（3/3），对 :3061 运行。全量 e2e 依赖固定 :3000 端口和 globalSetup，本沙箱有其他工作树在跑服务，不宜占用。⇒ **全量 e2e 标 `待确认`**。
6. **全量 vitest 分 4 片跑**（单条命令超过沙箱 120s 上限）。四片合计是全集（vitest `--shard` 语义），读数见 `verify.txt` §3。
7. 共享规划文档（07_/25_/README/02_/12_）**未改**；DEF-011-08 关闭登记、RTM 回写由收口卡（B11-RTM）按本证据完成。

## 四、已知残余（不得写成“全部场景 0 条 401”）

- **持有失效/已撤销令牌 Cookie 的浏览器（不是游客）**：提示存在 ⇒ 每次整页加载有 1 次 `auth/me` 401，401 后续期也失败时再加 1 次 `auth/refresh` 401（跨 tab 5s 锁会让部分页面跳过续期），一直持续到令牌 Cookie 过期或被服务端清掉。正控读数见 `verify.txt` §6 / `netfail.txt` `stale-cookie(positive-control)`：4 页 → `authMe=4, refresh=2, net401=6`（修前同场景也是 6 条，但构成是 `auth/me` + `favorites`）。在 Q-11-02=B 下这是不可省的权威探测：客户端无法删除 HttpOnly Cookie；若在“确认匿名”时自动调 `/auth/logout` 清 Cookie，会在跨 tab 续期锁竞争时误登出有效会话，所以**不做**。
- 这一残余**不在**卡的验收口径内（验收对象是游客）；若要连这种情况也清零，只能按 Q-11-02 选项 A 新增 200 语义的会话端点。
- 运行态各场景里出现的 `net::ERR_ABORTED … [rsc] [prefetch]` 是 Next `<Link>` 的视口预取在页面跳转或测量结束时被中止，修前修后都有，**不是 401，也不是本卡引入的**（未取证它们是否计入原审计的 `netFailures`；原审计脚本不在本树）。
- `next start` 的响应头里出现 `x-middleware-set-cookie`（Next 15.0 内部头，在 middleware 写 Cookie 时附带）。只出现在两种过渡态上，未评估它对 CDN 的影响。

## 五、未取证面

| 面 | 状态 |
|---|---|
| `pnpm test:e2e` 全量 | `待确认`（见 §三-5） |
| 有 Redis 的口径（`/system/ready` 双 ok） | 未跑：本沙箱无 Redis；探针页面在缺 Redis 时降级，但 401 计数与 Redis 无关（401 来自 `auth/me`/`favorites` 鉴权）。 |
| 生产容器 / Caddy / CDN 对提示 Cookie 的透传 | 未取证 |
| `next dev` 口径 | 未跑，只跑了 `next build` + `next start` |
| access 过期后由续期自动恢复登录态（401→refresh 200→me 200） | 只有单测（④a），**运行态未构造**（需等 15min 或改 TTL 配置） |
| BroadcastChannel 不可用时的 storage 兜底 | 只有单测（⑦b/⑦c），运行态 Chromium 走的是 BroadcastChannel |
| 管理端登出 → 站点其他标签页同步 | 未跑（见 §三-3 的自愈路径，属推理） |
| Safari / Firefox | 未跑 |

## 六、合并注意

- `scripts/check-docs-facts.mjs` 的 `spec-count` 在本工作树是 195→198（本卡 +3）。如果并行工作树也新增了 spec，合并时要按合并后的实际数重算（R10-01），不能直接取某一侧的值。
- `docs/governance/目录结构文档.md` 版本头 v3.23→v3.24。若另一工作树也改了版本头，合并时版本号要顺延。
