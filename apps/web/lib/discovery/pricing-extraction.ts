/**
 * Pricing Extraction — 第五层：价格提取
 *
 * 自动搜索/解析候选网站的价格页面，提取结构化价格。
 * 结构: region + input_tier + input/cache/output/batch price + source
 * 原则: 多源不覆盖 (official / aggregator / observed 分开存储)
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.6
 */

import type { PriceExtractionResult, PriceSource } from './types';
import { prisma } from '../db/prisma';
import {
  assertSafeUrl,
  readCappedText,
  readCappedJson,
  safeFetch,
} from '../security/url-policy';

/**
 * 对单个候选执行价格提取
 */
export async function extractPricing(
  candidateId: string,
  domain?: string,
  apiBase?: string,
): Promise<PriceExtractionResult[]> {
  const baseUrl = apiBase ?? (domain ? `https://${domain}` : null);
  if (!baseUrl) return [];

  // SSRF 策略校验（S2）：阻断私网/回环/云元数据地址。
  // 单点校验 baseUrl；内部各路径派生自同主机，dispatcher 在连接时兜底重定向跳转。
  try {
    await assertSafeUrl(baseUrl);
  } catch {
    return [];
  }

  const results: PriceExtractionResult[] = [];

  // 尝试从多个路径提取价格
  const pricingPaths = ['/pricing', '/price', '/plans', '/billing', '/docs/pricing'];
  for (const path of pricingPaths) {
    try {
      const res = await safeFetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'Accept': 'text/html' },
      });
      if (res.ok) {
        const html = await readCappedText(res);
        const extracted = parsePricingFromHtml(html, `${baseUrl}${path}`);
        results.push(...extracted);
      }
    } catch {
      // 继续尝试下一个路径
    }
  }

  // 尝试从 API 获取价格（某些 Provider 有 /v1/pricing 端点）
  try {
    const res = await safeFetch(`${baseUrl}/v1/pricing`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await readCappedJson<Record<string, unknown>>(res);
      const apiPrices = parsePricingFromApi(data, `${baseUrl}/v1/pricing`);
      results.push(...apiPrices);
    }
  } catch {
    // API 价格端点不存在时跳过
  }

  // 写入数据库
  for (const price of results) {
    await prisma.priceRule.create({
      data: {
        providerId: candidateId,
        region: price.region,
        inputTier: price.inputTier,
        inputPriceMinor: price.inputPriceMinor,
        cacheReadPriceMinor: price.cacheReadPriceMinor,
        cacheWritePriceMinor: price.cacheWritePriceMinor,
        outputPriceMinor: price.outputPriceMinor,
        batchPriceMinor: price.batchPriceMinor,
        source: price.source,
        sourceUrl: price.sourceUrl,
      },
    });
  }

  // 创建价格证据
  if (results.length > 0) {
    await prisma.evidenceChain.create({
      data: {
        candidateId,
        evidenceType: 'pricing',
        claim: `Extracted ${results.length} price rules from ${domain ?? baseUrl}`,
        source: results[0].source,
        confidence: 0.7,
        evidenceData: {
          priceCount: results.length,
          sources: [...new Set(results.map(r => r.source))],
        },
      },
    });
  }

  return results;
}

/**
 * 批量价格提取
 */
export async function extractPricingBatch(
  candidates: Array<{ id: string; domain?: string | null; apiBase?: string | null }>,
): Promise<{ processed: number; rulesExtracted: number }> {
  let processed = 0;
  let rulesExtracted = 0;

  for (const c of candidates) {
    try {
      const prices = await extractPricing(c.id, c.domain ?? undefined, c.apiBase ?? undefined);
      processed++;
      rulesExtracted += prices.length;
    } catch {
      // 单个失败不影响批量
    }
  }

  return { processed, rulesExtracted };
}

// ── 解析函数 ──

/**
 * 从 HTML 价格页解析价格
 * 识别常见价格格式: $X / 1M tokens, ¥X / 百万 tokens
 */
function parsePricingFromHtml(html: string, sourceUrl: string): PriceExtractionResult[] {
  const results: PriceExtractionResult[] = [];

  // 匹配 $X.XX / 1M tokens 或 $X.XX per million tokens
  const priceRegex = /\$(\d+\.?\d*)\s*(?:\/|per)\s*(?:1M|million|1M\s*tokens?)\s*(?:tokens?)?/gi;
  let match: RegExpExecArray | null;
  while ((match = priceRegex.exec(html)) !== null) {
    const usd = parseFloat(match[1]);
    const minor = usdToMinor(usd); // 转为分（CNY 近似）
    results.push({
      inputPriceMinor: minor,
      source: 'official',
      sourceUrl,
    });
  }

  // 匹配 ¥X.XX / 百万 tokens
  const cnyRegex = /¥(\d+\.?\d*)\s*(?:\/|每)\s*(?:百万|1M)\s*(?:tokens?)?/gi;
  while ((match = cnyRegex.exec(html)) !== null) {
    const cny = parseFloat(match[1]);
    const minor = BigInt(Math.round(cny * 100));
    results.push({
      inputPriceMinor: minor,
      source: 'official',
      sourceUrl,
    });
  }

  // 匹配 input/output 分离价格
  const inputOutputRegex = /input[:\s]+\$?(\d+\.?\d*).*?output[:\s]+\$?(\d+\.?\d*)/gis;
  while ((match = inputOutputRegex.exec(html)) !== null) {
    const inputUsd = parseFloat(match[1]);
    const outputUsd = parseFloat(match[2]);
    results.push({
      inputPriceMinor: usdToMinor(inputUsd),
      outputPriceMinor: usdToMinor(outputUsd),
      source: 'official',
      sourceUrl,
    });
  }

  return results;
}

/**
 * 从 API JSON 响应解析价格
 */
function parsePricingFromApi(
  data: Record<string, unknown>,
  sourceUrl: string,
): PriceExtractionResult[] {
  const results: PriceExtractionResult[] = [];

  // 常见格式: { models: [{ id, pricing: { input, output } }] }
  const models = (data.models ?? data.data) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(models)) {
    for (const model of models) {
      const pricing = model.pricing as Record<string, unknown> | undefined;
      if (pricing) {
        const input = pricing.prompt ?? pricing.input;
        const output = pricing.completion ?? pricing.output;
        if (typeof input === 'string') {
          results.push({
            inputPriceMinor: priceStringToMinor(input),
            outputPriceMinor: typeof output === 'string' ? priceStringToMinor(output) : undefined,
            source: 'aggregator',
            sourceUrl,
          });
        }
      }
    }
  }

  return results;
}

/**
 * USD 价格转分（CNY 近似 1:7.2）
 */
function usdToMinor(usd: number): bigint {
  const cny = usd * 7.2;
  return BigInt(Math.round(cny * 100));
}

/**
 * 价格字符串转分
 * 支持: "0.002/1k", "3.0/1M", "0.000002"
 */
function priceStringToMinor(priceStr: string): bigint {
  const trimmed = priceStr.trim();
  // /1k 格式
  if (trimmed.includes('/1k')) {
    const value = parseFloat(trimmed.replace(/\/1k.*/, ''));
    return BigInt(Math.round(value * 1000 * 7.2 * 100));
  }
  // /1M 格式
  if (trimmed.includes('/1M')) {
    const value = parseFloat(trimmed.replace(/\/1M.*/, ''));
    return BigInt(Math.round(value * 7.2 * 100));
  }
  // 裸数字
  const value = parseFloat(trimmed);
  if (!isNaN(value)) {
    return BigInt(Math.round(value * 7.2 * 100));
  }
  return BigInt(0);
}
