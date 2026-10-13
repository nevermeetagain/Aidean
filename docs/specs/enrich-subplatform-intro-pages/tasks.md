# Tasks · 子平台介绍页内容重构（原子化任务书）

> change-id: `enrich-subplatform-intro-pages` | 版本: v1 | 四级层级说明见文末《层级图例》

---

## 层级图例（L1→L4）

| 级 | Markdown 载体 | 本级职责 |
|---|---|---|
| **L1 阶段** | `## …`（轨道/Phase） | 声明该组目标、前置条件、交付物 |
| **L2 任务** | `### Task x.y 名称` | 一个可独立验收的功能面；标注【依赖】【产出】 |
| **L3 子任务** | `#### SubTask x.y.z 名称` | 最小可执行单元；字段完备即合法 |
| **L4 字段** | 子任务下有序列表 `- 【字段】: 内容` | 最小原子信息：目标/范围/验收/验证命令/产出/依赖 |

**复选框规则**：L3 完成即勾选自身复选框；**L2 勾选 = 其全部 L3 完成并经 checklist 对应检查点通过**。
**合法性规则**：任一 L3 缺失任一必填字段（【目标】【范围】【验收】）即为非法任务，实施者停止执行并要求补齐。

---

## 轨道 1 · 契约层（Spec 先行）

> **本级职责（L1）**：ProductIntroSchema 升 v2（可选字段 + version 1|2），v1 存量零影响。前置：spec.md APPROVE（管理者「开始执行」）。交付物：schema 代码 + shared 单测全绿。

### Task 1.1 v2 schema 与单测 【目标: 三层区块的结构契约 | 依赖: 无 | 产出: admin.schema.ts v2 段 + 单测】

- [x] #### SubTask 1.1.1 ProductIntroSchema v2 字段扩展
  - 【目标】新增 audience/problems/workflow/promises/ecosystem 可选字段；version 由 literal(1) 放宽为 1|2；新增 ProductIntroProblem/ProductIntroWorkflow 子 schema 并导出类型。
  - 【范围】修改 `packages/shared/src/schemas/admin.schema.ts`（ProductIntro 段，约 L195–L220 区域，避开 #71 的 displayName/category 行）。
  - 【验收】`pnpm --filter @aidean/shared exec tsc --noEmit` 通过；v1 样例 `{version:1,links,facts}` 解析仍 success。
  - 【验证命令】`pnpm --filter @aidean/shared exec tsc --noEmit; pnpm --filter @aidean/shared exec vitest run src/__tests__/product-intro.spec.ts`
  - 【产出】v2 类型 `ProductIntroAudience` 等推断可用；页面消费 `@aidean/shared` 类型无需改导入路径。
  - 【依赖】无
- [x] #### SubTask 1.1.2 v2 边界与 v1 兼容回归单测
  - 【目标】锁定 v2 上限（problems≤4、steps 1–8、promises/ecosystem≤4、audience≤80、solution≤200）、v1 数据在 v2 契约下解析不变、v2 字段缺省省略合法。
  - 【范围】修改 `packages/shared/src/__tests__/product-intro.spec.ts`（追加用例，不删既有用例）。
  - 【验收】该 spec 文件全绿；既有用例（javascript:/data: 拒绝、空对象通过、超界拒绝）零回归。
  - 【验证命令】`pnpm --filter @aidean/shared exec vitest run src/__tests__/product-intro.spec.ts`
  - 【依赖】1.1.1

## 轨道 2 · 数据层（真实资产注入）

> **本级职责（L1）**：seed 双文件剔除技术栈堆砌、注入三层内容；内容逐条可溯源规范说明 §2–§4。前置：轨道 1 完成（写侧校验存在）。交付物：两 seed 文件 v2 数据同步一致。

### Task 2.1 三产品 intro 重构 + Wiki 补块 【目标: 读者可懂的业务叙事 | 依赖: 1.1 | 产出: seed.ts / seed-products.mjs productsSeed 区】

