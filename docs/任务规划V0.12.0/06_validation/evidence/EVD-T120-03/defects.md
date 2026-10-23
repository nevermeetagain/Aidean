T120-03 真缺陷清单（抄送 Hark；本卡只登记不修，修复点全部落在卡面「禁止修改/未列出」路径）

取证环境：本机 dev（`next dev --turbo` @3000，env 含 AIDEAN_ENABLE_MOCK_UPSTREAM=1 / AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1）、
共享开发库 5435/aidean、Redis；Playwright 1.62.1，根 playwright.config.ts。原始读数见本目录 verify.txt 与
`.scratch/t120-03-probe-adm.txt`、`.scratch/t120-03-probe2.txt`（探针脚本 probe-adm-t12003.mjs / probe2-t12003.mjs）。

## D1 后台写 system_configs 后，前台 SSR 在下一 TTL 窗口内不反映新值（缓存失效丢失）
- 现象：PUT /api/v1/admin/configs（configGroup=home）返回 code=0、库内与后台回读均已更新，但 GET / 的 SSR HTML
  在 20s 内仍是旧值；同一 TTL 窗口内「第二次连续写入」必现（首轮 PUT 0s 收敛、次轮 PUT >20s 不收敛，
  再补一次同值 PUT 又 0s 收敛）。复现：F1/F2/F3 三行读数（F3 显示库内已是原值而页面仍含上一 marker）。
  e2e 侧同型复现：RUN-B 之前一轮全量里该用例失败快照呈现的 marker（`首页主标1792741403284`）创建于 15:43:23，
  而用例跑在 17:03:08 —— 陈旧态已存续 79.7 分钟（远超 site-home revalidate 600s / 页面 revalidate 300s 窗口）。
- 疑似链路（均在禁改路径，只给定位不给改法）：写侧 `apps/web/app/api/v1/admin/configs/route.ts:80-91`
  （home→revalidateTag("site-home")+revalidatePath("/")，general→site-branding+revalidatePath("/")）；
  读侧 `apps/web/lib/features/home/config.ts:56-59`（unstable_cache tag site-home revalidate 600）、
  `apps/web/lib/site-config.ts:62-65`（site-branding revalidate 600）、`apps/web/app/(site)/page.tsx:21`（revalidate 300）。
  两条已排除的假设：①不存在第二层模块级 memo（flags/home 服务各自只有一层 unstable_cache）；
  ②不是 Playwright 产物——纯 HTTP 探针（1s 轮询）同样不收敛。剩主要嫌疑：写请求内自身读到该 tag
  （RBAC/session 链路）导致当次 revalidateTag 被丢弃，或失效后同请求内在途读把陈旧值重新写回缓存。
- 影响：文档契约「保存即时可见」（`apps/web/components/admin/HomeContentEditor.tsx:8` 注释、S4 需求）在 dev 下不成立；
  生产 ISR/tag 语义不同但同一失效模式风险未排除。
- 本卡处置：cms-content.spec.ts 断言点 2 改为「10s 窗口实测不收敛才 test.fixme」，窗口与契约不放宽，D1 修复后自动恢复全断言。
- 触发条件再收敛（两次独立读数）：单跑该用例（缓存周期新鲜）4.3s 内收敛并通过；全量 RUN-B 中则不收敛并 fixme 生效——
  差别就是「同窗口内前一次写入」（RUN-B 里紧邻的前一条用例刚做过两次 PUT）。故 D1 是**连续写入下必现**，不是随机抖动。

## D2 功能开关复原方向的 PUBLIC 快照不收敛（与 D1 同型的失效丢失）
- 现象：PATCH /api/v1/admin/feature-flags/[id] 回显与库内均已变更，但 GET /api/v1/system/features 的
  `ladder.station` 在 20s 内不反映；紧随其后补一次同值 PATCH → 0s 收敛。读数 E1/E2/E2b（关闭方向 0s 收敛、
  复原方向 >20s 不收敛、再 PATCH 立刻收敛）。e2e 侧 feature-flags.spec.ts 两处「复原自检 waitFlag(original)」超时同源。
- 疑似链路：写侧 `apps/web/app/api/v1/admin/feature-flags/[id]/route.ts:57`（先 revalidateTag 后 writeAudit）；
  读侧 `apps/web/lib/features/flags/service.ts:41-44`（unstable_cache tag feature-flags revalidate 60）。
- 附加风险（比 D1 更值得优先）：陈旧快照会让「关闭态」断言以错误理由通过（缓存里恰好是上一状态），
  即用例可能假绿；D1/D2 修好后建议补一条「写后读」端到端不变量测试。
- 本卡处置：两处复原自检改为 `waitFlagProbe`（同 10s 窗口、不抛错）→ 不收敛时 test.fixme 登记 D2。
- 用例外的现场留存（`.scratch/t120-03-d2-live.txt`）：RUN-B 结束后数分钟核对，库内 isEnabled=true 而 PUBLIC 仍 false
  （远超 tag `feature-flags` 的 revalidate 60s，说明不是「等 TTL 自然收敛」）；期间一次同值 PATCH → 0s 收敛。
  即失效通道本身可用，丢的是当次 revalidateTag。

## D3 控制台「调用测试台」在 375px 视口横向溢出 32px
- 现象：fe01-console-call.spec.ts 视口用例在 375×667 下 `scrollWidth-clientWidth = 32`；
  「请求格式」四段控件为不换行 inline-flex，英文标签固有宽 349px > 可用 343px。
- 定位：`apps/web/components/user/console/CallPlayground.tsx:574-594` + `:47-52`（FORMAT_OPTIONS）——禁改路径。
- 本卡处置：焦点可达断言前置、溢出断言后置，实测溢出>1px 时 test.fixme 登记（修好后自动恢复全断言）。

## 观察项（非缺陷，登记供裁决）
- O1 `apps/web/app/(site)/models/loading.tsx:7` 骨架自身带 `<main aria-busy="true">`，流式期间瞬时并存 2 个 `<main>`
  （实测 +0ms main=2 → +1000ms main=1）。功能无害，但任何 `page.locator("main")` 单元素断言都会撞 strict mode；
  本卡已在 smoke.spec.ts [2] 用例侧规避（先 toHaveCount(1) 再断可见）。a11y 角度「一页两个 main」可考虑骨架改用 `<div role="status">`，属设计侧裁量。
- O2 `e2e/perf/perf-probe.mjs:101` 仍引用已下线的「自定义渠道」文案与 `console-panel-channels` testid（该文件非
  *.spec.ts，不进 e2e 运行，故本卡不动；后续性能卡需同步 ConsoleWorkspace 板块 id `apiChannels`）。
- O3 `e2e/**` 无 tsconfig，也不在任何门禁脚本内（`pnpm -C apps/web typecheck` 不覆盖）。本卡用临时 strict 配置
  （`.scratch/tsconfig.e2e.t12003.json`）试跑，本次改动文件 0 错误，另暴露 3 处既有类型错误：
  `e2e/tests/console-flow-gradient.spec.ts:44`（Fixtures 无 reducedMotion）、`e2e/tests/gateway-flow.spec.ts:106,108`
  （隐式 any）。均在允许路径但属通过用例，改动有回归风险且超出本卡目标，故只登记（建议由 e2e 治理卡统一收口）。
