# TASK-101：每日汇率采集（公开免费源 → 日汇率快照表）

> 版本: v1.0 | 创建: 2026-10-20 | 依据: 26_用户裁决记录 U-15、27_核心与非核心重划分
> 执行者：**助手 B** ｜ 前置：TASK-047（Hark，日快照表与读取接口）已推送

## 目标
`scripts/crawl/fx_daily.ts` 每天拉取一次 USD↔CNY（及 047 契约列出的币种）最新汇率，按 047 定义的表与唯一键（日期×币对）幂等写入；同一天重复运行不产生第二条；源失败时保留前一日快照并非零退出。

## 允许修改
- `scripts/crawl/fx_daily.ts`、`scripts/crawl/__tests__/fx_daily.spec.ts`
- `scripts/check-docs-facts.mjs`（仅计数，R10-01）
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-101/**`

## 验收
- [ ] 单测 ≥5：正常写入 / 同日重跑幂等 / 源 5xx 不覆盖 / 非法数值拒绝 / 时区按 Asia/Shanghai 取日期
- [ ] 真 PG16 实跑一次，`SELECT` 结果入证据
- [ ] 数据源为免费公开、无需 Key（如 Frankfurter/ECB），在证据中记录源 URL 与条款
- [ ] 全局门禁不退化
