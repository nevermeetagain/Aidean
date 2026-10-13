# Checklist · 管理端信息架构收尾与运营盲区补齐

> change-id: `finalize-admin-ia-and-ops-gaps` | 版本: v1.0 | 创建: 2026-10-13
> 本文件对应交付格式 §10 第 11、13–16 节 + §9 验收体系 + §12 自检。

---

## §11 基线指标（首次测量值）

> §9.1 纪律：无基线禁排「优化」任务。本轮为静态核查，性能类数字标「尚无基线，待实测」。

| 核心可感操作 | 指标 | 首次测量值 | 是否用户可感 |
|---|---|---|---|
| 打开 /admin 侧栏 | 建树渲染耗时 / 首屏 JS | 尚无基线（S1 后测） | 是 |
| 进入深层叶（直访 URL） | 自动展开到第 3 级所需渲染次数 | 尚无基线 | 是 |
| 查看用户 credentials | 查询次数（应 1 聚合内 3 表）/ 响应不含明文 | 尚无基线（S4 后测） | 是 |
| 在途冻结款列表 | 是否走索引 / 分页查询数 | 尚无基线（S5 后测 + EXPLAIN） | 是 |
| admin 门禁 | tsc/vitest/docs-facts/e2e 通过数 | tsc 0 / vitest 全 / facts 14/14 / e2e 52（S0 复核） | 否（工程守卫） |

**没有基线数字的项，禁止进入任何"优化"任务**；本轮只补功能/一致性，不排优化刀。

---

## §9.2 / §9.3 完成定义（Done）与防自证循环

```
Done =
  所有权内 diff 符合任务卡（【允许修改】未越界）
∧ 【验收】逐条有结果（优先命令证据）
∧ 【验证命令】可复现且通过
∧ evidence 能让一周后的人复现（归档 docs/specs/<change-id>/evidence/）
∧ 门禁通过：tsc 0 + vitest 全 + docs-facts 全绿 + admin e2e 不倒退（≥52）
∧ 未修改冻结契约（§4）与业务无关配置
∧ 无新增同类错误（如残留 window.* 原生弹窗）
```
- 防自证（§9.3）：验收标准由本规划（现在）定；执行由开发 CLI 做；判定由**独立验证者**只看 diff + 运行结果，仅输出 PASS/FAIL/UNKNOWN。
- 每切片全绿才可推送；**推送前单独向用户报备**（项目红线），且只用 SSH 别名 `git@github-aideanew`，绝不用/泄露 pasted-text 明文 PAT。

---

## 分切片验收清单（勾选式）

### S0 基线
- [ ] tsc 0 / vitest 全 / docs-facts 全绿 / admin e2e ≥52，数字登记入 evidence

### S1 三级引擎
- [ ] `buildAdminNav` 单测覆盖三级 + 两级兼容
- [ ] `filterNavByPerms` 逐级丢弃空壳（单测）
- [ ] 侧栏三级渲染 + 键盘可达 + 收起态可用
- [ ] localStorage 旧存档迁移不崩 + 深链自动展开两级祖先
- [ ] 现 admin 导航 e2e 不破

### S2 板块默认树
- [ ] 新库跑 seed → 开箱 7 板块 + 概览，31 入口零缺失
- [ ] 自定义库重跑 → 跳过不覆盖（用例证）
- [ ] 「应用推荐分组」按钮走二次确认 + revalidate 生效

### S3 兜底树
- [ ] DEFAULT_ADMIN_NAV == 31 入口，形状三级
- [ ] 注释 D-1/D-2「26」改实数

### S4 credentials
- [ ] GET 响应无明文密钥（单测断言）
- [ ] 跨用户 403；重复吊销 409；成功落审计
- [ ] 抽屉区渲染 + 无权限态隐藏

### S5 holds
- [ ] 索引迁移版本号唯一；查询走索引
- [ ] 分页契约 `{items,total,page,pageSize}`
- [ ] 释放复用既有 capture/reverse + 审计

### S6 OrdersManager
- [ ] grep `window.(prompt|confirm|alert)` 0 命中
- [ ] 三动作可用 + 落审计

### S2r 报表独立页
- [ ] `/admin/reports` 可访问渲染完整报表；概览保留精简 KPI 不倒退
- [ ] ReportsBoard variant 化（compact/full）向后兼容，reports.spec 不破

### S7 静态资讯迁库
- [x] seed-official-news 幂等写入 5 篇（category=官方公告）；重跑不重复 — tsx 实跑新建 5 条、重跑仅归集、SQL 查回 5 条 PUBLISHED
- [x] 前台资讯去静态合并后数据与迁库前一致；NewsManager 可编这 5 篇 — repository 纯 DB 真源 + site-pages.spec 两降级用例改写 + NewsManager category 筛选

