# V0.12.0 任务索引

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）

> 唯一状态载体。状态取值：待开工 / 进行中 / 待验证 / 已合并（附提交号）/ blocked（附原因）。层级 L 为依赖拓扑层，同层且所有权不相交者可并行。

| 卡 | 名称 | 切片 | 执行方 | 档位 | 工时(h) | 依赖 | 层级 | 状态 |
|---|---|---|---|---|---|---|---|---|
| T120-01 | DB 集成测试复绿并接入门禁（effective-price.int.spec 过期断言） | S12-0 | 外部助手 | sonnect | 1.5 | — | L1 | 已合并 9b294366 |
| T120-02 | 中间件去 Prisma 依赖（Edge 运行时警告根除） | S12-0 | 外部助手 | sonnect | 3.0 | — | L1 | 待开工 |
| T120-03 | 全量 e2e 在 Next 15.5.28 上跑通 + 3333 端口用例清理 | S12-0 | 外部助手 | sonnect | 4.0 | T120-01 | L2 | 已合并 086032e5（验收①③④绿：--workers=1 全量 230 例 0 failed；验收② blocked：3333 残留 4 处全在「允许修改」外，见 EVD-T120-03/deviation.md 1/2）；真缺陷 D1/D2/D3 已登记 defects.md 抄送 Hark |
| T120-04 | Docker 镜像真构建 + 容器内 run-due 调度验证（RK-11-07） | S12-0 | 外部助手 | sonnect | 2.0 | — | L1 | blocked:no-docker-egress（本机 Docker engine 29.4.3 可用但容器无外网：#13 [deps 9/9] `pnpm install --frozen-lockfile` 各 tarball ECONNREFUSED → BUILD_EXIT=1、未产出镜像；npmjs/npmmirror/dockerhub 三探针 http_code 均 000。验收①②未达、④沿用 T120-05 末跑全绿读数；卡面 `deploy/web/Dockerfile` 与 `.env.docker` 在本仓不存在（deploy/** 仅 7 个 .gitkeep），已按根 Dockerfile 代跑并记 deviation 1/2 待 Hark 裁决；解锁＝宿主机代理对 Docker 生效，或由 CI docker-build 收口①（②CI 未覆盖）） |
| T120-05 | 环境变量清单归一（.env.example ↔ process.env）+ 启动期 zod 校验 | S12-0 | 外部助手 | sonnect | 2.0 | — | L1 | 已合并 ef0dec6f（验收①②③④全绿：referenced 25 − example 差集 ∅、env.spec 3 例、tsc/lint/vitest 1857 tests/check-docs-rule/docs-facts 均 EXIT=0；缺必需变量启动即点名并退出）；spec-count pin 213→214 经用户授权越出本卡允许路径随 task-index 提交提出（EVD-T120-05/deviation.md 5）；遗留 deviation 6/7（guard run-all 未接 env-diff、目录结构文档等 3 处待同步）抄送 Hark |
| T120-06 | 需求追溯矩阵 V0.12 再生成（150 行）+ facts 断言改为动态读取 | S12-1 | 外部助手 | sonnect | 3.0 | — | L1 | 已合并 ebc2df10（验收①②③④全绿：矩阵升 v2.0 = 150 行、150 唯一 ID、与 03a V0.12 对称差 0、36 张引用卡文件齐；rtm-row-count 弃写死 158 与 V0.10.0 对照源，期望值改取 03a 当次实测，新增 rtm-id-unique 与 rtm-id-set-equal，rtm-gap-has-task 改认 T120-xx 卡号并按表头动态定位列位；变异检验三组（删一行／重复一行／表头改名）均 FAIL 且按 git hash 复原；facts 18 条 + rule + tsc + lint + vitest 1873 tests 全 EXIT=0；需求文档.md 同步 v1.20 改指 #v20 锚点）；deviation 8 条抄送 Hark（03a 生成器在转义竖线处截断 REQ-F-001、REQ-L-009 与 REQ-N-030 待下一版 03a 改判、docs/文档索引.md L18 在允许路径外未同步，归 T120-08 承接、再生成脚本留 .scratch 未入库）；Blocks T120-09／T120-36 解除 |
| T120-07 | V0.11.0 文档收口（README 重写、卡状态回写、裁决同步、CHANGELOG） | S12-1 | 外部助手 | haiku | 1.5 | — | L1 | 待开工 |
| T120-08 | 文档索引 / 目录结构文档 数字与版本校正 + 超 3000 字文档拆分 | S12-1 | 外部助手 | sonnect | 3.0 | — | L1 | 待开工 |
| T120-09 | 产品文档与代码不一致修订（02_ §四 中归属本卡的 6 条） | S12-1 | 外部助手 | haiku | 1.5 | T120-06 | L2 | 待开工 |
| T120-10 | ADR-0011 监控执行模型 + V0.12 契约落地到 @aidean/shared | S12-2 | Hark | opus | 4.0 | — | L1 | 已完成（Hark，2026-10-23） |
| T120-11 | monitor_catalogs 纳入 ScheduledScript + 按源 cadenceCron 判定 due | S12-2 | 外部助手 | sonnect | 5.0 | T120-10, T120-01, T120-12 | L3 | 待开工 |
| T120-12 | 后台『立即运行』真执行（意图表 + sidecar 消费 + 防重入 + 审计） | S12-2 | Hark | opus | 5.0 | T120-10 | L2 | 已完成 |
| T120-13 | 可靠性观测落库（幂等唯一键迁移 + llmtest 写入） | S12-3 | Hark | opus | 4.0 | T120-01, T120-12 | L3 | 已完成 |
| T120-14 | 可靠性读侧 API + 服务平台/模型详情可靠性展示 | S12-3 | 外部助手 | sonnect | 4.0 | T120-13, T120-10, T120-26, T120-16, T120-11 | L4 | 待开工 |
| T120-15 | 后台监控页运营化（运行队列、历史、立即运行反馈、频率生效提示） | S12-2 | 外部助手 | sonnect | 4.0 | T120-12, T120-26 | L3 | 待开工 |
| T120-16 | Artificial Analysis 署名展示（M-015 MUST） | S12-4 | 外部助手 | sonnect | 2.0 | — | L1 | 待开工 |
| T120-17 | 〔条件卡·Q-12-01〕多源可调用对外放行 | S12-4 | 外部助手 | sonnect | 1.0 | T120-10, T120-11, T120-14, T120-29 | 条件:Q-12-01 | 待开工 |
| T120-18 | 会话校验比对 tokenVersion（改密/封禁全端即时失效） | S12-5 | Hark | opus | 3.0 | — | L1 | 已完成（Hark，2026-10-23） |
| T120-19 | 已登录改密 API（旧密校验 + tokenVersion++ + 刷新令牌吊销） | S12-5 | Hark | opus | 3.0 | T120-10, T120-18 | L2 | 已完成（Hark，2026-10-23） |
| T120-20 | 找回密码（邮件验证码 purpose=reset，防枚举，限流） | S12-5 | Hark | opus | 4.0 | T120-10, T120-18, T120-19 | L3 | 已完成（Hark，2026-10-23） |
| T120-21 | 改密 / 找回密码页面（用户端） | S12-5 | 外部助手 | sonnect | 4.0 | T120-19, T120-20, T120-02 | L4 | 待开工 |
| T120-22 | Dock 常驻折叠：收藏 / 对比 两 Tab（客服 Tab 依 Q-12-03） | S12-6 | 外部助手 | sonnect | 6.0 | T120-26 | L3 | 待开工 |
| T120-23 | 自定义渠道保存时连通性探测（SSRF 防护） | S12-6 | Hark | opus | 4.0 | T120-10 | L2 | 已完成 |
| T120-24 | 余额不足切换免费额度的响应内轻提示 | S12-6 | 外部助手 | sonnect | 2.0 | T120-26 | L3 | 待开工 |
| T120-25 | 语义色令牌体系 + Tailwind 4 @theme 映射 + 包版本对齐 | S12-7 | Hark | opus | 6.0 | — | L1 | 已完成（Hark，2026-10-23） |
| T120-26 | 五态外壳上移 @aidean/ui（PanelState 通用化，用户端可用） | S12-7 | Hark | opus | 3.0 | T120-25 | L2 | 已完成（Hark，2026-10-23） |
| T120-27 | 色值/字号 codemod 工具 + 用户端（site/home/ladder/models）批次迁移 | S12-7 | 外部助手 | sonnect | 7.0 | T120-25, T120-26, T120-14, T120-16, T120-21, T120-22, T120-23, T120-24 | L5 | 待开工 |
| T120-28 | 管理端批次迁移：语义色 + 原生标签归零（RK-11-10 余量） | S12-7 | 外部助手 | sonnect | 6.0 | T120-25, T120-27, T120-15 | L6 | 待开工 |
| T120-29 | 非 admin 组件接入 @aidean/ui（38 个余量） | S12-7 | 外部助手 | sonnect | 4.0 | T120-27 | L6 | 待开工 |
| T120-30 | 组件测试基建（jsdom + Testing Library）+ 样例 | S12-7 | 外部助手 | sonnect | 3.0 | T120-25, T120-01 | L2 | 待开工 |
| T120-31 | 性能基线复测（15.5.28）+ CLS/TBT 定向治理 | S12-7 | 外部助手 | sonnect | 6.0 | T120-27, T120-29 | L7 | 待开工 |
| T120-32 | wallet / oauth 模块单测补齐 | S12-8 | 外部助手 | sonnect | 4.0 | — | L1 | 待开工 |
| T120-33 | V0.11 功能 e2e 补测（矩阵 CRUD、五态、分页 400、非管理员 403） | S12-8 | 外部助手 | sonnect | 4.0 | T120-03 | L3 | 待开工 |
| T120-34 | 关键交互组件测（Combobox、Dock、PasswordForm、ApiChannelsPanel） | S12-8 | 外部助手 | sonnect | 3.0 | T120-30, T120-21, T120-22, T120-23, T120-14, T120-15, T120-16, T120-24, T120-27, T120-28, T120-29, T120-31 | L8 | 待开工 |
| T120-35 | 〔条件卡·Q-12-02〕语言切换：撤除未用 lang 状态或启动 i18n | S12-6 | 外部助手 | haiku | 1.0 | T120-09 | 条件:Q-12-02 | 待开工 |
| T120-36 | V0.12 收口：RTM 回写 + 全量门禁 + 证据 + CHANGELOG | S12-8 | 外部助手 | sonnect | 3.0 | T120-01, T120-03, T120-04, T120-05, T120-06, T120-07, T120-08, T120-09, T120-14, T120-15, T120-16, T120-21, T120-22, T120-23, T120-24, T120-27, T120-28, T120-29, T120-31, T120-32, T120-33, T120-34 | L9 | 待开工 |

合计 36 张（条件卡 2 张）；Hark 9 张 / 36.0h；外部助手 27 张 / 90.5h。
