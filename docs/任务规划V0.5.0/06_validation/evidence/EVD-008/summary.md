> 版本: v1.1 | 更新: 2026-10-15 | 变更: 子智能体审查闭环——W-1 纠正 §2 因果措辞、W-2 补 §4 新旧裁决覆盖、W-3 追加 p2-decision.md 裁决原文归档、S-1 强化 §5 e2e 漂移移交（v1.0 初版：TASK-008 条件卡按 P-2 方案B 落地）

# EVD-008 · TASK-008 完成度分析（OIDC wechat-rag 回调白名单按端口裁决对齐）

## 0. 卡片性质：条件卡（P-2 裁决门）
TASK-008.md 标注「条件卡：待 P-2（AideanBot 3333 回调是否保留）裁决后下发」，阻塞条件「P-2 未裁决 → 不执行」。目标给出两方案：
- **方案A**（AideanBot 仍在用）：wechat-rag redirectUris 追加 `http://localhost:3333/auth/aidean/callback`（保留 3200）。
- **方案B**（AideanBot 已由 BotHot 取代）：不改代码，保持现状 `[wechat-rag.aidean.local, localhost:3200]`；sso-3333 e2e 去留另行立卡（Agent-Guard 所有，本卡不改 e2e）。

## 1. P-2 裁决记录（用户原文，2026-10-15）
就 P-2「AideanBot 的 3333 端口 OIDC 回调是否仍需保留在 seed.ts wechat-rag 白名单」征询项目所有者，**裁决 = 方案B：保持现状（AideanBot 已由 BotHot 取代）**。据此本卡**不修改 seed.ts**，仅登记裁决与取证。

## 2. 取证前的独立核验（避免臆测）
- 现网 `apps/web/prisma/seed.ts:354` wechat-rag redirectUris = `['https://wechat-rag.aidean.local/auth/aidean/callback','http://localhost:3200/auth/aidean/callback']`（= 方案B 现状，无 3333）。
- 守卫真源 `scripts/guard/port-ranges.json`（2026-10-14）仅登记 aidean[3000,3100] / aideanFleet[3100,3200] / aideanBotHot[3200,3300]，**未登记 aideanBot[3300,3400]**；其 `$comment` 明示「子平台区间以 P-1/P-2 裁决为准」。
- `port-consistency.mjs:120-121`：seed 回调端口若匹配不到任何登记区间 → **FAIL**。故方案A 落 3333 会触发守卫红灯，需伴随改 `port-ranges.json`（越出本卡允许范围）；此为佐证 P-2 在 V0.5.0 守卫生态中**未按方案A 收口**。
- `docs/任务规划V0.5.0/_generator/tasks_data.py` TASK-007 v2 注记：V0.5.0 **撤销** 旧「seed 必须含 3333 且不得含 3200」前提（3200=BotHot 前端宿主）。
- 反向证据辨析：`docs/plans/未完成事项目录.md §7.20`（2026-09-29）与 `docs/product/modules/子平台规范说明.md §5.0` 仅登记 aideanbot **宿主端口区间** 3300-3400（目标态）并述及「BotHot 由 aideanbot 拓展、不影响 aideanbot」，**从未就 wechat-rag 回调白名单是否保留 3333 作裁决**。`port-ranges.json` 未登记 aideanBot 区间是「P-2 待裁决」状态的守卫产物（其 `$comment` 明示「子平台区间以 P-1/P-2 裁决为准」），**并非对 §7.20 的撤销**——故 P-2 须在守卫生态外单独征询（本卡已征询）。
- 结论：文档无「现行、明确」的 P-2=方案A 裁决；属所有者产品决策 → 已按铁律「信息不足即征询、不臆测」提问并获方案B。

## 3. 验收标准（DoD）映射（方案B 分支）
| DoD | 结论 | 证据 |
| --- | --- | --- |
| 方案B：git diff 为空且证据含裁决记录 | 已确认 | `git-diff-empty.txt`（seed.ts diff = empty）；本 summary §1 裁决原文 |
| TASK-007 端口守卫对 seed 回调无 ERROR | 已确认 | `port-consistency.txt` EXITCODE=0（3200∈aideanFleet、3000∈aidean 全 PASS） |
| diff 仅落在允许修改范围内 | 已确认 | 无任何 tracked 代码变更；仅新增 `EVD-008/**`（∈允许） |
| （方案A 专属：check-oidc has3333） | 不适用 | 裁决为方案B，不补 3333 |

