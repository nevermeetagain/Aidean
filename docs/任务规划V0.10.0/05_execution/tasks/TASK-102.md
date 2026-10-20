# TASK-102：请求级展示币种解析（IP 国家 → CNY / USD）

> 版本: v1.0 | 创建: 2026-10-20 | 依据: 26_用户裁决记录 U-15
> 执行者：**助手 B** ｜ 前置：TASK-047（Hark，币种契约）已推送

## 目标
`apps/web/lib/currency/` 提供 `resolveDisplayCurrency(headers)`：读部署层国家头（如 `cf-ipcountry` / `x-vercel-ip-country` / 自定义 `x-geo-country`，按 047 契约顺序），CN → CNY，其他与未知 → USD；`middleware.ts` 只负责把结果写入请求头，不做 GeoIP 外网查询；前台读取该值供 053 使用。不改扣费。

## 允许修改
- `apps/web/lib/currency/**`
- `apps/web/middleware.ts`（仅新增币种头，不改现有逻辑）
- `scripts/check-docs-facts.mjs`（仅计数）
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-102/**`

## 验收
- [ ] 单测 ≥6：CN / US / JP / 缺头 / 非法值 / 多头优先级
- [ ] 现有 middleware 测试与 e2e 不退化
- [ ] 全局门禁不退化
