# 控制台工作区化重构 任务书

> change-id: `redesign-console-workspace` | 版本: v1.1 | 更新: 2026-09-17

## Phase 1 实施与核验

前置条件：规格获用户指示授权（见 spec 批准记录）。交付物：新工作区布局 + 文档同步。

### Task 1.1 布局重构

#### SubTask 1.1.1 新建 ConsoleWorkspace
- 【目标】: 五标签点击切换工作区 + 右置版本切换 + 键盘可用
- 【范围】新建 `apps/web/components/console/ConsoleWorkspace.tsx`；修改 `apps/web/components/console/GeneralForm.tsx`（移除旧 Switcher，导出 ModeSwitch 供右置复用）
- 【验收】五个板块 hidden 切换不卸载；`data-testid="console-mode-switch"` 保留于模型配置标题行最右；键盘 Tab/方向键可切换标签
- 【验证命令】`node apps/web/node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json`
- 【产出】ConsoleWorkspace.tsx；依赖：无
- 【执行记录】2026-09-17 完成：tsc 退出 0（TSC_OK）；454 例单测通过；hidden 挂载与方向键导航经浏览器实测。✅

#### SubTask 1.1.2 页面接线与加载骨架
- 【范围】修改 `apps/web/app/(site)/user/console/page.tsx`、`loading.tsx`
- 【验收】PagePlaceholder 页头；服务端取数/守卫不变；loading 骨架与新结构同构
- 【产出】更新后的两文件；依赖 1.1.1
- 【执行记录】2026-09-17 完成：页头卡与 PagePlaceholder 同构；守卫/取数未动；loading 同构。✅

#### SubTask 1.2.1 构建与浏览器验证
- 【范围】隔离产物构建 + 重启 3000 + 浏览器实测
- 【验收】登录后五标签切换、草稿保留、模式右置、375/1440 无横向溢出；无 console 错误
- 【验证命令】浏览器实测 + 截图取证；tsc 退出 0
- 【产出】验证记录；依赖 1.1.2
- 【执行记录】2026-09-17：旧服务（PID 43252）停止 → `.next` 改名隔离 → `next build` 退出 0（/user/console 14.9kB）→ postbuild-standalone 退出 0 → 新 PID 33928 就绪（Ready 126ms）→ Playwright 实测 1 passed（五标签/右置/刷新持久化/深链/方向键/375与1440无溢出）；console.error 捕获诊断定性为环境噪音（auth/me 401 未认证探测 + RSC 预取 ERR_ABORTED，非产品缺陷）；仓库正式套件 `e2e/playwright.config.ts` 34 passed（58.8s）含 fe01-console-call / console-flow-gradient / g6-openapi-keys / gateway-flow。临时诊断脚本已删除。✅

#### SubTask 1.2.2 文档同步归档
- 【范围】`docs/product/design/界面交互文档.md`、`docs/governance/目录结构文档.md`、`docs/文档索引.md`
- 【验收】三文档版本标记更新且与新结构一致；checklist 全绿
- 【产出】同步文档 + 归档记录；依赖 1.2.1
- 【执行记录】2026-09-17：界面交互 v2.6（§七改版）、目录结构 v2.9（console 条目注补 ConsoleWorkspace）、索引 v1.21；check-docs-rule PASS、git diff --check 退出 0。✅
