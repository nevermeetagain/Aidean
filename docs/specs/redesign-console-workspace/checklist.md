# 控制台工作区化重构 checklist

> change-id: `redesign-console-workspace` | 版本: v1.1 | 更新: 2026-09-17

- [x] C-1 五标签点击切换、同屏单板块、hidden 不卸载（草稿保留）——浏览器实测：切换后 config 面板 hidden、playground 状态保留，往返正常
- [x] C-2 `console-mode-switch` 位于模型配置标题行最右，语义/持久化不变——专业版切换后刷新仍保持 aria-pressed=true
- [x] C-3 PagePlaceholder 页头与其他页面同构；旧裸页头消失——浏览器实测 H1 + 竖条 + 面包屑胶囊
- [x] C-4 loading 骨架同构；键盘可用（Tab/方向键）——ArrowRight 实测切换至「平台密钥」
- [x] C-5 tsc 退出 0（TSC_OK）；next build 退出 0（/user/console 14.9kB）；375/1440 无横向溢出（≤2px）
- [x] C-6 文档三件同步（界面交互 v2.6 / 目录结构 v2.9 / 索引 v1.21）且版本标记更新；check-docs-rule PASS
- 兼容性：既有 e2e 选择器复核通过（call-playground 就绪判据、balance-entry、H1，两次 1 passed）；深链 ?tab=playground 等价旧滚动定位
- 边界：未做：e2e 正式新增用例（后续登记台账）；敏感字段红线不受影响（无成本字段输出）；本次一次性诊断脚本（.pw-cw/.pw-cw2）已删除，正面临时目录 `apps/web/.next-renamed-*` 保留待清理（含旧构建产物，重启服务已切新产物）