### S8 跑马灯/关于正文 CMS
- [x] `partners.marquee`(JSON)/`about.body`(RICH_TEXT) 两键可读回；缺省有兜底 ✅ shared `site-sections.schema.ts` 定契约+DEFAULT+parse；registry 两项 `configGroup=home`（新 kind `marquee`/`richText`，校验后存原文）；seed.ts 逐字符同真源；parity 守卫 6/6；`site-sections.spec.ts` parse 空/超长回默认。注：沿用既有架构 `configType=STRING`+`valueRule.kind`（非字面 JSON/RICH_TEXT 型）。
- [x] 前台随配置变化；站点配置页两编辑器可改且保存 revalidate 生效 ✅ `HomeSectionsEditor.tsx`（`PartnerMarqueeEditor`/`AboutBodyEditor`）挂 `/admin/configs`；configs PUT 按 home 组自动 `revalidateTag('site-home')+revalidatePath('/')`，首页即时生效（无需改 route）；`loadHomeContent` 消费、故障回退不报错。

### S9 RSC 守卫 + 报表权限码
- [x] `admin.reports.read` 入库；SUPER_ADMIN 含、MODERATOR/SUPPORT 不含（RBAC 快照测） ✅ `permissions.ts` `ADMIN_DOMAINS` 新增 `reports` 域（`ALL_PERMISSION_CODES` 含 `admin.reports.read/write`）；`admin-permissions.spec.ts` 6 测锁 SUPER_ADMIN 通配/ADMIN 含/MODERATOR 排除 `admin.reports.*`。注：现 `SYSTEM_ROLES` 仅 SUPER_ADMIN/ADMIN/MODERATOR 三角色，**无内置 SUPPORT**（该断言映射到 MODERATOR + 未显式授予的自定义角色，二者均不含此码）；入 Permission 表需 `seed-rbac` 重跑（部署动作，非门禁项）。
- [x] reports 端点改 `requireAdminApi("admin.reports.read")`；无此码角色隐金额，越权不泄金额 ✅ `reports/overview/route.ts` 已改权限码级；`/admin` 概览 `canViewReports` 条件渲染 + `/admin/reports` 页级守卫，端点 403/服务端隐藏/侧栏剪枝三处同口径；web tsc 0。
- [x] `/admin/menus` `/admin/logs` 越权直访→重定向而非空态 ✅ 两页（及 `/admin/reports`）改 async RSC `hasPermission`→无读码 `redirect("/admin?denied=...")`；web tsc 0。
- [x] 数字口径锚统一（`check-docs-facts` 全绿） ✅ 四处锚 30 域60 原子统一 + spec D-5/N-2 以代码为准（98 文件/36 路由目录域/32 后台页=概览+31 叶）；门禁复跑确认 `check-docs-facts` 全绿。

---

## §13 落盘清单（本次规划实际写入的文件）

> 用户裁决方案 A：产物落本仓 `docs/specs/<change-id>/`（而非 §11 模板路径）。**未写任何业务代码/测试/配置。**

| 路径 | 用途 |
|---|---|
| `docs/specs/finalize-admin-ia-and-ops-gaps/spec.md` | §10 第 1-5、12 节：快照/事实基线/需求复核/六契约/数据模型/风险 |
| `docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md` | §10 第 6-11 节：原子任务卡全集 + DAG + 所有权矩阵 + 成本预算 |
| `docs/specs/finalize-admin-ia-and-ops-gaps/checklist.md` | 本文件：基线指标 + Done + 验收 + 落盘 + 自检 + 前提局限 + 第一刀 |

- 未创建 `docs/03_solution` 等模板目录（§11 路径在本仓不存在，且 §13.13 禁无谓建目录 + 铁律6 目录基线）——**已按方案 A 映射到仓内约定**。
- CLOSE 阶段待办（非本次写）：在 `docs/文档索引.md` 登记本 change-id；拆分超 3000 行的 `docs/plans/未完成事项目录.md`（R-7）。

---

## §14 自检结果（逐条对照指令 §12）

需求
- [x] 每条 MUST 可改写成一句可验证的话（§3.2 表 M1–M6 均带可验证改写）
- [x] 冲突全部列出，无静默替用户决定（§3.3 五条 + §3.4）
- [x] BLOCKING 已全部裁决（B1–B4 于 2026-10-13 用户批准，见 spec.md §3.4）；未裁决前曾给条件方案 A/B + 分叉点，未擅自假设
- [x] 未为凑数伪造需求/方案（弃用参考3 错误仓库；参考1 结论逐条代码复核）

