# Tasks · implement-ladder-module

> 所属 Phase: 3 模块 1/4 | 四级层级 · 六字段 | 顺序 D(设计)→S(seed)→B(后端)→F(前端)→I(交互/e2e)

---

## Task L.0 设计先行产出 【依赖: 无 | 产出: docs/product/modules/天梯模块设计文档.md（原 features/ladder/DESIGN.md）】

- [x] #### SubTask L.0.1 设计文档回贴
  - 【目标】把 spec「设计先行交付物」四件（数据流图/表关系映射/缓存键规范/公式白名单）扩写为模块设计文档，实现者与评审共用
  - 【范围】新建 `apps/web/lib/features/ladder/DESIGN.md`（含 ASCII 数据流图、type→chartCode 映射表、缓存键规范、公式 AST 白名单、错误码引用）
  - 【验收】四节齐备；缓存键含版本段 `v1`；白名单明确禁 eval/Function
  - 【验证命令】`Select-String -Path docs/product/modules/天梯模块设计文档.md -Pattern '数据流','chartCode','ladder:matrix:v1','eval'`
  - 【产出】DESIGN.md
  - 【依赖】无
  - 【实施注记】2026-08-28 按铁律 1（实体文档仅存 docs/）迁移至 `docs/product/modules/天梯模块设计文档.md`（v1.1），代码注释与验证命令引用同步更新。

## Task L.1 种子数据 【依赖: L.0 | 产出: 可出榜的演示数据集】

- [x] #### SubTask L.1.1 seed 扩容对齐 v2 schema（静态验证 prisma validate+seed tsc 0 错；count 断言待 Docker 引擎恢复后跑 db push+seed 取证；顺修 compose dev yaml 注释头非法 `--`→`#`；station-overview chartConfig 已补）
  - 【目标】22 厂商 + ≥60 模型（四维评分+价格+基准）+ ranking_weights(30/30/20/20) + 两类 ladder_charts 定义，字段全部命中新 schema 列名
  - 【范围】修改 `apps/web/prisma/seed.ts`；不动已删除域（skill/mcp/agent 保持不 resurrect）
  - 【验收】seed 运行后 DB 内 vendors≥22、aiModels≥60、modelScores=模型数、rankingWeights=4、ladderCharts≥2（llm-professional/station-overview）
  - 【验证命令】docker compose ps 确认 PG 存活后：`pnpm --filter web exec prisma db push && pnpm --filter web db:seed`，随后 `npx prisma studio` 或 psql 计数断言（CI 不便时以 seed 脚本尾部 count 日志取证）
  - 【产出】演示数据集
  - 【依赖】L.0

## Task 0.2 排名服务实装（features/ranking） 【依赖: L.1 | 产出: 加权重算+公式解析器】

- [x] #### SubTask L.2.1 recapScores 四维加权重算
  - 【目标】按 ranking_weights 聚合 model_scores → composite_score 全量刷新（isCurrent 版本化）
  - 【范围】实装 `apps/web/lib/features/ranking/service.ts,repository.ts`
  - 【验收】单测：权重 25×4 下 composite=(各维均值)；缺维用例跳过该维并归一化权重和为 1
  - 【验证命令】`pnpm --filter @aidean/shared test recap` 不适用——测试位于 apps/web：新增 `lib/features/ranking/__tests__/recap.spec.ts` 并以 `pnpm --filter web test recap` 运行全绿
  - 【产出】rankService.recap()
- [x] #### SubTask L.2.2 formula-parser 安全求值器（vitest 12 passed；grep eval/new Function 零匹配）
  - 【目标】自定义排序公式 AST 解析（变量白名单 {score}/{priceInput}/{contextLength}；运算符 + - * / ( )），禁 eval/new Function
  - 【范围】新建 `lib/features/ranking/formula-parser.ts` + 单测
  - 【验收】合法公式求值正确；非法括号/未知变量/除零抛 FormulaError(带中文 message)；源码 grep 无 `eval(`/`new Function`
  - 【验证命令】`pnpm --filter web test formula` 全绿 + `Select-String -Path lib/features/ranking/formula-parser.ts -Pattern 'eval\(|new Function'` 无匹配
  - 【产出】解析器
  - 【依赖】L.2.1

