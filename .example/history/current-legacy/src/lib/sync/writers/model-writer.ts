/**
 * 模型数据写入器
 * 处理模型的 upsert（新增/更新）操作
 */

import { prisma } from '@/lib/db/prisma';
import type { ModelDiff } from '../types/sync';

/**
 * 模型数据（用于写入）
 */
export interface ModelWriteData {
  modelCode: string;
  nameDisplay: string;
  providerName?: string;
  nameCn?: string;
  nameEn?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  modelType?: string;  // ModelType enum value
  protocol?: string;
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
  vendorId?: string;
  parameterCount?: string;
  isOpenSource?: boolean;
  tags?: string[];
  benchmarkScore?: number;
  popularityScore?: number;
  officialUrl?: string;
  docsUrl?: string;
  apiUrl?: string;
  githubUrl?: string;
  publishedAt?: Date;
  status?: string;  // ModelStatus enum value
}

const VALID_MODEL_TYPES = new Set([
  'CHAT',
  'REASONING',
  'MULTIMODAL',
  'CODE',
  'VISION',
  'AUDIO',
  'EMBEDDING',
  'RERANK',
  'ASR',
  'TTS',
  'IMAGE_GEN',
  'VIDEO',
  'SYSTEM',
]);

const VALID_PROTOCOLS = new Set(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'CUSTOM']);

function normalizeVendorCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

// 厂商品牌色映射（同步时自动填充）
const VENDOR_BRAND_COLORS: Record<string, { brandColor: string; nameCn?: string; country?: string }> = {
  openai:     { brandColor: '#10a37f', nameCn: 'OpenAI', country: 'US' },
  anthropic:  { brandColor: '#d4a574', nameCn: 'Anthropic', country: 'US' },
  google:     { brandColor: '#4285f4', nameCn: 'Google', country: 'US' },
  xai:        { brandColor: '#1d1d1f', nameCn: 'xAI', country: 'US' },
  meta:       { brandColor: '#0668e1', nameCn: 'Meta', country: 'US' },
  mistral:    { brandColor: '#ff7000', nameCn: 'Mistral', country: 'FR' },
  deepseek:   { brandColor: '#4f46e5', nameCn: '深度求索', country: 'CN' },
  'bytedance': { brandColor: '#fe2c55', nameCn: '字节跳动', country: 'CN' },
  alibaba:    { brandColor: '#ff6a00', nameCn: '阿里', country: 'CN' },
  baidu:      { brandColor: '#2932e1', nameCn: '百度', country: 'CN' },
  zhipu:      { brandColor: '#5b6def', nameCn: '智谱', country: 'CN' },
  minimax:    { brandColor: '#6366f1', nameCn: 'MiniMax', country: 'CN' },
  'moonshot': { brandColor: '#7c3aed', nameCn: '月之暗面', country: 'CN' },
  '01-ai':    { brandColor: '#2563eb', nameCn: '零一万物', country: 'CN' },
  microsoft:  { brandColor: '#00a4ef', nameCn: '微软', country: 'US' },
  cohere:     { brandColor: '#39594d', nameCn: 'Cohere', country: 'CA' },
  perplexity: { brandColor: '#20b8cd', nameCn: 'Perplexity', country: 'US' },
};

function resolveModelType(value?: string): string {
  return value && VALID_MODEL_TYPES.has(value) ? value : 'CHAT';
}

function resolveProtocol(value?: string): string {
  return value && VALID_PROTOCOLS.has(value) ? value : 'OPENAI';
}

async function resolveVendorId(data: ModelWriteData): Promise<string> {
  if (data.vendorId) return data.vendorId;
  const providerName = data.providerName || data.modelCode.split('/')[0] || 'Unknown';
  const code = normalizeVendorCode(providerName);
  const brandInfo = VENDOR_BRAND_COLORS[code];

  const vendor = await prisma.vendor.upsert({
    where: { code },
    update: {
      name: providerName,
      ...(brandInfo?.brandColor ? { brandColor: brandInfo.brandColor } : {}),
      ...(brandInfo?.nameCn ? { nameCn: brandInfo.nameCn } : {}),
      isActive: true,
    },
    create: {
      code,
      name: providerName,
      nameEn: providerName,
      ...(brandInfo?.brandColor ? { brandColor: brandInfo.brandColor } : {}),
      ...(brandInfo?.nameCn ? { nameCn: brandInfo.nameCn } : {}),
      ...(brandInfo?.country ? { country: brandInfo.country } : {}),
      isActive: true,
    },
  });
  return vendor.id;
}

/**
 * Upsert 模型
 * 新增或更新模型记录
 */
export async function upsertModel(
  diff: ModelDiff,
  mappedData: ModelWriteData
): Promise<{ id: string; action: 'created' | 'updated' | 'deprecated' }> {
  const { type, modelCode } = diff;
  
  switch (type) {
    case 'NEW':
      return createModel(mappedData);
      
    case 'UPDATED':
      return updateModel(modelCode, mappedData);
      
    case 'DEPRECATED':
      return deprecateModel(modelCode);
      
    case 'UNCHANGED':
    default:
      // 未变化，跳过处理
      return { id: '', action: 'updated' };
  }
}

/**
 * 创建新模型
 */
