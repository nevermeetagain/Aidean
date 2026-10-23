# T120-25 偏离
1. 卡面验证命令 `pnpm -r exec vitest run` 在基线即失败：`packages/config` 无 vitest（ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL）。改为对 ui / shared / web 三包逐一执行 vitest run。
2. 「旧别名计数入 facts」：`scripts/check-docs-facts.mjs` 不在本卡允许路径。计数改由 `packages/ui/src/__tests__/tokens.spec.ts` 断言（=9），并在 UI设计文档 §2.1 登记；facts 断言留给拥有 scripts/ 的卡（建议 T120-27 codemod 收口时加，届时断言值为 0）。
3. 步骤 2「去掉对 slate-* 的重定义」：用法在 `apps/web/components/**`（本卡禁止修改）共 141 个文件，不能在本卡迁走。slate-400/500 保留为弃用别名，且必须保留字面 hex（`apps/web/lib/navigation-sync.spec.ts` UX-13 护栏按 hex 断言），值与 fg-subtle / fg-muted 相同。
4. `--color-accent` 保留「装饰亮色」原义，新增 `accent-strong` 承载品牌实底与文字，避免现有 to-accent / bg-accent 渐变在本卡内变色。唯一可见变化：teal / orange 焦点环改为 accent-strong（a11y 修复）。
