/**
 * Skills完整类型定义
 * 根据字段.md定义82个字段
 */

// 3.1 核心信息
export interface SkillCoreInfo {
  id?: string;
  name: string;
  nameCn?: string | null;
  displayName: string;
  description: string;
  shortDesc?: string | null;
  skillType: string; // 'utility' | 'code' | 'analysis' | 'creation' | 'office'
  difficultyLevel?: string | null; // 'beginner' | 'intermediate' | 'advanced'
  category: string;
  subCategory?: string | null;
  tags: string[];
}

// 3.2 作者与来源
export interface SkillAuthorInfo {
  author?: string | null;
  authorUrl?: string | null;
  version?: string | null;
  license?: string | null;
  sourceType: string; // 'official' | 'community' | 'enterprise'
  isOfficial: boolean;
  isPartner: boolean;
}

// 3.3 技术配置
export interface SkillTechnicalConfig {
  protocol: string; // 'anthropic' | 'openai' | 'universal'
  mcpServers: string[];
  integrationPlatforms: string[]; // 'ide' | 'cli' | 'web' | 'mobile'
  supportedIdes: string[]; // 'vscode' | 'idea' | 'cursor' | 'trae'
  programmingLanguages: string[];
  frameworks: string[];
  dependencies: string[];
  configSchema?: Record<string, any> | null;
  installCmd?: string | null;
  uninstallCmd?: string | null;
  updateCmd?: string | null;
}

// 3.4 功能与输入输出
export interface SkillFunctionIO {
  inputTypes: string[];
  outputTypes: string[];
  skillOutputs: string[];
  triggerMethods: string[]; // 'command' | 'shortcut' | 'auto'
  usageExamples?: Record<string, any> | null;
  templates?: Record<string, any> | null;
  shortcuts?: Record<string, any> | null;
}

// 3.5 学习路径
export interface SkillLearningPath {
  prerequisites: string[];
  learningPath?: Record<string, any> | null;
  estimatedTime?: number | null; // 分钟
  certificationAvailable: boolean;
  certificationInfo?: Record<string, any> | null;
  relatedSkills: string[];
  nextSteps: string[];
}

// 3.6 链接与资源
export interface SkillLinks {
  homepage?: string | null;
  repository?: string | null;
  documentation?: string | null;
  readmeUrl?: string | null;
  tutorialUrl?: string | null;
  demoVideo?: string | null;
  changelog?: string | null;
  icon?: string | null;
  screenshots: string[];
}

// 3.7 统计数据
export interface SkillStatistics {
  downloads: number;
  installs: number;
  stars: number;
  rating?: number | null; // 1-5
  reviewCount: number;
  ratingBreakdown?: Record<string, any> | null;
  activeUsers: number;
  usageCount: number;
  completionRate?: number | null; // %
  usageTrend?: Record<string, any> | null;
}

// 3.8 审核与状态
export interface SkillAuditStatus {
  isVerified: boolean;
  auditStatus: string; // 'pending' | 'approved' | 'rejected'
  auditBy?: string | null;
  auditAt?: Date | null;
  auditReason?: string | null;
  isFeatured: boolean;
  isRecommended: boolean;
  recommendStartAt?: Date | null;
  recommendEndAt?: Date | null;
  promotionBadge?: string | null;
  isActive: boolean;
  visibility: string; // 'public' | 'login' | 'paid' | 'admin'
}

// 3.9 运营配置
export interface SkillOperations {
  displayWeight: number;
  sortOrder: number;
  adminNote?: string | null;
  pricingType?: string | null; // 'free' | 'paid' | 'subscription'
  pricingInfo?: Record<string, any> | null;
  trialEnabled: boolean;
  trialConfig?: Record<string, any> | null;
}

