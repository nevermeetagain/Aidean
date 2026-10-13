import { PrismaClient, Prisma } from '@prisma/client'
import { hash, hashSync } from '@node-rs/bcrypt'
import { seedOfficialNewsItems } from './seed-official-news'
import { seedOfficialPlatforms } from './seed-official-platforms'

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

// =============================================
// R-83 T5：千级压测演示数据（10 家演示厂商 × 922 模型，综合分 100→0 均匀铺满全量程）
// provenance 沿用 #39 机制（sourceType=SELF「平台演示数据」）；命名/描述带「演示」防止混入正式榜单；
// 幂等 upsert，重复执行不产生重复行（#63 unique 索引兜底）。
// =============================================
const demoVendorsData = Array.from({ length: 10 }, (_, i) => ({ name: `DemoVendor-${i + 1}`, nameCn: `演示厂商${i + 1}`, website: '', tierLevel: 3, country: i % 2 === 0 ? 'USA' : 'CN', isOpenSource: true, brandColor: '#94a3b8' }))

/** 千级压测演示模型数（R-83 T5；facts 脚本静态解析本常量计入 seed-models 总数） */
const DEMO_MODEL_COUNT = 922
/** v2.6：演示模型四类型均匀分布——原全 CHAT 使默认筛选（REASONING）下仅 4 条，分带加载在默认视图不可见 */
const DEMO_MODEL_TYPES = ['CHAT', 'REASONING', 'MULTIMODAL', 'VISION'] as const

const demoModelsData = Array.from({ length: DEMO_MODEL_COUNT }, (_, i) => {
  const n = i + 1
  const composite = Math.round((100 - (i * 100) / 922) * 100) / 100
  const vendor = demoVendorsData[i % demoVendorsData.length]
  return { name: `demo-model-${String(n).padStart(3, '0')}`, nameCn: `演示模型 ${n}`, vendorName: vendor.name, modelType: DEMO_MODEL_TYPES[i % DEMO_MODEL_TYPES.length], parameterCount: '未知', contextLength: 128000, maxOutputTokens: 8192, isOpenSource: true, priceInput: 0, priceOutput: 0, priceCurrency: 'USD', benchmarkScores: {}, ladderScores: { official: composite, actual: composite, review: composite, selfTest: composite }, compositeScore: composite, tags: ['演示'], description: '千级压测演示数据（R-83 T5），非真实模型，仅用于天梯图规模与性能验证', publishedAt: '2025-01-01' }
})

const rankingWeightsData = [
  // 4 主维（默认启用）
  { dimension: 'official', weight: 0.30, isActive: true, sortOrder: 1 },
  { dimension: 'actual', weight: 0.30, isActive: true, sortOrder: 2 },
  { dimension: 'review', weight: 0.20, isActive: true, sortOrder: 3 },
  { dimension: 'selfTest', weight: 0.20, isActive: true, sortOrder: 4 },
  // 9 扩展维（R-34 集成，默认权重 0 = 禁用，管理员可通过权重管理 UI 启用）
  { dimension: 'reasoning', weight: 0, isActive: true, sortOrder: 5 },
  { dimension: 'coding', weight: 0, isActive: true, sortOrder: 6 },
  { dimension: 'math', weight: 0, isActive: true, sortOrder: 7 },
  { dimension: 'multilingual', weight: 0, isActive: true, sortOrder: 8 },
  { dimension: 'creativity', weight: 0, isActive: true, sortOrder: 9 },
  { dimension: 'instruction', weight: 0, isActive: true, sortOrder: 10 },
  { dimension: 'safety', weight: 0, isActive: true, sortOrder: 11 },
  { dimension: 'efficiency', weight: 0, isActive: true, sortOrder: 12 },
  { dimension: 'value', weight: 0, isActive: true, sortOrder: 13 },
]

const featureFlagsData = [
  { flagCode: 'ladder.model', name: '模型对比天梯图', nameCn: '模型对比天梯图', isEnabled: true, category: 'ladder', priority: 1, description: '大模型榜功能开关' },
  { flagCode: 'ladder.station', name: '大模型云服务天梯图', nameCn: '大模型云服务天梯图', isEnabled: true, category: 'ladder', priority: 2, description: '模型站榜功能开关' },
  { flagCode: 'gateway.chat', name: '统一计费网关', nameCn: '统一计费网关', isEnabled: true, category: 'gateway', priority: 1, description: '统一计费网关调用开关' },
  { flagCode: 'favorites.enabled', name: '收藏夹功能', nameCn: '收藏夹功能', isEnabled: true, category: 'feature', priority: 1, description: '收藏夹功能开关' },
  { flagCode: 'comparison.enabled', name: '模型对比功能', nameCn: '模型对比功能', isEnabled: true, category: 'feature', priority: 2, description: '模型对比功能开关' },
  { flagCode: 'evaluation.enabled', name: '付费测评功能', nameCn: '付费测评功能', isEnabled: true, category: 'feature', priority: 3, description: '付费测评功能开关' },
  { flagCode: 'chat.support', name: '客服功能', nameCn: '客服功能', isEnabled: true, category: 'feature', priority: 4, description: '客服功能开关' },
]

