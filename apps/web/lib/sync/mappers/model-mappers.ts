/**
 * Field mappers — transform RawModelData → NormalizedModelData.
 * Only sync-owned fields are mapped (D-2=C field ownership matrix).
 * Human-owned fields (nameDisplay, slug, vendorId, etc.) are never touched.
 */

import { createHash } from 'crypto';
import type {
  RawModelData,
  RawBenchmarkData,
  NormalizedModelData,
  NormalizedPriceData,
  NormalizedBenchmarkData,
} from '../types/sync';

/**
 * Map raw model data to normalized form.
 * Strips human-owned fields, computes checksum for dedup.
 */
export function mapModel(raw: RawModelData): NormalizedModelData {
  const normalized: NormalizedModelData = {
    modelCode: raw.modelCode,
    vendorName: raw.vendorName,
    contextLength: raw.contextLength,
    parameterCount: raw.parameterCount,
    isOpenSource: raw.isOpenSource,
    isMultiModal: raw.isMultiModal,
    isReasoning: raw.isReasoning,
    isCodingOptimized: raw.isCodingOptimized,
    officialUrl: raw.officialUrl,
    docsUrl: raw.docsUrl,
    apiUrl: raw.apiUrl,
    githubUrl: raw.githubUrl,
    paperUrl: raw.paperUrl,
    publishedAt: raw.publishedAt,
    deprecatedAt: raw.deprecatedAt,
    status: raw.status,
    benchmarkScore: raw.benchmarkScore,
    popularityScore: raw.popularityScore,
    prices: mapPrices(raw),
    benchmarks: mapBenchmarks(raw.benchmarks ?? []),
    checksum: '', // set below
  };

  normalized.checksum = computeChecksum(normalized);
  return normalized;
}

function mapPrices(raw: RawModelData): NormalizedPriceData[] {
  if (raw.inputPrice === undefined || raw.outputPrice === undefined) {
    return [];
  }
  return [{
    inputPrice: raw.inputPrice,
    outputPrice: raw.outputPrice,
    currency: raw.currency ?? 'CNY',
    unit: raw.unit ?? 'per_1k_tokens',
    effectiveAt: new Date(),
  }];
}

function mapBenchmarks(raw: RawBenchmarkData[]): NormalizedBenchmarkData[] {
  return raw.map(b => ({
    benchmarkType: b.benchmarkType,
    totalScore: b.totalScore,
    testDate: b.testDate ?? new Date(),
    sourceName: b.sourceName ?? 'sync',
    scores: b.scores ?? {},
  }));
}

/**
 * Compute checksum from sync-owned fields for dedup.
 * If checksum matches existing record, skip UPSERT.
 */
export function computeChecksum(data: NormalizedModelData): string {
  const fields = JSON.stringify({
    c: data.contextLength,
    p: data.parameterCount,
    os: data.isOpenSource,
    mm: data.isMultiModal,
    r: data.isReasoning,
    co: data.isCodingOptimized,
    ou: data.officialUrl,
    du: data.docsUrl,
    au: data.apiUrl,
    gu: data.githubUrl,
    pu: data.paperUrl,
    pa: data.publishedAt,
    da: data.deprecatedAt,
    s: data.status,
    bs: data.benchmarkScore,
    ps: data.popularityScore,
    pr: data.prices,
    b: data.benchmarks,
  });
  return createHash('sha256').update(fields).digest('hex').slice(0, 16);
}
