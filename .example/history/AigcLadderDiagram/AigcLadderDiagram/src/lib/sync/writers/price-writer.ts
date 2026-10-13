/**
 * 价格数据写入器
 * 处理模型价格的 upsert 操作
 */

import { prisma } from '@/lib/db/prisma';

/**
 * 价格数据
 */
export interface PriceWriteData {
  modelId: string;
  priceInput?: number;   // CNY per 1K tokens
  priceOutput?: number;  // CNY per 1K tokens
  pricePerRequest?: number;   // CNY per request
  currency?: string;
  source?: string;       // 数据来源: openrouter, manual, etc.
}

/**
 * 写入价格数据
 * 如果已存在，则更新；否则创建
 */
export async function upsertPrice(
  data: PriceWriteData
): Promise<{ id: string; action: 'created' | 'updated' }> {
  try {
    // 查找现有价格记录
    const existing = await prisma.modelPrice.findFirst({
      where: {
        modelId: data.modelId,
        isCurrent: true,
      },
    });
    
    if (existing) {
      // 检查是否有变化（转换为number比较）
      const hasChanged = 
        Number(existing.priceInput) !== Number(data.priceInput) ||
        Number(existing.priceOutput) !== Number(data.priceOutput) ||
        Number(existing.pricePerRequest) !== Number(data.pricePerRequest);
      
      if (!hasChanged) {
        return { id: existing.id, action: 'updated' };
      }
      
      // 标记旧记录为非当前
      await prisma.modelPrice.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });
    }
    
    // 创建新价格记录
    const price = await prisma.modelPrice.create({
      data: {
        modelId: data.modelId,
        priceInput: data.priceInput || 0,
        priceOutput: data.priceOutput || 0,
        pricePerRequest: data.pricePerRequest || null,
        billingCurrency: data.currency || 'CNY',
        sourceName: data.source || 'openrouter',
        isCurrent: true,
        effectiveFrom: new Date(),
      },
    });
    
    console.log(`[PriceWriter] ${existing ? 'Updated' : 'Created'} price for model ${data.modelId}`);
    
    return { 
      id: price.id, 
      action: existing ? 'updated' : 'created' 
    };
  } catch (error) {
    console.error(`[PriceWriter] Failed to upsert price for model ${data.modelId}:`, error);
    throw error;
  }
}

/**
 * 批量写入价格
 */
export async function batchUpsertPrices(
  dataList: PriceWriteData[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  
  for (const data of dataList) {
    try {
      const result = await upsertPrice(data);
      
      if (result.action === 'created') {
        results.created++;
      } else {
        results.updated++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to upsert price for ${data.modelId}: ${message}`);
    }
  }
  
  return results;
}

/**
 * 获取模型的当前价格
 */
export async function getCurrentPrice(modelId: string) {
  return prisma.modelPrice.findFirst({
    where: {
      modelId,
      isCurrent: true,
    },
  });
}

/**
 * 获取模型的价格历史
 */
export async function getPriceHistory(modelId: string, limit: number = 10) {
  return prisma.modelPrice.findMany({
    where: { modelId },
    orderBy: { effectiveFrom: 'desc' },
    take: limit,
  });
}
