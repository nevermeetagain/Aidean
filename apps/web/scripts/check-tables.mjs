// 表结构与最小数据取证：products/partner_keys/vendors(+modelCount 非0)/packages(体验套餐)/system_configs(ladder 粒度)
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const products = await p.product.count();
  console.log("products rows:", products);

  const partnerKeys = await p.partnerKey.count();
  console.log("partner_keys rows:", partnerKeys);

  const vendors = await p.vendor.findMany({ select: { code: true, priority: true, modelCount: true, isActive: true } });
  console.log("vendors rows:", vendors.length, "| non0 modelCount:", vendors.filter((v) => v.modelCount > 0).length, "| priorities:", vendors.map((v) => `${v.code}=${v.priority}`).join(","));

  const packages = await p.package.count();
  const dayPkg = await p.package.findFirst({ where: { title: "体验套餐（日卡）", deletedAt: null } });
  console.log("packages rows:", packages, "| 体验套餐（日卡）exists:", Boolean(dayPkg));

  // 白名单 11 键存在性（须与 shared ADMIN_CONFIG_KEYS / shared ADMIN_CONFIG_REGISTRY / seed 四处一致；B-N11 扩容 8→11）
  const WHITELIST_KEYS = [
    "ladder_score_granularity",
    "site.name",
    "site.description",
    "site.logoUrl",
    "site.title",
    "site.faviconUrl",
    "pricing.evalPerModel",
    "pricing.currency",
    "security.accessTokenTtlMinutes",
    "security.refreshTokenTtlDays",
    "security.maxLoginAttempts",
  ];
  const rows = await p.systemConfig.findMany({
    where: { configKey: { in: WHITELIST_KEYS } },
    select: { configKey: true, configValue: true },
  });
  const byKey = new Map(rows.map((r) => [r.configKey, r.configValue]));
  const missing = WHITELIST_KEYS.filter((k) => !byKey.has(k));
  console.log(
    "system_configs whitelist:",
    `${WHITELIST_KEYS.length - missing.length}/${WHITELIST_KEYS.length} exists`,
    "| missing:",
    missing.length ? missing.join(",") : "(none)"
  );
  for (const k of WHITELIST_KEYS) {
    console.log(`  - ${k}:`, byKey.has(k) ? `exists:${byKey.get(k) === "" ? "(empty)" : byKey.get(k)}` : "false");
  }
}

main()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