- [x] #### SubTask 2.1.1 seed.ts productsSeed v2 内容注入
  - 【目标】wechatrag/aideanfleet/aideanthesis：删 `group:'技术'` facts 分组，注入 audience/problems/workflow/promises/ecosystem（version:2）；aideanwiki 补 audience/problems；links 与文案安全过滤（无端口/内网/环境变量键/模型池）维持，SkillsCloud 保持 intro:null。
  - 【范围】修改 `apps/web/prisma/seed.ts` L793–L848 productsSeed 数组区；保留 #71 已注入的 displayName/category 行原样。
  - 【验收】`pnpm --filter web exec tsc --noEmit` 通过；`Select-String seed.ts -Pattern "group: '技术'"` 零命中；三产品 version: 2。
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【依赖】1.1.1
- [x] #### SubTask 2.1.2 seed-products.mjs 同步一致
  - 【目标】独立脚本 productsSeed 与 seed.ts 数组逐字段一致（同步契约注释维持）。
  - 【范围】修改 `apps/web/scripts/seed-products.mjs`。
  - 【验收】node 语法解析通过 `node --check apps/web/scripts/seed-products.mjs`；diff 两文件内容键值人工比对一致。
  - 【依赖】2.1.1

## 轨道 3 · 表现层（三层区块重塑）

> **本级职责（L1）**：介绍页按新固定区块序渲染，空块零渲染，三主题不破版。前置：轨道 1。交付物：[slug]/page.tsx 新版。

### Task 3.1 区块分层扩展 【目标: 身份/价值/流程/决策四层可见 | 依赖: 1.1 | 产出: 页面 v2 区块】

- [x] #### SubTask 3.1.1 page.tsx v2 区块实现
  - 【目标】页头下增 audience 行；新增「解决什么问题」（痛点→解法对照卡）、「如何使用」（workflow 编号步骤）、「生态互通 / 安全与承诺」（双列清单）三组区块；facts/links/benefits 区块保留；仅 CSS 令牌 + lucide + @aidean/ui，prefers-reduced-motion 兼容。
  - 【范围】修改 `apps/web/app/(site)/products/[slug]/page.tsx`（保留 #71 的 productLabel 接入行）。
  - 【验收】tsc 通过；v1 数据行（无 v2 字段）渲染与改造前一致（无空壳 section）。
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【依赖】1.1.1
  - 【产出】浏览器人工核验记录（checklist P3 组）。

## 轨道 4 · Admin 与验证门禁

> **本级职责（L1）**：后台可维护 v2 + 全链门禁与文档收口。前置：轨道 1–3。交付物：ProductsManager v2、门禁绿回执、台账/术语表/索引同步。

### Task 4.1 ProductsManager v2 编辑面 【目标: 运营可自助维护 | 依赖: 1.1, 2.1 | 产出: 表单 v2 字段】

- [x] #### SubTask 4.1.1 v2 字段编辑与回填
  - 【目标】新增 audience 输入框、problems `问题::解法` 多行、workflow 标题+步骤多行、promises/ecosystem 多行；行格式提交前拦截；任一 v2 字段有值→intro 输出 version:2，否则 version:1；introToForm 完整往返。
  - 【范围】修改 `apps/web/components/admin/ProductsManager.tsx`。
  - 【验收】tsc 通过；编辑含 v2 内容产品原样保存不丢字段。
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【依赖】3.1.1

### Task 4.2 门禁与收口 【目标: 全绿交付 + 文档即结构 | 依赖: 4.1 | 产出: 门禁回执 + 台账 v2.12】

- [x] #### SubTask 4.2.1 回归门禁连跑
  - 【目标】types/lint/unit/e2e(docs-about-products 选跑)/构建/docs 事实规则全链验证。
  - 【范围】`pnpm --filter @aidean/shared exec tsc --noEmit`、`pnpm --filter web exec tsc --noEmit`、shared vitest、web vitest 相关、`node scripts/check-docs-facts.mjs`、`node scripts/check-docs-rule.mjs`、`pnpm build`。
  - 【验收】全部退出码 0；计数类断言（route 107/page 44/spec 106）因无文件增减维持。执行注记：同码基线 build 成功 2 次为达标证；期间 3 次瞬时失败均定位为本机并行 `next dev` 实例争夺 .next/dep node_modules（pnpm store 副本残缺与增量态踩踏），非本变更缺陷，详见 checklist G-1 记录。
  - 【依赖】4.1.1
- [x] #### SubTask 4.2.2 台账与文档同步收口
  - 【目标】#70 置 ✅ 并附回执；术语表登记「介绍内容三层模型」；未完成事项目录/文档索引/术语表版本 banner 更新；本三件套勾选与完成记录。
  - 【范围】修改 `docs/plans/未完成事项目录.md`、`docs/governance/术语表.md`、`docs/文档索引.md`、本目录三文件。
  - 【验收】`node scripts/check-docs-rule.mjs` PASS；三份文档版本锚存在且递增。
  - 【验证命令】`node scripts/check-docs-rule.mjs`
  - 【依赖】4.2.1