const systemConfigsData = [
  { configKey: 'about.contactEmail', configGroup: 'about', configType: 'STRING', configValue: '591547726@qq.com', description: '联系邮箱（/about 页展示）' },
  { configKey: 'about.wechatQrUrl', configGroup: 'about', configType: 'STRING', configValue: '', description: '微信二维码图片 URL（空=显示待上传占位；PNG/JPEG/WebP/GIF/AVIF，≤500 字）' },
  { configKey: 'roadmap.milestones', configGroup: 'roadmap', configType: 'STRING', configValue: '[{"version":"v0.1","title":"搭好网站的地基","description":"网站的底层工程已经完成：代码分门别类放好，存放数据的表格建好，每次改动都会先通过自动检查再上线。","done":true},{"version":"v0.2","title":"天梯图自动刷新","description":"模型排行榜不再需要人工更新。新模型一发布，系统自动抓取跑分、更新排名，你看到的永远是最新战力榜。","done":false},{"version":"v0.3","title":"模型站导航上线","description":"不知道去哪家平台找模型？导航页把所有模型站整理在一起，标清价格、速度和擅长方向，一键跳转，像地图一样直观。","done":false},{"version":"v0.4","title":"模型对比测试","description":"选几个模型，输入同一道题，并排看回答。谁更准、谁更快、谁更便宜，一目了然，不再靠感觉选模型。","done":false},{"version":"v0.5","title":"AideanWiki 接入主站","description":"独立知识百科正式接入：你写的笔记、存的文献都能在一个地方搜到，知识不再散落在各个文件夹里。","done":false},{"version":"v0.6","title":"AideanBot 接入主站","description":"信源引擎机器人接入：公众号文章、网页内容自动采集整理，配合知识库使用，收集资料像打开水龙头一样简单。","done":false},{"version":"v0.7","title":"AideanThesis 接入主站","description":"论文审查助手接入：从选题到定稿，格式检查、查重预检、引用核验一站搞定，写论文不再是一个人的战斗。","done":false},{"version":"v0.8","title":"AideanFleet 本地控制台","description":"自动化舰队引擎升级为本地命令行工具：读剪贴板就能创建任务，融合多种 CLI 工具，初始化自动下载配置，在终端里指挥整个 AI 舰队。","done":false},{"version":"v0.9","title":"CLI 配置与自定义模型","description":"每个命令行工具都能单独配模型：推理任务配大模型，润色任务配快模型，按需分配，把算力花在刀刃上。","done":false},{"version":"v1.0","title":"AideanFleet 开源","description":"自动化舰队引擎正式开源：代码公开、文档齐全，开发者可以自行部署、贡献代码，让更多人用上 AI 自动化。","done":false},{"version":"v1.1","title":"统一账号与余额","description":"一个账号登录所有平台，一个钱包查看所有模型站余额。不再记十几个密码，不再挨个查余额，省心省力。","done":false},{"version":"v1.2","title":"规范化流程化","description":"从收集信息到存储、从知识库检索到论文编辑审查，整条链路打通并标准化。每一步有规范、有记录、可追溯，让 AI 辅助真正可靠。","done":false}]', description: '产品路线图里程碑（首页与 /roadmap 共用；JSON 数组，每条含 version 版本号 / title 标题 / description 说明 / done 是否已完成，≤24 条）' },
  { configKey: 'partners.education', configGroup: 'partners', configType: 'STRING', configValue: '{"enabled":true,"title":"学历助手","subtitle":"AI 驱动的学历提升助手","description":"从选课规划到考前复习，结合个人学习进度智能推荐路径。支持多模型切换，用最适合的 AI 模型解答不同学科的问题，让学习效率翻倍。","coverUrl":"/images/partners/education-cover.webp","images":[],"notes":"支持文科、理科、工科等多学科场景；具体服务范围与使用条款以实际沟通确认为准。","videoUrl":""}', description: '学历助手合作产品内容' },
  { configKey: 'partners.paper', configGroup: 'partners', configType: 'STRING', configValue: '{"enabled":true,"title":"论文辅导","subtitle":"学术写作与论文审查","description":"从选题到定稿全流程辅助：文献检索、大纲生成、段落润色、格式规范、查重预检。多模型协同工作，推理模型搭框架，快速模型做润色。","coverUrl":"/images/partners/paper-cover.webp","images":[],"notes":"适用于本科毕业论文至期刊投稿；具体服务范围与使用条款以实际沟通确认为准。","videoUrl":""}', description: '论文辅导合作产品内容' },
  { configKey: 'partners.research', configGroup: 'partners', configType: 'STRING', configValue: '{"enabled":true,"title":"科研知识库","subtitle":"团队科研知识管理","description":"把零散的论文、笔记、数据统一存到一个可搜索的知识库里。支持引用溯源、多源交叉验证，让团队的研究成果不再散落各处。","coverUrl":"/images/partners/research-cover.webp","images":[],"notes":"兼容 RagFlow 知识引擎；具体服务范围与使用条款以实际沟通确认为准。","videoUrl":""}', description: '科研知识库合作产品内容' },
  { configKey: 'site.name', configGroup: 'general', configType: 'STRING', configValue: 'Aidean', description: '站点名称', isPublic: true },
  { configKey: 'site.description', configGroup: 'general', configType: 'STRING', configValue: 'AI模型天梯图平台', description: '站点描述', isPublic: true },
  { configKey: 'site.logoUrl', configGroup: 'general', configType: 'STRING', configValue: '/images/icons/logo.svg', description: '站点Logo', isPublic: true },
  { configKey: 'site.title', configGroup: 'general', configType: 'STRING', configValue: '', description: '浏览器标题(为空则用站点名称)', isPublic: true },
  { configKey: 'site.faviconUrl', configGroup: 'general', configType: 'STRING', configValue: '/images/icons/logo.svg', description: '站点Favicon', isPublic: true },
  // S4「站点可见即可改」：SEO 关键词 + 首页三区块 + 帮助文档（configValue 与 shared *_JSON / registry defaultValue 逐字符一致，admin-config-seed-parity 守卫校验）
  { configKey: 'site.seo.keywords', configGroup: 'general', configType: 'STRING', configValue: '', description: 'SEO 关键词（逗号分隔，前台 meta keywords，可空）', isPublic: true },
  { configKey: 'home.hero', configGroup: 'home', configType: 'STRING', configValue: '{"badge":"天梯图评测 · 统一计费网关 · 一次充值全平台可用","title":"扫一眼，完成模型与云服务选型","subtitle":"Aidean 用统一口径的实测数据把各家大模型的性能排清楚——天梯图可视化评测，一次充值即可调用全平台模型与云服务。","primaryCta":{"href":"/models","label":"查看模型天梯图"},"secondaryCta":{"href":"/pricing","label":"价格中心"},"stats":[{"value":"统一口径","label":"实测评测"},{"value":"多家聚合","label":"计费网关"},{"value":"一次充值","label":"全平台可用"}]}', description: '首页首屏文案' },
  { configKey: 'home.valuePoints', configGroup: 'home', configType: 'STRING', configValue: '[{"icon":"BarChart3","title":"天梯图可视化评测","description":"以统一口径的实测数据绘制大模型与云服务天梯图，谁强谁弱、性价几何，一张图看懂。"},{"icon":"Wallet","title":"统一计费网关，一次充值通吃","description":"聚合各云厂商的 Key 池与额度，一次充值即可跨平台调用，告别多头开户与重复预付。"},{"icon":"LayoutGrid","title":"平台产品矩阵","description":"RAG 知识库、微信自动化机器人、技能云端市场协同发力，从选型到落地一站完成。"}]', description: '首页价值点卡片' },
  { configKey: 'home.modelEntries', configGroup: 'home', configType: 'STRING', configValue: '[{"icon":"Trophy","title":"模型对比天梯图","description":"实测性能矩阵可视化呈现，旗舰与高性价比模型一榜看尽。","href":"/models"},{"icon":"Cloud","title":"大模型云服务天梯图","description":"聚合主流云厂商 API 平台的价格、稳定性与限流观测。","href":"/ladder"},{"icon":"Scale","title":"模型对比","description":"把候选模型加入对比车，逐维度横向打分与取舍。","href":"/evaluations"},{"icon":"BookOpen","title":"API 平台详情入口","description":"各平台资费细则、免费额度与计费规则逐项拆解。","href":"/docs"}]', description: '首页模型入口卡片' },
  // S8 跑马灯/关于正文 CMS 化（B4）：configValue 与 shared MARQUEE_NAMES_JSON / ABOUT_BODY_DEFAULT 逐字符一致（admin-config-seed-parity 守卫②校验），消费端在首页
  { configKey: 'partners.marquee', configGroup: 'home', configType: 'STRING', configValue: '["星辰智能","云梯科技","启明数据","青野智联","光年算法","极目实验室","南风智算","白泽信息","鹏程云脑","墨子矩阵","听涛科技","九章模型云"]', description: '首页合作企业跑马灯名单' },
  { configKey: 'about.body', configGroup: 'home', configType: 'STRING', configValue: 'Aidean 是一个面向开发者与团队的 AI 选型与应用平台。我们以可复现的实测数据构建大模型与云服务天梯图，让每一次选型都有据可依；通过统一计费网关把分散在各云厂商的额度收敛成一个余额池，一次充值即可跨平台调用；再以信源引擎机器人（AideanBot，生态内亦称 WeChatRag）、独立知识百科（AideanWiki）、自动化舰队引擎（AideanFleet）与论文审查助手（AideanThesis）等构成的产品矩阵，覆盖从「模型选型」到「业务落地」的完整链路。团队坚持公开透明、按量计费，拒绝黑箱定价与隐性加价，让每一分钱都花在看得见的算力上。', description: '首页关于我们正文' },
  { configKey: 'docs.articles', configGroup: 'docs', configType: 'STRING', configValue: '[{"id":"start","group":"开始使用","title":"快速开始","summary":"从了解模型到完成配置，让第一次使用更简单。","sections":[{"title":"01 · 找到适合的模型","text":"从产品中的模型天梯图开始。对照任务类型、性能和价格筛选候选模型，再打开模型详情查看参数。单一排名不是全部：写作、推理和代码任务可能需要不同模型。"},{"title":"02 · 打开个人控制台","text":"登录后进入控制台。顶部展示余额、账号等级与今日用量；下方通过标签切换模型配置、免费额度、平台密钥、自有密钥和调用测试台，不必反复向下翻页。"},{"title":"03 · 完成一次小规模验证","text":"先配置模型，再在调用测试台发起简短请求。核对返回内容、错误提示和用量，确认满足需要后再接入自己的应用。不要在提示词中填写密码或真实密钥。"}],"link":"/user/console","linkLabel":"进入控制台"},{"id":"account","group":"开始使用","title":"账号与等级","summary":"了解账号状态和可用额度，不把等级当作模型性能。","sections":[{"title":"在哪里查看账号信息","text":"登录后的控制台概览展示当前等级及余额。免费模型的剩余额度和刷新周期在「免费额度」板块查看，以当前页面显示为准。"},{"title":"通用版与专业版","text":"通用版按档位绑定模型，适合快速配置；专业版按具体模型维护优先级，适合需要精细控制的用户。两种形式在「模型配置」标题右侧切换。"},{"title":"使用前确认","text":"实际可用能力受模型配置、余额及额度共同影响。遇到限制时先查看具体提示，避免连续重复提交相同请求。"}],"link":"/user/console?tab=quotas","linkLabel":"查看免费额度"},{"id":"keys","group":"开发者接入","title":"密钥管理","summary":"区分平台密钥与自有密钥，避免把凭证放错位置。","sections":[{"title":"平台密钥","text":"平台密钥用于你的应用调用本站网关。在控制台「平台密钥」中管理。创建后按照页面提示安全保存；不要将密钥写进公开仓库、前端代码、截图或分享链接。"},{"title":"自有密钥","text":"自有密钥用于配置你持有的上游服务凭证，与本站平台密钥用途不同。在「自有密钥」板块操作，并核对服务渠道和地址。"},{"title":"怀疑泄露怎么办","text":"立即在对应管理界面停用或撤销受影响密钥，更换应用中的凭证，并检查近期调用记录。不要将泄露的密钥发送给客服。"}],"link":"/user/console?tab=platformKeys","linkLabel":"管理平台密钥"},{"id":"gateway","group":"开发者接入","title":"网关接入","summary":"先在站内验证，再将配置带入自己的应用。","sections":[{"title":"接入前的三个检查","text":"确认平台密钥有效、目标模型已经配置、余额或免费额度满足调用要求。先使用控制台调用测试台验证，避免同时排查应用代码和账号配置。"},{"title":"在应用中安全配置","text":"从本站当前接入说明或测试台核对服务地址和模型标识，将凭证保存在服务端环境变量或密钥管理系统中。不要把管理后台地址作为模型服务地址，也不要直接将密钥交给浏览器。"},{"title":"失败时如何定位","text":"记录错误码、请求时间和请求标识，检查模型、额度和密钥状态。排障时只提供脱敏信息；不要反复重试权限或参数错误。生产接入前应单独验证超时和限流处理。"}],"link":"/user/console?tab=playground","linkLabel":"打开调用测试台"},{"id":"billing","group":"使用与支持","title":"计费与用量","summary":"先了解展示口径，再根据实际使用选择模型。","sections":[{"title":"查看价格","text":"价格页和模型详情提供可见价格信息。不同模型的输入和输出价格可能不同；调用前核对当前展示的币种和单位，不要把单次请求数等同于 Token 用量。"},{"title":"查看余额和消耗","text":"控制台概览提供余额及今日用量，余额入口可查看相关信息。测试先从短输入开始，根据实际输出长度和使用频率评估预算。"},{"title":"免费额度与自有渠道","text":"免费额度按界面展示的周期刷新，不能视作无限使用。自有渠道还受上游账户规则约束，使用前同时检查上游余额和权限。"}],"link":"/pricing","linkLabel":"查看当前价格"},{"id":"faq","group":"使用与支持","title":"常见问题","summary":"遇到问题时，先从这里找答案。","sections":[{"title":"为什么控制台没有显示全部功能？","text":"控制台采用标签式工作区，一次展示一个功能板块。点击「免费额度」「平台密钥」「自有密钥」或「调用测试台」切换；窄屏可横向滚动标签栏。"},{"title":"为什么排名与实际体验不同？","text":"评测反映特定任务和测试条件，不能替代你的业务验证。建议用相同输入对比候选模型，综合考虑质量、响应时间及价格。"},{"title":"如何联系支持？","text":"请发送问题描述、发生时间、相关页面及脱敏错误提示至 591547726@qq.com。不要附带密码、密钥、支付凭证完整信息或私人业务数据。"}],"link":"/about#contact","linkLabel":"联系与反馈"}]', description: '帮助文档文章' },
  // 白名单可编辑键（与 shared ADMIN_CONFIG_KEYS + admin/configs CONFIG_REGISTRY 三处同步；seed 为值真源）
  { configKey: 'ladder_score_granularity', configGroup: 'ladder', configType: 'NUMBER', configValue: '0.1', description: '模型性能天梯图性能轴/分隔栏的固定分割颗粒值（如 0.1：98.9 与 98.8 相邻档位）' },
  { configKey: 'ladder.defaultView', configGroup: 'ladder', configType: 'STRING', configValue: 'table', description: '默认榜单视图' },
  { configKey: 'ladder.autoRefresh', configGroup: 'ladder', configType: 'BOOLEAN', configValue: 'true', description: '自动刷新排名' },
  { configKey: 'pricing.evalPerModel', configGroup: 'pricing', configType: 'NUMBER', configValue: '2', description: '测评每模型价格(元)' },
  { configKey: 'pricing.currency', configGroup: 'pricing', configType: 'STRING', configValue: 'CNY', description: '默认货币' },
  { configKey: 'security.accessTokenTtlMinutes', configGroup: 'security', configType: 'NUMBER', configValue: '15', description: '访问令牌有效期(分钟)' },
  { configKey: 'security.refreshTokenTtlDays', configGroup: 'security', configType: 'NUMBER', configValue: '7', description: '刷新令牌有效期(天)' },
  { configKey: 'security.maxLoginAttempts', configGroup: 'security', configType: 'NUMBER', configValue: '5', description: '最大登录尝试次数' },
  { configKey: 'ui.floating_dock.enabled', configGroup: 'ui', configType: 'BOOLEAN', configValue: 'true', description: '右下角悬浮面板' },
  { configKey: 'ui.theme.default', configGroup: 'ui', configType: 'STRING', configValue: 'teal', description: '默认浅色主题（多套浅色主题切换，无深色模式）' },
]

