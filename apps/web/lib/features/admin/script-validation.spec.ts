/**
 * script-validation.spec.ts — L2 脚本调度入站校验纯函数守卫。
 *
 * 覆盖：scriptPath 白名单（放行 crawl/ranking、拒绝越界/非 .ts）、
 * cron 校验（合法/非法）、nextRunAt 计算优先级（intervalDays > cron > null）。
 */
import { describe, it, expect } from 'vitest';
import {
  isValidScriptPath,
  validateCron,
  computeNextRunForSchedule,
} from './script-validation';

describe('script-validation (L2 CUD 入站校验)', () => {
  it('scriptPath 白名单：放行既有采集/排名脚本', () => {
    expect(isValidScriptPath('scripts/crawl/crawl_models.ts')).toBe(true);
    expect(isValidScriptPath('scripts/crawl/crawl_api_stations.ts')).toBe(true);
    expect(isValidScriptPath('scripts/ranking/update_ranking.ts')).toBe(true);
  });

  it('scriptPath 白名单：拒绝越界/非 ts/任意目录', () => {
    expect(isValidScriptPath('scripts/db/migrate.ts')).toBe(false);
    expect(isValidScriptPath('../../etc/passwd')).toBe(false);
    expect(isValidScriptPath('scripts/crawl/crawl_models.js')).toBe(false);
    expect(isValidScriptPath('scripts/crawl_models.ts')).toBe(false);
    expect(isValidScriptPath('')).toBe(false);
  });

  it('validateCron：合法表达式返回 null', () => {
    expect(validateCron('0 2 * * *')).toBeNull();
    expect(validateCron('0 3 * * 0')).toBeNull();
  });

  it('validateCron：非法表达式返回错误文案', () => {
    expect(validateCron('not a cron')).toMatch(/非法 cron/);
    expect(validateCron('99 99 99')).toBeTruthy();
  });

  it('computeNextRunForSchedule：intervalDays 优先于 cron', () => {
    const next = computeNextRunForSchedule({ intervalDays: 2, cronExpression: '0 2 * * *' });
    expect(next).toBeInstanceOf(Date);
    const diffDays = Math.round((next!.getTime() - Date.now()) / 86_400_000);
    expect(diffDays).toBe(2);
  });

  it('computeNextRunForSchedule：仅有 cron 时按 cron 解析', () => {
    const next = computeNextRunForSchedule({ cronExpression: '0 2 * * *' });
    expect(next).toBeInstanceOf(Date);
    expect(next!.getTime()).toBeGreaterThan(Date.now());
  });

  it('computeNextRunForSchedule：无有效调度返回 null', () => {
    expect(computeNextRunForSchedule({})).toBeNull();
    expect(computeNextRunForSchedule({ intervalDays: null, cronExpression: null })).toBeNull();
  });
});