## Task L.3 天梯读穿缓存与矩阵接口（features/ladder） 【依赖: L.2 | 产出: GET /api/v1/ladder】

- [x] #### SubTask L.3.1 redis 单例补位
  - 【目标】统一 ioredis 连接（懒创建、连接失败降级 null 不抛）
  - 【范围】新建 `apps/web/lib/db/redis.ts`；.env.example 补 REDIS_URL 注释（已有则跳过）
  - 【验收】getRedis() 二次调用返回同一实例；无 REDIS_URL 时返回 null 且 ladder 服务走直查分支
  - 【验证命令】tsc 编译通过 + 单测 stub 断言降级路径返回值来自 DB
  - 【产出】redis 单例
  - 【依赖】L.0

- [x] #### SubTask L.3.2 LadderService.getMatrix 读穿实现（vitest ladder 13/13）
  - 【目标】filters/sort/type → filterHash → Redis HIT 返回 / MISS 聚合构建矩阵并回写 TTL 3600s；导出 invalidateLadderCache() 按 `ladder:matrix:*` SCAN 批删
  - 【范围】实装 `lib/features/ladder/{service,repository}.ts`；行档位 = compositeScore 每 5 分一档降序、列=厂商 tierLevel 再名称、单元格含 modelId/name/score
  - 【验收】单测：同参数二次调用第二次 cache:HIT（redis mock）；invalidate 后再调为 MISS；station 类型走 api_stations 分支结构一致
  - 【验证命令】`pnpm --filter web test ladder` 全绿
  - 【产出】矩阵服务
  - 【依赖】L.3.1、L.2.*

- [x] #### SubTask L.3.3 API 路由接线（ladder/models/[id]/stations 四端点，20002 信封断言通过，tsc 0 错）
  - 【目标】GET /api/v1/ladder 用 shared LadderQuerySchema 校验 → withApi 包装经 service；models 三端点分页/详情/站点资费
  - 【范围】实装 `app/api/v1/ladder/route.ts`、`app/api/v1/models/route.ts`、`app/api/v1/models/[id]/route.ts`、`app/api/v1/models/[id]/stations/route.ts`
  - 【验收】curl type=skills 得 code=20002 信封；type=models 200 且 rows 非空（有种子）；[id] 详情含参数表三价格字段；x-request-id 头存在
  - 【验证命令】`Invoke-RestMethod 'http://localhost:3000/api/v1/ladder?type=skills'` 观察信封（或以 route handler 单测替代取证）
  - 【产出】四端点
  - 【依赖】L.3.2

## Task L.4 前端视图层 【依赖: L.3 | 产出: /models 与 /ladder 真实榜】

- [ ] #### SubTask L.4.1 筛选栏与排序栏组件
  - 【目标】六筛选（互斥展开面板/「全部」循环态）+ 五排序（含自定义公式输入行内报错不阻断）
  - 【范围】新建 `components/ladder/{LadderFilterBar,LadderSortBar}.tsx`；状态提升至 `stores/ladderStore.ts`（zustand：filters/sort/view/pending）
  - 【验收】筛选变更即置 pending 并去重触发 fetch；公式错误时 sort 保持 lastGood 且输入框下方红字提示；URL query 双向同步（可分享回放）
  - 【验证命令】Storybook 缺席则以 Playwright 冒烟覆盖（并入 C.3 e2e 新 spec）
  - 【产出】两栏组件
  - 【依赖】L.3.3

- [x] #### SubTask L.4.2 矩阵表格与柱状图双视图
  - 【目标】同源 matrixData 渲染：MatrixTable（行档位色阶 accent 透明度阶梯/列头品牌色圆点/hover 高亮行列/单元格点击路由跳详情）+ BarChart（EChartWrapper 动态 import）
  - 【范围】新建 `components/ladder/{LadderMatrixTable,LadderBarChart,VersionSwitcher}.tsx`；`/models/page.tsx` 与 `/ladder/page.tsx`(新建目录) 装配 Server 取数 + Client 视图切换
  - 【验收】SSR HTML 含首行档位与厂商名；client 切视图 network 断言零新请求；柱状图点击柱体跳对应最高分模型详情
  - 【验证命令】`pnpm build` 含两页 Static 产物；e2e ladder-matrix 用例（见 I 任务）绿
  - 【产出】双视图页面
  - 【依赖】L.3.3