const navigationMenusData = [
  { menuCode: 'models', name: '模型', nameEn: 'Models', linkUrl: '/models', sortOrder: 1 },
  { menuCode: 'products', name: '产品', nameEn: 'Products', linkUrl: '/products', sortOrder: 2 },
  { menuCode: 'pricing', name: '价格', nameEn: 'Pricing', linkUrl: '/pricing', sortOrder: 3 },
  { menuCode: 'docs', name: '文档', nameEn: 'Docs', linkUrl: '/docs', sortOrder: 4 },
  { menuCode: 'roadmap', name: '路线图', nameEn: 'Roadmap', linkUrl: '/roadmap', sortOrder: 5 },
  { menuCode: 'partners', name: '合作', nameEn: 'Partners', linkUrl: '/partners', sortOrder: 6 },
  { menuCode: 'about', name: '关于', nameEn: 'About', linkUrl: '/about', sortOrder: 7 },
]

const announcementsData = [
  { title: 'Aidean平台正式上线', content: '欢迎来到Aidean AI模型天梯图平台！我们致力于为您提供最全面的AI模型评测与对比服务。', type: 'system', priority: 2, isPublished: true },
  { title: 'DeepSeek-V3模型已收录', content: 'DeepSeek-V3开源MoE模型已加入天梯图，支持超长上下文与强大推理能力。', type: 'update', priority: 1, isPublished: true },
  { title: '测评功能限时优惠', content: '新用户首次测评享受5折优惠，快来体验多模型对比功能吧！', type: 'promotion', priority: 0, isPublished: true },
]