// 3.10 采集同步与时间戳
export interface SkillSyncInfo {
  syncStatus: string; // 'manual' | 'auto' | 'scheduled'
  syncSource: string;
  syncBatchId?: string | null;
  syncMetadata?: Record<string, any> | null;
  dataQualityScore?: number | null;
  completenessRate?: number | null;
  lastUpdated?: Date | null;
  lastVerifiedAt?: Date | null;
  publishedAt?: Date | null;
  deprecatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// 扩展字段
export interface SkillExtension {
  extJson?: Record<string, any> | null;
  attr01?: string | null;
  attr02?: string | null;
  attr03?: string | null;
  attr04?: string | null;
  attr05?: string | null;
  tenantId: string;
}

// 完整Skill类型
export interface Skill extends
  SkillCoreInfo,
  SkillAuthorInfo,
  SkillTechnicalConfig,
  SkillFunctionIO,
  SkillLearningPath,
  SkillLinks,
  SkillStatistics,
  SkillAuditStatus,
  SkillOperations,
  SkillSyncInfo,
  SkillExtension {}

// 数据库行类型（蛇形命名）
export interface SkillDBRow {
  id: number;
  name: string;
  name_cn?: string | null;
  display_name: string;
  description: string;
  short_desc?: string | null;
  skill_type: string;
  difficulty_level?: string | null;
  category: string;
  sub_category?: string | null;
  tags: string[];
  author?: string | null;
  author_url?: string | null;
  version?: string | null;
  license?: string | null;
  source_type: string;
  is_official: boolean;
  is_partner: boolean;
  protocol: string;
  mcp_servers: string[];
  integration_platforms: string[];
  supported_ides: string[];
  programming_languages: string[];
  frameworks: string[];
  dependencies: string[];
  config_schema?: Record<string, any> | null;
  install_cmd?: string | null;
  uninstall_cmd?: string | null;
  update_cmd?: string | null;
  input_types: string[];
  output_types: string[];
  skill_outputs: string[];
  trigger_methods: string[];
  usage_examples?: Record<string, any> | null;
  templates?: Record<string, any> | null;
  shortcuts?: Record<string, any> | null;
  prerequisites: string[];
  learning_path?: Record<string, any> | null;
  estimated_time?: number | null;
  certification_available: boolean;
  certification_info?: Record<string, any> | null;
  related_skills: string[];
  next_steps: string[];
  homepage?: string | null;
  repository?: string | null;
  documentation?: string | null;
  readme_url?: string | null;
  tutorial_url?: string | null;
  demo_video?: string | null;
  changelog?: string | null;
  icon?: string | null;
  screenshots: string[];
  downloads: number;
  installs: number;
  stars: number;
  rating?: number | null;
  review_count: number;
  rating_breakdown?: Record<string, any> | null;
  active_users: number;
  usage_count: number;
  completion_rate?: number | null;
  usage_trend?: Record<string, any> | null;
  is_verified: boolean;
  audit_status: string;
  audit_by?: string | null;
  audit_at?: Date | null;
  audit_reason?: string | null;
  is_featured: boolean;
  is_recommended: boolean;
  recommend_start_at?: Date | null;
  recommend_end_at?: Date | null;
  promotion_badge?: string | null;
  is_active: boolean;
  visibility: string;
  display_weight: number;
  sort_order: number;
  admin_note?: string | null;
  pricing_type?: string | null;
  pricing_info?: Record<string, any> | null;
  trial_enabled: boolean;
  trial_config?: Record<string, any> | null;
  sync_status: string;
  sync_source: string;
  sync_batch_id?: string | null;
  sync_metadata?: Record<string, any> | null;
  data_quality_score?: number | null;
  completeness_rate?: number | null;
  last_updated?: Date | null;
  last_verified_at?: Date | null;
  published_at?: Date | null;
  deprecated_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  ext_json?: Record<string, any> | null;
  attr01?: string | null;
  attr02?: string | null;
  attr03?: string | null;
  attr04?: string | null;
  attr05?: string | null;
  tenant_id: string;
}

// 默认值生成器
export const SkillDefaults = {
  // 3.1 核心信息默认值
  core: {
    skillType: 'utility',
    category: 'general',
    tags: [],
  },
  // 3.2 作者与来源默认值
  author: {
    sourceType: 'community',
    isOfficial: false,
    isPartner: false,
  },
  // 3.3 技术配置默认值
  technical: {
    protocol: 'anthropic',
    mcpServers: [],
    integrationPlatforms: [],
    supportedIdes: [],
    programmingLanguages: [],
    frameworks: [],
    dependencies: [],
  },
  // 3.4 功能与输入输出默认值
  function: {
    inputTypes: [],
    outputTypes: [],
    skillOutputs: [],
    triggerMethods: [],
  },
  // 3.5 学习路径默认值
  learning: {
    prerequisites: [],
    certificationAvailable: false,
    relatedSkills: [],
    nextSteps: [],
  },
  // 3.6 链接与资源默认值
  links: {
    screenshots: [],
  },
  // 3.7 统计数据默认值
  stats: {
    downloads: 0,
    installs: 0,
    stars: 0,
    reviewCount: 0,
    activeUsers: 0,
    usageCount: 0,
  },
  // 3.8 审核与状态默认值
  audit: {
    isVerified: false,
    auditStatus: 'pending',
    isFeatured: false,
    isRecommended: false,
    isActive: true,
    visibility: 'public',
  },
  // 3.9 运营配置默认值
  operations: {
    displayWeight: 0,
    sortOrder: 0,
    trialEnabled: false,
  },
  // 3.10 同步默认值
  sync: {
    syncStatus: 'manual',
    syncSource: 'manual',
    tenantId: '0',
  },
};

// 从Skill创建完整默认值对象
export function createSkillWithDefaults(partial: Partial<Skill>): Skill {
  return {
    // 3.1 核心信息
    name: partial.name || '',
    displayName: partial.displayName || partial.name || '',
    description: partial.description || '',
    skillType: partial.skillType || SkillDefaults.core.skillType,
    category: partial.category || SkillDefaults.core.category,
    tags: partial.tags || [...SkillDefaults.core.tags],
    nameCn: partial.nameCn ?? null,
    shortDesc: partial.shortDesc ?? null,
    difficultyLevel: partial.difficultyLevel ?? null,
    subCategory: partial.subCategory ?? null,

    // 3.2 作者与来源
    author: partial.author ?? null,
    authorUrl: partial.authorUrl ?? null,
    version: partial.version ?? null,
    license: partial.license ?? null,
    sourceType: partial.sourceType || SkillDefaults.author.sourceType,
    isOfficial: partial.isOfficial ?? SkillDefaults.author.isOfficial,
    isPartner: partial.isPartner ?? SkillDefaults.author.isPartner,

    // 3.3 技术配置
    protocol: partial.protocol || SkillDefaults.technical.protocol,
    mcpServers: partial.mcpServers || [...SkillDefaults.technical.mcpServers],
    integrationPlatforms: partial.integrationPlatforms || [...SkillDefaults.technical.integrationPlatforms],
    supportedIdes: partial.supportedIdes || [...SkillDefaults.technical.supportedIdes],
    programmingLanguages: partial.programmingLanguages || [...SkillDefaults.technical.programmingLanguages],
    frameworks: partial.frameworks || [...SkillDefaults.technical.frameworks],
    dependencies: partial.dependencies || [...SkillDefaults.technical.dependencies],
    configSchema: partial.configSchema ?? null,
    installCmd: partial.installCmd ?? null,
    uninstallCmd: partial.uninstallCmd ?? null,
    updateCmd: partial.updateCmd ?? null,

    // 3.4 功能与输入输出
    inputTypes: partial.inputTypes || [...SkillDefaults.function.inputTypes],
    outputTypes: partial.outputTypes || [...SkillDefaults.function.outputTypes],
    skillOutputs: partial.skillOutputs || [...SkillDefaults.function.skillOutputs],
    triggerMethods: partial.triggerMethods || [...SkillDefaults.function.triggerMethods],
    usageExamples: partial.usageExamples ?? null,
    templates: partial.templates ?? null,
    shortcuts: partial.shortcuts ?? null,

    // 3.5 学习路径
    prerequisites: partial.prerequisites || [...SkillDefaults.learning.prerequisites],
    learningPath: partial.learningPath ?? null,
    estimatedTime: partial.estimatedTime ?? null,
    certificationAvailable: partial.certificationAvailable ?? SkillDefaults.learning.certificationAvailable,
    certificationInfo: partial.certificationInfo ?? null,
    relatedSkills: partial.relatedSkills || [...SkillDefaults.learning.relatedSkills],
    nextSteps: partial.nextSteps || [...SkillDefaults.learning.nextSteps],

    // 3.6 链接与资源
    homepage: partial.homepage ?? null,
    repository: partial.repository ?? null,
    documentation: partial.documentation ?? null,
    readmeUrl: partial.readmeUrl ?? null,
    tutorialUrl: partial.tutorialUrl ?? null,
    demoVideo: partial.demoVideo ?? null,
    changelog: partial.changelog ?? null,
    icon: partial.icon ?? null,
    screenshots: partial.screenshots || [...SkillDefaults.links.screenshots],

    // 3.7 统计数据
    downloads: partial.downloads ?? SkillDefaults.stats.downloads,
    installs: partial.installs ?? SkillDefaults.stats.installs,
    stars: partial.stars ?? SkillDefaults.stats.stars,
    rating: partial.rating ?? null,
    reviewCount: partial.reviewCount ?? SkillDefaults.stats.reviewCount,
    ratingBreakdown: partial.ratingBreakdown ?? null,
    activeUsers: partial.activeUsers ?? SkillDefaults.stats.activeUsers,
    usageCount: partial.usageCount ?? SkillDefaults.stats.usageCount,
    completionRate: partial.completionRate ?? null,
    usageTrend: partial.usageTrend ?? null,

    // 3.8 审核与状态
    isVerified: partial.isVerified ?? SkillDefaults.audit.isVerified,
    auditStatus: partial.auditStatus || SkillDefaults.audit.auditStatus,
    auditBy: partial.auditBy ?? null,
    auditAt: partial.auditAt ?? null,
    auditReason: partial.auditReason ?? null,
    isFeatured: partial.isFeatured ?? SkillDefaults.audit.isFeatured,
    isRecommended: partial.isRecommended ?? SkillDefaults.audit.isRecommended,
    recommendStartAt: partial.recommendStartAt ?? null,
    recommendEndAt: partial.recommendEndAt ?? null,
    promotionBadge: partial.promotionBadge ?? null,
    isActive: partial.isActive ?? SkillDefaults.audit.isActive,
    visibility: partial.visibility || SkillDefaults.audit.visibility,

    // 3.9 运营配置
    displayWeight: partial.displayWeight ?? SkillDefaults.operations.displayWeight,
    sortOrder: partial.sortOrder ?? SkillDefaults.operations.sortOrder,
    adminNote: partial.adminNote ?? null,
    pricingType: partial.pricingType ?? null,
    pricingInfo: partial.pricingInfo ?? null,
    trialEnabled: partial.trialEnabled ?? SkillDefaults.operations.trialEnabled,
    trialConfig: partial.trialConfig ?? null,

    // 3.10 同步与时间戳
    syncStatus: partial.syncStatus || SkillDefaults.sync.syncStatus,
    syncSource: partial.syncSource || SkillDefaults.sync.syncSource,
    syncBatchId: partial.syncBatchId ?? null,
    syncMetadata: partial.syncMetadata ?? null,
    dataQualityScore: partial.dataQualityScore ?? null,
    completenessRate: partial.completenessRate ?? null,
    lastUpdated: partial.lastUpdated ?? null,
    lastVerifiedAt: partial.lastVerifiedAt ?? null,
    publishedAt: partial.publishedAt ?? null,
    deprecatedAt: partial.deprecatedAt ?? null,
    tenantId: partial.tenantId || SkillDefaults.sync.tenantId,

    // 扩展
    extJson: partial.extJson ?? null,
    attr01: partial.attr01 ?? null,
    attr02: partial.attr02 ?? null,
    attr03: partial.attr03 ?? null,
    attr04: partial.attr04 ?? null,
    attr05: partial.attr05 ?? null,
  };
}
