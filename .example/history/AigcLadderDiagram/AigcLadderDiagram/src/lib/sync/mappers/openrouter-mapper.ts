/**
 * OpenRouter 数据映射器
 * 将 OpenRouter API 数据转换为本地模型结构
 * 汇率: ¥5 = $1 (USD to CNY)
 */

import type { OpenRouterModel, StandardizedModel } from '../types/openrouter';

const USD_TO_CNY_RATE = 5;

/**
 * 将 USD 价格转换为 CNY 价格
 * @param usdPrice USD 价格 (per token)
 * @returns CNY 价格 (per 1K tokens)
 */
export function convertUsdToCny(usdPrice: number): number {
  if (usdPrice === undefined || usdPrice === null || usdPrice === 0) {
    return 0;
  }
  // USD per token -> CNY per 1K tokens
  // Formula: usdPrice * 1000 * USD_TO_CNY_RATE
  const cnyPrice = usdPrice * 1000 * USD_TO_CNY_RATE;
  return parseFloat(cnyPrice.toFixed(6));
}

export function convertUsdUnitToCny(usdPrice: number): number {
  if (usdPrice === undefined || usdPrice === null || usdPrice === 0) {
    return 0;
  }
  return parseFloat((usdPrice * USD_TO_CNY_RATE).toFixed(6));
}

/**
 * 格式化价格显示
 */
export function formatPrice(cnyPrice: number): string {
  if (cnyPrice === 0) {
    return '免费';
  }
  if (cnyPrice < 0.001) {
    return `¥${cnyPrice.toFixed(6)}`;
  }
  if (cnyPrice < 0.01) {
    return `¥${cnyPrice.toFixed(4)}`;
  }
  return `¥${cnyPrice.toFixed(2)}`;
}

/**
 * 判断模型是否为多模态
 */
function isMultiModal(model: OpenRouterModel): boolean {
  const modality = model.architecture?.modality || '';
  const description = model.description || '';
  const name = model.name || '';
  
  // 检查 modality
  if (modality.includes('image') || modality.includes('vision')) {
    return true;
  }
  
  // 检查描述
  const multiModalKeywords = ['vision', 'image', 'multimodal', '视觉', '图像'];
  if (multiModalKeywords.some(kw => description.toLowerCase().includes(kw))) {
    return true;
  }
  
  // 检查名称
  if (name.toLowerCase().includes('vision')) {
    return true;
  }
  
  return false;
}

function mapModelType(model: OpenRouterModel): string {
  const modality = model.architecture?.modality?.toLowerCase() || '';
  const name = model.name?.toLowerCase() || '';
  const description = model.description?.toLowerCase() || '';
  if (modality.includes('image') && !modality.includes('text')) return 'IMAGE_GEN';
  if (modality.includes('image') || modality.includes('vision')) return 'VISION';
  if (modality.includes('audio')) return 'AUDIO';
  if (modality.includes('video')) return 'VIDEO';
  if (name.includes('embedding') || description.includes('embedding')) return 'EMBEDDING';
  if (name.includes('rerank') || description.includes('rerank')) return 'RERANK';
  if (name.includes('reason') || name.includes('thinking') || description.includes('reasoning')) return 'REASONING';
  if (name.includes('code') || description.includes('code')) return 'CODE';
  if (isMultiModal(model)) return 'MULTIMODAL';
  return 'CHAT';
}

function buildTags(model: OpenRouterModel): string[] {
  const tags = new Set<string>();
  const modality = model.architecture?.modality || '';
  const tokenizer = model.architecture?.tokenizer || '';
  const instructType = model.architecture?.instruct_type || '';
  if (modality) tags.add(modality);
  if (tokenizer) tags.add(tokenizer);
  if (instructType) tags.add(instructType);
  if (isMultiModal(model)) tags.add('多模态');
  if ((model.name || '').toLowerCase().includes('code')) tags.add('代码');
  return Array.from(tags);
}

/**
 * 将 OpenRouterModel 映射为标准模型
 */
export function mapToStandardizedModel(orModel: OpenRouterModel): StandardizedModel {
  const pricing = orModel.pricing || {};
  const modelType = mapModelType(orModel);
  
  return {
    modelCode: orModel.id || '',
    nameDisplay: orModel.name || orModel.id || '',
    description: orModel.description,
    contextLength: orModel.context_length,
    maxOutputTokens: orModel.per_request_limits?.completion_tokens,
    modelType,
    protocol: 'OPENAI',
    isMultiModal: isMultiModal(orModel),
    isReasoning: modelType === 'REASONING',
    isCodingOptimized: modelType === 'CODE',
    tags: buildTags(orModel),
    priceInput: convertUsdToCny(pricing.prompt || 0),
    priceOutput: convertUsdToCny(pricing.completion || 0),
    priceImage: convertUsdUnitToCny(pricing.image || 0),
    pricePerRequest: convertUsdUnitToCny(pricing.request || 0),
    providerName: orModel.top_provider?.name || extractVendorFromId(orModel.id),
    officialUrl: orModel.id ? `https://openrouter.ai/${orModel.id}` : undefined,
    docsUrl: 'https://openrouter.ai/docs',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    architecture: orModel.architecture as Record<string, any>,
    pricing: orModel.pricing as Record<string, any>,
    rawData: orModel,
  };
}

/**
 * 批量映射
 */
export function mapToStandardizedModels(orModels: OpenRouterModel[]): StandardizedModel[] {
  return orModels.map(mapToStandardizedModel);
}

/**
 * 从模型ID提取厂商名称
 * 例如: "anthropic/claude-3.5-sonnet" -> "Anthropic"
 */
function extractVendorFromId(modelId?: string): string {
  if (!modelId) {
    return 'Unknown';
  }
  
  const parts = modelId.split('/');
  if (parts.length > 1) {
    const vendor = parts[0];
    // 首字母大写
    return vendor.charAt(0).toUpperCase() + vendor.slice(1);
  }
  
  return 'Unknown';
}

/**
 * 获取模型显示价格字符串（用于展示）
 */
export function getModelPriceDisplay(model: StandardizedModel): {
  input: string;
  output: string;
  image: string;
} {
  return {
    input: formatPrice(model.priceInput || 0) + '/ 1K Tokens',
    output: formatPrice(model.priceOutput || 0) + '/ 1K Tokens',
    image: model.priceImage ? formatPrice(model.priceImage) + '/ image' : '-',
  };
}
