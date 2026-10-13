/**
 * L2 自定义频率管理 — 脚本调度入站校验纯函数集合。
 *
 * 抽为独立模块（无 prisma / next 依赖）以便单测直接断言，
 * 与服务端 route 共用同一真源，避免校验逻辑在多处漂移。
 */
import { CronExpressionParser } from 'cron-parser';

/**
 * 允许被登记/改写的脚本路径白名单：仓库内 scripts/<crawl|ranking>/<file>.ts。
 * 防御目的：后台仅能调度项目自带的采集/排名脚本，杜绝任意路径或越权脚本注入
 * （与 seed 中既有 scriptPath 一致：scripts/crawl/crawl_models.ts、scripts/ranking/update_ranking.ts）。
 */
export const SCRIPT_PATH_ALLOWLIST = /^scripts\/(?:crawl|ranking)\/[\w.-]+\.ts$/;

export function isValidScriptPath(path: string): boolean {
  return SCRIPT_PATH_ALLOWLIST.test(path);
}

/** cron 校验：合法返回 null，非法返回可读错误文案（不抛异常，交由 route 转 400）。 */
export function validateCron(expr: string): string | null {
  try {
    CronExpressionParser.parse(expr, { tz: process.env.TZ ?? 'Asia/Shanghai' });
    return null;
  } catch (e) {
    return `非法 cron 表达式：${e instanceof Error ? e.message : String(e)}`;
  }
}

/**
 * 依据 intervalDays（优先）或 cronExpression 计算下次运行时间；无有效调度返回 null（不自动调度）。
 * 与 script-executor.computeNextRun 同优先级口径，仅面向「新建 / 刚改写频率」的原始入参。
 */
export function computeNextRunForSchedule(schedule: {
  intervalDays?: number | null;
  cronExpression?: string | null;
}): Date | null {
  if (schedule.intervalDays && schedule.intervalDays > 0) {
    const next = new Date();
    next.setDate(next.getDate() + schedule.intervalDays);
    return next;
  }
  if (schedule.cronExpression) {
    try {
      const interval = CronExpressionParser.parse(schedule.cronExpression, {
        tz: process.env.TZ ?? 'Asia/Shanghai',
      });
      return interval.next().toDate();
    } catch {
      return null;
    }
  }
  return null;
}
