/**
 * 同步调度器 (Sync Scheduler)
 * 基于 node-cron 实现定时同步任务
 * 
 * 功能：
 * 1. 每日 00:00 自动执行全量同步
 * 2. 支持手动触发同步
 * 3. 防止重复执行（锁机制）
 * 4. 支持优雅关闭
 */

// 注意: 使用 cron 需要安装依赖: npm install cron && npm install -D @types/cron
// import { CronJob } from 'cron';
import { executeFullSync, getSyncStatus } from './sync-orchestrator';
import type { SyncConfig, SyncResult } from './types/sync';

// 调度器状态
type JobHistoryEntry = {
  jobId: string;
  startedAt: Date;
  completedAt?: Date;
  result?: SyncResult;
};

interface SchedulerState {
  isRunning: boolean;
  currentJob: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  jobHistory: JobHistoryEntry[];
}

// 全局状态
const state: SchedulerState = {
  isRunning: false,
  currentJob: null,
  lastRunAt: null,
  nextRunAt: null,
  jobHistory: [],
};

// Cron 任务实例
// let dailyJob: CronJob | null = null;
let dailyJob: any = null;

/**
 * 初始化调度器
 * 启动每日定时同步任务
 */
export function initScheduler(): void {
  if (dailyJob) {
    console.log('[Scheduler] Already initialized');
    return;
  }

  // TODO: 实现定时调度（需要安装 cron 包）
  // 当前版本仅支持手动触发
  console.log('[Scheduler] Initialized - Manual trigger only (cron not installed)');
}

/**
 * 停止调度器
 */
export function stopScheduler(): void {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * 执行定时同步任务
 */
async function runScheduledSync(jobType: string): Promise<void> {
  // 检查是否已有任务在运行
  if (state.isRunning) {
    console.log('[Scheduler] Another sync is running, skipping...');
    return;
  }

  const jobId = `${jobType}-${Date.now()}`;
  const jobStart = new Date();
  
  // 更新状态
  state.isRunning = true;
  state.currentJob = jobId;
  
  const historyEntry: JobHistoryEntry = {
    jobId,
    startedAt: jobStart,
  };
  state.jobHistory.push(historyEntry);
  
  console.log(`[Scheduler] Starting ${jobType} sync job: ${jobId}`);

  try {
    // 执行同步
    const result = await executeFullSync({
      dryRun: false,
      sources: ['openrouter', 'arena'],
    });
    
    // 更新历史记录
    historyEntry.completedAt = new Date();
    historyEntry.result = result;
    
    // 更新最后运行时间
    state.lastRunAt = jobStart;
    
    if (result.success) {
      console.log(`[Scheduler] ${jobType} sync completed successfully`);
      console.log(`  - Models found: ${result.stats.modelsFound}`);
      console.log(`  - New: ${result.stats.modelsNew}`);
      console.log(`  - Updated: ${result.stats.modelsUpdated}`);
      console.log(`  - Duration: ${result.stats.duration}ms`);
    } else {
      console.error(`[Scheduler] ${jobType} sync failed:`, result.errors);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Scheduler] ${jobType} sync error:`, errorMessage);
    
    historyEntry.completedAt = new Date();
  } finally {
    // 清理状态
    state.isRunning = false;
    state.currentJob = null;
    
    // 更新下次运行时间
    // if (dailyJob) {
    //   state.nextRunAt = dailyJob.nextDate().toJSDate();
    // }
    
    // 限制历史记录数量
    if (state.jobHistory.length > 100) {
      state.jobHistory = state.jobHistory.slice(-100);
    }
  }
}

/**
 * 手动触发同步
 */
export async function triggerManualSync(
  config?: Partial<SyncConfig>
): Promise<SyncResult> {
  if (state.isRunning) {
    throw new Error('Another sync is already running');
  }
  
  console.log('[Scheduler] Manual sync triggered');
  
  const jobId = `manual-${Date.now()}`;
  state.isRunning = true;
  state.currentJob = jobId;
  
  const historyEntry: JobHistoryEntry = {
    jobId,
    startedAt: new Date(),
  };
  state.jobHistory.push(historyEntry);
  
  try {
    const result = await executeFullSync(config);
    
    historyEntry.completedAt = new Date();
    historyEntry.result = result;
    state.lastRunAt = historyEntry.startedAt;
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    historyEntry.completedAt = new Date();
    
    return {
      success: false,
      batchId: '',
      stats: {
        modelsFound: 0,
        modelsNew: 0,
        modelsUpdated: 0,
        modelsDeprecated: 0,
        modelsUnchanged: 0,
        errors: 1,
        duration: 0,
      },
      errors: [errorMessage],
      startedAt: historyEntry.startedAt,
      completedAt: historyEntry.completedAt,
    };
  } finally {
    state.isRunning = false;
    state.currentJob = null;
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): SchedulerState {
  return {
    ...state,
    nextRunAt: dailyJob?.nextDate().toJSDate() || null,
  };
}

/**
 * 获取任务历史
 */
export function getJobHistory(limit: number = 20): typeof state.jobHistory {
  return state.jobHistory.slice(-limit);
}

/**
 * 检查是否正在运行
 */
export function isSyncRunning(): boolean {
  return state.isRunning;
}

// 导出默认调度器实例
export default {
  init: initScheduler,
  stop: stopScheduler,
  triggerManualSync,
  getStatus: getSchedulerStatus,
  getHistory: getJobHistory,
  isRunning: isSyncRunning,
};
