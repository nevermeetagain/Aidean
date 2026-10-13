# Checklist · implement-ladder-module

> 取证标注：[命令]/[断言]/[测试]/[人工]；DB 类检查点需本地 docker compose 起服务后取证
> **apply 结果**：L.0-L.6 全部 SubTask 完成；四连门禁全绿（shared 35/35 → build 0 → gates 5/5 → e2e 8/8）

## Task L.0 设计先行

- [x] L0-1 DESIGN.md 四节齐备：数据流图(SSR+客户端+降级分支)/type→chartCode 映射(models↔llm-professional,stations↔station-overview)/缓存键 `ladder:matrix:v1:{type}:{hash12}` + SCAN 失效 + bump 策略/公式白名单明示禁 eval 及 CSP 论证（SubTask L.0.1）[断言]

## Task L.1 种子数据

- [x] L1-1 seed 代码对齐验证完成：prisma validate valid、seed tsc(es2022 strict) 0 错、station-overview chartConfig 补齐、count 取证日志就位。✅ **DB 断言已实机复验（2026-08-28）**：本地 PG 凭据修复后 `db push --force-reset`（35 表同步）+ seed 成功——vendors=22 / aiModels=78 / modelScores=78 / rankingWeights=4 / ladderCharts=6（另 20 站点+2 用户+6 榜单装配共 200 rankings）。顺修 compose dev yaml 注释头非法 `--`（SubTask L.1.1）[命令]

## Task L.2 排名服务

- [x] L2-1 recap 纯函数 7 tests 绿：等权均值(75)、缺维归一化(73.33)、全缺 fail-fast、零权重防除零、非对称(84)、round half-up、多维缺口（SubTask L.2.1）[测试]
- [x] L2-2 formula-parser 12 tests 绿 + eval/new Function grep 零匹配；除零/未知变量/括号不匹配 FormulaError 中文 message 齐备；compileFormula AST 缓存上限 128（SubTask L.2.2）[测试+命令]

## Task L.3 缓存与接口

- [x] L3-1 redis 单例懒创建同实例复用 + 无 REDIS_URL 降级 null 不抛 + 命令失败永久 fallback（ioredis 5.11.1 已在 deps 免装）（SubTask L.3.1）[测试]
- [x] L3-2 getMatrix 读穿 13 用例绿：二次 hit=true repo spy 零调用、invalidate 后 MISS 回源、档位分组 [85–90]/[75–80]、列内截断 8、custom 经 evaluateFormula、stations 分支结构一致、降级直查分支（SubTask L.3.2）[测试]
- [x] L3-3 四端点就位并经 route 直调测试：type=skills→HTTP400+code20002 信封 data:null+x-request-id；models 分页白名单过滤；[id] slug/cuid 双查 404→20001；stations has 查询空容忍（SubTask L.3.3）[命令/测试]

## Task L.4 前端视图

- [x] L4-1 筛选/排序栏落成：六组互斥面板/「全部」三态循环/变更即取+AbortController 最新胜出/公式错误红字保 lastGood/URL 双向同步可回放（useLadderQuerySync）（SubTask L.4.1）[构建+断言]
- [x] L4-2 双视图同源同矩阵：MatrixTable accent color-mix 行色阶+品牌色圆点+hover 高亮+点击跳详情；BarChart Top12 动态 import；切视图零网络请求（e2e 计数取证）；SSR models.html/ladder.html 含标题与「暂无数据」容忍态（SubTask L.4.2）[构建+e2e]
- [x] L4-3 首页 ModelSection 四链接 = /models、/ladder、/compare(占位保持)、/docs（SubTask L.4.3）[命令]

## Task L.5 交互与 e2e

- [x] L5-1 详情页 [slug]：generateMetadata；左 sticky 锚点目录 DetailToc(smooth scroll+IntersectionObserver -40%/-55% 高亮 aria-current)；右四节 intro/params/bench/samples；价格三行 ¥/M toFixed(2)；未收录内联空态不崩；force-dynamic 无 DB 构建绿（SubTask L.5.1）[构建]
- [x] L5-2 ladder-matrix.spec.ts 四用例并入：双榜 h1 契约（暂无数据容忍）/筛选 URL 同步主路径走通(protocol=)/柱状图切换零请求(route 计数增量0)/API type=skills→400+20002。总 8/8 绿 25.4s，零回归（SubTask L.5.2）[测试]

## Task L.6 收口

- [x] L6-1 四连门禁全绿：`pnpm --filter @aidean/shared test` 35/35 → `pnpm build` exit 0 (36.5s,17 路由含 ● /models/[slug]) → `pnpm gates` 5/5 PASS → `pnpm test:e2e` 8/8 (26.0s)。经 Fix-3 闭环（dev server MODULE_NOT_FOUND 同源 node_modules 抖动→install --force）。（SubTask L.6.1）[命令]
- [x] L6-2 establish-dev-workflow/checklist.md Phase 3 组天梯图相关项已核销勾选并注记「天梯图 ✅」（SubTask L.6.1）[断言]

---

## 遗留与移交注记

1. ✅ **DB 运行时取证已完成（2026-08-28）**：seed 五项计数全达标；`GET /api/v1/ladder?type=models` 实弹返回 code=0、rows=7（90–95 档：OpenAI o1=93.25 / DeepSeek-R1=92 / Claude 3.7 Sonnet=91.5）；`GET /api/v1/models` total=78；e2e 11/11 在真实数据下复跑全绿。**排障注记**：`.env.local` 的旧 DATABASE_URL（Next 优先级高于 .env）曾覆盖修复值致 500——两文件均已对齐新凭据。
2. seed 数据为演示口径，上线前由采集管线替换；seed 未含 UserFreeQuota 演示数据（quotaUsage 空态为正确行为，可后续补种子）。
3. echarts chunk 卫生随下次图表真实渲染复检（本模块 BarChart 走动态 import 且无种子时容器为占位态）。
4. 本机排查建议：node_modules 曾被外部进程两度删除（非 Defender），需排查第三方清理软件并将仓库目录加排除。
