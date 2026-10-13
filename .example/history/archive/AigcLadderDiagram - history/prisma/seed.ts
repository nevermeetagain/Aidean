import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await (prisma as any).aiModel.deleteMany()
  await (prisma as any).benchmark.deleteMany()
  await (prisma as any).rankingWeight.deleteMany()
  await (prisma as any).featureFlag.deleteMany()

  // Seed ranking weights
  const weights = [
    { dimension: 'official', weight: 30, isActive: true },
    { dimension: 'actual', weight: 30, isActive: true },
    { dimension: 'review', weight: 20, isActive: true },
    { dimension: 'self', weight: 20, isActive: true },
  ]
  await prisma.rankingWeight.createMany({ data: weights })
  console.log('✅ Ranking weights seeded')

  // Seed feature flags
  const flags = [
    { flagCode: 'ladder.model', name: '大模型天梯图', isEnabled: true },
    { flagCode: 'ladder.skill', name: 'Skills天梯图', isEnabled: true },
    { flagCode: 'ladder.mcp', name: 'MCP天梯图', isEnabled: true },
    { flagCode: 'ladder.agent', name: 'Agent天梯图', isEnabled: true },
    { flagCode: 'ladder.api', name: 'API站天梯图', isEnabled: true },
    { flagCode: 'marketplace.skills', name: 'Skills市场', isEnabled: true },
    { flagCode: 'marketplace.mcp', name: 'MCP市场', isEnabled: true },
    { flagCode: 'favorites.enabled', name: '收藏夹功能', isEnabled: true },
    { flagCode: 'comparison.enabled', name: '模型对比功能', isEnabled: true },
    { flagCode: 'evaluation.enabled', name: '付费测评功能', isEnabled: true },
    { flagCode: 'chat.enabled', name: '客服功能', isEnabled: true },
  ]
  await (prisma as any).featureFlag.createMany({ data: flags })
  console.log('✅ Feature flags seeded')

  // Seed AI models with demo data
  const models = [
    {
      name: 'GPT-4.5',
      nameCn: 'GPT-4.5',
      provider: 'OpenAI',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '1.8T',
      context: 128,
      maxOutputTokens: 32768,
      isOpenSource: false,
      inputPrice: 75,
      outputPrice: 150,
      prices: JSON.stringify({ input: 75, output: 150, unit: '$/M tokens' }),
      links: JSON.stringify({ website: 'https://openai.com', docs: 'https://platform.openai.com' }),
      benchmark: JSON.stringify({ mmlu: 88.7, humaneval: 92.0, gpqa: 87.8 }),
      scores: JSON.stringify({ official: 95, actual: 88, review: 90, self: 85 }),
      totalScore: 89.5,
      tags: ['推理', '编程', '长上下文'],
      icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
      description: 'OpenAI 最新旗舰模型，支持超长上下文窗口',
      publishedAt: new Date('2025-02-27'),
    },
    {
      name: 'Claude 3.7 Sonnet',
      nameCn: 'Claude 3.7',
      provider: 'Anthropic',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '175B',
      context: 200,
      maxOutputTokens: 128000,
      isOpenSource: false,
      inputPrice: 15,
      outputPrice: 75,
      prices: JSON.stringify({ input: 15, output: 75, unit: '$/M tokens' }),
      links: JSON.stringify({ website: 'https://anthropic.com', docs: 'https://docs.anthropic.com' }),
      benchmark: JSON.stringify({ mmlu: 88.5, humaneval: 92.7 }),
      scores: JSON.stringify({ official: 94, actual: 91, review: 93, self: 88 }),
      totalScore: 91.5,
      tags: ['推理', '编程', '长上下文'],
      icon: 'https://www.anthropic.com/images/brand/favicon.svg',
      description: 'Anthropic 最强模型，支持 200K 上下文',
      publishedAt: new Date('2025-02-24'),
    },
    {
      name: 'Gemini 2.5 Pro',
      nameCn: ' Gemini 2.5',
      provider: 'Google',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '1.8T',
      context: 1000,
      maxOutputTokens: 32768,
      isOpenSource: false,
      inputPrice: 0,
      outputPrice: 0,
      prices: JSON.stringify({ input: 0, output: 0, unit: 'Free' }),
      links: JSON.stringify({ website: 'https://deepmind.google', docs: 'https://ai.google.dev' }),
      benchmark: JSON.stringify({ mmlu: 87.8, math: 91.0 }),
      scores: JSON.stringify({ official: 92, actual: 90, review: 88, self: 86 }),
      totalScore: 89.0,
      tags: ['推理', '长上下文', '免费'],
      icon: 'https://www.gstatic.com/images/branding/product/2x/ai_editor_2023q4_96dp.png',
      description: 'Google 最新旗舰模型，支持 1M 上下文',
      publishedAt: new Date('2025-03-25'),
    },
    {
      name: 'Doubao-Pro-32k',
      nameCn: '豆包 Pro',
      provider: 'ByteDance',
      type: 'CHAT',
      category: 'APPLICATION',
      params: '32B',
      context: 32,
      maxOutputTokens: 8192,
      isOpenSource: false,
      inputPrice: 0.0008,
      outputPrice: 0.002,
      prices: JSON.stringify({ input: 0.0008, output: 0.002, unit: '¥/K tokens' }),
      links: JSON.stringify({ website: 'https://www.doubao.com' }),
      benchmark: JSON.stringify({ mmlu: 78.5 }),
      scores: JSON.stringify({ official: 75, actual: 72, review: 70, self: 68 }),
      totalScore: 71.25,
      tags: ['性价比', '国产'],
      icon: 'https://www.baike.com/path?img=http%3A%2F%2Fpic.ime.126.net%2Fimage%2F2024%2F12%2F03%2F20241203161331_172.png',
      description: '字节跳动推出的大模型应用版',
      publishedAt: new Date('2024-05-15'),
    },
    {
      name: 'ERNIE-4.0-8K',
      nameCn: '文心一言 4.0',
      provider: 'Baidu',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '400B',
      context: 8,
      maxOutputTokens: 8192,
      isOpenSource: false,
      inputPrice: 0.012,
      outputPrice: 0.036,
      prices: JSON.stringify({ input: 0.012, output: 0.036, unit: '¥/K tokens' }),
      links: JSON.stringify({ website: 'https://yiyan.baidu.com' }),
      benchmark: JSON.stringify({ mmlu: 82.3 }),
      scores: JSON.stringify({ official: 82, actual: 78, review: 80, self: 75 }),
      totalScore: 78.75,
      tags: ['国产', '中文优化'],
      icon: 'https://baidu.com/favicon.ico',
      description: '百度最新一代文心大模型',
      publishedAt: new Date('2024-04-16'),
    },
    {
      name: 'GLM-4-Plus',
      nameCn: '智谱 GLM-4',
      provider: 'Zhipu',
      type: 'CHAT',
      category: 'APPLICATION',
      params: '130B',
      context: 128,
      maxOutputTokens: 8192,
      isOpenSource: false,
      inputPrice: 0.001,
      outputPrice: 0.001,
      prices: JSON.stringify({ input: 0.001, output: 0.001, unit: '¥/K tokens' }),
      links: JSON.stringify({ website: 'https://www.zhipuai.cn' }),
      benchmark: JSON.stringify({ mmlu: 81.5 }),
      scores: JSON.stringify({ official: 78, actual: 75, review: 77, self: 72 }),
      totalScore: 75.5,
      tags: ['国产', '性价比'],
      icon: 'https://www.zhipuai.cn/favicon.ico',
      description: '智谱AI最新旗舰模型',
      publishedAt: new Date('2024-08-29'),
    },
    {
      name: 'Qwen-Max',
      nameCn: '通义千问 Max',
      provider: 'Alibaba',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '500B',
      context: 32,
      maxOutputTokens: 8192,
      isOpenSource: false,
      inputPrice: 0.02,
      outputPrice: 0.06,
      prices: JSON.stringify({ input: 0.02, output: 0.06, unit: '¥/M tokens' }),
      links: JSON.stringify({ website: 'https://tongyi.aliyun.com' }),
      benchmark: JSON.stringify({ mmlu: 84.2 }),
      scores: JSON.stringify({ official: 85, actual: 82, review: 83, self: 80 }),
      totalScore: 82.5,
      tags: ['国产', '编程'],
      icon: 'https://img.alicdn.com/tfs/TB1_ZX6NXXXXXbbXVXXXXXXXXXX-32-32.ico',
      description: '阿里云通义千问系列最强模型',
      publishedAt: new Date('2024-01-08'),
    },
    {
      name: 'Abab 6.5s',
      nameCn: 'Abab 6.5s',
      provider: 'MiniMax',
      type: 'CHAT',
      category: 'APPLICATION',
      params: '456B',
      context: 200,
      maxOutputTokens: 8192,
      isOpenSource: false,
      inputPrice: 0.001,
      outputPrice: 0.005,
      prices: JSON.stringify({ input: 0.001, output: 0.005, unit: '¥/K tokens' }),
      links: JSON.stringify({ website: 'https://www.minimax.io' }),
      benchmark: JSON.stringify({ mmlu: 80.1 }),
      scores: JSON.stringify({ official: 76, actual: 73, review: 75, self: 70 }),
      totalScore: 73.5,
      tags: ['国产', '长上下文'],
      icon: 'https://www.minimax.io/favicon.ico',
      description: 'MiniMax 长上下文模型',
      publishedAt: new Date('2024-11-04'),
    },
    {
      name: 'Llama 3.1 405B',
      nameCn: 'Llama 3.1',
      provider: 'Meta',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '405B',
      context: 128,
      maxOutputTokens: 8192,
      isOpenSource: true,
      inputPrice: 0,
      outputPrice: 0,
      prices: JSON.stringify({ input: 0, output: 0, unit: 'Open Source' }),
      links: JSON.stringify({ website: 'https://llama.meta.com', docs: 'https://github.com/meta-llama' }),
      benchmark: JSON.stringify({ mmlu: 88.6 }),
      scores: JSON.stringify({ official: 90, actual: 85, review: 87, self: 82 }),
      totalScore: 86.0,
      tags: ['开源', '推理', '编程'],
      icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
      description: 'Meta 开源最强 Llama 模型',
      publishedAt: new Date('2024-07-23'),
    },
    {
      name: 'DeepSeek-V3',
      nameCn: 'DeepSeek V3',
      provider: 'DeepSeek',
      type: 'CHAT',
      category: 'PROFESSIONAL',
      params: '671B',
      context: 64,
      maxOutputTokens: 16384,
      isOpenSource: true,
      inputPrice: 0,
      outputPrice: 0,
      prices: JSON.stringify({ input: 0, output: 0, unit: 'Open Source' }),
      links: JSON.stringify({ website: 'https://www.deepseek.com' }),
      benchmark: JSON.stringify({ mmlu: 86.4 }),
      scores: JSON.stringify({ official: 88, actual: 86, review: 85, self: 83 }),
      totalScore: 85.5,
      tags: ['开源', '推理', '长上下文'],
      icon: 'https://www.deepseek.com/favicon.ico',
      description: 'DeepSeek 开源最强 MoE 模型',
      publishedAt: new Date('2024-12-19'),
    },
  ]

  for (const model of models) {
    await (prisma as any).aiModel.create({ data: model })
  }
  console.log(`✅ ${models.length} AI models seeded`)

  // Add some sample benchmarks
  const allModels = await (prisma as any).aiModel.findMany()
  for (const model of allModels) {
    await (prisma as any).benchmark.create({
      data: {
        modelId: model.id,
        sourceType: 'OFFICIAL',
        sourceName: '官方测试',
        benchmarkType: 'standard',
        scores: model.benchmark || {},
        totalScore: model.totalScore || 0,
      },
    })
  }
  console.log(`✅ ${allModels.length} benchmarks seeded`)

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