- [ ] #### SubTask L.4.3 首页入口链校正
  - 【目标】首页 ModelSection 四卡链接对齐真实路径：对比天梯图→/models、云服务天梯图→/ladder、模型对比→/compare(保持占位)、API 平台详情→/docs
  - 【范围】修改 `components/home/ModelSection.tsx` 链接数组
  - 【验收】四 href 与上表一致
  - 【验证命令】`Select-String -Path components/home/ModelSection.tsx -Pattern '/ladder'`,`'/compare'`
  - 【产出】入口修正
  - 【依赖】L.4.2

## Task L.5 交互细化与 e2e 【依赖: L.4 | 产出: 交互红线核验】

- [x] #### SubTask L.5.1 详情页锚点目录
  - 【目标】详情页左目录平滑滚动高亮（scroll-behavior smooth + IntersectionObserver 高亮当前节）
  - 【范围】`app/(web)/models/[slug]/page.tsx`（slug 直查 ai_models.slug）、复用 RevealOnScroll 家族策略
  - 【验收】SSR 含四节标题；点击目录锚点滚动平滑且高亮随动
  - 【验证命令】Playwright detail-anchor 用例
  - 【产出】详情体验闭环
  - 【依赖】L.4.2

- [x] #### SubTask L.5.2 e2e 用例 ladder-matrix.spec.ts（总 8 tests 全绿 25.4s；4 断言等价调整已注记）
  - 【目标】四段冒烟：双榜加载有行；筛选生效改 query；切视图零网络请求；非法 type API 返 20002
  - 【范围】新建 `e2e/tests/ladder-matrix.spec.ts`（请求计数用 page.route 计数器实现）
  - 【验收】全部绿；请求计数断言切换视图 newRequests===0
  - 【验证命令】`pnpm test:e2e`（总用例数增至 ≥7）
  - 【产出】G-3 扩容
  - 【依赖】L.4.*、L.5.1

## Task L.6 门禁收口 【依赖: L.5 | 产出: 全绿三连】

- [x] #### SubTask L.6.1 全链门禁与本 checklist 收口（四连：shared 35/35→build 0(36.5s,17 路由)→gates 5/5→e2e 8/8(26.0s)；SSR DB 失败降级分支实战验证生效）
  - 【目标】build/gates/test:e2e/test(shared+web) 四连绿；checklist 全勾并回填 establish-dev-workflow Phase 3 组对应项（3-1~3-4 中天梯图部分）
  - 【范围】本目录 checklist 全量；establish-dev-workflow/checklist.md Phase 3 组勾选天梯图相关
  - 【验收】四连命令退出码 0
  - 【验证命令】`pnpm build; pnpm gates; pnpm test:e2e; pnpm --filter @aidean/shared test`
  - 【产出】模块 CLOSE 就绪
  - 【依赖】L.5.*

---

# 核验修复回路

- [ ] Fix-3（引用检查点 L6-1 / e2e webServer）：dev server 二次 MODULE_NOT_FOUND（'next/dist/pages/_app'）——与 Fix-2 同源（install 重组后 next 虚拟实例损坏）。修复：`pnpm install --force` 后重跑四连全须绿。
- [x] Fix-3 已执行：install --force 重建后复跑 e2e → 8 passed，退出码 0（详见 L.6.1 取证）

# Task Dependencies

```
L.0 → L.1 → {L.2.1→L.2.2} → {L.3.1→L.3.2→L.3.3} → {L.4.1,L.4.2}∥ → L.4.3
                                                            ↘ L.5.1 → L.5.2 → L.6
（L.4 两子任务可并行；L.5.1 仅依赖 L.4.2 的详情页）
```

# 验证基线说明

- e2e 需要 dev server + DB 有种子数据：本地跑 `docker compose up -d postgres redis` → db push → seed → `pnpm dev`（playwright.config 已 reuseExistingServer）
- 若 CI 无 Docker：DB 相关检查点标注「本地取证」并在 checklist 留执行记录截图/日志摘要
