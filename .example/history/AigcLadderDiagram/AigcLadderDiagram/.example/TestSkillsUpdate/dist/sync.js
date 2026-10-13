/**
 * Skill 同步脚本 - 主入口 v2.0
 * 参考：Skills同步方案_优化版_v2.md
 *
 * 核心改进：
 * 1. 5个数据源支持（skillsmp/smithery/skills_sh/npm/github）
 * 2. 数据分层配置
 * 3. 命令行参数控制
 * 4. 连接池管理
 */
import { DataLayer } from './types/skill.js';
import { createAdapter } from './adapters/index.js';
import { SkillSyncEngine } from './engine/SyncEngine.js';
import { initSchema, upsertDataSource, closePool } from './database/connection.js';
/**
 * v2.0: 数据源配置（含数据分层和可信度）
 */
const DATA_SOURCES = [
    {
        sourceCode: 'skillsmp',
        sourceName: 'SkillsMP',
        baseUrl: 'https://skillsmp.com',
        rateLimitRequests: 100,
        rateLimitWindow: 60,
        dataLayer: DataLayer.L1_COMMUNITY,
        trustScore: 70,
        syncPriority: 1,
    },
    {
        sourceCode: 'smithery',
        sourceName: 'Smithery',
        baseUrl: 'https://smithery.ai',
        rateLimitRequests: 60,
        rateLimitWindow: 60,
        dataLayer: DataLayer.L1_COMMUNITY,
        trustScore: 60,
        syncPriority: 2,
    },
    {
        sourceCode: 'skills_sh',
        sourceName: 'Skills.sh',
        baseUrl: 'https://skills.sh',
        rateLimitRequests: 80,
        rateLimitWindow: 60,
        dataLayer: DataLayer.L1_COMMUNITY,
        trustScore: 50,
        syncPriority: 3,
    },
    {
        sourceCode: 'npm',
        sourceName: 'npm Registry',
        baseUrl: 'https://registry.npmjs.org',
        rateLimitRequests: 200,
        rateLimitWindow: 60,
        dataLayer: DataLayer.L0_RAW,
        trustScore: 90, // npm下载量数据权威
        syncPriority: 4,
    },
    {
        sourceCode: 'github',
        sourceName: 'GitHub',
        baseUrl: 'https://api.github.com',
        apiKey: process.env.GITHUB_TOKEN,
        rateLimitRequests: 5000,
        rateLimitWindow: 3600, // 5000/hour with token
        dataLayer: DataLayer.L0_RAW,
        trustScore: 100, // GitHub stars/forks最权威
        syncPriority: 5,
    },
];
/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        sources: [],
        dryRun: false,
        bulk: false,
        transaction: false,
        limit: 100,
    };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--source':
            case '-s':
                if (args[i + 1]) {
                    result.sources = args[i + 1].split(',');
                    i++;
                }
                break;
            case '--dry-run':
            case '-d':
                result.dryRun = true;
                break;
            case '--bulk':
            case '-b':
                result.bulk = true;
                break;
            case '--transaction':
            case '-t':
                result.transaction = true;
                break;
            case '--limit':
            case '-l':
                if (args[i + 1]) {
                    result.limit = parseInt(args[i + 1]);
                    i++;
                }
                break;
            case '--help':
            case '-h':
                console.log(`
Skill Sync Tool v2.0

Usage: ts-node src/sync.ts [options]

Options:
  -s, --source <sources>   Comma-separated source codes (default: all)
                           Available: skillsmp, smithery, skills_sh, npm, github
  -d, --dry-run           Dry run mode (no database writes)
  -b, --bulk              Use bulk UPSERT mode (faster for large datasets)
  -t, --transaction        Use database transactions (slower but safer)
  -l, --limit <number>    Limit records per source (default: 100)
  -h, --help              Show this help message

Examples:
  ts-node src/sync.ts --source skillsmp,smithery --dry-run
  ts-node src/sync.ts --bulk --limit 10000
  ts-node src/sync.ts --source npm --transaction
        `);
                process.exit(0);
        }
    }
    return result;
}
/**
 * 同步单个数据源
 */
async function syncDataSource(config, cliArgs) {
    console.log(`\n========================================`);
    console.log(`Syncing from: ${config.sourceName} (Layer: L${config.dataLayer}, Trust: ${config.trustScore})`);
    console.log(`========================================\n`);
    try {
        // 创建适配器
        const adapter = createAdapter(config);
        // 验证连接
        const isConnected = await adapter.validateConnection();
        if (!isConnected) {
            console.warn(`[${config.sourceName}] Connection validation failed, skipping...`);
            return;
        }
        // 创建同步引擎
        const engine = new SkillSyncEngine(adapter, config, {
            batchSize: 100,
            enableConflictResolution: true,
            dryRun: cliArgs.dryRun,
            enableCircuitBreaker: true,
            enableQualityFilter: true,
            enableFieldLevelIncremental: true,
            enableBulkUpsert: cliArgs.bulk,
            bulkBufferSize: 500,
            enableTransaction: cliArgs.transaction,
        });
        // 执行同步
        const result = await engine.sync({
            page: 1,
            limit: cliArgs.limit,
            _triggeredBy: 'manual',
        });
        console.log(`\n[${config.sourceName}] Sync result:`, result);
    }
    catch (error) {
        console.error(`[${config.sourceName}] Sync failed:`, error);
        throw error;
    }
}
/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('Skill Sync Tool v2.0');
    console.log('========================================\n');
    const cliArgs = parseArgs();
    try {
        // 初始化数据库
        console.log('Initializing database...');
        await initSchema();
        console.log('Database initialized.\n');
        // 保存数据源配置
        console.log('Saving data source configurations...');
        for (const config of DATA_SOURCES) {
            await upsertDataSource({
                sourceCode: config.sourceCode,
                sourceName: config.sourceName,
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                dataLayer: config.dataLayer,
                trustScore: config.trustScore,
                rateLimitRequests: config.rateLimitRequests,
                rateLimitWindow: config.rateLimitWindow,
                syncPriority: config.syncPriority,
            });
        }
        console.log('Data source configurations saved.\n');
        // 过滤要同步的数据源
        const sourcesToSync = cliArgs.sources.length > 0
            ? DATA_SOURCES.filter(s => cliArgs.sources.includes(s.sourceCode))
            : DATA_SOURCES;
        if (sourcesToSync.length === 0) {
            console.error(`No valid data sources found. Available: ${DATA_SOURCES.map(s => s.sourceCode).join(', ')}`);
            process.exit(1);
        }
        // 同步数据源
        for (const config of sourcesToSync) {
            await syncDataSource(config, cliArgs);
        }
        console.log('\n========================================');
        console.log('All sync tasks completed!');
        console.log('========================================');
    }
    catch (error) {
        console.error('\n========================================');
        console.error('Sync failed:', error);
        console.error('========================================');
        process.exit(1);
    }
    finally {
        // 关闭连接池
        await closePool();
    }
}
// 运行主函数
main();
//# sourceMappingURL=sync.js.map