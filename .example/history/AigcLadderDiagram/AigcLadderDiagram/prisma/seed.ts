import { PrismaClient, Prisma } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================
// 工具函数
// ============================================
function generateCode(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ============================================
// 种子数据
// ============================================
const vendorsData = [
  // ---- T1 国际大厂 ----
  { name: 'OpenAI', nameCn: 'OpenAI', website: 'https://openai.com', tierLevel: 1, country: 'USA', isOpenSource: false, brandColor: '#10a37f' },
  { name: 'Anthropic', nameCn: 'Anthropic', website: 'https://anthropic.com', tierLevel: 1, country: 'USA', isOpenSource: false, brandColor: '#d4a574' },
  { name: 'Google', nameCn: 'Google', website: 'https://deepmind.google', tierLevel: 1, country: 'USA', isOpenSource: false, brandColor: '#4285f4' },
  { name: 'Meta', nameCn: 'Meta', website: 'https://llama.meta.com', tierLevel: 1, country: 'USA', isOpenSource: true, brandColor: '#1877f2' },
  { name: 'Microsoft', nameCn: '微软', website: 'https://azure.microsoft.com/en-us/products/ai-services', tierLevel: 1, country: 'USA', isOpenSource: false, brandColor: '#00a4ef' },
  { name: 'Mistral AI', nameCn: 'Mistral AI', website: 'https://mistral.ai', tierLevel: 1, country: 'FR', isOpenSource: true, brandColor: '#f70000' },
  { name: 'xAI', nameCn: 'xAI', website: 'https://x.ai', tierLevel: 1, country: 'USA', isOpenSource: false, brandColor: '#1d9bf0' },
  { name: 'Cohere', nameCn: 'Cohere', website: 'https://cohere.com', tierLevel: 2, country: 'CA', isOpenSource: false, brandColor: '#39594d' },
  { name: 'AI21 Labs', nameCn: 'AI21 Labs', website: 'https://ai21.com', tierLevel: 2, country: 'ISR', isOpenSource: false, brandColor: '#553580' },
  { name: 'Stability AI', nameCn: 'Stability AI', website: 'https://stability.ai', tierLevel: 2, country: 'GBR', isOpenSource: true, brandColor: '#7c3aed' },
  // ---- T2 国内头部 ----
  { name: 'DeepSeek', nameCn: 'DeepSeek', website: 'https://www.deepseek.com', tierLevel: 1, country: 'CN', isOpenSource: true, brandColor: '#4d6bfe' },
  { name: 'ByteDance', nameCn: '字节跳动', website: 'https://www.doubao.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#3ec8b0' },
  { name: 'Baidu', nameCn: '百度', website: 'https://yiyan.baidu.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#2932e1' },
  { name: 'Alibaba', nameCn: '阿里巴巴', website: 'https://tongyi.aliyun.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#ff6a00' },
  { name: 'Zhipu', nameCn: '智谱AI', website: 'https://www.zhipuai.cn', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#4f46e5' },
  { name: 'MiniMax', nameCn: 'MiniMax', website: 'https://www.minimax.io', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#2563eb' },
  { name: '01.AI', nameCn: '零一万物', website: 'https://www.lingyiwanwu.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#6366f1' },
  { name: 'Moonshot AI', nameCn: '月之暗面', website: 'https://www.moonshot.cn', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#8b5cf6' },
  { name: 'iFlytek', nameCn: '科大讯飞', website: 'https://www.iflytek.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#0066ff' },
  { name: 'SenseTime', nameCn: '商汤科技', website: 'https://www.sensetime.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#c026d3' },
  { name: 'Tencent', nameCn: '腾讯', website: 'https://hunyuan.tencent.com', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#07c160' },
  { name: 'Huawei', nameCn: '华为', website: 'https://www.huawei.com/cloud', tierLevel: 2, country: 'CN', isOpenSource: false, brandColor: '#cf0a2c' },
]

const modelsData = [
  // =============================================
  // OpenAI 系列 (8个)
  // =============================================
  { name: 'GPT-4.5', nameCn: 'GPT-4.5', vendorName: 'OpenAI', modelType: 'CHAT', parameterCount: '1800B', contextLength: 128000, maxOutputTokens: 32768, isOpenSource: false, priceInput: 75, priceOutput: 150, priceCurrency: 'USD', benchmarkScores: { mmlu: 88.7, humaneval: 92.0 }, ladderScores: { official: 95, actual: 88, review: 90, selfTest: 85 }, compositeScore: 89.5, tags: ['推理', '编程', '长上下文'], description: 'OpenAI 最新旗舰模型', publishedAt: '2025-02-27' },
  { name: 'GPT-4o', nameCn: 'GPT-4o', vendorName: 'OpenAI', modelType: 'MULTIMODAL', parameterCount: '200B', contextLength: 128000, maxOutputTokens: 16384, isOpenSource: false, priceInput: 5, priceOutput: 15, priceCurrency: 'USD', benchmarkScores: { mmlu: 88.2, humaneval: 90.5 }, ladderScores: { official: 92, actual: 87, review: 89, selfTest: 84 }, compositeScore: 88.0, tags: ['多模态', '视觉', '语音'], description: 'OpenAI 多模态旗舰', publishedAt: '2024-05-13' },
  { name: 'GPT-4o mini', nameCn: 'GPT-4o mini', vendorName: 'OpenAI', modelType: 'CHAT', parameterCount: '8B', contextLength: 128000, maxOutputTokens: 16384, isOpenSource: false, priceInput: 0.15, priceOutput: 0.6, priceCurrency: 'USD', benchmarkScores: { mmlu: 82.5 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['性价比', '编程'], description: 'OpenAI 轻量级模型，高性价比', publishedAt: '2024-07-18' },
  { name: 'o1', nameCn: 'OpenAI o1', vendorName: 'OpenAI', modelType: 'REASONING', parameterCount: '未知', contextLength: 200000, maxOutputTokens: 100000, isOpenSource: false, priceInput: 15, priceOutput: 60, priceCurrency: 'USD', benchmarkScores: { mmlu: 92.3, math: 96.0 }, ladderScores: { official: 96, actual: 93, review: 94, selfTest: 90 }, compositeScore: 93.25, tags: ['推理', '数学', '编程'], description: 'OpenAI 推理模型，深度思考', publishedAt: '2024-09-12' },
  { name: 'o3-mini', nameCn: 'OpenAI o3-mini', vendorName: 'OpenAI', modelType: 'REASONING', parameterCount: '未知', contextLength: 200000, maxOutputTokens: 100000, isOpenSource: false, priceInput: 1.1, priceOutput: 4.4, priceCurrency: 'USD', benchmarkScores: { mmlu: 89.5, math: 93.0 }, ladderScores: { official: 91, actual: 88, review: 89, selfTest: 85 }, compositeScore: 88.25, tags: ['推理', '性价比'], description: 'OpenAI 轻量推理模型', publishedAt: '2025-01-31' },
  { name: 'DALL-E 3', nameCn: 'DALL-E 3', vendorName: 'OpenAI', modelType: 'IMAGE_GEN', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.04, priceOutput: 0.04, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 88, actual: 85, review: 87, selfTest: 82 }, compositeScore: 85.5, tags: ['图像生成', '文生图'], description: 'OpenAI 图像生成模型', publishedAt: '2023-10-01' },
  { name: 'Sora', nameCn: 'Sora', vendorName: 'OpenAI', modelType: 'VIDEO', parameterCount: '未知', contextLength: 8192, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.1, priceOutput: 0.1, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 90, actual: 85, review: 88, selfTest: 80 }, compositeScore: 85.75, tags: ['视频生成', '文生视频'], description: 'OpenAI 视频生成模型', publishedAt: '2024-12-09' },
  { name: 'Whisper v3', nameCn: 'Whisper v3', vendorName: 'OpenAI', modelType: 'AUDIO', parameterCount: '1.5B', contextLength: 16384, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0.006, priceOutput: 0.006, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 88, actual: 86, review: 87, selfTest: 84 }, compositeScore: 86.25, tags: ['语音识别', '开源', '多语言'], description: 'OpenAI 语音识别模型', publishedAt: '2023-11-06' },
  // =============================================
  // Anthropic 系列 (6个)
  // =============================================
  { name: 'Claude 3.7 Sonnet', nameCn: 'Claude 3.7', vendorName: 'Anthropic', modelType: 'CHAT', parameterCount: '175B', contextLength: 200000, maxOutputTokens: 128000, isOpenSource: false, priceInput: 15, priceOutput: 75, priceCurrency: 'USD', benchmarkScores: { mmlu: 88.5, humaneval: 92.7 }, ladderScores: { official: 94, actual: 91, review: 93, selfTest: 88 }, compositeScore: 91.5, tags: ['推理', '编程', '长上下文'], description: 'Anthropic 最强模型', publishedAt: '2025-02-24' },
  { name: 'Claude 3.5 Haiku', nameCn: 'Claude 3.5 Haiku', vendorName: 'Anthropic', modelType: 'CHAT', parameterCount: '20B', contextLength: 200000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.8, priceOutput: 4, priceCurrency: 'USD', benchmarkScores: { mmlu: 84.5 }, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['性价比', '编程'], description: 'Anthropic 轻量快速模型', publishedAt: '2024-11-04' },
  { name: 'Claude 3 Opus', nameCn: 'Claude 3 Opus', vendorName: 'Anthropic', modelType: 'CHAT', parameterCount: '300B', contextLength: 200000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 15, priceOutput: 75, priceCurrency: 'USD', benchmarkScores: { mmlu: 86.8 }, ladderScores: { official: 90, actual: 87, review: 89, selfTest: 84 }, compositeScore: 87.5, tags: ['推理', '长上下文'], description: 'Anthropic 上一代旗舰', publishedAt: '2024-03-04' },
  { name: 'Claude 3.5 Sonnet Vision', nameCn: 'Claude 3.5 视觉版', vendorName: 'Anthropic', modelType: 'VISION', parameterCount: '175B', contextLength: 200000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 3, priceOutput: 15, priceCurrency: 'USD', benchmarkScores: { mmlu: 87.1 }, ladderScores: { official: 90, actual: 86, review: 88, selfTest: 83 }, compositeScore: 86.75, tags: ['视觉', '文档理解'], description: 'Anthropic 视觉增强模型', publishedAt: '2024-06-20' },
  { name: 'Claude 3 Sonnet', nameCn: 'Claude 3 Sonnet', vendorName: 'Anthropic', modelType: 'CHAT', parameterCount: '70B', contextLength: 200000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 3, priceOutput: 15, priceCurrency: 'USD', benchmarkScores: { mmlu: 82.5 }, ladderScores: { official: 84, actual: 80, review: 82, selfTest: 78 }, compositeScore: 81.0, tags: ['性价比', '编程'], description: 'Anthropic 均衡模型', publishedAt: '2024-03-04' },
  { name: 'Claude 3 Haiku', nameCn: 'Claude 3 Haiku', vendorName: 'Anthropic', modelType: 'CHAT', parameterCount: '10B', contextLength: 200000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.25, priceOutput: 1.25, priceCurrency: 'USD', benchmarkScores: { mmlu: 75.5 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['性价比', '快速'], description: 'Anthropic 最快速模型', publishedAt: '2024-03-04' },
  // =============================================
  // Google 系列 (6个)
  // =============================================
  { name: 'Gemini 2.5 Pro', nameCn: 'Gemini 2.5', vendorName: 'Google', modelType: 'CHAT', parameterCount: '1800B', contextLength: 1000000, maxOutputTokens: 32768, isOpenSource: false, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 87.8, math: 91.0 }, ladderScores: { official: 92, actual: 90, review: 88, selfTest: 86 }, compositeScore: 89.0, tags: ['推理', '长上下文', '免费'], description: 'Google 最新旗舰模型', publishedAt: '2025-03-25' },
  { name: 'Gemini 2.0 Flash', nameCn: 'Gemini 2.0 Flash', vendorName: 'Google', modelType: 'MULTIMODAL', parameterCount: '未知', contextLength: 1048576, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.1, priceOutput: 0.4, priceCurrency: 'USD', benchmarkScores: { mmlu: 85.5 }, ladderScores: { official: 88, actual: 83, review: 85, selfTest: 80 }, compositeScore: 84.0, tags: ['多模态', '超长上下文', '性价比'], description: 'Google 多模态模型', publishedAt: '2024-12-11' },
  { name: 'Gemini 1.5 Pro', nameCn: 'Gemini 1.5 Pro', vendorName: 'Google', modelType: 'CHAT', parameterCount: '未知', contextLength: 2000000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 1.25, priceOutput: 5, priceCurrency: 'USD', benchmarkScores: { mmlu: 85.3 }, ladderScores: { official: 86, actual: 82, review: 84, selfTest: 79 }, compositeScore: 82.75, tags: ['长上下文', '多模态'], description: 'Google 百万级上下文模型', publishedAt: '2024-02-15' },
  { name: 'Gemini 1.5 Flash', nameCn: 'Gemini 1.5 Flash', vendorName: 'Google', modelType: 'CHAT', parameterCount: '未知', contextLength: 1000000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.075, priceOutput: 0.3, priceCurrency: 'USD', benchmarkScores: { mmlu: 82.0 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['性价比', '快速'], description: 'Google 轻量级模型', publishedAt: '2024-05-24' },
  { name: 'Gemma 2 27B', nameCn: 'Gemma 2 27B', vendorName: 'Google', modelType: 'CHAT', parameterCount: '27B', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 78.5 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['开源', '轻量'], description: 'Google 开源轻量模型', publishedAt: '2024-06-27' },
  { name: 'Imagen 3', nameCn: 'Imagen 3', vendorName: 'Google', modelType: 'IMAGE_GEN', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.03, priceOutput: 0.03, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 86, actual: 83, review: 85, selfTest: 80 }, compositeScore: 83.5, tags: ['图像生成', '文生图'], description: 'Google 图像生成模型', publishedAt: '2024-12-16' },
  // =============================================
  // Meta 系列 (4个)
  // =============================================
  { name: 'Llama 3.1 405B', nameCn: 'Llama 3.1 405B', vendorName: 'Meta', modelType: 'CHAT', parameterCount: '405B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 88.6 }, ladderScores: { official: 90, actual: 85, review: 87, selfTest: 82 }, compositeScore: 86.0, tags: ['开源', '推理', '编程'], description: 'Meta 开源最强模型', publishedAt: '2024-07-23' },
  { name: 'Llama 3.1 70B', nameCn: 'Llama 3.1 70B', vendorName: 'Meta', modelType: 'CHAT', parameterCount: '70B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 82.0 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['开源', '编程'], description: 'Meta 中型开源模型', publishedAt: '2024-07-23' },
  { name: 'Llama 3.1 8B', nameCn: 'Llama 3.1 8B', vendorName: 'Meta', modelType: 'CHAT', parameterCount: '8B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 68.4 }, ladderScores: { official: 65, actual: 60, review: 62, selfTest: 58 }, compositeScore: 61.25, tags: ['开源', '轻量'], description: 'Meta 轻量开源模型', publishedAt: '2024-07-23' },
  { name: 'Llama 3.2 11B Vision', nameCn: 'Llama 3.2 视觉版', vendorName: 'Meta', modelType: 'VISION', parameterCount: '11B', contextLength: 128000, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 73.5 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['开源', '视觉'], description: 'Meta 开源视觉模型', publishedAt: '2024-09-25' },
  // =============================================
  // Microsoft 系列 (4个)
  // =============================================
  { name: 'Phi-4', nameCn: 'Phi-4', vendorName: 'Microsoft', modelType: 'CHAT', parameterCount: '14B', contextLength: 16384, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 84.8 }, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['开源', '编程', '轻量'], description: '微软小型高性能模型', publishedAt: '2024-12-12' },
  { name: 'Phi-3.5 MoE', nameCn: 'Phi-3.5 MoE', vendorName: 'Microsoft', modelType: 'CHAT', parameterCount: '42B', contextLength: 128000, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 78.6 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['开源', 'MoE'], description: '微软 MoE 架构模型', publishedAt: '2024-08-20' },
  { name: 'Copilot Pro', nameCn: 'Copilot Pro', vendorName: 'Microsoft', modelType: 'CHAT', parameterCount: '未知', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 86.0 }, ladderScores: { official: 85, actual: 82, review: 83, selfTest: 79 }, compositeScore: 82.25, tags: ['编程', '办公'], description: '微软 Copilot 旗舰模型', publishedAt: '2024-01-15' },
  { name: 'Florence-2', nameCn: 'Florence-2', vendorName: 'Microsoft', modelType: 'VISION', parameterCount: '0.77B', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['开源', '视觉', 'OCR'], description: '微软视觉理解模型', publishedAt: '2024-06-03' },
  // =============================================
  // Mistral AI 系列 (4个)
  // =============================================
  { name: 'Mistral Large 2', nameCn: 'Mistral Large 2', vendorName: 'Mistral AI', modelType: 'CHAT', parameterCount: '123B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 2, priceOutput: 6, priceCurrency: 'USD', benchmarkScores: { mmlu: 84.0 }, ladderScores: { official: 84, actual: 80, review: 82, selfTest: 78 }, compositeScore: 81.0, tags: ['推理', '编程'], description: 'Mistral 旗舰模型', publishedAt: '2024-07-24' },
  { name: 'Mistral Medium', nameCn: 'Mistral Medium', vendorName: 'Mistral AI', modelType: 'CHAT', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.6, priceOutput: 1.8, priceCurrency: 'USD', benchmarkScores: { mmlu: 80.5 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['性价比'], description: 'Mistral 中型模型', publishedAt: '2024-01-01' },
  { name: 'Mixtral 8x22B', nameCn: 'Mixtral 8x22B', vendorName: 'Mistral AI', modelType: 'CHAT', parameterCount: '141B', contextLength: 64000, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 77.8 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['开源', 'MoE'], description: 'Mistral 开源 MoE 模型', publishedAt: '2024-04-10' },
  { name: 'Mistral Small', nameCn: 'Mistral Small', vendorName: 'Mistral AI', modelType: 'CHAT', parameterCount: '22B', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 75.2 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['开源', '轻量'], description: 'Mistral 轻量开源模型', publishedAt: '2024-09-18' },
  // =============================================
  // xAI 系列 (2个)
  // =============================================
  { name: 'Grok-3', nameCn: 'Grok-3', vendorName: 'xAI', modelType: 'CHAT', parameterCount: '未知', contextLength: 131072, maxOutputTokens: 16384, isOpenSource: false, priceInput: 5, priceOutput: 15, priceCurrency: 'USD', benchmarkScores: { mmlu: 87.5 }, ladderScores: { official: 88, actual: 84, review: 86, selfTest: 82 }, compositeScore: 85.0, tags: ['推理', '编程'], description: 'xAI 旗舰模型', publishedAt: '2025-02-18' },
  { name: 'Grok-2', nameCn: 'Grok-2', vendorName: 'xAI', modelType: 'CHAT', parameterCount: '未知', contextLength: 131072, maxOutputTokens: 8192, isOpenSource: false, priceInput: 2, priceOutput: 10, priceCurrency: 'USD', benchmarkScores: { mmlu: 83.5 }, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['推理'], description: 'xAI 上一代模型', publishedAt: '2024-08-13' },
  // =============================================
  // Cohere 系列 (2个)
  // =============================================
  { name: 'Command R+', nameCn: 'Command R+', vendorName: 'Cohere', modelType: 'CHAT', parameterCount: '104B', contextLength: 128000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 2.5, priceOutput: 10, priceCurrency: 'USD', benchmarkScores: { mmlu: 80.5 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['RAG', '企业'], description: 'Cohere 企业级RAG模型', publishedAt: '2024-04-03' },
  { name: 'Command R 35B', nameCn: 'Command R 35B', vendorName: 'Cohere', modelType: 'CHAT', parameterCount: '35B', contextLength: 128000, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: { mmlu: 74.0 }, ladderScores: { official: 70, actual: 66, review: 68, selfTest: 64 }, compositeScore: 67.0, tags: ['开源', 'RAG'], description: 'Cohere 开源RAG模型', publishedAt: '2024-03-11' },
  // =============================================
  // AI21 Labs 系列 (2个)
  // =============================================
  { name: 'Jamba 1.5 Large', nameCn: 'Jamba 1.5 Large', vendorName: 'AI21 Labs', modelType: 'CHAT', parameterCount: '398B', contextLength: 256000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 2, priceOutput: 8, priceCurrency: 'USD', benchmarkScores: { mmlu: 82.0 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['长上下文', 'MoE'], description: 'AI21 MoE架构模型', publishedAt: '2024-07-22' },
  { name: 'Jurassic-2 Ultra', nameCn: 'Jurassic-2 Ultra', vendorName: 'AI21 Labs', modelType: 'CHAT', parameterCount: '178B', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.9, priceOutput: 2.9, priceCurrency: 'USD', benchmarkScores: { mmlu: 76.5 }, ladderScores: { official: 74, actual: 70, review: 72, selfTest: 68 }, compositeScore: 71.0, tags: ['企业', '编程'], description: 'AI21 企业级模型', publishedAt: '2023-03-01' },
  // =============================================
  // Stability AI 系列 (2个)
  // =============================================
  { name: 'Stable Diffusion 3.5', nameCn: 'SD 3.5', vendorName: 'Stability AI', modelType: 'IMAGE_GEN', parameterCount: '8B', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 84, actual: 80, review: 82, selfTest: 78 }, compositeScore: 81.0, tags: ['开源', '图像生成'], description: 'Stability AI 开源图像模型', publishedAt: '2024-10-22' },
  { name: 'Stable Video Diffusion', nameCn: 'SVD', vendorName: 'Stability AI', modelType: 'VIDEO', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['开源', '视频生成'], description: 'Stability AI 开源视频模型', publishedAt: '2024-01-01' },
  // =============================================
  // DeepSeek 系列 (4个)
  // =============================================
  { name: 'DeepSeek-V3', nameCn: 'DeepSeek V3', vendorName: 'DeepSeek', modelType: 'CHAT', parameterCount: '671B', contextLength: 64000, maxOutputTokens: 16384, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 86.4 }, ladderScores: { official: 88, actual: 86, review: 85, selfTest: 83 }, compositeScore: 85.5, tags: ['开源', '推理', '长上下文'], description: 'DeepSeek 开源最强 MoE 模型', publishedAt: '2024-12-19' },
  { name: 'DeepSeek-R1', nameCn: 'DeepSeek R1', vendorName: 'DeepSeek', modelType: 'REASONING', parameterCount: '671B', contextLength: 64000, maxOutputTokens: 16384, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 90.8, math: 97.3 }, ladderScores: { official: 94, actual: 92, review: 93, selfTest: 89 }, compositeScore: 92.0, tags: ['开源', '推理', '数学'], description: 'DeepSeek 推理模型，开源最强', publishedAt: '2025-01-20' },
  { name: 'DeepSeek-Coder-V2', nameCn: 'DeepSeek Coder V2', vendorName: 'DeepSeek', modelType: 'CODE', parameterCount: '236B', contextLength: 128000, maxOutputTokens: 16384, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { humaneval: 90.5 }, ladderScores: { official: 86, actual: 84, review: 85, selfTest: 82 }, compositeScore: 84.25, tags: ['开源', '编程', '代码'], description: 'DeepSeek 代码模型', publishedAt: '2024-06-17' },
  { name: 'DeepSeek-V2.5', nameCn: 'DeepSeek V2.5', vendorName: 'DeepSeek', modelType: 'CHAT', parameterCount: '236B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.8 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['开源', '性价比'], description: 'DeepSeek 上一代模型', publishedAt: '2024-09-01' },
  // =============================================
  // 阿里巴巴 系列 (5个)
  // =============================================
  { name: 'Qwen-Max', nameCn: '通义千问 Max', vendorName: 'Alibaba', modelType: 'CHAT', parameterCount: '500B', contextLength: 32000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.02, priceOutput: 0.06, priceCurrency: 'CNY', benchmarkScores: { mmlu: 84.2 }, ladderScores: { official: 85, actual: 82, review: 83, selfTest: 80 }, compositeScore: 82.5, tags: ['国产', '编程'], description: '阿里云通义千问系列最强模型', publishedAt: '2024-01-08' },
  { name: 'Qwen-Plus', nameCn: '通义千问 Plus', vendorName: 'Alibaba', modelType: 'CHAT', parameterCount: '未知', contextLength: 131072, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.004, priceOutput: 0.012, priceCurrency: 'CNY', benchmarkScores: { mmlu: 80.5 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['国产', '性价比'], description: '阿里云通义千问均衡模型', publishedAt: '2024-04-01' },
  { name: 'Qwen-Turbo', nameCn: '通义千问 Turbo', vendorName: 'Alibaba', modelType: 'CHAT', parameterCount: '未知', contextLength: 131072, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.0003, priceOutput: 0.0006, priceCurrency: 'CNY', benchmarkScores: { mmlu: 74.0 }, ladderScores: { official: 70, actual: 66, review: 68, selfTest: 64 }, compositeScore: 67.0, tags: ['国产', '快速'], description: '阿里云通义千问快速模型', publishedAt: '2024-04-01' },
  { name: 'Qwen2.5-72B', nameCn: 'Qwen2.5 72B', vendorName: 'Alibaba', modelType: 'CHAT', parameterCount: '72B', contextLength: 131072, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.5 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['开源', '国产'], description: '阿里云开源最强模型', publishedAt: '2024-09-19' },
  { name: 'Qwen-VL-Max', nameCn: '通义千问视觉Max', vendorName: 'Alibaba', modelType: 'VISION', parameterCount: '72B', contextLength: 32768, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0.02, priceOutput: 0.06, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.3 }, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['视觉', '开源', '国产'], description: '通义千问视觉模型', publishedAt: '2024-03-01' },
  // =============================================
  // 字节跳动 系列 (3个)
  // =============================================
  { name: 'Doubao-Pro-32k', nameCn: '豆包 Pro', vendorName: 'ByteDance', modelType: 'CHAT', parameterCount: '32B', contextLength: 32000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.0008, priceOutput: 0.002, priceCurrency: 'CNY', benchmarkScores: { mmlu: 78.5 }, ladderScores: { official: 75, actual: 72, review: 70, selfTest: 68 }, compositeScore: 71.25, tags: ['性价比', '国产'], description: '字节跳动豆包Pro模型', publishedAt: '2024-05-15' },
  { name: 'Doubao-Lite-32k', nameCn: '豆包 Lite', vendorName: 'ByteDance', modelType: 'CHAT', parameterCount: '8B', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.0003, priceOutput: 0.0006, priceCurrency: 'CNY', benchmarkScores: { mmlu: 70.0 }, ladderScores: { official: 66, actual: 62, review: 64, selfTest: 60 }, compositeScore: 63.0, tags: ['性价比', '轻量', '国产'], description: '字节跳动豆包轻量模型', publishedAt: '2024-05-15' },
  { name: 'Doubao-Vision', nameCn: '豆包视觉版', vendorName: 'ByteDance', modelType: 'VISION', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.003, priceOutput: 0.009, priceCurrency: 'CNY', benchmarkScores: { mmlu: 75.0 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['视觉', '国产'], description: '字节跳动豆包视觉模型', publishedAt: '2024-08-01' },
  // =============================================
  // 百度 系列 (3个)
  // =============================================
  { name: 'ERNIE-4.0', nameCn: '文心一言 4.0', vendorName: 'Baidu', modelType: 'CHAT', parameterCount: '未知', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.03, priceOutput: 0.09, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.0 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['国产', '企业'], description: '百度文心一言旗舰模型', publishedAt: '2024-01-01' },
  { name: 'ERNIE-3.5', nameCn: '文心一言 3.5', vendorName: 'Baidu', modelType: 'CHAT', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.008, priceOutput: 0.024, priceCurrency: 'CNY', benchmarkScores: { mmlu: 76.0 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['国产', '性价比'], description: '百度文心一言均衡模型', publishedAt: '2023-06-01' },
  { name: 'ERNIE-ViLG 2.0', nameCn: '文心一格', vendorName: 'Baidu', modelType: 'IMAGE_GEN', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.02, priceOutput: 0.02, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['图像生成', '国产'], description: '百度文心一格图像生成模型', publishedAt: '2023-09-01' },
  // =============================================
  // 智谱AI 系列 (3个)
  // =============================================
  { name: 'GLM-4-Plus', nameCn: 'GLM-4 Plus', vendorName: 'Zhipu', modelType: 'CHAT', parameterCount: '130B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.05, priceOutput: 0.1, priceCurrency: 'CNY', benchmarkScores: { mmlu: 83.5 }, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['国产', '编程'], description: '智谱AI旗舰模型', publishedAt: '2024-06-01' },
  { name: 'GLM-4-9B', nameCn: 'GLM-4 9B', vendorName: 'Zhipu', modelType: 'CHAT', parameterCount: '9B', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 72.5 }, ladderScores: { official: 68, actual: 64, review: 66, selfTest: 62 }, compositeScore: 65.0, tags: ['开源', '国产', '轻量'], description: '智谱AI开源轻量模型', publishedAt: '2024-06-01' },
  { name: 'CogVLM2', nameCn: 'CogVLM2', vendorName: 'Zhipu', modelType: 'VISION', parameterCount: '18B', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 78.0 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['开源', '视觉', '国产'], description: '智谱AI视觉理解模型', publishedAt: '2024-05-01' },
  // =============================================
  // MiniMax 系列 (2个)
  // =============================================
  { name: 'MiniMax-01', nameCn: 'MiniMax-01', vendorName: 'MiniMax', modelType: 'CHAT', parameterCount: '456B', contextLength: 1000000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0.01, priceOutput: 0.02, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.0 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['开源', '长上下文', '国产'], description: 'MiniMax 百万级上下文模型', publishedAt: '2025-01-15' },
  { name: 'abab-7', nameCn: 'abab-7', vendorName: 'MiniMax', modelType: 'CHAT', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.005, priceOutput: 0.01, priceCurrency: 'CNY', benchmarkScores: { mmlu: 76.0 }, ladderScores: { official: 72, actual: 68, review: 70, selfTest: 66 }, compositeScore: 69.0, tags: ['国产', '性价比'], description: 'MiniMax 对话模型', publishedAt: '2024-06-01' },
  // =============================================
  // 零一万物 系列 (2个)
  // =============================================
  { name: 'Yi-Lightning', nameCn: 'Yi-Lightning', vendorName: '01.AI', modelType: 'CHAT', parameterCount: '未知', contextLength: 16384, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.001, priceOutput: 0.002, priceCurrency: 'CNY', benchmarkScores: { mmlu: 80.5 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['国产', '性价比', '快速'], description: '零一万物快速模型', publishedAt: '2024-10-01' },
  { name: 'Yi-Vision', nameCn: 'Yi-Vision', vendorName: '01.AI', modelType: 'VISION', parameterCount: '34B', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 78.0 }, ladderScores: { official: 74, actual: 70, review: 72, selfTest: 68 }, compositeScore: 71.0, tags: ['开源', '视觉', '国产'], description: '零一万物视觉模型', publishedAt: '2024-03-01' },
  // =============================================
  // 月之暗面 系列 (2个)
  // =============================================
  { name: 'Kimi k1.5', nameCn: 'Kimi k1.5', vendorName: 'Moonshot AI', modelType: 'REASONING', parameterCount: '未知', contextLength: 200000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.02, priceOutput: 0.06, priceCurrency: 'CNY', benchmarkScores: { mmlu: 87.5, math: 94.0 }, ladderScores: { official: 90, actual: 87, review: 88, selfTest: 84 }, compositeScore: 87.25, tags: ['推理', '国产', '长上下文'], description: '月之暗面推理模型', publishedAt: '2025-01-20' },
  { name: 'Moonshot-v1', nameCn: 'Moonshot v1', vendorName: 'Moonshot AI', modelType: 'CHAT', parameterCount: '未知', contextLength: 200000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.012, priceOutput: 0.012, priceCurrency: 'CNY', benchmarkScores: { mmlu: 79.5 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['国产', '长上下文'], description: '月之暗面对话模型', publishedAt: '2024-03-01' },
  // =============================================
  // 科大讯飞 系列 (2个)
  // =============================================
  { name: 'Spark-4.0 Ultra', nameCn: '星火4.0 Ultra', vendorName: 'iFlytek', modelType: 'CHAT', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.02, priceOutput: 0.06, priceCurrency: 'CNY', benchmarkScores: { mmlu: 80.0 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['国产', '语音'], description: '科大讯飞旗舰模型', publishedAt: '2024-06-01' },
  { name: 'Spark-TTS', nameCn: '星火语音合成', vendorName: 'iFlytek', modelType: 'TTS', parameterCount: '未知', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.01, priceOutput: 0.01, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 82, actual: 78, review: 80, selfTest: 76 }, compositeScore: 79.0, tags: ['国产', '语音合成'], description: '科大讯飞语音合成模型', publishedAt: '2024-01-01' },
  // =============================================
  // 商汤科技 系列 (2个)
  // =============================================
  { name: 'SenseNova-5.0', nameCn: '日日新5.0', vendorName: 'SenseTime', modelType: 'CHAT', parameterCount: '未知', contextLength: 64000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.015, priceOutput: 0.045, priceCurrency: 'CNY', benchmarkScores: { mmlu: 79.0 }, ladderScores: { official: 76, actual: 72, review: 74, selfTest: 70 }, compositeScore: 73.0, tags: ['国产', '视觉'], description: '商汤科技旗舰模型', publishedAt: '2024-04-01' },
  { name: 'SenseMirage', nameCn: '秒画', vendorName: 'SenseTime', modelType: 'IMAGE_GEN', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.02, priceOutput: 0.02, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['国产', '图像生成'], description: '商汤科技图像生成模型', publishedAt: '2024-01-01' },
  // =============================================
  // 腾讯 系列 (2个)
  // =============================================
  { name: 'Hunyuan-Large', nameCn: '混元 Large', vendorName: 'Tencent', modelType: 'CHAT', parameterCount: '389B', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: { mmlu: 82.5 }, ladderScores: { official: 80, actual: 76, review: 78, selfTest: 74 }, compositeScore: 77.0, tags: ['开源', '国产'], description: '腾讯混元开源模型', publishedAt: '2024-11-01' },
  { name: 'Hunyuan-Turbo', nameCn: '混元 Turbo', vendorName: 'Tencent', modelType: 'CHAT', parameterCount: '未知', contextLength: 32000, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.004, priceOutput: 0.012, priceCurrency: 'CNY', benchmarkScores: { mmlu: 78.0 }, ladderScores: { official: 74, actual: 70, review: 72, selfTest: 68 }, compositeScore: 71.0, tags: ['国产', '性价比'], description: '腾讯混元快速模型', publishedAt: '2024-05-01' },
  // =============================================
  // 华为 系列 (2个)
  // =============================================
  { name: 'Pangu-5.0', nameCn: '盘古5.0', vendorName: 'Huawei', modelType: 'CHAT', parameterCount: '未知', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: false, priceInput: 0.04, priceOutput: 0.12, priceCurrency: 'CNY', benchmarkScores: { mmlu: 81.0 }, ladderScores: { official: 78, actual: 74, review: 76, selfTest: 72 }, compositeScore: 75.0, tags: ['国产', '企业'], description: '华为盘古旗舰模型', publishedAt: '2024-06-01' },
  { name: 'Pangu-Weather', nameCn: '盘古气象', vendorName: 'Huawei', modelType: 'SYSTEM', parameterCount: '未知', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 85, actual: 82, review: 83, selfTest: 80 }, compositeScore: 82.5, tags: ['开源', '气象', '系统级'], description: '华为盘古气象大模型', publishedAt: '2023-11-01' },
  // =============================================
  // 嵌入/排序模型 (6个)
  // =============================================
  { name: 'text-embedding-3-large', nameCn: 'OpenAI嵌入Large', vendorName: 'OpenAI', modelType: 'EMBEDDING', parameterCount: '未知', contextLength: 8191, maxOutputTokens: 3072, isOpenSource: false, priceInput: 0.13, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 90, actual: 88, review: 89, selfTest: 86 }, compositeScore: 88.25, tags: ['嵌入', '检索'], description: 'OpenAI 嵌入模型', publishedAt: '2024-01-25' },
  { name: 'text-embedding-3-small', nameCn: 'OpenAI嵌入Small', vendorName: 'OpenAI', modelType: 'EMBEDDING', parameterCount: '未知', contextLength: 8191, maxOutputTokens: 1536, isOpenSource: false, priceInput: 0.02, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 84, actual: 82, review: 83, selfTest: 80 }, compositeScore: 82.25, tags: ['嵌入', '性价比'], description: 'OpenAI 轻量嵌入模型', publishedAt: '2024-01-25' },
  { name: 'BGE-M3', nameCn: 'BGE-M3', vendorName: 'Alibaba', modelType: 'EMBEDDING', parameterCount: '568M', contextLength: 8192, maxOutputTokens: 1024, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 86, actual: 84, review: 85, selfTest: 82 }, compositeScore: 84.25, tags: ['开源', '嵌入', '多语言'], description: 'BGE多语言嵌入模型', publishedAt: '2024-01-01' },
  { name: 'Cohere Embed v3', nameCn: 'Cohere嵌入v3', vendorName: 'Cohere', modelType: 'EMBEDDING', parameterCount: '未知', contextLength: 512, maxOutputTokens: 1024, isOpenSource: false, priceInput: 0.1, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 88, actual: 86, review: 87, selfTest: 84 }, compositeScore: 86.25, tags: ['嵌入', '检索'], description: 'Cohere 嵌入模型', publishedAt: '2024-01-01' },
  { name: 'rerank-v3', nameCn: 'Cohere排序v3', vendorName: 'Cohere', modelType: 'RERANK', parameterCount: '未知', contextLength: 4096, maxOutputTokens: 4096, isOpenSource: false, priceInput: 0.1, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: 88, actual: 86, review: 87, selfTest: 84 }, compositeScore: 86.25, tags: ['排序', '检索'], description: 'Cohere 排序模型', publishedAt: '2024-01-01' },
  { name: 'bge-reranker-v2-m3', nameCn: 'BGE排序v2', vendorName: 'Alibaba', modelType: 'RERANK', parameterCount: '568M', contextLength: 8192, maxOutputTokens: 4096, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'CNY', benchmarkScores: {}, ladderScores: { official: 84, actual: 82, review: 83, selfTest: 80 }, compositeScore: 82.25, tags: ['开源', '排序', '检索'], description: 'BGE开源排序模型', publishedAt: '2024-01-01' },
]

const rankingWeightsData = [
  { dimension: 'official', weight: 0.30, isActive: true, sortOrder: 1 },
  { dimension: 'actual', weight: 0.30, isActive: true, sortOrder: 2 },
  { dimension: 'review', weight: 0.20, isActive: true, sortOrder: 3 },
  { dimension: 'selfTest', weight: 0.20, isActive: true, sortOrder: 4 },
]

const featureFlagsData = [
  { flagCode: 'ladder.model', name: '大模型天梯图', nameCn: '大模型天梯图', isEnabled: true, category: 'ladder', priority: 1, description: '大模型天梯图功能开关' },
  { flagCode: 'ladder.skill', name: 'Skills天梯图', nameCn: 'Skills天梯图', isEnabled: true, category: 'ladder', priority: 2, description: 'Skills天梯图功能开关' },
  { flagCode: 'ladder.mcp', name: 'MCP天梯图', nameCn: 'MCP天梯图', isEnabled: true, category: 'ladder', priority: 3, description: 'MCP天梯图功能开关' },
  { flagCode: 'ladder.agent', name: 'Agent天梯图', nameCn: 'Agent天梯图', isEnabled: true, category: 'ladder', priority: 4, description: 'Agent天梯图功能开关' },
  { flagCode: 'ladder.api', name: 'API站天梯图', nameCn: 'API站天梯图', isEnabled: true, category: 'ladder', priority: 5, description: 'API站天梯图功能开关' },
  { flagCode: 'marketplace.skills', name: 'Skills市场', nameCn: 'Skills市场', isEnabled: true, category: 'marketplace', priority: 1, description: 'Skills市场功能开关' },
  { flagCode: 'marketplace.mcp', name: 'MCP市场', nameCn: 'MCP市场', isEnabled: true, category: 'marketplace', priority: 2, description: 'MCP市场功能开关' },
  { flagCode: 'favorites.enabled', name: '收藏夹功能', nameCn: '收藏夹功能', isEnabled: true, category: 'feature', priority: 1, description: '收藏夹功能开关' },
  { flagCode: 'comparison.enabled', name: '模型对比功能', nameCn: '模型对比功能', isEnabled: true, category: 'feature', priority: 2, description: '模型对比功能开关' },
  { flagCode: 'evaluation.enabled', name: '付费测评功能', nameCn: '付费测评功能', isEnabled: true, category: 'feature', priority: 3, description: '付费测评功能开关' },
  { flagCode: 'chat.enabled', name: '客服功能', nameCn: '客服功能', isEnabled: true, category: 'feature', priority: 4, description: '客服功能开关' },
]

const systemConfigsData = [
  { configKey: 'site.name', configGroup: 'general', configType: 'STRING', configValue: 'Aidean', description: '站点名称', isPublic: true },
  { configKey: 'site.description', configGroup: 'general', configType: 'STRING', configValue: 'AI模型天梯图平台', description: '站点描述', isPublic: true },
  { configKey: 'site.logoUrl', configGroup: 'general', configType: 'STRING', configValue: '/images/icons/logo.svg', description: '站点Logo', isPublic: true },
  { configKey: 'site.title', configGroup: 'general', configType: 'STRING', configValue: '', description: '浏览器标题(为空则用站点名称)', isPublic: true },
  { configKey: 'site.faviconUrl', configGroup: 'general', configType: 'STRING', configValue: '/images/icons/logo.svg', description: '站点Favicon', isPublic: true },
  { configKey: 'ladder.defaultView', configGroup: 'ladder', configType: 'STRING', configValue: 'table', description: '默认榜单视图' },
  { configKey: 'ladder.autoRefresh', configGroup: 'ladder', configType: 'BOOLEAN', configValue: 'true', description: '自动刷新排名' },
  { configKey: 'pricing.evalPerModel', configGroup: 'pricing', configType: 'NUMBER', configValue: '2', description: '测评每模型价格(元)' },
  { configKey: 'pricing.currency', configGroup: 'pricing', configType: 'STRING', configValue: 'CNY', description: '默认货币' },
  { configKey: 'security.maxLoginAttempts', configGroup: 'security', configType: 'NUMBER', configValue: '5', description: '最大登录尝试次数' },
  { configKey: 'security.sessionTimeout', configGroup: 'security', configType: 'NUMBER', configValue: '720', description: '会话超时时间(分钟)' },
  { configKey: 'ui.floating_dock.enabled', configGroup: 'ui', configType: 'BOOLEAN', configValue: 'true', description: '右下角悬浮面板' },
  { configKey: 'ui.theme.default', configGroup: 'ui', configType: 'STRING', configValue: 'light', description: '默认主题' },
]

const dictTypesData = [
  { dictCode: 'model_status', dictName: '模型状态', description: '模型生命周期状态' },
  { dictCode: 'model_type', dictName: '模型类型', description: 'AI模型分类' },
  { dictCode: 'vendor_tier', dictName: '厂商等级', description: '厂商分层等级' },
  { dictCode: 'notice_type', dictName: '公告类型', description: '系统公告分类' },
]

const dictItemsData = [
  { dictCode: 'model_status', itemCode: 'active', itemLabel: '活跃', sortOrder: 1 },
  { dictCode: 'model_status', itemCode: 'deprecated', itemLabel: '已弃用', sortOrder: 2 },
  { dictCode: 'model_status', itemCode: 'preview', itemLabel: '预览版', sortOrder: 3 },
  { dictCode: 'model_type', itemCode: 'chat', itemLabel: '对话', sortOrder: 1 },
  { dictCode: 'model_type', itemCode: 'vision', itemLabel: '视觉', sortOrder: 2 },
  { dictCode: 'model_type', itemCode: 'audio', itemLabel: '音频', sortOrder: 3 },
  { dictCode: 'vendor_tier', itemCode: 'tier1', itemLabel: 'T1-国际大厂', sortOrder: 1 },
  { dictCode: 'vendor_tier', itemCode: 'tier2', itemLabel: 'T2-国内头部', sortOrder: 2 },
  { dictCode: 'vendor_tier', itemCode: 'tier3', itemLabel: 'T3-创业公司', sortOrder: 3 },
  { dictCode: 'notice_type', itemCode: 'system', itemLabel: '系统公告', sortOrder: 1 },
  { dictCode: 'notice_type', itemCode: 'maintenance', itemLabel: '维护通知', sortOrder: 2 },
  { dictCode: 'notice_type', itemCode: 'update', itemLabel: '更新日志', sortOrder: 3 },
]

const navigationMenusData = [
  { menuCode: 'home', name: '首页', nameEn: 'Home', linkUrl: '/', sortOrder: 1 },
  { menuCode: 'models', name: '模型', nameEn: 'Models', linkUrl: '/models', sortOrder: 2 },
  { menuCode: 'skills', name: 'Skills', nameEn: 'Skills', linkUrl: '/skills', sortOrder: 3 },
  { menuCode: 'mcps', name: 'MCP', nameEn: 'MCP', linkUrl: '/mcps', sortOrder: 4 },
  { menuCode: 'news', name: '资讯', nameEn: 'News', linkUrl: '/news', sortOrder: 5 },
  { menuCode: 'docs', name: '文档', nameEn: 'Docs', linkUrl: '/docs', sortOrder: 6 },
]

const announcementsData = [
  { title: 'Aidean平台正式上线', content: '欢迎来到Aidean AI模型天梯图平台！我们致力于为您提供最全面的AI模型评测与对比服务。', type: 'system', priority: 2, isPublished: true },
  { title: 'DeepSeek-V3模型已收录', content: 'DeepSeek-V3开源MoE模型已加入天梯图，支持超长上下文与强大推理能力。', type: 'update', priority: 1, isPublished: true },
  { title: '测评功能限时优惠', content: '新用户首次测评享受5折优惠，快来体验多模型对比功能吧！', type: 'promotion', priority: 0, isPublished: true },
]

const scheduledScriptsData = [
  { name: '模型数据同步', scriptPath: 'scripts/sync-models.ts', cronExpression: '0 2 * * *', isActive: true },
  { name: '排名更新', scriptPath: 'scripts/update-rankings.ts', cronExpression: '0 3 * * 0', isActive: true },
]

// Skills 数据 (22个)
const skillsData = [
  { name: 'code-reviewer', nameCn: '代码审查', description: 'AI代码审查助手，帮助发现代码中的潜在问题', category: 'development', author: 'Aidean Team', tags: ['编程', '代码质量'], githubUrl: 'https://github.com/aidean/code-reviewer', installCount: 1250, rating: 4.8 },
  { name: 'doc-writer', nameCn: '文档生成器', description: '自动生成代码文档和技术文档', category: 'development', author: 'Aidean Team', tags: ['文档', '自动化'], githubUrl: 'https://github.com/aidean/doc-writer', installCount: 890, rating: 4.5 },
  { name: 'sql-assistant', nameCn: 'SQL助手', description: '智能SQL查询生成和优化助手', category: 'database', author: 'Aidean Team', tags: ['SQL', '数据库'], githubUrl: 'https://github.com/aidean/sql-assistant', installCount: 2100, rating: 4.7 },
  { name: 'prompt-optimizer', nameCn: 'Prompt优化器', description: '优化和精炼AI提示词', category: 'ai', author: 'Aidean Team', tags: ['Prompt', 'AI'], githubUrl: 'https://github.com/aidean/prompt-optimizer', installCount: 3200, rating: 4.9 },
  { name: 'test-generator', nameCn: '测试生成器', description: '自动生成单元测试和集成测试', category: 'development', author: 'Aidean Team', tags: ['测试', '自动化'], githubUrl: 'https://github.com/aidean/test-generator', installCount: 780, rating: 4.4 },
  { name: 'api-designer', nameCn: 'API设计器', description: 'RESTful API设计与文档生成工具', category: 'development', author: 'Aidean Team', tags: ['API', '设计'], githubUrl: 'https://github.com/aidean/api-designer', installCount: 1560, rating: 4.6 },
  { name: 'git-flow', nameCn: 'Git工作流', description: 'Git分支管理和工作流自动化', category: 'development', author: 'Aidean Team', tags: ['Git', '协作'], githubUrl: 'https://github.com/aidean/git-flow', installCount: 980, rating: 4.3 },
  { name: 'debug-helper', nameCn: '调试助手', description: '智能代码调试和错误分析', category: 'development', author: 'Aidean Team', tags: ['调试', 'Bug修复'], githubUrl: 'https://github.com/aidean/debug-helper', installCount: 1850, rating: 4.7 },
  { name: 'refactor-pro', nameCn: '重构专家', description: '代码重构建议与自动执行', category: 'development', author: 'Aidean Team', tags: ['重构', '代码质量'], githubUrl: 'https://github.com/aidean/refactor-pro', installCount: 670, rating: 4.2 },
  { name: 'security-scanner', nameCn: '安全扫描', description: '代码安全漏洞扫描与修复建议', category: 'security', author: 'Aidean Team', tags: ['安全', '漏洞'], githubUrl: 'https://github.com/aidean/security-scanner', installCount: 2300, rating: 4.8 },
  { name: 'perf-analyzer', nameCn: '性能分析', description: '代码性能瓶颈分析与优化建议', category: 'development', author: 'Aidean Team', tags: ['性能', '优化'], githubUrl: 'https://github.com/aidean/perf-analyzer', installCount: 1120, rating: 4.5 },
  { name: 'i18n-helper', nameCn: '国际化助手', description: '多语言国际化翻译与资源管理', category: 'development', author: 'Aidean Team', tags: ['国际化', '翻译'], githubUrl: 'https://github.com/aidean/i18n-helper', installCount: 540, rating: 4.1 },
  { name: 'data-pipeline', nameCn: '数据管道', description: 'ETL数据管道设计与自动化', category: 'data', author: 'Aidean Team', tags: ['数据', 'ETL'], githubUrl: 'https://github.com/aidean/data-pipeline', installCount: 890, rating: 4.4 },
  { name: 'chart-builder', nameCn: '图表构建器', description: '数据可视化图表自动生成', category: 'data', author: 'Aidean Team', tags: ['可视化', '图表'], githubUrl: 'https://github.com/aidean/chart-builder', installCount: 1670, rating: 4.6 },
  { name: 'regex-master', nameCn: '正则大师', description: '正则表达式生成、测试与解释', category: 'development', author: 'Aidean Team', tags: ['正则', '工具'], githubUrl: 'https://github.com/aidean/regex-master', installCount: 3200, rating: 4.8 },
  { name: 'docker-compose-gen', nameCn: 'Docker编排生成', description: 'Docker Compose配置自动生成', category: 'devops', author: 'Aidean Team', tags: ['Docker', '容器'], githubUrl: 'https://github.com/aidean/docker-compose-gen', installCount: 1450, rating: 4.5 },
  { name: 'ci-pipeline', nameCn: 'CI流水线', description: 'CI/CD流水线配置生成', category: 'devops', author: 'Aidean Team', tags: ['CI/CD', '自动化'], githubUrl: 'https://github.com/aidean/ci-pipeline', installCount: 980, rating: 4.3 },
  { name: 'terraform-gen', nameCn: 'Terraform生成', description: '基础设施即代码Terraform配置生成', category: 'devops', author: 'Aidean Team', tags: ['IaC', 'Terraform'], githubUrl: 'https://github.com/aidean/terraform-gen', installCount: 760, rating: 4.2 },
  { name: 'markdown-beautifier', nameCn: 'Markdown美化', description: 'Markdown文档格式化与美化', category: 'writing', author: 'Aidean Team', tags: ['Markdown', '文档'], githubUrl: 'https://github.com/aidean/markdown-beautifier', installCount: 2100, rating: 4.6 },
  { name: 'email-composer', nameCn: '邮件撰写', description: '商务邮件智能撰写与润色', category: 'writing', author: 'Aidean Team', tags: ['邮件', '写作'], githubUrl: 'https://github.com/aidean/email-composer', installCount: 1340, rating: 4.4 },
  { name: 'schema-validator', nameCn: 'Schema验证', description: 'JSON Schema验证与生成工具', category: 'development', author: 'Aidean Team', tags: ['Schema', '验证'], githubUrl: 'https://github.com/aidean/schema-validator', installCount: 890, rating: 4.3 },
  { name: 'env-setup', nameCn: '环境配置', description: '开发环境一键配置工具', category: 'devops', author: 'Aidean Team', tags: ['环境', '配置'], githubUrl: 'https://github.com/aidean/env-setup', installCount: 1780, rating: 4.7 },
]

// MCP Servers 数据 (22个)
const mcpServersData = [
  { name: 'github-mcp', nameCn: 'GitHub MCP', description: '与GitHub仓库交互，管理Issue、PR、代码', category: 'integration', provider: 'GitHub', tags: ['Git', '协作'], command: 'npx @github/mcp', installCount: 5600, rating: 4.8, isOfficial: true },
  { name: 'slack-mcp', nameCn: 'Slack MCP', description: 'Slack消息收发和频道管理', category: 'integration', provider: 'Slack', tags: ['消息', '协作'], command: 'npx @slack/mcp', installCount: 3200, rating: 4.6, isOfficial: true },
  { name: 'notion-mcp', nameCn: 'Notion MCP', description: 'Notion页面和数据库操作', category: 'integration', provider: 'Notion', tags: ['文档', '知识库'], command: 'npx @notion/mcp', installCount: 4100, rating: 4.7, isOfficial: false },
  { name: 'postgres-mcp', nameCn: 'PostgreSQL MCP', description: 'PostgreSQL数据库查询和管理', category: 'database', provider: 'PostgreSQL', tags: ['数据库', 'SQL'], command: 'npx @postgres/mcp', installCount: 2800, rating: 4.5, isOfficial: false },
  { name: 'redis-mcp', nameCn: 'Redis MCP', description: 'Redis缓存操作和数据管理', category: 'database', provider: 'Redis', tags: ['缓存', 'NoSQL'], command: 'npx @redis/mcp', installCount: 1900, rating: 4.4, isOfficial: false },
  { name: 'filesystem-mcp', nameCn: '文件系统 MCP', description: '本地文件系统读写操作', category: 'system', provider: 'Anthropic', tags: ['文件', '系统'], command: 'npx @anthropic/fs-mcp', installCount: 8900, rating: 4.9, isOfficial: true },
  { name: 'brave-search-mcp', nameCn: 'Brave搜索 MCP', description: 'Brave搜索引擎集成', category: 'search', provider: 'Brave', tags: ['搜索', 'Web'], command: 'npx @brave/search-mcp', installCount: 4500, rating: 4.7, isOfficial: true },
  { name: 'puppeteer-mcp', nameCn: 'Puppeteer MCP', description: '浏览器自动化操作', category: 'automation', provider: 'Puppeteer', tags: ['浏览器', '自动化'], command: 'npx @puppeteer/mcp', installCount: 3400, rating: 4.5, isOfficial: false },
  { name: 'docker-mcp', nameCn: 'Docker MCP', description: 'Docker容器管理操作', category: 'devops', provider: 'Docker', tags: ['Docker', '容器'], command: 'npx @docker/mcp', installCount: 2100, rating: 4.4, isOfficial: false },
  { name: 'aws-mcp', nameCn: 'AWS MCP', description: 'AWS云服务操作集成', category: 'cloud', provider: 'AWS', tags: ['AWS', '云服务'], command: 'npx @aws/mcp', installCount: 1800, rating: 4.3, isOfficial: true },
  { name: 'gcp-mcp', nameCn: 'GCP MCP', description: 'Google Cloud Platform操作集成', category: 'cloud', provider: 'Google', tags: ['GCP', '云服务'], command: 'npx @gcp/mcp', installCount: 1200, rating: 4.2, isOfficial: false },
  { name: 'jira-mcp', nameCn: 'Jira MCP', description: 'Jira项目管理和Issue跟踪', category: 'integration', provider: 'Atlassian', tags: ['项目管理', 'Issue'], command: 'npx @jira/mcp', installCount: 2600, rating: 4.5, isOfficial: false },
  { name: 'linear-mcp', nameCn: 'Linear MCP', description: 'Linear项目管理集成', category: 'integration', provider: 'Linear', tags: ['项目管理', '敏捷'], command: 'npx @linear/mcp', installCount: 1500, rating: 4.4, isOfficial: true },
  { name: 'mongodb-mcp', nameCn: 'MongoDB MCP', description: 'MongoDB文档数据库操作', category: 'database', provider: 'MongoDB', tags: ['数据库', 'NoSQL'], command: 'npx @mongodb/mcp', installCount: 1700, rating: 4.3, isOfficial: false },
  { name: 'mysql-mcp', nameCn: 'MySQL MCP', description: 'MySQL关系数据库操作', category: 'database', provider: 'MySQL', tags: ['数据库', 'SQL'], command: 'npx @mysql/mcp', installCount: 2300, rating: 4.4, isOfficial: false },
  { name: 's3-mcp', nameCn: 'S3存储 MCP', description: 'Amazon S3对象存储操作', category: 'cloud', provider: 'AWS', tags: ['存储', 'S3'], command: 'npx @aws/s3-mcp', installCount: 1400, rating: 4.2, isOfficial: false },
  { name: 'fetch-mcp', nameCn: 'Fetch MCP', description: 'HTTP请求和API调用', category: 'network', provider: 'Anthropic', tags: ['HTTP', 'API'], command: 'npx @anthropic/fetch-mcp', installCount: 6700, rating: 4.8, isOfficial: true },
  { name: 'memory-mcp', nameCn: '记忆 MCP', description: '持久化知识图谱存储', category: 'system', provider: 'Anthropic', tags: ['记忆', '知识图谱'], command: 'npx @anthropic/memory-mcp', installCount: 5200, rating: 4.7, isOfficial: true },
  { name: 'sequential-thinking-mcp', nameCn: '顺序思考 MCP', description: '结构化多步骤推理', category: 'ai', provider: 'Anthropic', tags: ['推理', '思考'], command: 'npx @anthropic/thinking-mcp', installCount: 3800, rating: 4.6, isOfficial: true },
  { name: 'exa-mcp', nameCn: 'Exa搜索 MCP', description: 'Exa AI搜索引擎集成', category: 'search', provider: 'Exa', tags: ['搜索', 'AI'], command: 'npx @exa/mcp', installCount: 980, rating: 4.3, isOfficial: false },
  { name: 'supabase-mcp', nameCn: 'Supabase MCP', description: 'Supabase后端服务集成', category: 'database', provider: 'Supabase', tags: ['数据库', 'BaaS'], command: 'npx @supabase/mcp', installCount: 1600, rating: 4.4, isOfficial: true },
  { name: 'figma-mcp', nameCn: 'Figma MCP', description: 'Figma设计文件读取与操作', category: 'design', provider: 'Figma', tags: ['设计', 'UI'], command: 'npx @figma/mcp', installCount: 1100, rating: 4.2, isOfficial: false },
]

// Agents 数据 (22个)
const agentsData = [
  { name: 'coding-agent', nameCn: '编程助手Agent', description: '智能编程助手，支持代码生成、重构、解释', category: 'development', author: 'Aidean Team', tags: ['编程', 'AI助手'], capabilities: ['代码生成', '代码重构', 'Bug修复', '代码解释'], usageCount: 15000, rating: 4.8, isActive: true },
  { name: 'writing-agent', nameCn: '写作助手Agent', description: '智能写作助手，支持文案、报告、邮件生成', category: 'content', author: 'Aidean Team', tags: ['写作', '内容'], capabilities: ['文案生成', '报告撰写', '邮件写作', '润色修改'], usageCount: 12000, rating: 4.7, isActive: true },
  { name: 'data-agent', nameCn: '数据分析Agent', description: '智能数据分析助手，处理和分析各类数据', category: 'data', author: 'Aidean Team', tags: ['数据', '分析'], capabilities: ['数据清洗', '数据分析', '可视化', '报告生成'], usageCount: 8500, rating: 4.6, isActive: true },
  { name: 'research-agent', nameCn: '研究助手Agent', description: '学术研究助手，支持文献检索、摘要、分析', category: 'research', author: 'Aidean Team', tags: ['研究', '学术'], capabilities: ['文献检索', '摘要生成', '对比分析', '引用管理'], usageCount: 6200, rating: 4.5, isActive: true },
  { name: 'meeting-agent', nameCn: '会议助手Agent', description: '智能会议助手，支持纪要、总结、行动项', category: 'productivity', author: 'Aidean Team', tags: ['会议', '效率'], capabilities: ['会议纪要', '要点总结', '行动项提取', '日程安排'], usageCount: 9800, rating: 4.7, isActive: true },
  { name: 'translation-agent', nameCn: '翻译Agent', description: '多语言翻译与本地化助手', category: 'content', author: 'Aidean Team', tags: ['翻译', '多语言'], capabilities: ['实时翻译', '文档翻译', '术语管理', '本地化'], usageCount: 7800, rating: 4.5, isActive: true },
  { name: 'qa-testing-agent', nameCn: 'QA测试Agent', description: '自动化质量保证测试助手', category: 'development', author: 'Aidean Team', tags: ['测试', '质量'], capabilities: ['用例生成', '回归测试', '性能测试', '兼容性测试'], usageCount: 4500, rating: 4.3, isActive: true },
  { name: 'devops-agent', nameCn: 'DevOps Agent', description: '运维自动化助手', category: 'devops', author: 'Aidean Team', tags: ['运维', '自动化'], capabilities: ['部署管理', '监控告警', '日志分析', '故障排查'], usageCount: 5600, rating: 4.4, isActive: true },
  { name: 'security-agent', nameCn: '安全审计Agent', description: '安全审计与合规检查助手', category: 'security', author: 'Aidean Team', tags: ['安全', '合规'], capabilities: ['漏洞扫描', '合规检查', '风险评估', '安全建议'], usageCount: 3200, rating: 4.6, isActive: true },
  { name: 'seo-agent', nameCn: 'SEO优化Agent', description: '搜索引擎优化分析与建议', category: 'marketing', author: 'Aidean Team', tags: ['SEO', '营销'], capabilities: ['关键词分析', '内容优化', '技术SEO', '竞品分析'], usageCount: 4100, rating: 4.3, isActive: true },
  { name: 'customer-support-agent', nameCn: '客服Agent', description: '智能客户服务与工单处理', category: 'support', author: 'Aidean Team', tags: ['客服', '支持'], capabilities: ['问题解答', '工单处理', '知识库检索', '情绪分析'], usageCount: 11200, rating: 4.7, isActive: true },
  { name: 'project-manager-agent', nameCn: '项目管理Agent', description: '项目进度跟踪与资源分配', category: 'productivity', author: 'Aidean Team', tags: ['项目管理', '效率'], capabilities: ['进度跟踪', '资源分配', '风险评估', '报告生成'], usageCount: 6700, rating: 4.5, isActive: true },
  { name: 'legal-agent', nameCn: '法律助手Agent', description: '法律文档审查与合规咨询', category: 'legal', author: 'Aidean Team', tags: ['法律', '合规'], capabilities: ['合同审查', '法规检索', '风险评估', '合规建议'], usageCount: 2800, rating: 4.4, isActive: true },
  { name: 'finance-agent', nameCn: '财务分析Agent', description: '财务数据分析与报表生成', category: 'finance', author: 'Aidean Team', tags: ['财务', '分析'], capabilities: ['财务分析', '报表生成', '预算预测', '异常检测'], usageCount: 3900, rating: 4.4, isActive: true },
  { name: 'design-agent', nameCn: '设计助手Agent', description: 'UI/UX设计建议与审查', category: 'design', author: 'Aidean Team', tags: ['设计', 'UI'], capabilities: ['设计审查', '配色建议', '布局优化', '可访问性检查'], usageCount: 2400, rating: 4.2, isActive: true },
  { name: 'onboarding-agent', nameCn: '入职引导Agent', description: '新员工入职引导与培训', category: 'hr', author: 'Aidean Team', tags: ['HR', '培训'], capabilities: ['入职引导', '培训计划', '知识问答', '进度跟踪'], usageCount: 1800, rating: 4.1, isActive: true },
  { name: 'code-review-agent', nameCn: '代码评审Agent', description: '自动化代码评审与建议', category: 'development', author: 'Aidean Team', tags: ['代码评审', '质量'], capabilities: ['代码审查', '风格检查', '安全扫描', '性能建议'], usageCount: 8900, rating: 4.7, isActive: true },
  { name: 'api-testing-agent', nameCn: 'API测试Agent', description: 'API接口自动化测试', category: 'development', author: 'Aidean Team', tags: ['API', '测试'], capabilities: ['接口测试', '性能测试', '契约测试', 'Mock生成'], usageCount: 3600, rating: 4.3, isActive: true },
  { name: 'content-moderation-agent', nameCn: '内容审核Agent', description: '内容合规审核与过滤', category: 'content', author: 'Aidean Team', tags: ['审核', '合规'], capabilities: ['内容审核', '敏感词过滤', '图片审核', '风险评估'], usageCount: 5400, rating: 4.5, isActive: true },
  { name: 'knowledge-base-agent', nameCn: '知识库Agent', description: '知识库构建与检索助手', category: 'knowledge', author: 'Aidean Team', tags: ['知识库', 'RAG'], capabilities: ['知识提取', '文档索引', '语义检索', '问答生成'], usageCount: 7200, rating: 4.6, isActive: true },
  { name: 'workflow-automation-agent', nameCn: '工作流Agent', description: '业务工作流自动化编排', category: 'automation', author: 'Aidean Team', tags: ['工作流', '自动化'], capabilities: ['流程编排', '条件触发', '数据转换', '通知推送'], usageCount: 4800, rating: 4.4, isActive: true },
  { name: 'monitoring-agent', nameCn: '监控分析Agent', description: '系统监控与智能告警', category: 'devops', author: 'Aidean Team', tags: ['监控', '告警'], capabilities: ['指标监控', '异常检测', '根因分析', '告警通知'], usageCount: 3100, rating: 4.3, isActive: true },
]

// API Stations 数据 (20个)
const apiStationsData = [
  { name: 'OpenAI API', nameCn: 'OpenAI API', description: 'OpenAI官方API服务，提供GPT-4等模型', provider: 'OpenAI', providerCn: 'OpenAI', baseUrl: 'https://api.openai.com/v1', tags: ['GPT', '对话'], status: 'active', pricingInfo: { input: 5, output: 15, currency: 'USD' }, rating: 4.9, latency: 200 },
  { name: 'Anthropic API', nameCn: 'Anthropic API', description: 'Anthropic官方API服务，提供Claude系列模型', provider: 'Anthropic', providerCn: 'Anthropic', baseUrl: 'https://api.anthropic.com', tags: ['Claude', '对话'], status: 'active', pricingInfo: { input: 3, output: 15, currency: 'USD' }, rating: 4.8, latency: 250 },
  { name: 'Gemini API', nameCn: 'Gemini API', description: 'Google Gemini API服务', provider: 'Google', providerCn: 'Google', baseUrl: 'https://generativelanguage.googleapis.com', tags: ['Gemini', '多模态'], status: 'active', pricingInfo: { input: 0, output: 0, currency: 'USD' }, rating: 4.7, latency: 180 },
  { name: 'SiliconFlow', nameCn: '硅基流动', description: '国内大模型API聚合平台', provider: 'SiliconFlow', providerCn: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', tags: ['聚合', '国产'], status: 'active', pricingInfo: { input: 1, output: 2, currency: 'CNY' }, rating: 4.5, latency: 150 },
  { name: 'DeepSeek API', nameCn: 'DeepSeek API', description: 'DeepSeek官方API服务', provider: 'DeepSeek', providerCn: 'DeepSeek', baseUrl: 'https://api.deepseek.com', tags: ['DeepSeek', '开源'], status: 'active', pricingInfo: { input: 0, output: 0, currency: 'CNY' }, rating: 4.6, latency: 220 },
  { name: 'Azure OpenAI', nameCn: 'Azure OpenAI', description: '微软Azure托管的OpenAI API服务', provider: 'Microsoft', providerCn: '微软', baseUrl: 'https://oai.azure.com', tags: ['Azure', 'GPT'], status: 'active', pricingInfo: { input: 5, output: 15, currency: 'USD' }, rating: 4.8, latency: 180 },
  { name: 'Mistral API', nameCn: 'Mistral API', description: 'Mistral AI官方API服务', provider: 'Mistral AI', providerCn: 'Mistral AI', baseUrl: 'https://api.mistral.ai', tags: ['Mistral', '开源'], status: 'active', pricingInfo: { input: 2, output: 6, currency: 'USD' }, rating: 4.5, latency: 190 },
  { name: 'Cohere API', nameCn: 'Cohere API', description: 'Cohere企业级API服务', provider: 'Cohere', providerCn: 'Cohere', baseUrl: 'https://api.cohere.ai', tags: ['Cohere', 'RAG'], status: 'active', pricingInfo: { input: 2.5, output: 10, currency: 'USD' }, rating: 4.4, latency: 230 },
  { name: 'xAI API', nameCn: 'xAI API', description: 'xAI Grok模型API服务', provider: 'xAI', providerCn: 'xAI', baseUrl: 'https://api.x.ai', tags: ['Grok', '推理'], status: 'active', pricingInfo: { input: 5, output: 15, currency: 'USD' }, rating: 4.3, latency: 210 },
  { name: '通义千问API', nameCn: '通义千问API', description: '阿里云通义千问API服务', provider: 'Alibaba', providerCn: '阿里巴巴', baseUrl: 'https://dashscope.aliyuncs.com', tags: ['Qwen', '国产'], status: 'active', pricingInfo: { input: 0.02, output: 0.06, currency: 'CNY' }, rating: 4.5, latency: 120 },
  { name: '豆包API', nameCn: '豆包API', description: '字节跳动豆包大模型API服务', provider: 'ByteDance', providerCn: '字节跳动', baseUrl: 'https://api.doubao.com', tags: ['豆包', '国产'], status: 'active', pricingInfo: { input: 0.0008, output: 0.002, currency: 'CNY' }, rating: 4.3, latency: 100 },
  { name: '文心一言API', nameCn: '文心一言API', description: '百度文心一言API服务', provider: 'Baidu', providerCn: '百度', baseUrl: 'https://aip.baidubce.com', tags: ['文心', '国产'], status: 'active', pricingInfo: { input: 0.03, output: 0.09, currency: 'CNY' }, rating: 4.4, latency: 130 },
  { name: '智谱API', nameCn: '智谱API', description: '智谱AI GLM系列API服务', provider: 'Zhipu', providerCn: '智谱AI', baseUrl: 'https://open.bigmodel.cn', tags: ['GLM', '国产'], status: 'active', pricingInfo: { input: 0.05, output: 0.1, currency: 'CNY' }, rating: 4.4, latency: 140 },
  { name: 'Moonshot API', nameCn: 'Moonshot API', description: '月之暗面Kimi API服务', provider: 'Moonshot AI', providerCn: '月之暗面', baseUrl: 'https://api.moonshot.cn', tags: ['Kimi', '国产'], status: 'active', pricingInfo: { input: 0.012, output: 0.012, currency: 'CNY' }, rating: 4.5, latency: 160 },
  { name: '讯飞星火API', nameCn: '讯飞星火API', description: '科大讯飞星火大模型API服务', provider: 'iFlytek', providerCn: '科大讯飞', baseUrl: 'https://spark-api.xf-yun.com', tags: ['星火', '国产'], status: 'active', pricingInfo: { input: 0.02, output: 0.06, currency: 'CNY' }, rating: 4.3, latency: 135 },
  { name: '腾讯混元API', nameCn: '腾讯混元API', description: '腾讯混元大模型API服务', provider: 'Tencent', providerCn: '腾讯', baseUrl: 'https://hunyuan.tencentcloudapi.com', tags: ['混元', '国产'], status: 'active', pricingInfo: { input: 0.004, output: 0.012, currency: 'CNY' }, rating: 4.3, latency: 125 },
  { name: '华为盘古API', nameCn: '华为盘古API', description: '华为盘古大模型API服务', provider: 'Huawei', providerCn: '华为', baseUrl: 'https://pangu.huaweicloud.com', tags: ['盘古', '国产'], status: 'active', pricingInfo: { input: 0.04, output: 0.12, currency: 'CNY' }, rating: 4.2, latency: 170 },
  { name: 'Together AI', nameCn: 'Together AI', description: '开源模型托管与推理API', provider: 'Together AI', providerCn: 'Together AI', baseUrl: 'https://api.together.xyz', tags: ['开源', '推理'], status: 'active', pricingInfo: { input: 0.2, output: 0.8, currency: 'USD' }, rating: 4.4, latency: 200 },
  { name: 'Fireworks AI', nameCn: 'Fireworks AI', description: '高性能开源模型推理API', provider: 'Fireworks AI', providerCn: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai', tags: ['开源', '高性能'], status: 'active', pricingInfo: { input: 0.2, output: 0.8, currency: 'USD' }, rating: 4.3, latency: 160 },
  { name: 'Groq API', nameCn: 'Groq API', description: 'Groq超快推理API服务', provider: 'Groq', providerCn: 'Groq', baseUrl: 'https://api.groq.com', tags: ['超快', '推理'], status: 'active', pricingInfo: { input: 0.05, output: 0.1, currency: 'USD' }, rating: 4.6, latency: 30 },
]

// 帮助文档数据
const documentsData = [
  { title: '快速入门指南', titleEn: 'Quick Start Guide', slug: 'quick-start', content: '# 快速入门\n\n欢迎使用Aidean平台！\n\n## 1. 注册账号\n访问注册页面创建账号...\n\n## 2. 浏览天梯图\n首页展示大模型天梯图...\n\n## 3. 对比测评\n选择模型进行多维度对比...', category: 'guide', type: 'help', isPublished: true },
  { title: '天梯图使用说明', titleEn: 'Ladder Chart Guide', slug: 'ladder-guide', content: '# 天梯图使用说明\n\n## 视图切换\n支持专业版和应用版视图...\n\n## 筛选功能\n按类型、协议、开源等条件筛选...\n\n## 排序算法\n自定义排序公式使用说明...', category: 'guide', type: 'help', isPublished: true },
  { title: '余额与充值', titleEn: 'Balance & Recharge', slug: 'balance-guide', content: '# 余额与充值\n\n## 余额系统\n采用预付费模式，先充值后使用...\n\n## 充值档位\n- 体验包：¥10\n- 基础包：¥50（赠送¥5）\n- 标准包：¥100（赠送¥15）\n\n## 消费记录\n可在个人中心查看完整消费记录...', category: 'billing', type: 'help', isPublished: true },
  { title: 'API文档', titleEn: 'API Documentation', slug: 'api-docs', content: '# API文档\n\n## 认证方式\n使用Bearer Token进行认证...\n\n## 基础URL\n`https://api.aidean.com/v1`\n\n## 端点列表\n- GET /models - 获取模型列表\n- GET /ladder - 获取天梯图数据\n- POST /evaluations - 创建评测', category: 'api', type: 'docs', isPublished: true },
]

// ============================================
// 主函数
// ============================================
async function main() {
  console.log('🌱 Seeding database...')

  // ============================================
  // 1. 清空数据（按外键依赖逆序）
  // ============================================
  console.log('🧹 Clearing existing data...')
  
  await prisma.ladderRanking.deleteMany().catch(() => {})
  await prisma.ladderChart.deleteMany().catch(() => {})
  await prisma.benchmark.deleteMany().catch(() => {})
  await prisma.modelScore.deleteMany().catch(() => {})
  await prisma.modelPrice.deleteMany().catch(() => {})
  await prisma.aiModel.deleteMany().catch(() => {})
  await prisma.vendor.deleteMany().catch(() => {})
  await prisma.rankingWeight.deleteMany().catch(() => {})
  await prisma.featureFlag.deleteMany().catch(() => {})
  await prisma.systemConfig.deleteMany().catch(() => {})
  await prisma.dictItem.deleteMany().catch(() => {})
  await prisma.dictType.deleteMany().catch(() => {})
  await prisma.navigationMenu.deleteMany().catch(() => {})
  await prisma.announcement.deleteMany().catch(() => {})
  await prisma.scheduledScript.deleteMany().catch(() => {})
  await prisma.userNotification.deleteMany().catch(() => {})
  await prisma.apiKey.deleteMany().catch(() => {})
  await prisma.userProfile.deleteMany().catch(() => {})
  await prisma.user.deleteMany().catch(() => {})

  console.log('✅ Data cleared')

  // ============================================
  // 2. 创建基础数据
  // ============================================
  
  // 2.1 创建厂商
  console.log('🏢 Creating vendors...')
  const vendors: Record<string, any> = {}
  for (const v of vendorsData) {
    const created = await prisma.vendor.create({
      data: { 
        code: generateCode(v.name),
        name: v.name,
        nameCn: v.nameCn,
        website: v.website,
        tierLevel: v.tierLevel,
        country: v.country,
        brandColor: v.brandColor || '#6366f1',
        isActive: true,
      }
    })
    vendors[v.name] = created
  }
  console.log(`✅ ${vendorsData.length} vendors created`)

  // 2.2 创建AI模型
  console.log('🤖 Creating AI models...')
  const models: any[] = []
  for (const m of modelsData) {
    const vendor = vendors[m.vendorName]
    
    if (!vendor) {
      console.warn(`Skipping ${m.name}: vendor not found`)
      continue
    }

    const slug = generateSlug(m.name)
    // 检查slug唯一性，若重复则追加vendor前缀
    const existingModel = await prisma.aiModel.findFirst({ where: { slug } })
    const finalSlug = existingModel ? `${slug}-${generateSlug(m.vendorName)}` : slug
    
    const created = await prisma.aiModel.create({
      data: {
        modelCode: finalSlug,
        nameDisplay: m.name,
        nameCn: m.nameCn,
        slug: finalSlug,
        vendorId: vendor.id,
        modelType: m.modelType as any,
        parameterCount: m.parameterCount,
        contextLength: m.contextLength,
        maxOutputTokens: m.maxOutputTokens,
        isOpenSource: m.isOpenSource,
        tags: m.tags,
        publishedAt: new Date(m.publishedAt),
        isActive: true,
        officialUrl: vendor.website,
      }
    })
    models.push({ ...created, ...m })
    
    // 2.3 创建模型价格
    await prisma.modelPrice.create({
      data: {
        modelId: created.id,
        priceInput: m.priceInput,
        priceOutput: m.priceOutput,
        billingCurrency: m.priceCurrency,
        isCurrent: true,
        effectiveFrom: new Date(),
      }
    })
    
    // 2.4 创建模型评分
    await prisma.modelScore.create({
      data: {
        modelId: created.id,
        officialScore: m.ladderScores.official,
        actualScore: m.ladderScores.actual,
        reviewScore: m.ladderScores.review,
        selfTestScore: m.ladderScores.selfTest,
        compositeScore: m.compositeScore,
        calcVersion: 1,
        isCurrent: true,
      }
    })
    
    // 2.5 创建基准测试
    await prisma.benchmark.create({
      data: {
        modelId: created.id,
        sourceType: 'OFFICIAL',
        sourceName: '官方测试',
        benchmarkType: 'standard',
        scores: m.benchmarkScores,
        totalScore: m.compositeScore,
      }
    })
  }
  console.log(`✅ ${models.length} AI models with prices, scores and benchmarks created`)

  // ============================================
  // 3. 创建系统配置
  // ============================================
  
  // 3.1 排名权重
  console.log('⚖️ Creating ranking weights...')
  for (const w of rankingWeightsData) {
    await prisma.rankingWeight.create({ data: w as any })
  }
  console.log(`✅ ${rankingWeightsData.length} ranking weights created`)

  // 3.2 功能开关
  console.log('🚦 Creating feature flags...')
  for (const f of featureFlagsData) {
    await prisma.featureFlag.create({ data: f as any })
  }
  console.log(`✅ ${featureFlagsData.length} feature flags created`)

  // 3.3 系统配置
  console.log('⚙️ Creating system configs...')
  for (const cfg of systemConfigsData) {
    await prisma.systemConfig.create({
      data: { ...cfg, sortOrder: systemConfigsData.indexOf(cfg) } as any
    })
  }
  console.log(`✅ ${systemConfigsData.length} system configs created`)

  // 3.4 导航菜单
  console.log('🧭 Creating navigation menus...')
  for (const m of navigationMenusData) {
    await prisma.navigationMenu.create({
      data: { ...m, level: 1, isVisible: true, showInHeader: true } as any
    })
  }
  console.log(`✅ ${navigationMenusData.length} navigation menus created`)

  // 3.5 字典数据
  console.log('📚 Creating dictionary data...')
  const dictTypes: Record<string, any> = {}
  for (const dt of dictTypesData) {
    const created = await prisma.dictType.create({ data: dt as any })
    dictTypes[dt.dictCode] = created
  }
  for (const di of dictItemsData) {
    const type = dictTypes[di.dictCode]
    if (type) {
      await prisma.dictItem.create({
        data: {
          dictTypeId: type.id,
          itemCode: di.itemCode,
          itemLabel: di.itemLabel,
          sortOrder: di.sortOrder,
        } as any
      })
    }
  }
  console.log(`✅ ${dictTypesData.length} dict types with ${dictItemsData.length} items created`)

  // 3.6 公告
  console.log('📢 Creating announcements...')
  for (const ann of announcementsData) {
    await prisma.announcement.create({
      data: { ...ann, publishedAt: new Date() } as any
    })
  }
  console.log(`✅ ${announcementsData.length} announcements created`)

  // 3.7 定时脚本
  console.log('⏰ Creating scheduled scripts...')
  for (const script of scheduledScriptsData) {
    await prisma.scheduledScript.create({
      data: {
        ...script,
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any
    })
  }
  console.log(`✅ ${scheduledScriptsData.length} scheduled scripts created`)

  // 3.8 Skills
  console.log('🛠️ Creating skills...')
  for (const skill of skillsData) {
    await prisma.skill.create({
      data: {
        name: skill.name,
        nameCn: skill.nameCn,
        displayName: skill.nameCn || skill.name,
        description: skill.description,
        category: skill.category,
        author: skill.author,
        tags: skill.tags,
        readmeUrl: skill.githubUrl,
        downloads: skill.installCount,
        rating: skill.rating,
        isVerified: true,
      } as any
    })
  }
  console.log(`✅ ${skillsData.length} skills created`)

  // 3.9 MCP Servers
  console.log('🔌 Creating MCP servers...')
  for (const mcp of mcpServersData) {
    await prisma.mCPServer.create({
      data: {
        name: mcp.name,
        nameCn: mcp.nameCn,
        displayName: mcp.nameCn || mcp.name,
        description: mcp.description,
        category: mcp.category,
        tags: mcp.tags,
        command: mcp.command,
        downloads: mcp.installCount,
        rating: mcp.rating,
        isVerified: mcp.isOfficial,
      } as any
    })
  }
  console.log(`✅ ${mcpServersData.length} MCP servers created`)

  // 3.10 Agents
  console.log('🤖 Creating agents...')
  for (const agent of agentsData) {
    await prisma.agent.create({
      data: {
        name: agent.name,
        nameCn: agent.nameCn,
        displayName: agent.nameCn || agent.name,
        description: agent.description,
        category: agent.category,
        author: agent.author,
        tags: agent.tags,
        capabilities: agent.capabilities,
        activeUsers: agent.usageCount,
        avgRating: agent.rating,
        isVerified: agent.isActive,
      } as any
    })
  }
  console.log(`✅ ${agentsData.length} agents created`)

  // 3.11 API Stations
  console.log('🌐 Creating API stations...')
  for (const api of apiStationsData) {
    await prisma.aPIStation.create({
      data: {
        name: api.name,
        nameCn: api.nameCn,
        displayName: api.nameCn || api.name,
        description: api.description,
        provider: api.provider,
        website: api.provider,
        baseUrl: api.baseUrl,
        models: api.tags,
        pricing: api.pricingInfo,
        rating: api.rating,
        avgLatency: api.latency,
        isVerified: api.status === 'active',
      } as any
    })
  }
  console.log(`✅ ${apiStationsData.length} API stations created`)

  // 3.12 帮助文档 (跳过 - Document模型为文件上传，非帮助文档)
  console.log('📚 Skipping documents (model mismatch)...')

  // ============================================
  // 4. 创建用户
  // ============================================
  console.log('👤 Creating users...')
  
  // 超级管理员
  const adminEmail = 'admin@aidean.com'
  const adminPassword = 'Admin123!@#'
  const hashedPassword = await hash(adminPassword, 12)
  
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      nickname: '超级管理员',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      balance: 1000,
      profile: {
        create: {
          bio: '系统超级管理员',
        }
      }
    }
  })
  console.log('✅ Super admin created: admin@aidean.com / Admin123!@#')

  // 测试用户
  await prisma.user.create({
    data: {
      email: 'test@aidean.com',
      password: await hash('Test123!@#', 12),
      nickname: '测试用户',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      balance: 100,
      profile: {
        create: {
          bio: '测试账号',
        }
      }
    }
  })
  console.log('✅ Test user created: test@aidean.com / Test123!@#')

  // ============================================
  // 5. 创建天梯图数据
  // ============================================
  console.log('📊 Creating ladder charts...')
  
  const chartConfigs = [
    { chartCode: 'llm-professional', name: '大模型专业版天梯图', description: '专业级大语言模型综合排名', chartType: 'PERFORMANCE', applicableTypes: ['CHAT', 'REASONING', 'CODE'], isFeatured: true, isPublic: true },
    { chartCode: 'llm-open-source', name: '开源模型天梯图', description: '开源大模型综合排名', chartType: 'OPEN_SOURCE', applicableTypes: ['CHAT', 'REASONING', 'CODE'], isFeatured: false, isPublic: true },
    { chartCode: 'llm-value', name: '性价比天梯图', description: '综合性能与价格比排名', chartType: 'PRICE_VALUE', applicableTypes: ['CHAT', 'REASONING', 'CODE'], isFeatured: false, isPublic: true },
    { chartCode: 'llm-mobile', name: '手机端天梯图', description: '手机端精简版排名', chartType: 'MOBILE', applicableTypes: ['CHAT'], isFeatured: false, isPublic: true },
    { chartCode: 'llm-vision', name: '视觉模型天梯图', description: '视觉/多模态模型排名', chartType: 'CUSTOM', applicableTypes: ['VISION', 'MULTIMODAL', 'IMAGE_GEN'], isFeatured: false, isPublic: true },
    { chartCode: 'llm-audio-video', name: '音视频模型天梯图', description: '音频/视频生成模型排名', chartType: 'CUSTOM', applicableTypes: ['VIDEO', 'AUDIO', 'TTS', 'ASR'], isFeatured: false, isPublic: true },
  ]
  
  for (const cfg of chartConfigs) {
    const ladderChart = await prisma.ladderChart.create({
      data: {
        chartCode: cfg.chartCode,
        name: cfg.name,
        description: cfg.description,
        chartType: cfg.chartType,
        applicableTypes: cfg.applicableTypes,
        isFeatured: cfg.isFeatured,
        isPublic: cfg.isPublic,
        isActive: true,
      } as any
    })
    
    // 筛选适用模型
    const applicableModels = models.filter((m: any) => {
      if (cfg.chartType === 'OPEN_SOURCE') return m.isOpenSource
      if (cfg.chartType === 'VALUE') return true // 性价比包含所有
      return cfg.applicableTypes.includes(m.modelType)
    })
    
    // 为适用模型创建排名
    const sortedModels = [...applicableModels].sort((a: any, b: any) => b.compositeScore - a.compositeScore)
    for (let i = 0; i < sortedModels.length; i++) {
      const m = sortedModels[i]
      await prisma.ladderRanking.create({
        data: {
          chartId: ladderChart.id,
          modelId: m.id,
          rankPosition: i + 1,
          modelCode: m.modelCode,
          modelName: m.nameDisplay,
          vendorName: m.vendorName,
          compositeScore: m.compositeScore,
          benchmarkScore: m.compositeScore,
          contextLength: m.contextLength,
          priceInput: m.priceInput,
          priceOutput: m.priceOutput,
          isOpenSource: m.isOpenSource,
          versionDate: new Date(),
        } as any
      })
    }
    console.log(`  ✅ ${cfg.name}: ${sortedModels.length} rankings`)
  }
  console.log(`✅ ${chartConfigs.length} ladder charts created`)

  console.log('\n🎉 Database seeding completed!')
  console.log('\n📋 Login Credentials:')
  console.log('  Super Admin: admin@aidean.com / Admin123!@#')
  console.log('  Test User:   test@aidean.com / Test123!@#')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