契约
- [x] 六份契约齐全且为机器可校验形式（§4 指向 zod/TS 类型为唯一源）
- [x] 指定唯一源，无多源并存（TS 类型 + zod）
- [x] 前/后/数据三端可只凭契约开工（§4.4 自检；B1–B4 已裁决，原 BLOCKED 端点已全部展开 L4）
- [x] 错误码覆盖失败路径（§4②：401/403/404/409/422/429 + 新增 CREDENTIAL_NOT_REVOCABLE）
- [x] 管理端越权路径在 Identity③ 显式禁止（403 + 单测要求）

切片与任务
- [x] 按垂直切片（端到端可演示），非按技术层（S0–S9 每刀给可演示行为）
- [x] 每刀可独立演示/验收
- [x] 第一刀是步行骨架（S0 基线冻结）
- [x] 任务卡字段齐全：§6.2 十六字段→本仓字段显式映射（见 tasks.md 图例）；S2r/S7/S8/S9 裁决后已全展开至 L4
- [x] 每卡有可执行验证命令（PowerShell 兼容，分号串联）
- [x] 每卡有允许/禁止修改路径 + 并行性
- [x] 每任务可反向追溯到需求（标 M1–M6 / G2–G7 / §3.2）

依赖与并行
- [x] 依赖图无环（§8 环检测：无环）
- [x] 每条并行结论附机械规则依据（§8 四条件 + §9 重叠标注）
- [x] 关键路径已标（S0→S1→S2）
- [x] 所有权矩阵无未处理重叠（两处争用均降串行/独占，§9）

资源与风险
- [x] 每任务标建议档位 + 理由
- [x] 成本预算表已给出（§10）
- [x] 基线指标有首测值或明确「尚无基线」（§11，性能类均标待实测）
- [x] 风险/未决/已裁决分开列（§12 风险 R-1–R-8；§3.4 B1–B4 已裁决、B5/N-1/N-2 NON_BLOCKING）

纪律
- [x] 未修改任何业务代码（仅写 3 个规划 md）
- [x] 未输出无证据绝对结论（性能/未运行项均标待实测）
- [x] 未用「最佳实践/行业惯例」替代本仓证据（结论均带 file:line）
- [x] 所有未验证项已显式标注（§2.2「仅来自参考文档已复核」、§11「尚无基线」）

> §12 自检全部 [x]（任务卡十六字段采 §6.2→本仓六+三字段映射，方案 A 的必然结果；B1–B4 已裁决后各切片均展开至 L4）。

---

## §15 本次规划的前提与局限

前提：
1. 基线 `a1fc5c05`（S1-S8 已 push、双端一致、工作树干净）为真。
2. 用户裁决方案 A：规划产物落 `docs/specs/<change-id>/`。
3. 板块划分（7 大板块 + 概览独立）沿用用户原话与参考1 命名；具体叶归属在 S2 实施时可微调，不改 URL。

局限：
1. **全程静态核查，未运行系统**：性能/慢查询/渲染耗时均「待实测」，不作既成事实。
2. **B1–B4 已裁决**：S2r/S7/S8/S9 已全部展开至 L4，可下发实现；无遗留 BLOCKING。
3. §6.2 十六字段做了向仓内格式的合理裁剪映射（方案 A 取舍）。
4. pasted-text 内含真实明文 PAT：与本规划无技术依赖，未复现其值；建议用户**立即撤销并轮换**。
5. 端口红线（web 仅 3000）、绝不动 AideanThesis 3400、禁 force push、commit 精确分域不用 `-A`——实施阶段继续遵守。

---

## §16 建议的第一刀与启动顺序

1. **第一刀 = S0**（基线冻结留证）：纯安全动作，把门禁数字钉死，后续每刀可比对；无基线禁排优化任务（§9.1）。
2. 主路径 **S1 → S2**（三级引擎 → 7 板块默认树）；**S2r 与 S1 并行开跑**，因 S2 需 S2r 先交出 `/admin/reports` 叶。
3. S1 完成后 **S3 并行**（兜底树补全，同文件故紧随 S1）。
4. **旁路刀 S4 / S5 / S6 / S7 / S8 / S9.2 可与主路径并行下发**给独立 CLI（所有权不相交）；约束：S5 迁移（若需）版本独占；S7•S8 同属内容 Agent 需拆两个 Agent 或串行。
5. **S9.1（报表金额权限）必须串行于 S2r 后**（同 reports API/概览页文件域）；S9.2（RSC 守卫/数字锚）独立可先行。
6. 每片全绿 → 单独报备 → SSH 推送（仅用 git@github-aideanew SSH 别名，无 PAT）；全部完成后 CLOSE：登记文档索引、拆分超长台账（R-7）。

**启动已无外部阻塞**：B1–B4 均落定（B4 以现有虚构名单作 seed、运营后台可替换，无需外部真实名单输入）。可直接从 S0 开始逐刀下发。
