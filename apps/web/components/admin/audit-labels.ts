/**
 * UX-27：审计日志对运营展示的中文业务名（纯数据，无 "use client"，供 RSC page.tsx 与客户端组件共用）。
 * 值为后端原始 tableName / action 码（API 契约不变），标签仅用于展示。
 */
/** 可筛选的数据表（值 = 审计 tableName 原值，标签 = 运营可读中文名） */
export const AUDIT_TABLE_LABEL: Record<string, string> = {
  ai_models: "模型",
  users: "用户",
  benchmarks: "基准测试",
  sync_batches: "同步批次",
  wallets: "钱包",
  stations: "API 站点",
};

/** 操作类型（值 = 后端 action 码） */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "1": "新增",
  "2": "修改",
  "3": "删除",
};

/** 白名单（URL 手改的非法值回落「全部」） */
export const AUDIT_TABLE_VALUES = Object.keys(AUDIT_TABLE_LABEL);
export const AUDIT_ACTION_VALUES = Object.keys(AUDIT_ACTION_LABEL);
export const AUDIT_QUERY_KEYS = ["page", "tableName", "action"] as const;
