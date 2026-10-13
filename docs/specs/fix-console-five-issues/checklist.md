# Checklist · 控制台五问题修复

> 核验规则见 [_template/checklist.md](../_template/checklist.md)。取证标注：**[命令]** 确切命令取证 / **[断言]** 结构文档核验 / **[测试]** 自动化测试 / **[人工]** 视觉体验。

---

## 分组一 · 功能修复（M1-M5）

- [x] F-1 API Key 物理删除：删除后行移除、verify 明文 → 10004、非本人/不存在 → 40000（M.1.1）[测试]
  - 取证：`pnpm --filter web exec vitest run lib/features/apikey` → apikey.spec.ts ⑩b 全绿
- [x] F-2 报表自定义窗口 + 多维聚合来源优先级 channel>station>platform（M.4.3）[测试]
  - 取证：`pnpm --filter web exec vitest run lib/features/gateway/__tests__/usage-stats.spec.ts` → buildUsageStatsWindow/validateUsageWindow/buildUsageBreakdown 全绿
- [x] F-3 接入格式归一（responses/gemini → 内部 OpenAI Chat → 回填体裁）（M.5.1/M.5.2）[测试]
  - 取证：`pnpm --filter @aidean/shared test`（+5 例）、`pnpm --filter web exec vitest run lib/features/gateway/__tests__/routes-gateway.spec.ts`（⑰ Responses + ⑱ Gemini）全绿
- [x] F-4 Key/站点/渠道面板对比度与 CRUD UI 可用（M.2.1/M.3.2）[测试]
  - 取证：`pnpm --filter web typecheck` 0 error；视觉/交互由一次性 Playwright 探针（F-5）实测确认
- [x] F-5 控制台浏览器实测（2026-10-08 · 登录 test 用户 → 逐面板断言）[测试]
  - 取证：探针 13/13 ALL PASS，未过滤控制台错误数=0。覆盖：M2 三档用途弹窗/明文 `aid_ak_…`(len=67)/一键复制；M1 新建行出现且删除后该 key 从 `GET /api/v1/user/api-keys` 彻底消失（`listApiKeys` 不过滤 `isActive`，消失即坐实 `deleteMany` 物理删除而非软删）；M5 openai/anthropic/openai-responses/gemini 四格式按钮齐全 + gemini 强制聚合（流式开关 disabled）+ openai 流式可用；M4 开始/结束日期 input + 多维消耗明细区（breakdown）；M3 自有密钥面板站点下拉。
  - 说明：探针为一次性核验脚本，跑完即删（`.scratch/` 已清空）；本轮纯核验，无代码/文档改动。

## 分组二 · 文档同步（M6.2 · 铁律 3/6）

- [x] D-1 API接口文档登记 breakdown 端点 + stats 窗口 + chat 四接入格式 + api-keys 物理删除（M6.2）[断言]
  - 取证：`docs/architecture/API接口文档.md` v1.41 §5.4 四行更新/新增
- [x] D-2 check-docs-facts 基线随结构变更同步（route 125 / ui-refs 49 / spec 115）[命令]
  - 取证：`node scripts/check-docs-facts.mjs` → All 14 assertions passed
- [x] D-3 铁律 1/数字真源规则通过 [命令]
  - 取证：`node scripts/check-docs-rule.mjs` → docs rule PASS + 数字真源断言 PASS
- [x] D-4 CHANGELOG 登记本批次（M1-M6 + 环境修复 + Verification）[断言]
  - 取证：`CHANGELOG.md` [Unreleased] 2026-10-08 新增「控制台体验修复批次」段

---

## 全局回归门禁（每个 Task 完成时增量跑）

- [x] G-1 类型/测试/构建链路绿 [命令]
  - 取证：`pnpm --filter web typecheck`（0 error）；`pnpm --filter @aidean/shared typecheck`（0 error）；`pnpm --filter web exec vitest run`（**85 文件 / 858 tests** 全绿，基线 847）；`pnpm --filter @aidean/shared test`（**109 tests** 全绿）；`pnpm --filter web lint`（pass，仅既存无关 `<img>` 提示）；`pnpm --filter web build`（**✓ Compiled successfully**，standalone 产物拷贝，exit 0）
- [x] G-2 与 establish-dev-workflow 回归联动：本 change-id 六步循环产物（spec/tasks/checklist）齐备并归档 [断言]
  - 取证：`docs/specs/fix-console-five-issues/{spec,tasks,checklist}.md` 存在，tasks 全 L3 勾选
- [x] G-3 环境阻断项已消解并留痕（非代码回归）[命令]
  - 取证：`next/dist/compiled/jest-worker/processChild.js` MODULE_NOT_FOUND（已知 #82 类，见 `docs/plans/未完成事项目录.md` §7.25）→ `pnpm install --force`（本地 store 重物化，downloaded 0）后 build 恢复绿色
