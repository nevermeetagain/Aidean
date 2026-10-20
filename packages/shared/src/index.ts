// @aidean/shared - 跨端唯一契约源(唯一允许 barrel 的契约包)
export * from "./schemas/auth.schema";
export * from "./schemas/user.schema";
export * from "./schemas/models.schema";
export * from "./schemas/ladder.schema";
export * from "./schemas/billing.schema";
export * from "./schemas/gateway.schema";
export * from "./schemas/packages.schema";
export * from "./schemas/redemption.schema";
export * from "./schemas/admin.schema";
export * from "./schemas/menu.schema";
export * from "./schemas/rbac.schema";
export * from "./schemas/common.schema";
export * from "./schemas/system.schema";
export * from "./schemas/feature-flags.schema";
export * from "./schemas/favorites.schema";
export * from "./schemas/site-content.schema";
export * from "./schemas/news.schema";
export * from "./schemas/roadmap.schema";
export * from "./schemas/home-content.schema";
export * from "./schemas/site-sections.schema";
export * from "./schemas/docs-content.schema";
export * from "./schemas/logs.schema";
export * from "./schemas/reports.schema";
export * from "./schemas/promotion.schema";
export * from "./schemas/price-batch.schema";
export * from "./schemas/monitoring.schema";

export * from "./constants/ladder.constants";
export * from "./constants/gateway.constants";
export * from "./constants/user.constants";
export * from "./constants/billing.constants";
export * from "./constants/admin-config.constants";
export * from "./constants/news.constants";

export * from "./utils/money";
export * from "./utils/billing";
export * from "./utils/pricing-config";
export * from "./utils/provider-pricing";
export * from "./utils/price-normalization";

// 全项目唯一错误码源（ADR-P001 / TASK-001）；apps/web 侧仅允许重导出（TASK-002）。
export * from "./errors";

export * from "./permissions";

export * from "./types/index";