> 版本: v0.7.0 | 更新: 2026-09-23 | 变更: huaweicloud 分支交付优化

# pricing 读侧落点 & security 限流改造 —— 立项讨论稿

> 版本：v0.1（草拟，待 M 立项/拍板，B 未落码）| 日期：2026-09-10 | 作者：员工B
> 依据：实地穿透 `app/(site)/pricing/page.tsx`、`lib/features/gateway/service.ts`、`lib/features/auth/{constants,tokens}.ts`、`prisma/seed.ts:224-231`

## 一、pricing 读侧落点草拟（范围：app/(site)/pricing + lib/billing 读侧）

### 1.1 现状事实（穿透结论）
| 位置 | 现状 | 与 pricing.* 契约关系 |
|---|---|---|
| `#gateway-pricing` 区块 | **占位骨架**（SKELETON_ROWS 硬编码 "——————"），文案"实际扣费由单价、加价率与 Token 倍率共同决定" | 无消费点 |
| `#recharge-tiers` 区块 | `RECHARGE_TIERS = ["¥10","¥55","¥115","¥600","¥2500"]` 硬编码，货币符号硬编码 ¥ | 无消费点 |
| `#product-tiers` 区块 | 产品权益价格（骨架同源） | 无消费点 |
| `lib/features/gateway/service.ts:346/569/840` | 计费加价 = `Number(rule?.markupRate ?? 1)`，兜底 **1（无加价）硬编码**，rule 来自渠道规则表非 systemConfig | 与白名单 8 键无关 |
| seed | **无 `billing.markup` 键**（此前"更名"议题的前提经查不成立：该键从未存在于 seed） | — |

### 1.2 契约消费方案（最小可执行，三选一或组合）
- **方案 A（零扩键，推荐）**：`#gateway-pricing` 骨架填充时引入 `parsePricingConfig` + `formatEvalPrice`（`@aidean/shared` B-N9 已交付）：
  - 货币符号取 `CURRENCY_SYMBOLS[pricing.currency]`，替换全页硬编码 ¥（recharge-tiers 同步受益）；
  - "评估服务单价"行展示 `formatEvalPrice(evalPerModel, currency)`；
  - 改动面：`pricing/page.tsx` 单文件 + Server Component 直读 systemConfig（复用 GET 投影逻辑），不动 API。
- **方案 B（扩键 1）**：`pricing.rechargeTiers`（STRING，CSV 如 `10,55,115,600,2500`）配置化充值档位 → 三处同步（shared ADMIN_CONFIG_KEYS/REGISTRY + seed）+ 白名单守卫更新，成本高于 A，价值在于运营可改档位。
- **方案 C（扩键 2）**：`pricing.global_markup_fallback`（NUMBER [1,3] 步长 0.01）接 `service.ts` 兜底 `?? 1` → **即此前"billing.markup 更名"议题的实质**：新增全局兜底键而非更名。优先级低：现网 rule 全量覆盖 markupRate，兜底路径未触发。

### 1.3 待 M 拍板点
1. 采 A / B / C 哪个组合；
2. `evalPerModel` 的产品语义（"每次模型评估服务单价"还是"网关调用单价"）决定其展示位置；
3. 充值档位是否需要运营侧动态可改。

## 二、security.* 限流改造方案（不落码，auth 域）

### 2.1 现状三口径冲突表
| 口径 | 值 | 位置 | 冲突 |
|---|---|---|---|
| `security.maxLoginAttempts`（seed，DB 可改） | 5 | systemConfig | 与硬编码一致，**可直接接线** |
| `LOGIN_MAX_FAILED_ATTEMPTS` | 5 | `lib/features/auth/constants.ts:27` | 同口径，接线后 DB 改值即生效 |
| `LOGIN_IP_RATE_LIMIT` / WINDOW | 20 / 600s | constants.ts:31-33 | seed **无对应键**，需扩键或维持硬编码 |
| `security.sessionTimeout`（seed） | 720 分钟=12h | systemConfig:231 | 与 access 15m（tokens.ts JWT 900s）、refresh 7d（cookie Max-Age=604800）**语义均不符** |
| access JWT / refresh cookie | 900s / 604800s | tokens.ts:52 / 登录下发 | 硬编码 |

### 2.2 改造方案（分两步，均待拍板）
- **第一步（同口径接线，低风险）**：登录失败锁阈值改读 `systemConfig['security.maxLoginAttempts']`（缓存 60s 或登录时直读），constants.ts 的 5 降级为**代码兜底默认值**。范围：auth 域 2-3 文件，不动 API 契约。
- **第二步（语义定义后接线，需 M 拍板）**：`sessionTimeout=720` 三种可能语义——
  - ① 「access 有效期」→ 需把 720 分钟改 15（与现值冲突，须 M 改 seed 值）；
  - ② 「登录态最长保持（refresh 续期上限）」→ 需把 refresh 从 7d 改 12h（用户感知变化大）；
  - ③ 「闲置会话超时」→ 需新增滑动续期逻辑（工作量大）。
  **B 建议语义①的变体**：拆键为 `security.accessTokenTtlMinutes=15` + `security.refreshTokenTtlDays=7`，废弃 720 旧键（seed deleteMany 幂等重建可平滑过渡）。
- **IP 限流**：如需配置化，扩键 `security.ipRateLimit`（NUMBER [1,100]）+ `security.ipRateWindowSeconds`（NUMBER [60,3600]）；**B 建议暂不扩**——限流参数属安全敏感项，运行时可改反而放大误配置风险，维持硬编码+代码评审变更即可。

### 2.3 待 M 拍板点
1. maxLoginAttempts 是否接线（B 建议接）；
2. sessionTimeout 语义选 ①/②/③ 或拆键方案；
3. IP 限流是否维持硬编码（B 建议维持）。

## 三、执行约束重申
- 立项前 B 不改任何码；立项后范围仅 `app/(site)/pricing`、`lib/billing`、auth 域对应文件 + shared 扩键（如批）；
- 禁改 `app/api/**`（configs 端点已闭环 11/11）、e2e、docker、checklist；
- 所有扩键须三处同步 + parity 守卫 + seed 幂等验证。
