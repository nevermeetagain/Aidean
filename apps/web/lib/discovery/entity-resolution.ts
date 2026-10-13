/**
 * Entity Resolution — 第二层：实体消歧
 *
 * 防止同一个实体被当成多个。
 * 消歧信号: 同域名 > 同 API Base > 同公司 > 同 GitHub Org > 同品牌 > 同邮箱域名
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.3
 */

import type { Candidate } from './types';
import { prisma } from '../db/prisma';

/**
 * 对候选列表执行实体消歧
 * 1. 候选之间的去重
 * 2. 候选与已有 Provider/Gateway 的去重
 *
 * @returns { new: 新候选, merged: 被合并到已有的候选 }
 */
export async function resolveEntities(
  candidates: Candidate[],
): Promise<{ newCandidates: Candidate[]; merged: number }> {
  const newCandidates: Candidate[] = [];
  let merged = 0;

  // 候选间去重：同域名视为同一实体
  const seenDomains = new Set<string>();
  const deduped: Candidate[] = [];
  for (const c of candidates) {
    if (c.domain) {
      const normalized = normalizeDomain(c.domain);
      if (seenDomains.has(normalized)) {
        merged++;
        continue;
      }
      seenDomains.add(normalized);
    }
    deduped.push(c);
  }

  // 与已有 Provider 去重
  for (const candidate of deduped) {
    const isDuplicate = await checkExistingEntity(candidate);
    if (isDuplicate) {
      merged++;
    } else {
      newCandidates.push(candidate);
    }
  }

  return { newCandidates, merged };
}

/**
 * 检查候选是否与已有实体重复
 */
async function checkExistingEntity(candidate: Candidate): Promise<boolean> {
  // 1. 同域名检查
  if (candidate.domain) {
    const normalizedDomain = normalizeDomain(candidate.domain);

    // 检查 ModelProvider
    const provider = await prisma.modelProvider.findFirst({
      where: {
        OR: [
          { name: { contains: candidate.name, mode: 'insensitive' } },
          { website: { contains: candidate.domain, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (provider) return true;

    // 检查 APIStation
    const station = await prisma.aPIStation.findFirst({
      where: {
        OR: [
          { name: { contains: candidate.name, mode: 'insensitive' } },
          { baseUrl: { contains: candidate.domain, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (station) return true;

    // 检查已有 Candidate
    const existingCandidate = await prisma.discoveryCandidate.findFirst({
      where: { domain: normalizedDomain },
      select: { id: true },
    });
    if (existingCandidate) return true;
  }

  // 2. 同 API Base 检查
  if (candidate.apiBase) {
    const station = await prisma.aPIStation.findFirst({
      where: { baseUrl: { contains: candidate.apiBase, mode: 'insensitive' } },
      select: { id: true },
    });
    if (station) return true;
  }

  // 3. 同名称检查（模糊匹配）
  const providerByName = await prisma.modelProvider.findFirst({
    where: { name: { equals: candidate.name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (providerByName) return true;

  return false;
}

/**
 * 域名标准化：去 www、转小写、去尾部斜杠
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/**
 * 将候选写入数据库
 */
export async function persistCandidates(
  candidates: Candidate[],
): Promise<{ created: number; evidence: number }> {
  let created = 0;
  let evidence = 0;

  for (const candidate of candidates) {
    const record = await prisma.discoveryCandidate.create({
      data: {
        candidateType: candidate.candidateType,
        name: candidate.name,
        domain: candidate.domain,
        apiBase: candidate.apiBase,
        description: candidate.description,
        sourceType: candidate.sourceType,
        sourceUrl: candidate.sourceUrl,
        sourceKeyword: candidate.sourceKeyword,
        status: 'discovered',
      },
    });

    // 同时创建发现证据
    await prisma.evidenceChain.create({
      data: {
        candidateId: record.id,
        evidenceType: 'discovery',
        claim: `Discovered via ${candidate.sourceType}: ${candidate.name}`,
        source: candidate.sourceType === 'registry' ? 'aggregator' : 'search',
        sourceUrl: candidate.sourceUrl,
        confidence: 0.7,
        evidenceData: {
          keyword: candidate.sourceKeyword,
          domain: candidate.domain,
          apiBase: candidate.apiBase,
        },
      },
    });

    created++;
    evidence++;
  }

  return { created, evidence };
}
