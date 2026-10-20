/**
 * Pricing Extraction — 第五层：价格提取
 *
 * 自动搜索/解析候选网站的价格页面，提取结构化价格。
 * 结构: region + input_tier + input/cache/output/batch price + source
 * 原则: 多源不覆盖 (official / aggregator / observed 分开存储)
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.6
 *
 * 汇率（TASK-069，U-15 / ADR-P005 v0.3）：USD 价折算 CNY 分一律用当日汇率快照（getDailyFx，与计费/展示同源），
 * 经唯一归一函数 normalizeUnitPrice 定点换算；本文件无任何汇率字面量。
 * 缺汇率 fail-closed：USD 价无法折算时**跳过该条 PriceRule 不写库**（CNY 价不受影响），不得回退任何固定汇率。
 */

import {
  PriceNormalizationError,
  normalizeUnitPrice,
  type FxRates,
  type NormalizableUnit,
} from '@aidean/shared';

import type { PriceExtractionResult, PriceSource } from './types';
import { prisma } from '../db/prisma';
import { getDailyFx } from '../features/pricing/fx';
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
  opts: ExtractPricingOptions = {},
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

  const raws: RawPriceResult[] = [];

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
        raws.push(...parsePricingFromHtml(html, `${baseUrl}${path}`));
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
      raws.push(...parsePricingFromApi(data, `${baseUrl}/v1/pricing`));
    }
  } catch {
    // API 价格端点不存在时跳过
  }

  // 折算为 CNY 分（USD 价读当日汇率快照；缺汇率的 USD 条目跳过，不写库）
  const fxProvider = opts.fxProvider ?? defaultFxProvider();
  const { results, skipped } = await convertRawPrices(raws, fxProvider);
  if (skipped > 0) {
    console.warn(`[discovery/pricing] 当日汇率快照缺失，跳过 ${skipped} 条 USD 价格规则（fail-closed，未写库）：${domain ?? baseUrl}`);
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
  // 同一批次只取一次当日汇率（懒加载：无 USD 价时不读库），保证批内折算口径一致
  const fxProvider = defaultFxProvider();

  for (const c of candidates) {
    try {
      const prices = await extractPricing(c.id, c.domain ?? undefined, c.apiBase ?? undefined, { fxProvider });
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
function parsePricingFromHtml(html: string, sourceUrl: string): RawPriceResult[] {
  const results: RawPriceResult[] = [];

  // 匹配 $X.XX / 1M tokens 或 $X.XX per million tokens
  const priceRegex = /\$(\d+\.?\d*)\s*(?:\/|per)\s*(?:1M|million|1M\s*tokens?)\s*(?:tokens?)?/gi;
  let match: RegExpExecArray | null;
  while ((match = priceRegex.exec(html)) !== null) {
    results.push({
      input: { value: match[1], currency: 'USD', unit: 'per_million_tokens' },
      source: 'official',
      sourceUrl,
    });
  }

  // 匹配 ¥X.XX / 百万 tokens
  const cnyRegex = /¥(\d+\.?\d*)\s*(?:\/|每)\s*(?:百万|1M)\s*(?:tokens?)?/gi;
  while ((match = cnyRegex.exec(html)) !== null) {
    results.push({
      input: { value: match[1], currency: 'CNY', unit: 'per_million_tokens' },
      source: 'official',
      sourceUrl,
    });
  }

  // 匹配 input/output 分离价格
  const inputOutputRegex = /input[:\s]+\$?(\d+\.?\d*).*?output[:\s]+\$?(\d+\.?\d*)/gis;
  while ((match = inputOutputRegex.exec(html)) !== null) {
    results.push({
      input: { value: match[1], currency: 'USD', unit: 'per_million_tokens' },
      output: { value: match[2], currency: 'USD', unit: 'per_million_tokens' },
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
): RawPriceResult[] {
  const results: RawPriceResult[] = [];

  // 常见格式: { models: [{ id, pricing: { input, output } }] }
  const models = (data.models ?? data.data) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(models)) {
    for (const model of models) {
      const pricing = model.pricing as Record<string, unknown> | undefined;
      if (pricing) {
        const input = pricing.prompt ?? pricing.input;
        const output = pricing.completion ?? pricing.output;
        if (typeof input === 'string') {
          const inAmt = parsePriceString(input);
          if (inAmt) {
            results.push({
              input: inAmt,
              output: typeof output === 'string' ? parsePriceString(output) ?? undefined : undefined,
              source: 'aggregator',
              sourceUrl,
            });
          }
        }
      }
    }
  }

  return results;
}

// ── 折算（TASK-069）──

/** 待折算的原币价格（解析阶段不碰汇率） */
export interface RawAmount {
  /** 十进制串（解析所得原文，避免浮点） */
  value: string;
  currency: 'USD' | 'CNY';
  unit: NormalizableUnit;
}

interface RawPriceResult {
  input: RawAmount;
  output?: RawAmount;
  source: PriceSource;
  sourceUrl: string;
}

/** 当日汇率提供者：返回 null 表示当日快照缺失（fail-closed） */
export type FxProvider = () => Promise<FxRates | null>;

export interface ExtractPricingOptions {
  /** 测试/批量注入；缺省读 getDailyFx()（当日快照，Asia/Shanghai 汇率日） */
  fxProvider?: FxProvider;
}

/** 默认提供者：懒加载 + 记忆化，同一提供者实例内只读一次快照；读库失败按缺汇率处理 */
function defaultFxProvider(): FxProvider {
  let pending: Promise<FxRates | null> | null = null;
  return () => {
    pending ??= getDailyFx().catch((err: unknown) => {
      console.warn(`[discovery/pricing] 读取当日汇率快照失败，按缺汇率处理：${err instanceof Error ? err.message : String(err)}`);
      return null;
    });
    return pending;
  };
}

/** 十进制串 → 分（×100，半入），不经浮点 */
function decimalToMinor(v: string): bigint {
  const [i, f = ''] = v.split('.');
  const cents = BigInt(i + (f + '00').slice(0, 2));
  return f.length > 2 && Number(f[2]) >= 5 ? cents + 1n : cents;
}

/**
 * 原币价 → CNY 分 / 每百万 Token（PriceRule 口径）。
 * USD 需当日汇率 fx；fx 缺失抛 PriceNormalizationError('fx_missing')——调用方据此跳过该条，不写库。
 */
export function toMinorCny(value: string | number, currency: 'USD' | 'CNY', unit: NormalizableUnit, fx: FxRates | null): bigint {
  const raw = typeof value === 'string' ? value.trim().replace(/\.$/, '') : value;
  const n = normalizeUnitPrice({ value: raw, sourceCurrency: currency, sourceUnit: unit, targetCurrency: 'CNY', fx });
  return decimalToMinor(n.value);
}

/** 批量折算：需要汇率时才取一次；USD 条目缺汇率则整条跳过（skipped 计数） */
async function convertRawPrices(
  raws: RawPriceResult[],
  fxProvider: FxProvider,
): Promise<{ results: PriceExtractionResult[]; skipped: number }> {
  const needsFx = raws.some((r) => r.input.currency !== 'CNY' || (r.output && r.output.currency !== 'CNY'));
  const fx = needsFx ? await fxProvider() : null;
  const results: PriceExtractionResult[] = [];
  let skipped = 0;
  for (const r of raws) {
    try {
      results.push({
        inputPriceMinor: toMinorCny(r.input.value, r.input.currency, r.input.unit, fx),
        outputPriceMinor: r.output ? toMinorCny(r.output.value, r.output.currency, r.output.unit, fx) : undefined,
        source: r.source,
        sourceUrl: r.sourceUrl,
      });
    } catch (err) {
      if (err instanceof PriceNormalizationError) {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }
  return { results, skipped };
}

/**
 * 价格字符串解析（聚合商 API，USD）
 * 支持: "0.002/1k", "3.0/1M", 裸数字（沿用既有口径：按每百万 Token 处理）
 */
function parsePriceString(priceStr: string): RawAmount | null {
  const trimmed = priceStr.trim();
  const num = (s: string): string | null => {
    const m = /^\s*(\d+(?:\.\d+)?)/.exec(s);
    return m ? m[1] : null;
  };
  // /1k 格式
  if (trimmed.includes('/1k')) {
    const v = num(trimmed.replace(/\/1k.*/, ''));
    return v ? { value: v, currency: 'USD', unit: 'per_1k_tokens' } : null;
  }
  // /1M 格式
  if (trimmed.includes('/1M')) {
    const v = num(trimmed.replace(/\/1M.*/, ''));
    return v ? { value: v, currency: 'USD', unit: 'per_million_tokens' } : null;
  }
  // 裸数字
  const v = num(trimmed);
  return v ? { value: v, currency: 'USD', unit: 'per_million_tokens' } : null;
}
