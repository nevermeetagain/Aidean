# EVD-101 · 汇率数据源与条款

- 源：**Frankfurter**（开源，https://github.com/lineofflight/frankfurter），公共实例 `https://api.frankfurter.dev`。
- 端点：`GET https://api.frankfurter.dev/v2/rate/usd/cny` → `{"date":"2026-10-20","base":"USD","quote":"CNY","rate":6.6761}`（2026-10-20 实测）。
- 条款（https://frankfurter.dev/ FAQ，2026-10-20 读取）：
  - 无需 API Key（"You don't need an API key"）；
  - 混合汇率（blended）为 Frankfurter 自行计算，**可免费商用**（"Blended rates are Frankfurter's own calculation and free to use"）；直连单一央行 provider 端点另受各 provider 条款约束——本脚本只用混合端点；
  - **允许本地落库缓存**（"Storing daily observations locally for caching or historical analytics is encouraged"）；
  - 无配额，仅防滥用限速；每日一次调用远低于限速。
  - 汇率为中间价（mid-market），日频更新。
- 选型依据：26 号裁决「汇率取最新市场汇率，每天只用一个汇率」+ 待复议栏「免费公开源，如 ECB/Frankfurter」；ADR-P005 §2 采集由 TASK-101 承担。
- 可替换：环境变量 `FX_DAILY_SOURCE_URL` 指向同形端点（如自建 Frankfurter 实例），响应仍须为 `{base:"USD",quote:"CNY",rate}`。