## 4. 双向钢人论证
- 支持方案B：与 seed 现状、port-ranges 未登记 aideanBot、V0.5.0 撤销 3333 前提三点一致；改 seed 反而会破坏守卫并需越界改 port-ranges.json。
- 反方①「§7.20 / §5.0 给了 aideanbot 3300-3400 且『BotHot 不影响 aideanbot』→ 应方案A」→ 排除：(i) 宿主端口区间授权 ≠ 3333 OIDC 回调白名单保留裁决，系不同子问题；(ii) 该表态为 2026-09-29 旧口径，已被 **2026-10-15 用户 P-2 裁决=方案B** 直接改写（现行有效决策优先，见 `p2-decision.md`）；(iii) 现行守卫产物（port-ranges.json）亦未据此登记 aideanBot。
- 反方②「sso-3333 e2e 仍在跑 = AideanBot 仍在用」→ 排除：TASK-008 目标显式规定「sso-3333 e2e 去留另行立卡（Agent-Guard 所有）」，e2e 存续不构成 seed 补录依据。
- 残余：若未来 P-2 复议为方案A，需同时（a）seed.ts 加 3333 回调（b）port-ranges.json 登记 aideanBot[3300,3400]（confirmed）——二者须同刀，否则守卫红灯。已在 §5 记为后续触发条件。

## 5. 前提、局限与后续
- 前提：本裁决以「AideanBot 已由 BotHot 取代」为业务事实；若该前提变化，按 §4 残余的 (a)(b) 同刀处置。
- 后续立卡（非本卡，移交 Agent-Guard）：`e2e/web/sso-3333.spec.ts` 与方案B 现状存在**文档前置漂移**——该 spec 头注仍写 `redirect_uris=[wechat-rag.aidean.local, localhost:3333]`、test [a] 直连 `localhost:3333` authorize，而现行 seed 为 3200。**CI e2e-skeleton job 只跑 walking-skeleton + smoke，不含 sso-3333，故方案B 不会使 CI 变红**；漂移非本卡引入（seed 现状本就无 3333），且 TASK-008/TASK-037 明文本卡禁改 e2e。Guard 卡候选处置：同步 spec 头注 DB 前置（手动/容器卷注入 3333 记录）或 `test.skip`+注释，或整体 retire。（本卡仅登记移交，未触 e2e，符合范围。）
- 局限：本卡为数据/裁决对齐，无 DB 实改（方案B 保持现状）；未连库执行 db:seed（方案B 无需）。

## 6. 证据清单
`p2-decision.md`（P-2 裁决用户回复原文 + 裁决要旨） · `grep-callbacks.txt`（seed.ts 三处 auth/aidean/callback，wechat-rag 含 3200 不含 3333） · `port-consistency.txt`（EXITCODE=0 全 PASS） · `git-diff-empty.txt`（seed.ts diff=empty） · 本 `summary.md`（核验链 + 双向钢人 + 移交）。

## 6.1 子智能体审查（rev1）闭环
- 判定：**PASS（可归档）**；无 Blocker/Major。DoD 三条经审方独立复跑（git diff 空 / port-consistency exit 0 / tracked 无变更 / 未跟踪仅规划树）与 EVD 一致。
- 采纳修复：W-1（§2 纠正「未登记=覆盖 §7.20」因果倒置）、W-2（§4 反方① 补「2026-10-15 裁决覆盖 2026-09-29 旧口径」）、W-3（追加 `p2-decision.md` 裁决原文归档）、S-1（§5 强化 sso-3333 文档前置漂移的移交登记）。
- 移交他卡（本卡范围外，正确不执行）：S-1 sso-3333 e2e → Agent-Guard 另卡；S-2 同步 aideanbot 下线口径回真源（子平台规范说明 §5.0 / §7.20）→ 另立文档卡，本卡不越界改真源。

## 7. 结论
TASK-008（条件卡）**已确认完成（方案B）**：P-2 经所有者裁决为「保持现状」，seed.ts 零改动、`git diff` 为空、端口守卫对现 seed 回调全绿、diff 仅落在允许范围；裁决原文与独立核验链已归档。可进入下一步（本卡无代码提交，仅 docs/EVD-008 随规划入库）。
