> 版本: v0.1 | 更新: 2026-10-24 | T120-16 偏离登记（外部助手）

1. 验收范围收敛（天梯/对比未做）：卡面目标含「天梯、模型详情、对比」三处，本卡仅落地模型详情页。
   根因：天梯数据源 repository.getModelsForMatrix 取 model_scores（composite 四维均值），LadderRankEntry 无 sourceName/AA 字段；
   「有 AA 才渲染」需改 repository/service/types/API（全在本卡允许路径外）。对比页（/evaluations、components/site/CompareDock）亦不在允许路径。
   处理：经用户裁决收敛到详情页；天梯/对比 AA 署名需 Hark 评估在 ladder 数据链新增 hasAaData 标志（另开卡或扩权）。

2. 越界两处（用户 2026-10-24 授权，参照 T120-05 spec-count 越界先例；本次授权不构成通用先例，后续越界照旧先问）：
   - 新增 e2e/web/aa-source-attribution.spec.ts（详情页 有AA→可见 / 非AA→不出现 / 无基准→不出现，prisma 夹具+afterAll 清理）。
   - scripts/check-docs-facts.mjs spec-count expect "222"→"223"（仅改此 1 行数字，未动 desc 历史串与其他 pin）。
   理由：卡面验收要「e2e/组件测：可见署名」，但 e2e/** 与 check-docs-facts.mjs 均不在本卡允许修改路径。

3. 卡面验证命令不可运行：`pnpm -C apps/web exec vitest run components/site` 因 apps/web 无 jsdom/@testing-library、
   vitest.config include 仅 lib/**/*.spec.ts、environment=node，组件渲染测无法被发现/运行。
   组件级 vitest 断言顺延至 T120-30（jsdom 基建）/T120-34（关键交互组件测）——请在这两张卡验收补「AA 署名组件级 vitest 断言」。
   本卡以 e2e（Playwright 真实浏览器渲染详情页）满足验收①「含 AA 页面可见署名」。

4. check-docs-facts desc 历史串仍写「spec 文件总数 = 222」（未同步），系遵循「只改 expect 一个数字」的最小授权；功能断言 expected=223==actual=223 通过。
   建议 Hark 下次触该 pin 时一并补 desc 注记（T120-16 新增 e2e/web/aa-source-attribution.spec.ts 222→223）。
