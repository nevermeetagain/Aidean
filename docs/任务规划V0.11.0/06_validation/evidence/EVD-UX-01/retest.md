# EVD-UX-01 · 修复后全量复测（UX-FIX）

- 裁定：用户 2026-10-22 19:58「全同意」（12 项按建议）。基线 main `2aed5f9`；修复分支 `ux/fix-all` = 批次 A `5dc454b` + B `a39200d` + C `f3c30c5` + 审查修正 `99f943f` + 复测修正 `f87804c`。
- 环境：生产构建 `next start -p 3002`，独立库 aidean_ux（PG16 :55432），同一套脚本（crawl/axe/inject/console-inj/theme/journeys/perf2/ovf）前后对比。
- 门禁：tsc 0｜lint 0｜vitest 1826 通过/5 跳过｜check-docs-rule 0｜check-docs-facts 16/16｜pnpm build 0。
- 独立审查（只读）：1 阻塞已修（/pricing「按官方单价…计费」与网关加价扣费不符→改「按实际 Token 用量计费」）；采纳 4 条非阻塞（旧导航 seed 去协议矩阵、公告/API 站点空态按 total、Combobox aria-controls、功能设计文档 32 叶+1 重定向）。

| 指标 | 修复前 | 修复后 | 证据 |
|---|---|---|---|
| 768/1024 横向溢出（用户端 81 次截图） | 103px，26 页 | 0（全部 −15） | `shots/after/FIX-UX01-home-768.png` |
| axe color-contrast 节点 | 687（45 页） | 92（13 页）；用户端 135→14（−90%） | 余量主为 emerald-600 状态徽标 #009966 |
| axe critical | 13 | 0 | select-name/label 补 aria-label |
| 失败显示为空态 | /evaluations、/announcements、管理端 8 页 | 0；管理端 offline 33 页全部错误态 | `FIX-UX02-…` `FIX-UX04-admin-wallets-offline-error.png` |
| CLS 桌面 /pricing、/news | 0.346、0.170 | 0.000、0.000 | `.scratch/ux/perf/perf2.tsv` |
| CLS 移动 /news | 0.414 | 0.000 | 同上 |
| /pricing 390 价格可见 | 否 | 是（卡片） | `FIX-UX05-pricing-390-cards.png` |
| /evaluations/new 首屏按钮 | ~1006 | 搜索下拉，每次 ≤50 | `FIX-UX08-evaluations-new-combobox.png` |
| 控制台 ?tab= 刷新保持 | 否 | 是（U4 旅程） | journeys U4 |
| 管理端筛选进 URL 刷新保持 | 否 | 是（A4 旅程） | journeys A4 |
| 移动汉堡触控 | 24×36 | 44×44 | journeys A5 |
| /oauth/dev/callback 生产 | 200 回显 code | 404 | curl |
| /admin/protocols | 独立页 | 307 → 兼容矩阵 Tab | `FIX-D8-admin-compat-matrix.png` |

- 性能 TBT 下降（首页移动 1248→271ms）受沙箱负载影响大，只作参考，不作结论。
- 未尽事项：管理端 500 注入仍只跑完 18 页（脚本 600s 超时，offline 33 页完整）；控制台「免费额度」为 SSR 取数，客户端注入无法模拟其失败（非回归）；剩余对比度主要是 emerald-600/rose 等状态色与 slate-300 编号，未在本轮主题层处理；首页区块容器 `components/home/SectionFrame.tsx` 仍 max-w-6xl。
- 运营注意（2026-10-23 更新）：已由数据迁移 `20261023000000_admin_nav_ux26_rename` 自动对齐——`prisma migrate deploy` 时把仍为旧出厂名的 3 个侧栏叶改为新名并停用协议矩阵叶，管理员自定义过的名称不覆盖；无需再手动「应用推荐分组」。

## 收尾复测（2026-10-22 23:50 CST）

| 项 | 结果 |
|---|---|
| color-contrast（61 页 axe，1440） | 92 → **0**（状态色文字深一档 emerald/green/rose/amber/red-700、slate-300 文字→slate-400、console 青色强调文字→primary；见 UX-FIX-D 67c1a27） |
| serious/critical 违规总数 | **0**（另修 /user/console 余额卡 label-content-name-mismatch、/user/balance 加载骨架 aria-prohibited-attr） |
| 首页 SectionFrame 宽度 | max-w-6xl → 全宽 + px-4 md:px-6；1440 下页头内容与区块外框左右边一致（截图 shots/after/home-1440-sectionframe.png） |
| 768/1024 横向溢出 | 0 |
| 管理端 500 注入 | 33/33 页完成：32 页错误态，/admin/models 为服务端渲染无客户端 GET（no-client-fetch） |
| 报告 §8 文档修订 | 9 条全部落实 + 管理端 IA 收口 / oauth 生产 404 同步（UX-FIX-E 15e6bb3；文档索引 v1.90） |
| 门禁 | build/tsc/lint 0；Vitest 1826 passed / 5 skipped；check-docs-rule 0；check-docs-facts 16/16 |

剩余非阻塞：TBT 受沙箱负载影响仅作参考；HeroBanner 居中文本仍内部限宽 max-w-6xl（非 SectionFrame，属可读性限宽）。
