# Checklist · 子平台介绍页内容重构（三层介绍模型）

> 核验规则：按分组核验，每组全部通过才可宣告完成；任何失败项 → tasks.md 追加 `Fix:` 任务（引用检查点编号）→ 修复后重验勾选。
> 取证标注：**[命令]** 必须以确切命令执行取证；**[断言]** 为结构/文档核验（存在性、链接可达、格式合法）；**[测试]** 为自动化测试通过；**[人工]** 允许描述式核验（视觉/体验类，注明核验人与方式）。
> 核验人：主理人（product-release-lead 会话）；核验日期：2026-09-28；dev 服务器隔离端口 **3457**（避让 3000/3103 在跑实例）。

---

## 分组一 · 契约层

- [x] C-1 `ProductIntroSchema` v2 扩展可解析（SubTask 1.1.1）[测试]
  - 取证：`pnpm --filter "@aidean/shared" exec vitest run src/__tests__/product-intro.spec.ts` → **19 passed (19)**（原 10 用例零回归 + 新 9 用例通过）
- [ [x] C-2 v1 兼容红线：显式 `version:1` 的库内 JSON 在 v2 契约下解析通过且 v2 字段全部 `undefined`（SubTask 1.1.1/1.1.2）[测试]
  - 取证：同上 spec「v1 存量零迁移」用例；`version:" 3/0"` 拒绝用例通过
- [x] C-3 shared 包编译干净（SubTask 1.1.1）[命令]
  - 取证：`pnpm --filter "@aidean/shared" exec tsc --noEmit` → EXIT=0
  - 附注：`product.ts` 不存在——ProductIntro 契约真源在 `admin.schema.ts`（立项前实探修正，spec 影响面已按实况登记）

## 分组二 · 数据层

- [x] D-1 seed 双文件语法与同步一致（SubTask 2.1.1/2.1.2）[命令]
  - 取证：`node --check apps/web/scripts/seed-products.mjs` → 退出码 0；`audience:` 行两文件均为 4
- [x] D-2 技术栈堆砌清零（SubTask 2.1.1/2.1.2）[命令]
  - 取证：seed 双文件 `Select-String -Pattern "group: '技术'"` 零命中；`Select-String -Pattern "FastAPI|Celery|Vue3|Vite" apps/web/prisma/seed.ts, apps/web/scripts/seed-products.mjs` productsSeed 区零命中
- [x] D-3 库内结构完整性（SubTask 2.1.1）[命令]
  - 取证：`pnpm --filter web db:seed` → `📦 Products: 5 (expect 5)`；临时核检脚本实测四产品 `v2 / audience:1 / problems / steps / promises / eco` 计数符合设计、`techGroup:no`（脚本用后即删，证据留存于会话记录）
  - 实测值：wechatrag problems4/steps5/promises2/eco3；aideanfleet problems4/steps4/promises3/eco3；aideanthesis problems4/steps4/promises3/eco2；aideanwiki problems2（仅身份+价值层，缺省块零渲染契约的活样本）
- [x] D-4 零虚构纪律（ADDED Requirement 场景）[断言]
  - 取证：promises/ecosystem 条目逐条对照 `docs/product/modules/子平台规范说明.md`（AES-256-GCM §2.3、Allowed_Roots 沙箱 §3.6、追加式日志 §3.10、SSO/计费网关 §2.8、Fleet 公开直链 §65 实测、Thesis Pages 路由与审计页 §4.6/§4.10、模型池容错 §3.7-3.10）；SkillsCloud `intro:null` 维持不注入 —— 通过

## 分组三 · 表现层（运行时实测）

- [x] P-1 三层区块渲染（SubTask 3.1.1）[命令]
  - 取证：`next dev -p 3457`（注入 dev 库 DATABASE_URL）后 Invoke-WebRequest：
    - wechatrag / aideanfleet / aideanthesis → `痛点区:True 流程区:True 承诺区:True 生态区:True 受众行:True 技术残留:False`
    - aideanwiki → `痛点区:True 受众行:True，流程/承诺/生态 False`（未注入块零渲染=设计预期）
    - skillscloud → 五断言全 False，HTTP 200（降级=设计预期）
    - 五页均 HTTP 200、全页无 FastAPI/Celery/Vue3/Vite/自研 字样残留
- [x] P-2 中文显示名共存（Impact 并行说明）[命令]
  - 取证：五页命中 `信源引擎机器人|自动化舰队引擎|论文审查助手|独立知识百科` 各一 —— #71 的 displayName 与 #70 三层内容叠加无冲突
- [x] P-3 web 端编译（SubTask 3.1.1）[命令]
  - 取证：`pnpm --filter web exec tsc --noEmit` → EXIT=0（页面/Admin/seed 全域）

## 分组四 · Admin 编辑面

- [x] A-1 v2 表单编译与往返结构（SubTask 4.1.1）[命令]
  - 取证：web tsc EXIT=0 覆盖 `ProductsManager.tsx`；`introToForm` 返回类型收敛为 `Pick<ProductForm, ...8 键>`，空块归一 null / version 1↔2 逻辑经代码走查
- [x] A-2 web 单测全量零回归（与 #71 叠加底座）[测试]
  - 取证：`pnpm --filter web exec vitest run` → **79 files / 720 passed (720)**
- [ ] A-3 后台浏览器实操编辑往返 [人工]
  - 状态：**未在本窗口执行**（在跑 3000/3103 实例归属其他会话，避免踩踏）。列为遗留人工项：任一会话登录 `http://localhost:3000/admin/products` 打开编辑→保存 v2 内容→前台核对无字段丢失
  - 风险评级：中（读写两侧 zod 契约单测已覆盖非法输入；表单往返有类型保证+纯函数逻辑）

## 全局回归门禁

- [x] G-1 构建链路：`pnpm build` 于本 change 全部代码合入后 **成功 2 次**（`Tasks: 2 successful`，SSG 输出含 `● /products/[slug]` 与实路由清单、postbuild 拷贝完成）[命令]
  - **环境干扰记录（如实）**：本工作树存在其他会话的 `next dev`（PID 49008/32780 等）与本窗口 build 争夺 `.next`，期间出现 3 种瞬时故障：`node_modules/.pnpm` 副本残缺（jest-worker/styled-jsx，经 `pnpm install --force` 修复）、`PageNotFoundError: /api/v1/admin/free-quotas`（dev 改写 .next 增量态）。均非本次代码缺陷；处置建议：冗余 dev 实例收口后复跑 `Remove-Item apps\web\.next -Recurse -Force; pnpm build` 取一次双保险
- [x] G-2 与 `establish-dev-workflow` 回归联动（SubTask 4.2.1）[断言]
  - 取证：`node scripts/check-docs-facts.mjs` → **11/11 PASS / EXIT=0**（route 107 / page 44 / spec 106 计数维持——本变更零文件增减：新建仅 docs/specs 三件套）；`node scripts/check-docs-rule.mjs` → **PASS**（铁律 1/3/数字真源）
- [x] G-3 `prefers-reduced-motion`/三主题不破版 [断言]
  - 取证：新页面区块沿用既有样式契约（仅 `@aidean/ui` CSS 令牌类 + lucide-react，hover 过渡均 `transition duration-200` 系）；无自定义动画关键帧 —— 结构核验通过；浏览器三主题目视归入 A-3 人工窗口
