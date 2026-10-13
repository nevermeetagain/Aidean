/**
 * Skill 同步脚本 - 类型定义 v2.0
 * 参考：Skills同步方案_优化版_v2.md 场景化验证驱动设计
 */
// ==================== 数据分层 ====================
/**
 * 数据分层枚举
 * L0: 原始源（npm/github）→ 需清洗过滤
 * L1: 社区源（skillsmp/smithery）→ 基本可信
 * L2: 聚合源（LMSYS等）→ 高可信
 * L3: 权威源（官方API）→ 100%可信
 */
export var DataLayer;
(function (DataLayer) {
    DataLayer[DataLayer["L0_RAW"] = 0] = "L0_RAW";
    DataLayer[DataLayer["L1_COMMUNITY"] = 1] = "L1_COMMUNITY";
    DataLayer[DataLayer["L2_AGGREGATOR"] = 2] = "L2_AGGREGATOR";
    DataLayer[DataLayer["L3_AUTHORITY"] = 3] = "L3_AUTHORITY";
})(DataLayer || (DataLayer = {}));
// ==================== 字段级变更 ====================
/**
 * 字段变更级别
 * 控制变更检测粒度和通知策略
 */
export var FieldChangeLevel;
(function (FieldChangeLevel) {
    FieldChangeLevel["METRIC"] = "METRIC";
    FieldChangeLevel["CONTENT"] = "CONTENT";
    FieldChangeLevel["RELEASE"] = "RELEASE";
    FieldChangeLevel["PRICING"] = "PRICING";
    FieldChangeLevel["IDENTITY"] = "IDENTITY";
})(FieldChangeLevel || (FieldChangeLevel = {}));
/**
 * 字段→变更级别映射
 */
export const FIELD_LEVEL_MAP = {
    'downloadCount': FieldChangeLevel.METRIC,
    'stars': FieldChangeLevel.METRIC,
    'description': FieldChangeLevel.CONTENT,
    'category': FieldChangeLevel.CONTENT,
    'tags': FieldChangeLevel.CONTENT,
    'version': FieldChangeLevel.RELEASE,
    'lastUpdated': FieldChangeLevel.RELEASE,
    'installCommand': FieldChangeLevel.RELEASE,
    'npmPackage': FieldChangeLevel.RELEASE,
    'pricing': FieldChangeLevel.PRICING,
    'author': FieldChangeLevel.IDENTITY,
    'name': FieldChangeLevel.IDENTITY,
    'displayName': FieldChangeLevel.IDENTITY,
    'sourceUrl': FieldChangeLevel.IDENTITY,
};
/**
 * 变更级别配置
 */
export const CHANGE_LEVEL_CONFIG = {
    [FieldChangeLevel.METRIC]: { level: 0, logHistory: false, notify: false, requireReview: false },
    [FieldChangeLevel.CONTENT]: { level: 1, logHistory: true, notify: false, requireReview: false },
    [FieldChangeLevel.RELEASE]: { level: 2, logHistory: true, notify: true, requireReview: false },
    [FieldChangeLevel.PRICING]: { level: 3, logHistory: true, notify: true, requireReview: false },
    [FieldChangeLevel.IDENTITY]: { level: 4, logHistory: true, notify: true, requireReview: true },
};
/** 质量评分阈值：低于此值的数据进入"待完善"队列 */
export const QUALITY_THRESHOLD = 60;
// ==================== 错误类型 ====================
/**
 * v2.0: 结构化错误码
 */
export var SyncErrorCode;
(function (SyncErrorCode) {
    // 1xx: 网络相关
    SyncErrorCode["NETWORK_TIMEOUT"] = "SYNC_101";
    SyncErrorCode["API_RATE_LIMIT"] = "SYNC_102";
    SyncErrorCode["CONNECTION_REFUSED"] = "SYNC_103";
    // 2xx: 数据相关
    SyncErrorCode["DATA_FORMAT_INVALID"] = "SYNC_201";
    SyncErrorCode["REQUIRED_FIELD_MISSING"] = "SYNC_202";
    SyncErrorCode["VALIDATION_FAILED"] = "SYNC_203";
    SyncErrorCode["SCHEMA_MISMATCH"] = "SYNC_204";
    // 3xx: 数据库相关
    SyncErrorCode["DB_CONNECTION_FAILED"] = "SYNC_301";
    SyncErrorCode["DUPLICATE_KEY"] = "SYNC_302";
    SyncErrorCode["TRANSACTION_FAILED"] = "SYNC_303";
    // 4xx: 业务相关
    SyncErrorCode["CONFLICT_RESOLUTION_FAILED"] = "SYNC_401";
    SyncErrorCode["CIRCUIT_BREAKER_OPEN"] = "SYNC_402";
    SyncErrorCode["QUALITY_BELOW_THRESHOLD"] = "SYNC_403";
    SyncErrorCode["IDENTITY_REVIEW_REQUIRED"] = "SYNC_404";
})(SyncErrorCode || (SyncErrorCode = {}));
export const SYNC_ERROR_MESSAGES = {
    [SyncErrorCode.NETWORK_TIMEOUT]: '网络连接超时，请检查数据源地址和防火墙设置',
    [SyncErrorCode.API_RATE_LIMIT]: 'API请求频率超限，正在自动重试',
    [SyncErrorCode.CONNECTION_REFUSED]: '数据源拒绝连接，可能服务不可用',
    [SyncErrorCode.DATA_FORMAT_INVALID]: '数据格式不符合预期，请检查数据源格式',
    [SyncErrorCode.REQUIRED_FIELD_MISSING]: '必填字段缺失',
    [SyncErrorCode.VALIDATION_FAILED]: '数据验证失败',
    [SyncErrorCode.SCHEMA_MISMATCH]: '数据源Schema变更，需更新映射配置',
    [SyncErrorCode.DB_CONNECTION_FAILED]: '数据库连接失败',
    [SyncErrorCode.DUPLICATE_KEY]: '数据重复，已存在相同记录',
    [SyncErrorCode.TRANSACTION_FAILED]: '数据库事务执行失败',
    [SyncErrorCode.CONFLICT_RESOLUTION_FAILED]: '冲突解决失败，需人工审核',
    [SyncErrorCode.CIRCUIT_BREAKER_OPEN]: '断路器已熔断，数据源暂时不可用',
    [SyncErrorCode.QUALITY_BELOW_THRESHOLD]: '数据质量低于阈值',
    [SyncErrorCode.IDENTITY_REVIEW_REQUIRED]: '身份信息变更，需人工审核',
};
export class AdapterError extends Error {
    code;
    cause;
    constructor(message, code = SyncErrorCode.DATA_FORMAT_INVALID, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'AdapterError';
    }
}
export class SyncError extends Error {
    code;
    taskId;
    constructor(message, code = SyncErrorCode.CONFLICT_RESOLUTION_FAILED, taskId) {
        super(message);
        this.code = code;
        this.taskId = taskId;
        this.name = 'SyncError';
    }
}
//# sourceMappingURL=skill.js.map