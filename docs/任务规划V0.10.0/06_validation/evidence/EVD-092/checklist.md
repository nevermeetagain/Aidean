# EVD-092 · 018/023/078 三张 UI 卡五态运行态核对

- 环境：`next start -p 3000`（生产构建，aidean_e2e 库：TASK-006 空库重放+seed）· PG16.14 · Redis 8.6.3 · Playwright chromium
- 方法：每页 × 5 态；加载/错误/空态用 `page.route` 注入（延迟 4s / 500 / 空列表），无权限态用真实账号或真实开关（关后立即恢复），成功态走真实写操作（事后清理）
- 视口：桌面 1440×900（d1440）+ 移动 390×844（m390），共 34 张截图；脚本 zz092.cjs.txt；机读结果 results.json

- 汇总（15 格）：PASS 14 / FAIL 0 / UNKNOWN 1
| 页面 | 态 | 桌面 | 移动 | 结论 | 说明 |
|---|---|---|---|---|---|
| TASK-018 后台功能开关 /admin/feature-flags | empty | 018-flags-empty-d1440.png | 018-flags-empty-m390.png | PASS | GET 返回 items=[] |
| TASK-018 后台功能开关 /admin/feature-flags | loading | 018-flags-loading-d1440.png | 018-flags-loading-m390.png | PASS | GET 延迟 4s |
| TASK-018 后台功能开关 /admin/feature-flags | error | 018-flags-error-d1440.png | 018-flags-error-m390.png | PASS | GET 注入 500 |
| TASK-018 后台功能开关 /admin/feature-flags | forbidden | 018-flags-forbidden-d1440.png | 018-flags-forbidden-m390.png | PASS | 非管理员直链 → /admin/login?denied=1 |
| TASK-018 后台功能开关 /admin/feature-flags | success | 018-flags-success-d1440.png | 018-flags-success-m390.png | PASS | 切换 chat.support → 内联「已保存」 |
| TASK-023 收藏（详情页按钮 + /user/console?tab=favorites） | empty | 023-favs-empty-d1440.png | 023-favs-empty-m390.png | PASS | 种子用户无收藏（真实空） |
| TASK-023 收藏（详情页按钮 + /user/console?tab=favorites） | loading | 023-favs-loading-d1440.png | 023-favs-loading-m390.png | PASS | 列表延迟 4s |
| TASK-023 收藏（详情页按钮 + /user/console?tab=favorites） | error | 023-favs-error-d1440.png | 023-favs-error-m390.png | PASS | 列表注入 500 |
| TASK-023 收藏（详情页按钮 + /user/console?tab=favorites） | forbidden | 023-favs-forbidden-d1440.png, 023-fav-login-d1440.png | 023-favs-forbidden-m390.png, 023-fav-login-m390.png | PASS | 开关关闭直链 → favs-disabled；匿名详情页 → fav-login |
| TASK-023 收藏（详情页按钮 + /user/console?tab=favorites） | success | 023-fav-button-active-d1440.png, 023-favs-success-d1440.png | 023-fav-button-active-m390.png, 023-favs-success-m390.png | PASS | 详情页点收藏 → 实心星；控制台列表可见 |
| TASK-078 天梯五维筛选 /models | empty | 078-filter-empty-d1440.png | 078-filter-empty-m390.png | UNKNOWN | 注入的空响应形状与 /api/v1/ladder 实际信封不符，组件把它当错误并显示「ok」，未能构造真实空态；契约未定义空态 testid（DEF-092-01） |
| TASK-078 天梯五维筛选 /models | loading | 078-filter-loading-d1440.png | 078-filter-loading-m390.png | PASS | 全不选触发请求（延迟 4s）→ ladder-pending |
| TASK-078 天梯五维筛选 /models | error | 078-filter-error-d1440.png | 078-filter-error-m390.png | PASS（观察） | 红色内联提示条显示服务端 message，保留上一屏数据不清空；契约未定义 testid → 建议补 ladder-error（DEF-092-01） |
| TASK-078 天梯五维筛选 /models | forbidden | 078-filter-forbidden-d1440.png | 078-filter-forbidden-m390.png | PASS | ladder.model 关闭 → feature-disabled |
| TASK-078 天梯五维筛选 /models | success | 078-filter-success-d1440.png | 078-filter-success-m390.png | PASS | 协议「全选」→ 全选框 checked=true，URL=/models?type=models&modelType=REASONING&protocol=ANTHROPIC%2COPENAI%2CRESPONSES%2CGOOGLE%2CCUSTOM&benchmark=composite |

## 缺陷单

### DEF-092-01 · 天梯筛选缺少契约化的空态/错误态（回指 TASK-078）
- 现象：`06-ux-states` 契约未为 LadderFilter 定义 empty/error testid；运行态错误态为红色内联提示条（可用），空态未能以注入方式构造（组件对非预期响应形状显示服务端 message「ok」为错误）。
- 建议：契约补 `ladder-empty`（「没有符合条件的模型，试试放宽筛选」+ 一键清空）与 `ladder-error`（role=alert + 重试），由外部助手在 TASK-037 e2e 收敛时补用例；属契约增量，需按铁律先改契约再实现（建议并入 V0.10.x 新卡）。

## 首轮脚本问题（已修正，不计为缺陷）
- 收藏控制台路径误写 `/console` → 实为 `/user/console?tab=favorites`；天梯「全选」位于各维度下拉内，需先点「协议」；延迟路由在 unroute 后 continue 抛错 → 加 catch。修正后全量重跑，截图全部为重跑产物。
