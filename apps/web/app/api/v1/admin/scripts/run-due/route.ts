/**
 * POST /api/v1/admin/scripts/run-due — 触发到期脚本执行（R-70）
 *
 * 双通道鉴权（D2 修复）：
 *  ① 内部服务令牌：scheduler sidecar 以 Authorization: Bearer <ADMIN_API_TOKEN> 调用，
 *     匹配 env.ADMIN_API_TOKEN 即放行（无需 Cookie session）。
 *  ② 管理员会话：admin UI 手动触发时走 Cookie session → requireAdminApi()。
 * 两种方式满足其一即可。未匹配内部令牌且无有效 admin session → 401/403。
 *
 * #69 防重入锁：sidecar 每分钟触发一次，而 nextRunAt 仅在执行完成后才重算——
 * 执行时长 >1 分钟的脚本会被下一次触发重复拉起（同一脚本最多 5 实例并行）。
 * 入口以 Redis SETNX 互斥（lock:scheduler:run-due，TTL=runScriptProcess 超时上限
 * 300s），完成后 Lua「值相等才删」原子释放（防 TTL 过期后误删他人锁）。
 * Redis 缺失/故障时 fail-open 无锁直跑：锁是尽力而为护栏，不阻断调度，
 * 与 lib/db/redis「缓存属可失组件」的降级哲学一致（dev 无 Redis 不受影响）。
 */

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { runDueScripts, type ExecuteResult } from '../../../../../../lib/features/admin/script-executor';
import { getRedis } from '../../../../../../lib/db/redis';
import { withApi } from '../../../_lib/handler';
import { ApiError, ERROR_CODES } from '../../../_lib/errors';

export const dynamic = 'force-dynamic';

const SCHEDULER_LOCK_KEY = 'lock:scheduler:run-due';
/** 与 runScriptProcess 的 spawn timeout（300s）对齐：锁最长持有不超过脚本超时上限 */
const SCHEDULER_LOCK_TTL_SECONDS = 300;

export const POST = withApi(async (req) => {
  // D2 修复：双通道鉴权
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  // 通道 ①：内部服务令牌（scheduler sidecar）——恒时比较防时序侧信道（#69），
  // 前置等长检查（timingSafeEqual 对不等长输入抛错）
  const internalToken = process.env.ADMIN_API_TOKEN;
  const isInternalService = !!(
    bearerToken &&
    internalToken &&
    bearerToken.length === internalToken.length &&
    timingSafeEqual(Buffer.from(bearerToken), Buffer.from(internalToken))
  );

  if (!isInternalService) {
    // 通道 ②：管理员会话（Cookie session，admin UI 手动触发）
    // 如果带了不匹配的 Bearer token，也走到这里 → requireAdminApi 会因无 Cookie 而 401
    await requireAdminApi("admin.scripts.write");
  }

  const executeDue = async () => {
    const results: ExecuteResult[] = await runDueScripts();
    return {
      triggered: results.length,
      results: results.map(r => ({
        executionId: r.executionId,
        status: r.status === 1 ? 'success' : r.status === 2 ? 'failed' : 'running',
        durationMs: r.durationMs,
        errorMsg: r.errorMsg,
      })),
    };
  };

  const redis = getRedis();
  if (!redis) {
    // 无 Redis（dev / 降级分支）：无锁直跑
    return executeDue();
  }

  const lockToken = randomUUID();
  const acquired =
    (await redis.setNxEx(SCHEDULER_LOCK_KEY, lockToken, SCHEDULER_LOCK_TTL_SECONDS)) === 'OK';
  if (!acquired) {
    // 已有实例在执行：本次触发幂等跳过（sidecar 收到 200，属正常节奏）
    return { triggered: 0, results: [], skipped: 'locked' as const };
  }
  try {
    return await executeDue();
  } finally {
    await redis.compareDelete(SCHEDULER_LOCK_KEY, lockToken);
  }
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
