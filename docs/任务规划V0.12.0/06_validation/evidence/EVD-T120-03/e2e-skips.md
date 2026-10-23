## RUN-C（rebased HEAD c4160b9d＝权威读数，2026-10-23 18:41–18:52）
total 230 ｜ passed 182 ｜ skipped 48 ｜ failed 0 ｜ 用时 582.6s

### admin :: admin/models.spec.ts（1 条）
- 基准测试页面加载 → skip

### admin :: admin/modules.spec.ts（14 条）
- 脚本列表页加载 → skip
- 评测列表页加载 → skip
- 角色管理页加载 → skip
- 部门管理页加载 → skip
- 团队管理页加载 → skip
- 资讯管理页加载 → skip
- 公告管理页加载 → skip
- 交易记录页加载 → skip
- 套餐管理页加载 → skip
- 天梯图配置页加载 → skip
- 通用设置页加载 → skip
- 功能开关页加载 → skip
- 用户反馈页加载 → skip
- 系统公告页加载 → skip

### admin :: admin/sync.spec.ts（2 条）
- 同步管理页渲染与基础交互 → skip
- 同步日志页筛选与展开交互 → skip

### admin :: admin/tools.spec.ts（3 条）
- Skills页面加载 → skip
- MCP页面加载 → skip
- Agent页面加载 → skip

### flows :: tests/fe01-console-call.spec.ts（1 条）
- 375px：控制台无横向溢出且关键控件可聚焦 → 375px 横向溢出 32px：组件侧缺陷，待修复后解除（见 EVD-T120-03）

### web :: web/docs-about-products.spec.ts（14 条）
- 帮助中心页面正常加载 → skip
- 帮助文档页面正常加载 → skip
- 定价方案页面正常加载 → skip
- API文档页面正常加载 → skip
- 联系我们页面正常加载 → skip
- 合作页面正常加载 → skip
- 招聘页面正常加载 → skip
- AI员工页面正常加载 → skip
- 知识库页面正常加载 → skip
- 解决方案页面正常加载 → skip
- 业务咨询页面正常加载 → skip
- /sphere 产品页卡片使用三产品语义路径 → skip
- 对比页面加载 → skip
- 评测页面加载 → skip

### web :: web/resources.spec.ts（13 条）
- Skills页面正常加载 → skip
- Skills页面有内容或空状态 → skip
- Skills页面筛选功能 → skip
- MCP页面正常加载 → skip
- MCP页面有内容或空状态 → skip
- MCP页面筛选功能 → skip
- Agent页面正常加载 → skip
- Agent页面有内容或空状态 → skip
- Agent页面筛选功能 → skip
- 资讯页面正常加载 → skip
- 资讯页面有内容或空状态 → skip
- 资讯页面筛选功能 → skip
- 从首页导航到Skills页面 → skip

## RUN-B（rebase 前基线 80c392bc，2026-10-23 18:18–18:28）
total 230 ｜ passed 179 ｜ skipped 51 ｜ failed 0 ｜ 用时 584.1s

### admin :: admin/cms-content.spec.ts（1 条）
- 改首页 Hero 主标题 → 前台首页标题区变化 → D1 首页 SSR 不反映后台新值（缓存失效丢失，见 EVD-T120-03/defects.md）

### admin :: admin/feature-flags.spec.ts（2 条）
- 关 ladder.station → /providers 显 feature-disabled + ladder API 403/50011 + 桌面入口消失；开→恢复 → D2 复原方向 PUBLIC 快照 10s 不收敛（缓存失效丢失，见 EVD-T120-03/defects.md）
- 关 ladder.station → 移动端抽屉亦无 /providers 入口（与桌面同源过滤）；开→恢复 → D2 复原方向 PUBLIC 快照 10s 不收敛（缓存失效丢失，见 EVD-T120-03/defects.md）

### admin :: admin/models.spec.ts（1 条）
- 基准测试页面加载 → skip

### admin :: admin/modules.spec.ts（14 条）
- 脚本列表页加载 → skip
- 评测列表页加载 → skip
- 角色管理页加载 → skip
- 部门管理页加载 → skip
- 团队管理页加载 → skip
- 资讯管理页加载 → skip
- 公告管理页加载 → skip
- 交易记录页加载 → skip
- 套餐管理页加载 → skip
- 天梯图配置页加载 → skip
- 通用设置页加载 → skip
- 功能开关页加载 → skip
- 用户反馈页加载 → skip
- 系统公告页加载 → skip

### admin :: admin/sync.spec.ts（2 条）
- 同步管理页渲染与基础交互 → skip
- 同步日志页筛选与展开交互 → skip

### admin :: admin/tools.spec.ts（3 条）
- Skills页面加载 → skip
- MCP页面加载 → skip
- Agent页面加载 → skip

### flows :: tests/fe01-console-call.spec.ts（1 条）
- 375px：控制台无横向溢出且关键控件可聚焦 → 375px 横向溢出 32px：组件侧缺陷，待修复后解除（见 EVD-T120-03）

### web :: web/docs-about-products.spec.ts（14 条）
- 帮助中心页面正常加载 → skip
- 帮助文档页面正常加载 → skip
- 定价方案页面正常加载 → skip
- API文档页面正常加载 → skip
- 联系我们页面正常加载 → skip
- 合作页面正常加载 → skip
- 招聘页面正常加载 → skip
- AI员工页面正常加载 → skip
- 知识库页面正常加载 → skip
- 解决方案页面正常加载 → skip
- 业务咨询页面正常加载 → skip
- /sphere 产品页卡片使用三产品语义路径 → skip
- 对比页面加载 → skip
- 评测页面加载 → skip

### web :: web/resources.spec.ts（13 条）
- Skills页面正常加载 → skip
- Skills页面有内容或空状态 → skip
- Skills页面筛选功能 → skip
- MCP页面正常加载 → skip
- MCP页面有内容或空状态 → skip
- MCP页面筛选功能 → skip
- Agent页面正常加载 → skip
- Agent页面有内容或空状态 → skip
- Agent页面筛选功能 → skip
- 资讯页面正常加载 → skip
- 资讯页面有内容或空状态 → skip
- 资讯页面筛选功能 → skip
- 从首页导航到Skills页面 → skip

## 分类小结
- 本卡登记的真缺陷 fixme：D3 fe01 375px ×1（两次读数均触发）；D1 cms Hero ×1、D2 feature-flags 复原自检 ×2 仅在 RUN-B 触发——
  RUN-C 前按 Windows 惯例先停 dev 再 pnpm install（prisma generate 锁 DLL），重启后缓存新鲜，
  这三条用例走的是完整断言并通过（缺陷触发条件＝「同一 TTL 窗口内的第二次连续写入」，见 defects.md D1「触发条件再收敛」与 D2 现场留存）。
- 其余 47 条为既有 test.describe.skip 占位（C-3：/admin/scripts、/admin/evaluations、/admin/rbac/*、资源页等路由已删除），非本卡引入。
