# EVD-084 偏离说明

1. **卡面与代码事实冲突：/providers 不是天梯页。** 卡面目标写「/models 与 /providers 无 footer」，但需求真源（需求文档:41「天梯图页面不展示页脚」、界面交互文档 §一「天梯图页面（/models、/ladder）不渲染页脚」）与代码真源（`components/site/SiteFooter.tsx:40` `LADDER_PATHS = ["/models", "/ladder"]`）一致为 /models + /ladder；/providers 是「模型服务提供商」内容页，正常渲染页脚。处理：spec 断言 /models、/ladder 无页脚（SSR HTML + 水合 DOM 双重），并把 /providers 作为**对照组**断言「有页脚」，以防选择器失效假绿。未改业务代码。若用户本意确为 /providers 也隐藏页脚，属需求变更，需改 `SiteFooter.tsx`（apps/**，本卡禁止）。
2. **验证命令无法在本环境变绿（已登记，验收允许「失败已登记」）：**
   - 环境：无 :3000 服务、无 PG16/Redis（沙箱无 docker/root）。`pnpm test:e2e -g ladder-no-footer` 在根配置 globalSetup（`e2e/global-setup.ts:11` 请求 :3000）即 ECONNREFUSED，exit 1。
   - 结构性问题：根 `playwright.config.ts` 所有 project 的 testDir 均为 `e2e/web|admin|tests` 子目录，卡面指定路径 `e2e/ladder-no-footer.spec.ts`（e2e 根）**不被任何 project 收录**，`--list -g ladder-no-footer` 输出「No tests found」。即使服务就绪，卡面命令也找不到用例。**需要助手 C 改 `playwright.config.ts`**（C 独占）：新增一个 project（如 `{ name: 'root-specs', testDir: './e2e', testMatch: /ladder-no-footer\.spec\.ts/, use: devices['Desktop Chrome'] }`）或把本 spec 纳入 web project 的 testMatch。
   - 已用不入库的临时探针配置证明 spec 可解析、列出 3 例（verify.txt）。
3. `scripts/check-docs-facts.mjs`：spec-count 188→189（R10-01 计数同步；rebase 后叠加 TASK-048、TASK-080 的增量，desc 记归因链）。
4. task-index 本卡行状态回写（派单要求，同 EVD-036 授权偏离）。
5. #19 台账回写归助手 C（`docs/plans/未完成事项目录.md`），本卡只出逐项结论（item19-checklist.md）。