const scheduledScriptsData = [
  {
    name: '模型数据同步',
    description: '主源 OpenRouter + 交叉验证源 Quanzil/Arena/HF/LMSys/ArtificialAnalysis/EpochAI（覆盖 quanzil.com、arena.ai、openrouter.ai）',
    scriptPath: 'scripts/crawl/crawl_models.ts',
    params: { source: 'all' },
    cronExpression: '0 2 * * *',
    isActive: true,
  },
  { name: '排名更新', scriptPath: 'scripts/ranking/update_ranking.ts', cronExpression: '0 3 * * 0', isActive: true },
  {
    name: 'llmtest 站点采集',
    description: '拉取 llmtest.cn API 站点榜单公开数据 → discovery 候选（gateway），经后台审核 promote 为 APIStation',
    scriptPath: 'scripts/crawl/crawl_llmtest.ts',
    cronExpression: '30 2 * * *',
    isActive: true,
  },
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

// ============================================
// 主函数
// ============================================
async function main() {
  // ============================================
  // 0. OIDC first-party 接入方（M-SSO P1.1；upsert 幂等，不参与上方清理）
  //    生产口径：secret 经 OIDC_CLIENT_SECRET_<ID> env 注入并立即轮换 dev 默认值
  // ============================================
  console.log('🔐 Creating OIDC first-party clients...')
  const oidcClients = [
    { clientId: 'aidean-rag', name: 'AideanRag', redirectUris: ['http://36.134.158.50:10001/auth/aidean/callback'], scopes: ['openid', 'profile', 'wallet:read'], secretEnv: 'OIDC_CLIENT_SECRET_AIDEAN_RAG', firstParty: true, pkceRequired: false },
    { clientId: 'wechat-rag', name: 'WeChatRag', redirectUris: ['https://wechat-rag.aidean.local/auth/aidean/callback', 'http://localhost:3200/auth/aidean/callback'], scopes: ['openid', 'profile', 'wallet:read'], secretEnv: 'OIDC_CLIENT_SECRET_WECHAT_RAG', firstParty: true, pkceRequired: false },
    { clientId: 'skills-cloud', name: 'SkillsCloud', redirectUris: ['https://skills-cloud.aidean.local/auth/aidean/callback'], scopes: ['openid', 'profile', 'wallet:read', 'billing:write'], secretEnv: 'OIDC_CLIENT_SECRET_SKILLS_CLOUD', firstParty: true, pkceRequired: false },
    // 演示第三方（M-SSO-FOLLOWUP D4）：强制 PKCE 的公共客户端样例，redirect 指向本机便于联调
    { clientId: 'test-third-party', name: '演示第三方应用', redirectUris: ['http://localhost:3000/oauth/dev/callback'], scopes: ['openid', 'profile', 'wallet:read'], secretEnv: 'OIDC_CLIENT_SECRET_TEST_THIRD_PARTY', firstParty: false, pkceRequired: true },
  ]
  for (const c of oidcClients) {
    const secret = process.env[c.secretEnv] ?? `${c.clientId}-dev-secret-please-rotate`
    await prisma.oidcClient.upsert({
      where: { clientId: c.clientId },
      update: { name: c.name, redirectUris: c.redirectUris, scopes: c.scopes },
      create: {
        clientId: c.clientId,
        name: c.name,
        clientSecretHash: hashSync(secret, 12),
        redirectUris: c.redirectUris,
        scopes: c.scopes,
        pkceRequired: c.pkceRequired,
        firstParty: c.firstParty,
        isActive: true,
      },
    })
  }
  console.log(`✅ ${oidcClients.length} OIDC clients upserted`)

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
  await prisma.navigationMenu.deleteMany().catch(() => {})
  await prisma.announcement.deleteMany().catch(() => {})
  await prisma.newsItem.deleteMany().catch(() => {})
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
  for (const v of [...vendorsData, ...demoVendorsData]) {
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
  // 协议分布（v1.7）：按厂商映射 API 协议，o1/o3-mini 走 OpenAI Responses API；
  // 未知厂商回落 OPENAI 兼容。筛选组件五选项（Anthropic Messages / OpenAI Chat Completions /
  // OpenAI Responses API / Gemini Native generateContent / 自定义HTTP）均有数据可达。
  const VENDOR_PROTOCOL: Record<string, string> = {
    'OpenAI': 'OPENAI',
    'Anthropic': 'ANTHROPIC',
    'Google': 'GOOGLE',
    'Microsoft': 'OPENAI',
    'Meta': 'OPENAI',
    'xAI': 'OPENAI',
    'Mistral AI': 'OPENAI',
    'Cohere': 'CUSTOM',
    'AI21 Labs': 'OPENAI',
    'Stability AI': 'CUSTOM',
    'DeepSeek': 'OPENAI',
    'Alibaba': 'OPENAI',
    'ByteDance': 'OPENAI',
    'Baidu': 'CUSTOM',
    'Zhipu': 'OPENAI',
    'MiniMax': 'OPENAI',
    '01.AI': 'OPENAI',
    'Moonshot AI': 'OPENAI',
    'iFlytek': 'CUSTOM',
    'SenseTime': 'CUSTOM',
    'Tencent': 'OPENAI',
    'Huawei': 'CUSTOM',
  }
  const MODEL_PROTOCOL_OVERRIDES: Record<string, string> = {
    'o1': 'RESPONSES',
    'o3-mini': 'RESPONSES',
  }
  const models: any[] = []
  for (const m of [...modelsData, ...demoModelsData]) {
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
        protocol: (MODEL_PROTOCOL_OVERRIDES[m.name] ?? VENDOR_PROTOCOL[m.vendorName] ?? 'OPENAI') as any,
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
        sourceType: 'SELF',
        sourceName: '平台演示数据',
        benchmarkType: 'standard',
        verifiedStatus: 1, // 演示环境豁免：seed 数据标记为已核验，避免读侧过滤后数据消失（T-1.3.3）
        scores: m.benchmarkScores,
        totalScore: m.compositeScore,
      }
    })
  }
  console.log(`✅ ${models.length} AI models with prices, scores and benchmarks created`)

  // 2.6 回填厂商 modelCount（管理端 /admin/vendors 列表展示列；此前恒 0）
  console.log('🔢 Backfilling vendor modelCount...')
  const vendorModelCounts = new Map<string, number>()
  for (const m of [...modelsData, ...demoModelsData]) {
    if (!vendors[m.vendorName]) continue
    vendorModelCounts.set(m.vendorName, (vendorModelCounts.get(m.vendorName) ?? 0) + 1)
  }
  for (const [vendorName, count] of vendorModelCounts) {
    await prisma.vendor.update({ where: { id: vendors[vendorName].id }, data: { modelCount: count } })
  }
  console.log(`✅ ${vendorModelCounts.size} vendors modelCount backfilled`)

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

  // 3.5 公告
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

  // 3.8 API Stations（大模型云服务天梯图）
  console.log('🌐 Creating API stations...')
  for (const api of apiStationsData) {
    const station = await prisma.aPIStation.create({
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
    // 计费规则（默认本系统计费，不加价）
    await prisma.stationBillingRule.create({
      data: { stationId: station.id } as any
    }).catch(() => {})
  }
  console.log(`✅ ${apiStationsData.length} API stations created`)

  // 3.9 网关 e2e 专用站点（幂等：按 name 存在即跳过；isVerified=false 不进公开天梯图榜单）
  //  - 故障站 rating 更高排候选链前位 → 上游永不可达触发 voidHold + Key 失败计数 + 换站降级
  //  - Mock 站 baseUrl 指向本地 catch-all mock 上游（需 AIDEAN_ENABLE_MOCK_UPSTREAM=1）
  //  - 自有Key站：billingMode=UPSTREAM + rating 最高 → 用户在该站有 station_user_keys 时
  //    首候选即命中「自有 Key 直调上游、不扣平台余额」（G6 G7 断言夹具）；无 Key 用户走
  //    gateway 既有降级序（UPSTREAM 分支 continue），不影响 gateway-flow 用例的 PLATFORM 口径
  //  - 三站 models 均含 seed 模型 "Claude 3.7 Sonnet" 的 nameDisplay（listCallableStations 以 models.has(nameDisplay) 匹配）
  console.log('🧪 Creating gateway e2e stations...')
  const gatewayE2eStations = [
    {
      name: '网关E2E故障站',
      baseUrl: 'http://localhost:59998',
      rating: 9.9,
      desc: 'e2e 专用：永不可达的故障上游（触发 void 降级链路）',
    },
    {
      name: '网关E2E Mock站',
      baseUrl: 'http://localhost:3000/api/v1/mock-upstream',
      rating: 9.8,
      desc: 'e2e 专用：本地 mock 上游（AIDEAN_ENABLE_MOCK_UPSTREAM=1）',
    },
    {
      name: '网关E2E自有Key站',
      baseUrl: 'http://localhost:3000/api/v1/mock-upstream',
      rating: 9.95,
      desc: 'e2e 专用：UPSTREAM 计费模式站（用户自有 Key 直调 mock 上游，不扣平台余额）',
      billingMode: 'UPSTREAM' as const,
    },
  ]
  for (const gs of gatewayE2eStations) {
    const existing = await prisma.aPIStation.findFirst({ where: { name: gs.name, deletedAt: null } })
    if (existing) {
      console.log(`↷ 网关 e2e 站点已存在，跳过: ${gs.name}`)
      continue
    }
    const station = await prisma.aPIStation.create({
      data: {
        name: gs.name,
        nameCn: gs.name,
        displayName: gs.name,
        description: gs.desc,
        baseUrl: gs.baseUrl,
        models: ['Claude 3.7 Sonnet'],
        protocols: [],
        features: [],
        rating: gs.rating,
        isVerified: false,
      } as any
    })
    await prisma.stationKey.create({
      data: { stationId: station.id, keyValue: `e2e-${generateSlug(gs.name)}`, name: 'e2e' } as any
    })
    // billingMode 显式传入（自有Key站=UPSTREAM；其余缺省 PLATFORM）——
    // GW-KEY-01 的 UPSTREAM 计费路径与 G6 G7 契约用例依赖该规则真实存在
    await prisma.stationBillingRule.create({
      data: { stationId: station.id, ...(gs.billingMode ? { billingMode: gs.billingMode } : {}) } as any
    })
  }
  console.log('✅ gateway e2e stations ready')

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
      profile: {
        create: {
          bio: '系统超级管理员',
        }
      },
      // 钱包（账本模式：余额存 wallets，初始赠送 ¥1000 = 100000 分）
      wallet: {
        create: {
          balanceMinor: 100000n,
          postedCreditsMinor: 100000n,
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
      profile: {
        create: {
          bio: '测试账号',
        }
      },
      // 钱包（初始赠送 ¥100 = 10000 分）
      wallet: {
        create: {
          balanceMinor: 10000n,
          postedCreditsMinor: 10000n,
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

  // ============================================
  // 6. 产品矩阵与卡商密钥（rebuild-admin-console-and-harden-auth SubTask 2.4.1/3.5.1；upsert 幂等）
  // ============================================
  // 同步契约：本数组与 scripts/seed-products.mjs 的 productsSeed 保持一致（add-subplatform-showcase-pages，5 产品）。
  // wechatrag slug ↔ 显示名 AideanBot 映射登记于 docs/specs/add-subplatform-showcase-pages/spec.md。
  // 公开文案安全过滤：不含端口/内网 IP/环境变量键/模型池/风险台账（内容源 docs/product/modules/子平台规范说明.md，重写非摘抄）。
  const productsSeed = [
    {
      slug: 'aideanwiki', name: 'AideanWiki', displayName: '独立知识百科', category: 'PARTNER' as const, tagline: '知识库个人版免费可用', badge: '已上线', sortOrder: 10,
      description: 'Aidean 知识库产品：个人版免费可用，多源文档一键入库与检索问答；团队版权益与定价明细整理中，详见价格页产品权益分区。',
      benefits: ['个人版免费可用', '多源知识库检索', '团队版协作（规划中）'],
      // enrich-subplatform-intro-pages：仅注入有事实源的区块（受众/问题），promises/ecosystem 等素材到位后再补；
      // 产品入口链接仍待正式域名发布后由运营在后台配置（#65）。
      intro: {
        version: 2,
        audience: '需要把多来源、多格式资料沉淀为可检索可问答的库的个人与团队',
        problems: [
          { problem: '文档散在多种格式与来源里，想找时搜不到', solution: '多源文档一键入库同一个库，统一检索与问答' },
          { problem: '个人工具怕收费，用不久', solution: '个人版免费可用；团队版按权益计（明细整理中）' },
        ],
      },
    },
    {
      // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §2（能力/SSO/计费网关/加密落库/私有部署/扩展规划）
      slug: 'wechatrag', name: 'AideanBot', displayName: '信源引擎机器人', category: 'OFFERING' as const, tagline: '信息源 → 知识库 → 机器人闭环（生态内亦称 WeChatRag）', badge: '内测中', sortOrder: 20,
      description: '以微信公众号为核心的知识库机器人平台：向机器人发送公众号链接即构建知识库并自动更新、即时生效；纳入范围由订阅策略决定（账号全部文章 / 单篇文章），机器人支持后台主动推送，后续将扩展更多图文与视频内容源。',
      benefits: ['公众号链接即传即建知识库', '订阅策略自动更新、即时生效', '机器人多端问答、引用可溯源', '主平台账号统一登录'],
      intro: {
        version: 2,
        // 管理者默认规则（2026-09-26）：无正式说明时子平台链接一律指向 GitHub 组织页（组织页公开可达）；
        // AideanBot 仓库实测 404（私有或不存在），不得直链。
        links: [{ label: 'GitHub 组织', url: 'https://github.com/aideanew', kind: 'repo' }],
        audience: '需要长期沉淀微信公众号内容、并能随手检索复用的人和团队',
        problems: [
          { problem: '公众号文章散在收藏夹与聊天记录里，用时搜不到', solution: '链接发给机器人即入库，随问随答' },
          { problem: '账号在不断更新，人工存档的副本很快就过期', solution: '订阅账号全部文章，增量自动同步、回答即时生效' },
          { problem: '回答引文对不上原文，原图又因防盗链打不开', solution: '回答附原文卡片溯源，防盗链图片在库内可直接查看' },
          { problem: '每换一个端都要重新注册登录、门槛高', solution: '与 Aidean 主平台账号统一登录，网页与机器人多端共用' },
        ],
        workflow: {
          title: '一条链接到可用的知识库',
          steps: [
            '把公众号文章或账号链接发给机器人',
            '按订阅策略选择入库范围：账号全部文章，或单篇独立入库',
            '系统自动解析入库，原图经防盗链处理后可直接查看',
            '随时向机器人提问，回答附原文引用与溯源卡片',
            '账号后续更新自动同步进库，无需人工维护',
          ],
        },
        promises: [
          '全栈私有部署，知识库数据留在自有环境',
          '敏感凭据加密落库（AES-256-GCM）',
        ],
        ecosystem: [
          '与 Aidean 主平台账号统一登录（SSO 已接入）',
          '已接入主平台统一计费网关',
          '内容源扩展规划：抖音、B 站、小红书等图文与视频账号',
        ],
        facts: [
          { group: '交付', items: [{ label: '交付形态', value: 'Docker Compose 全栈部署' }, { label: '账号体系', value: '主平台统一登录' }] },
        ],
      },
    },
    {
      // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §3（状态机/机器门禁/返工/治理/模型池容错/沙箱红线/开源仓库）
      slug: 'aideanfleet', name: 'AideanFleet', displayName: '自动化舰队引擎', category: 'OPEN_SOURCE' as const, tagline: '薄控制面 + 可插拔执行体的自动化执行器', badge: '迭代中', sortOrder: 30,
      description: '本地优先的自动化任务编排工具：控制面只做编排、调度、治理与可靠性守望，能力全部下沉到主流代码执行 CLI；内置网页控制台、审批与预算治理、多模型池优先级容错，零外部服务依赖。',
      benefits: ['多角色协作与 DAG 任务调度', '可插拔执行体、模型池自动切换', '审批、预算与用量治理', '网页控制台与可靠性守望'],
      intro: {
        version: 2,
        links: [{ label: 'GitHub 仓库', url: 'https://github.com/aideanew/AideanFleet', kind: 'repo' }],
        audience: '希望把多个 AI 编码智能体组织起来、可靠交付长任务的工程团队',
        problems: [
          { problem: '长任务无人值守几小时，AI 中途跑偏没人知道', solution: '十状态状态机逐步推进，任务卡住自动监测、挂起等待人工决策' },
          { problem: 'AI 产出门禁质量不一，不敢直接合并', solution: '机器门禁与独立评审角色自动验收，不合格打回返工' },
          { problem: '权限与预算失控，成本容易爆炸', solution: '内置审批、预算与用量治理，每笔消耗可见可追责' },
          { problem: '换个模型供应商就得重搭工作流', solution: '多模型池按优先级尝试，额度耗尽或故障即时切换' },
        ],
        workflow: {
          title: '从一条需求到有监督的交付',
          steps: [
            '把需求整理成任务包（TaskPack 契约），注册项目开工',
            'Manager 自动拆解派工，前端 / 后端 / 数据等角色并行执行',
            '机器门禁与评审角色自动判定通过或返工，结果归档',
            '网页控制台全程监督事件、进度与消耗，断点可恢复守望',
          ],
        },
        promises: [
          '项目根白名单沙箱，智能体无法写到任意路径',
          '密钥永不入仓，运行期才注入环境',
          '追加式事件日志，全程操作可审计回溯',
        ],
        ecosystem: [
          '开源仓库，GitHub 直接查看与取用代码',
          '主流编码 CLI 执行体即插即用，多适配器可扩展',
          '零外部服务依赖，单机即可完整运转',
        ],
        facts: [
          { group: '交付', items: [{ label: '交付形态', value: '本地单机控制台工具' }, { label: '数据存储', value: '本地文件库，无需云服务' }] },
        ],
      },
    },
    {
      // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §4（工作台/模块/审计日志/私有部署）与既有产品口径；AideanThesis 仓库实测 404，链接按默认规则指组织页
      slug: 'aideanthesis', name: 'AideanThesis', displayName: '论文审查助手', category: 'PARTNER' as const, tagline: '论文检测 / 质量控制 + AI 协作工作台', badge: '开发中', sortOrder: 40,
      description: '面向高校与科研团队的一体化论文工作台：覆盖格式统一、语义检查、标注、查重、目录与文献流程，论文资产沉淀于知识库，支持 AI 辅助审阅与修订、多任务并行。',
      benefits: ['查重与质量控制流程一体化', '知识库沉淀与引用管理', 'AI 辅助审阅与修订建议', '多任务并行与审计留痕'],
      intro: {
        version: 2,
        links: [{ label: 'GitHub 组织', url: 'https://github.com/aideanew', kind: 'repo' }],
        audience: '高校师生与科研团队——覆盖论文从成稿到定稿的全过程',
        problems: [
          { problem: '各校格式规范不同，排版总要到截止前重排一遍', solution: '格式检查与统一按学校规范自适应' },
          { problem: '查重工具与降重平台来回换，改后文字生硬走样', solution: '查重与降重改写同工作台完成，改写保持语义并留修改建议' },
          { problem: 'AI 评审只有笼统印象，不知从何改起', solution: '章节级结构化批注与修订建议，逐条可操作' },
          { problem: '论文与资料散在网盘邮箱，版本失控', solution: '沉淀进知识库，引用互链、全程留痕可追溯' },
        ],
        workflow: {
          title: '从初稿到符合规范的定稿',
          steps: [
            '上传论文，选择学校与学位类型',
            '查重与格式检查一次跑完，报告定位到问题句',
            'AI 给审阅与修订建议，人来逐条决定采纳',
            '师生共批注、目录与文献互链，导出定稿',
          ],
        },
        promises: [
          'AI 只做辅助：每一处修改保留人工最终确认',
          '全流程操作日志留痕，审阅过程可审计',
          '私有部署：论文数据放在自己的环境里',
        ],
        ecosystem: [
          '账号体系规划与 Aidean 主平台统一打通',
          '论文资产沉淀知识库，可生态内持续复用',
        ],
        facts: [
          { group: '交付', items: [{ label: '交付形态', value: 'Docker Compose 全栈' }, { label: '账号体系', value: '规划接入主平台统一登录' }] },
        ],
      }
    },
    {
      slug: 'skillscloud', name: 'SkillsCloud', displayName: '技能云', category: null, tagline: '技能市场与云执行', badge: '规划中', sortOrder: 50,
      description: 'Agent 技能市场与云端执行沙箱：技能一键安装、云端沙箱运行、用量计费透明。',
      benefits: ['技能一键安装', '云端沙箱执行', '用量计费透明'],
      intro: null,
    },
  ]
  for (const p of productsSeed) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, displayName: p.displayName, category: p.category, tagline: p.tagline, badge: p.badge, description: p.description, benefits: p.benefits, intro: p.intro ?? Prisma.DbNull, sortOrder: p.sortOrder },
      create: { ...p, intro: p.intro ?? Prisma.DbNull },
    })
  }
  console.log(`\n📦 Products: ${await prisma.product.count()} (expect 5)`)

  // dev 卡商密钥：明文仅此处输出一次，库内只存 SHA-256（验收：hash 比对一致）
  const { createHash } = await import('node:crypto')
  const partnerPlain = 'ak_dev_aidean_local_0123456789abcdef'
  const partnerHash = createHash('sha256').update(partnerPlain).digest('hex')
  await prisma.partnerKey.upsert({
    where: { keyHash: partnerHash },
    update: { isActive: true },
    create: { name: 'dev-local', keyHash: partnerHash, prefix: partnerPlain.slice(0, 8), isActive: true },
  })
  const seededKey = await prisma.partnerKey.findUnique({ where: { keyHash: partnerHash } })
  console.log(`🔑 PartnerKey dev: prefix=${seededKey?.prefix} 明文(仅输出一次)=${partnerPlain}`)
  console.log(`   hash 校验: ${seededKey?.keyHash === partnerHash ? '一致' : '不一致!'}`)
  console.log(`🔑 partner_keys: ${await prisma.partnerKey.count()} (expect 1)`)

  // ============================================
  // 6.5 最小套餐种子（管理端 /admin/packages 与套餐码批次绑定的最小可用数据；幂等：按 title 存在即跳过）
  // ============================================
  console.log('🎫 Seeding minimal package...')
  const seedPackageTitle = '体验套餐（日卡）'
  const existingPkg = await prisma.package.findFirst({ where: { title: seedPackageTitle, deletedAt: null } })
  if (!existingPkg) {
    await prisma.package.create({
      data: {
        title: seedPackageTitle,
        description: '平台通用体验套餐：seed 最小数据，供管理端套餐管理与套餐码绑定联调。',
        priceMinor: 990n,
        durationHours: 24,
        benefits: ['24 小时套餐直连'],
        status: 'ACTIVE',
        sortOrder: 10,
      },
    })
    console.log(`✅ package created: ${seedPackageTitle} (priceMinor=990)`)
  } else {
    console.log(`↷ package 已存在，跳过: ${seedPackageTitle}`)
  }
  console.log(`🎫 packages: ${await prisma.package.count()}`)

  // ============================================
  // 6.5 演示对比测评（EVAL-01：isPaid=false 公开示例，免费/未登录可看）
  // 幂等：按 title 跳过（title 含「示例：」前缀，不触碰真实测评数据）
  // ============================================
  const demoUser = await prisma.user.findUnique({ where: { email: 'test@aidean.com' } })
  const demoModels = await prisma.aiModel.findMany({
    where: { deletedAt: null },
    orderBy: { nameDisplay: 'asc' },
    take: 6,
    select: { id: true, nameDisplay: true },
  })
  if (demoUser && demoModels.length >= 3) {
    const demoSeeds: Array<{
      title: string
      prompt: string
      modelIds: string[]
      winnerModelId: string | null
      status: number
      responses: Array<{ modelId: string; content: string; error?: string }>
    }> = [
      {
        title: '示例：多模型代码质量评估',
        prompt: '请评估以下 Python 函数的健壮性并给出改进建议：def parse(data): return json.loads(data)["items"]',
        modelIds: [demoModels[0].id, demoModels[1].id, demoModels[2].id],
        winnerModelId: demoModels[1].id,
        status: 2,
        responses: [
          { modelId: demoModels[0].id, content: '该函数未做异常捕获与类型校验，建议：1) try/except 包裹 json.loads；2) 校验 data 为字符串；3) 用 .get 代替直接索引。' },
          { modelId: demoModels[1].id, content: '健壮性不足。改进方案：使用 dataclass + 显式类型注解，外层加自定义 JSONDecodeError 处理，并对 items 缺失回退空列表。' },
          { modelId: demoModels[2].id, content: '可以优化为：def parse(data: str) -> list: try: items = json.loads(data).get("items", []); except (TypeError, json.JSONDecodeError): return []; return items' },
        ],
      },
      {
        title: '示例：三模型推理对比',
        prompt: '一个水池有一个进水口和一个出水口，进水管 3 小时注满，出水管 4 小时放空，同时打开多久注满？',
        modelIds: [demoModels[0].id, demoModels[1].id, demoModels[3].id],
        winnerModelId: demoModels[0].id,
        status: 2,
        responses: [
          { modelId: demoModels[0].id, content: '进水速度 1/3 池/时，出水速度 1/4 池/时，净速度 1/3 - 1/4 = 1/12，需要 12 小时注满。' },
          { modelId: demoModels[1].id, content: '设池容量为 1：进 1/3、出 1/4，净 1/12 池/时 → 12 小时。' },
          { modelId: demoModels[3].id, content: '12 小时（1/(1/3-1/4)=12）。' },
        ],
      },
      {
        title: '示例：部分模型失败的测评',
        prompt: '用一句话分别介绍这三个模型的核心定位。',
        modelIds: [demoModels[0].id, demoModels[1].id, demoModels[4].id],
        winnerModelId: null,
        status: 2,
        responses: [
          { modelId: demoModels[0].id, content: '通用对话与推理模型，覆盖多语言与代码场景。' },
          { modelId: demoModels[1].id, content: '侧重深度推理与长上下文分析的旗舰模型。' },
          { modelId: demoModels[4].id, content: '', error: '上游服务超时（示例：部分失败时仅该列显示原因，其他列正常结算）' },
        ],
      },
    ]
    for (const demo of demoSeeds) {
      const existing = await prisma.evaluation.findFirst({ where: { title: demo.title, isPaid: false } })
      if (existing) {
        console.log(`↷ demo evaluation 已存在，跳过: ${demo.title}`)
        continue
      }
      const evaluation = await prisma.evaluation.create({
        data: {
          userId: demoUser.id,
          title: demo.title,
          prompt: demo.prompt,
          evalType: 'comparison',
          comparisonMode: 'side-by-side',
          config: { idempotencyKey: null },
          results: { demo: true },
          winnerModelId: demo.winnerModelId,
          status: demo.status,
          progress: 100,
          isPaid: false,
          cost: 0,
          startedAt: new Date(),
          completedAt: new Date(),
          evaluationModels: {
            create: demo.responses.map((r) => ({
              modelId: r.modelId,
              status: r.error ? 'error' : 'completed',
              response: r.error ? null : r.content,
              errorMessage: r.error ?? null,
              tokensInput: 128,
              tokensOutput: r.error ? 0 : 96,
              tokensTotal: r.error ? 0 : 224,
              latencyMs: r.error ? null : 842,
            })),
          },
        },
      })
      console.log(`✅ demo evaluation created: ${demo.title} (id=${evaluation.id})`)
    }
  } else {
    console.log('⚠️ 演示测评跳过：缺少 demo 用户或模型（eval01 库首轮 seed 后自动具备）')
  }

  // 6.x 官方资讯迁库（S7 finalize-admin-ia-and-ops-gaps B3）：static-articles 幂等 upsert 归入「官方公告」；单独执行见 prisma/seed-official-news.ts
  const newsCreated = await seedOfficialNewsItems(prisma)
  console.log(`📰 news_items(官方公告): 新建/归集 ${newsCreated} 条`)

  // 6.x2 官方平台目录种子（控制台 MVP 丁：N3）：六大主流官方平台 upsert + UPSTREAM 计费规则
  const officialPlatformCount = await seedOfficialPlatforms(prisma)
  console.log(`🌐 official_platforms: 新增/更新 ${officialPlatformCount} 个`)


  // ============================================
  // 6.y 模型提供商种子（ModelProvider + ProviderModelOffering）
  // 幂等：按 code upsert provider，按 (providerId, modelId) upsert offering
  // ============================================
  const providerSeeds = [
    {
      code: 'siliconflow',
      name: 'SiliconFlow',
      nameCn: '硅基流动',
      rechargeRatio: 20,
      priceCurrency: 'USD',
      rechargeCurrency: 'CNY',
      isActive: true,
      sortOrder: 10,
      description: '硅基流动聚合平台，提供开源自研模型与第三方模型 API',
    },
    {
      code: 'openrouter',
      name: 'OpenRouter',
      nameCn: null,
      rechargeRatio: 7,
      priceCurrency: 'USD',
      rechargeCurrency: 'CNY',
      isActive: true,
      sortOrder: 20,
      description: 'OpenRouter 统一路由平台，接入 200+ 模型',
    },
    {
      code: 'together',
      name: 'Together AI',
      nameCn: null,
      rechargeRatio: 7,
      priceCurrency: 'USD',
      rechargeCurrency: 'CNY',
      isActive: false,
      sortOrder: 30,
      description: 'Together AI 提供开源模型托管与推理 API',
    },
  ]

  for (const p of providerSeeds) {
    await prisma.modelProvider.upsert({
      where: { code: p.code },
      create: p,
      update: { name: p.name, rechargeRatio: p.rechargeRatio, description: p.description, isActive: p.isActive, sortOrder: p.sortOrder },
    })
  }
  console.log(`✅ ${providerSeeds.length} model providers seeded`)

  // 为 siliconflow 挂载前 5 个已有模型作为示例 offerings
  const sfProvider = await prisma.modelProvider.findUnique({ where: { code: 'siliconflow' } })
  if (sfProvider) {
    const sampleModels = await prisma.aiModel.findMany({
      take: 5,
      orderBy: { benchmarkScore: 'desc' },
      include: { vendor: { select: { name: true } } },
    })
    for (let i = 0; i < sampleModels.length; i++) {
      const m = sampleModels[i]
      const priceInput = 10 + i * 2  // $10, $12, $14, $16, $18 per M tokens
      const priceOutput = priceInput * 3  // 输出贵 3 倍
      await prisma.providerModelOffering.upsert({
        where: { providerId_modelId: { providerId: sfProvider.id, modelId: m.id } },
        create: {
          providerId: sfProvider.id,
          modelId: m.id,
          listedAt: new Date(2025, 0, 1 + i),  // 2025-01-02..06
          defaultMultiplier: 1.0,
          priceInput,
          priceOutput,
          priceCache: null,
          priceUnit: 'per_million_tokens',
          effectiveFrom: new Date(2025, 0, 1),
          isActive: true,
        },
        update: {
          priceInput,
          priceOutput,
          defaultMultiplier: 1.0,
        },
      })
    }
    console.log(`✅ ${sampleModels.length} provider offerings seeded for siliconflow`)
  }

  // ============================================
  // 7. Count 取证（SubTask L.1.1 验收断言）
  // ============================================
  const [vendorCount, aiModelCount, modelScoreCount, rankingWeightCount, ladderChartCount, providerCount, offeringCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.aiModel.count(),
    prisma.modelScore.count(),
    prisma.rankingWeight.count(),
    prisma.ladderChart.count(),
    prisma.modelProvider.count(),
    prisma.providerModelOffering.count(),
  ])
  console.log('\n📊 Seed counts:')
  console.log(`  vendors=${vendorCount} (expect >=22)`)
  console.log(`  aiModels=${aiModelCount} (expect >=60)`)
  console.log(`  modelScores=${modelScoreCount} (expect == aiModels:${aiModelCount})`)
  console.log(`  rankingWeights=${rankingWeightCount} (expect =13)`)
  console.log(`  ladderCharts=${ladderChartCount} (expect >=3)`)
  console.log(`  modelProviders=${providerCount} (expect >=3)`)
  console.log(`  providerOfferings=${offeringCount} (expect >=5)`)

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
