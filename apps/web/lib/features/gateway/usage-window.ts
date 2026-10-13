/**
 * 统计报表预设区间 → 日期窗口纯函数（控制台问题 A 修复）：
 *
 * 公式与服务端 getUsageStats 完全同式（lib/features/gateway/service.ts USAGE_STATS_RANGE_DAYS 段）：
 *   end = 今天本地 0 点；start = end - (days - 1) 天。
 * 前端 preset chip 点击 / 初始挂载均通过本函数回填 dateFrom/dateTo，
 * 保证「显示区间」与「后端取数窗口」字节一致，消灭 preset/custom 双事实源漂移。
 */
export const PRESET_RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

export type PresetRangeId = keyof typeof PRESET_RANGE_DAYS;

/** 本地时区 → YYYY-MM-DD（与服务端 `<dateFrom>T00:00:00` 解析口径对齐，禁用 toISOString 以免 UTC 跨日） */
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * preset → 含今天的窗口（dateTo=今天、dateFrom=今天-(days-1)）。
 * today 由调用方传入便于单测锚定时区；不修改入参。
 */
export function presetWindow(range: PresetRangeId, today: Date): { dateFrom: string; dateTo: string } {
  const days = PRESET_RANGE_DAYS[range] ?? 30;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { dateFrom: toLocalIso(start), dateTo: toLocalIso(end) };
}