async function createModel(
  data: ModelWriteData
): Promise<{ id: string; action: 'created' }> {
  try {
    const vendorId = await resolveVendorId(data);
    const model = await prisma.aiModel.create({
      data: {
        modelCode: data.modelCode,
        slug: data.modelCode.replace(/\//g, '-'),
        nameDisplay: data.nameDisplay,
        nameCn: data.nameCn,
        nameEn: data.nameEn,
        contextLength: data.contextLength,
        maxOutputTokens: data.maxOutputTokens,
        modelType: resolveModelType(data.modelType) as any,
        isMultiModal: data.isMultiModal || false,
        isReasoning: data.isReasoning || false,
        isCodingOptimized: data.isCodingOptimized || false,
        vendorId,
        parameterCount: data.parameterCount,
        isOpenSource: data.isOpenSource ?? true,
        tags: data.tags || [],
        protocol: resolveProtocol(data.protocol) as any,
        benchmarkScore: data.benchmarkScore,
        popularityScore: data.popularityScore,
        officialUrl: data.officialUrl,
        docsUrl: data.docsUrl,
        apiUrl: data.apiUrl,
        githubUrl: data.githubUrl,
        publishedAt: data.publishedAt,
        status: (data.status as any) || 'ACTIVE',
      },
    });
    
    console.log(`[ModelWriter] Created model: ${data.modelCode} (ID: ${model.id})`);
    
    return { id: model.id, action: 'created' };
  } catch (error) {
    console.error(`[ModelWriter] Failed to create model ${data.modelCode}:`, error);
    throw error;
  }
}

/**
 * 更新模型
 */
async function updateModel(
  modelCode: string,
  data: ModelWriteData
): Promise<{ id: string; action: 'updated' }> {
  try {
    const existing = await prisma.aiModel.findUnique({
      where: { modelCode },
    });
    
    if (!existing) {
      throw new Error(`Model not found: ${modelCode}`);
    }

    const vendorId = await resolveVendorId(data);
    
    const model = await prisma.aiModel.update({
      where: { modelCode },
      data: {
        nameDisplay: data.nameDisplay,
        nameCn: data.nameCn,
        nameEn: data.nameEn,
        contextLength: data.contextLength,
        maxOutputTokens: data.maxOutputTokens,
        modelType: resolveModelType(data.modelType) as any,
        protocol: resolveProtocol(data.protocol) as any,
        isMultiModal: data.isMultiModal,
        isReasoning: data.isReasoning,
        isCodingOptimized: data.isCodingOptimized,
        vendorId,
        parameterCount: data.parameterCount,
        isOpenSource: data.isOpenSource,
        tags: data.tags,
        benchmarkScore: data.benchmarkScore,
        popularityScore: data.popularityScore,
        officialUrl: data.officialUrl,
        docsUrl: data.docsUrl,
        apiUrl: data.apiUrl,
        githubUrl: data.githubUrl,
        publishedAt: data.publishedAt,
      },
    });
    
    console.log(`[ModelWriter] Updated model: ${modelCode} (ID: ${model.id})`);
    
    return { id: model.id, action: 'updated' };
  } catch (error) {
    console.error(`[ModelWriter] Failed to update model ${modelCode}:`, error);
    throw error;
  }
}

/**
 * 标记模型为废弃
 */
async function deprecateModel(
  modelCode: string
): Promise<{ id: string; action: 'deprecated' }> {
  try {
    const existing = await prisma.aiModel.findUnique({
      where: { modelCode },
    });
    
    if (!existing) {
      throw new Error(`Model not found: ${modelCode}`);
    }
    
    const model = await prisma.aiModel.update({
      where: { modelCode },
      data: {
        status: 'DEPRECATED',
        deprecatedAt: new Date(),
      },
    });
    
    console.log(`[ModelWriter] Deprecated model: ${modelCode} (ID: ${model.id})`);
    
    return { id: model.id, action: 'deprecated' };
  } catch (error) {
    console.error(`[ModelWriter] Failed to deprecate model ${modelCode}:`, error);
    throw error;
  }
}

/**
 * 更新模型的最后同步时间
 */
async function touchModel(
  modelCode: string
): Promise<{ id: string; action: 'updated' }> {
  try {
    const model = await prisma.aiModel.update({
      where: { modelCode },
      data: {},
    });
    
    return { id: model.id, action: 'updated' };
  } catch (error) {
    console.error(`[ModelWriter] Failed to touch model ${modelCode}:`, error);
    throw error;
  }
}

/**
 * 批量写入模型
 */
export async function batchUpsertModels(
  diffs: ModelDiff[],
  dataMap: Map<string, ModelWriteData>
): Promise<{ created: number; updated: number; deprecated: number; errors: string[] }> {
  const results = { created: 0, updated: 0, deprecated: 0, errors: [] as string[] };
  
  for (const diff of diffs) {
    try {
      const data = dataMap.get(diff.modelCode);
      
      if (!data && diff.type !== 'DEPRECATED') {
        results.errors.push(`No data for model ${diff.modelCode}`);
        continue;
      }
      
      const result = await upsertModel(diff, data!);
      
      switch (result.action) {
        case 'created':
          results.created++;
          break;
        case 'updated':
          results.updated++;
          break;
        case 'deprecated':
          results.deprecated++;
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to process ${diff.modelCode}: ${message}`);
    }
  }
  
  return results;
}


