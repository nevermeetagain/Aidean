/**
 * Discovery Layer — Type Definitions
 *
 * 类型定义：发现层各阶段共享的类型。
 * 依据: AI市场发现与智能引擎设计文档.md §1-2
 */

// ── 候选实体类型 ──
export type CandidateType = 'provider' | 'gateway' | 'model' | 'tool';

// ── 发现来源类型 ──
export type SourceType = 'registry' | 'search' | 'github' | 'news' | 'crawl';

// ── 候选状态机 ──
export type CandidateStatus =
  | 'discovered'   // 刚发现
  | 'verifying'    // 验证中
  | 'verified'     // 验证通过
  | 'promoted'     // 已升级为正式实体
  | 'rejected';    // 验证失败或重复

// ── 协议类型 ──
export type ProtocolType =
  | 'openai_chat'
  | 'openai_responses'
  | 'anthropic_messages'
  | 'streaming'
  | 'tool_calling'
  | 'structured_output'
  | 'vision'
  | 'audio'
  | 'pdf'
  | 'reasoning'
  | 'mcp';

// ── 能力维度 ──
export type CapabilityType =
  | 'function_calling'
  | 'vision'
  | 'reasoning'
  | 'structured_output'
  | 'prompt_caching'
  | 'code_execution'
  | 'web_search'
  | 'long_context';

// ── 工具名称 ──
export type ToolName =
  | 'claude_code'
  | 'cursor'
  | 'codex'
  | 'opencode'
  | 'cline'
  | 'continue'
  | 'aider';

// ── 证据来源 ──
export type EvidenceSource = 'official' | 'aggregator' | 'observed' | 'search';

// ── 证据类型 ──
export type EvidenceType =
  | 'discovery'
  | 'fingerprint'
  | 'protocol'
  | 'pricing'
  | 'quality'
  | 'change';

// ── 价格来源 ──
export type PriceSource = 'official' | 'aggregator' | 'observed';

// ── 套餐类型 ──
export type PlanType =
  | 'token_based'
  | 'request_based'
  | 'credit_based'
  | 'window_based'
  | 'hybrid';

// ── 候选实体 ──
export interface Candidate {
  candidateType: CandidateType;
  name: string;
  domain?: string;
  apiBase?: string;
  description?: string;
  sourceType: SourceType;
  sourceUrl: string;
  sourceKeyword?: string;
}

// ── 技术指纹结果 ──
export interface FingerprintResult {
  hasModelsEndpoint: boolean;
  hasChatEndpoint: boolean;
  hasResponsesEndpoint: boolean;
  hasMessagesEndpoint: boolean;
  authMethod?: 'bearer' | 'api_key' | 'x_api_key' | 'unknown';
  modelsFormat?: 'openai' | 'custom' | 'unknown';
  pricingPageFound: boolean;
  probedAt: string;
}

// ── 协议探测结果 ──
export interface ProtocolProbeResult {
  protocol: ProtocolType;
  supported: boolean;
  probeMethod: 'endpoint_check' | 'minimal_request' | 'documented';
  confidence: number;
  detail?: Record<string, unknown>;
}

// ── 价格提取结果 ──
export interface PriceExtractionResult {
  region?: string;
  inputTier?: string;
  inputPriceMinor?: bigint;
  cacheReadPriceMinor?: bigint;
  cacheWritePriceMinor?: bigint;
  outputPriceMinor?: bigint;
  batchPriceMinor?: bigint;
  source: PriceSource;
  sourceUrl?: string;
}

// ── 管道阶段 ──
export type PipelineStage =
  | 'discovery'
  | 'resolution'
  | 'fingerprint'
  | 'protocol'
  | 'pricing'
  | 'plan';

// ── 管道阶段状态 ──
export interface StageStatus {
  name: PipelineStage;
  status: 'pending' | 'running' | 'completed' | 'failed';
  candidatesFound?: number;
  merged?: number;
  new?: number;
  processed?: number;
  total?: number;
  error?: string;
  durationMs?: number;
}

// ── 管道执行结果 ──
export interface PipelineResult {
  pipelineId: string;
  status: 'running' | 'completed' | 'failed';
  stages: StageStatus[];
  startedAt: string;
  completedAt?: string;
  totalCandidates: number;
  promoted: number;
  rejected: number;
}
