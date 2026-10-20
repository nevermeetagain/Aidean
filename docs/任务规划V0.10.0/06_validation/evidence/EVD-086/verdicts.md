# EVD-086 · 22 张已移出卡在当前 main 逐卡复核

- 基线：HEAD c638d85（含 TASK-006 提交），Node v22.23.3，pnpm 9.0.0
- 环境：PostgreSQL 16.14（:55432；e2e 库 aidean_e2e 为 TASK-006 空库重放 18 迁移+三段 seed；int 库 aidean_int 由 migrate deploy 新建）· Redis 8.6.3（:6379）· `next start -p 3000`（生产构建）· Playwright chromium
- 方法：逐卡执行原卡「验证命令」原文（int 卡把 `DATABASE_URL=postgresql://...` 占位替换为真库；web 全量单测用占位 DATABASE_URL，与 CI verify job 一致），每卡完整输出与退出码存 logs/
- 结论：**PASS 21 / FAIL 1（TASK-079，测试配置缺陷，功能本身 4/4 通过）/ UNKNOWN 0**

| 卡 | 原卡名 | 证据类型 | 结论 | exit | 证据文件 | 摘要 |
|---|---|---|---|---|---|---|
| TASK-001 | 错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + Syst | 单测 | PASS | 0 | logs/TASK-001.log | 210 passed (210) |
| TASK-002 | web 侧错误码改为从 shared 重导出（消除双源） | 单测(web 全量) | PASS | 0 | logs/TASK-002.log | 1292 passed | 5 skipped (1297) |
| TASK-003 | 新增 GET /api/v1/system/ready（DB+Redis 就绪探 | 单测+运行态 ready | PASS | 0 | logs/TASK-003.log | 9 passed (9) |
| TASK-004 | 契约测试生成器（从 shared 契约自动生成契约测试） | 契约生成 drift | PASS | 0 | logs/TASK-004.log | 210 passed (210) |
| TASK-005 | 步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封 | e2e | PASS | 0 | logs/TASK-005.log | 3 passed (3.8s) |
| TASK-010 | 固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite  | 真库 int | PASS | 0 | logs/TASK-010.log | 真库 PG16 2 passed（RUN_DB_TESTS=1；首跑缺该开关 2 skipped 已作废重跑）；aidean_int 空库 migrate deploy 18 条 |
| TASK-011 | ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（ | 真库 迁移+int | PASS | 0 | logs/TASK-011.log | 真库 PG16 2 passed（RUN_DB_TESTS=1；首跑缺该开关 2 skipped 已作废重跑）；aidean_int 空库 migrate deploy 18 条 |
| TASK-012 | persistPrices 修正：单模型仅一条 current、事务化 | 单测 | PASS | 0 | logs/TASK-012.log | 76 passed | 2 skipped (78) |
| TASK-014 | 功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射） | 单测 | PASS | 0 | logs/TASK-014.log | 210 passed (210) |
| TASK-015 | 开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜） | 单测(web 全量) | PASS | 0 | logs/TASK-015.log | 1292 passed | 5 skipped (1297) |
| TASK-016 | 后台开关端点 GET/PATCH /api/v1/admin/feature-f | 单测 | PASS | 0 | logs/TASK-016.log | 9 passed (9) |
| TASK-017 | 后台菜单种子：新增「功能开关」入口（seed-navigation-menu + | 单测 | PASS | 0 | logs/TASK-017.log | 20 passed (20) |
| TASK-018 | UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态 | tsc+lint（运行态见 EVD-092） | PASS | 0 | logs/TASK-018.log | 命令 exit 0 |
| TASK-019 | e2e：功能开关端到端（关→入口消失+API 50011→开→恢复） | e2e(admin) | PASS | 0 | logs/TASK-019.log | 3 passed (8.1s) |
| TASK-021 | 收藏契约落地（favorites.schema.ts） | 单测 | PASS | 0 | logs/TASK-021.log | 210 passed (210) |
| TASK-022 | 收藏 API：GET/POST /api/v1/user/favorites + | 单测 | PASS | 0 | logs/TASK-022.log | 16 passed (16) |
| TASK-023 | UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab | tsc+lint（运行态见 EVD-092） | PASS | 0 | logs/TASK-023.log | 命令 exit 0 |
| TASK-024 | e2e：收藏端到端（收藏→控制台可见→取消→未登录引导） | e2e | PASS | 0 | logs/TASK-024.log | 3 passed (6.3s) |
| TASK-076 | 后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_chan | 单测 | PASS | 0 | logs/TASK-076.log | 71 passed (71) |
| TASK-077 | OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整 | 单测 | PASS | 0 | logs/TASK-077.log | 12 passed (12) |
| TASK-078 | UI 小修：天梯五维筛选「全部」全选/全不选 + 价格页充值档位改读 share | tsc+lint（运行态见 EVD-092） | PASS | 0 | logs/TASK-078.log | 命令 exit 0 |
| TASK-079 | e2e：筛选「全部」全选/全不选 + 价格页档位一致 | e2e | FAIL（原命令）/ 功能 PASS | 1（复跑 0） | logs/TASK-079.log | 原命令 `pnpm test:e2e -g ladder-filter-all` exit=1：e2e/playwright.config.ts webServer 探针得 404 后自起 `dev -- --turbo` 失败（DEF-086-01）；去 webServer 同配置复跑 4/4 passed |

## 缺陷单

### DEF-086-01 · `pnpm test:e2e` 的 webServer 复用探针失效（回指 TASK-079）
- 现象：`e2e/playwright.config.ts` 的 `webServer.url=http://localhost:3000`、`reuseExistingServer=true`；Playwright 探针 `GET /` 与 `/index.html` 均得 **404**（同 URL 经 curl / Node fetch / http.get 均 200），于是判定不可复用并执行 `npx -y pnpm --filter web dev -- --turbo` → next 把 `--turbo` 当项目目录：`Invalid project directory … apps/web/--turbo`，exit 1。
- 影响：卡面原验证命令在「已有 :3000 生产服务」的环境下必失败；CI e2e-skeleton 用根 `playwright.config.ts`（无 webServer），不受影响。
- 建议修法（立新卡，交外部助手）：① `webServer.command` 改为 `pnpm --filter web dev --turbo`（去掉多余 `--`）；② `webServer.url` 改指 `/api/v1/system/health`；③ 复跑 `pnpm test:e2e -g ladder-filter-all` 取证。
- 回写：需由 TASK-088 在 V0.10.x task-index 重新立卡（本卡允许修改范围不含规划目录）。
