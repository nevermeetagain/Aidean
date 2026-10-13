/**
 * Technical Fingerprinting — 第三层：技术指纹
 *
 * 自动检查候选网站/文档的技术特征。
 * 探测: /v1/models, /v1/chat/completions, /v1/responses, /v1/messages
 * 判定: OpenAI-style / Anthropic-compatible / 认证方式 / 价格页
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.4
 */

import type { FingerprintResult } from './types';
import { Prisma } from "@prisma/client";
import { prisma } from '../db/prisma';
import { assertSafeUrl, assertResponseSize, readCappedJson, safeFetch } from '../security/url-policy';

/**
 * 对单个候选执行技术指纹探测
 */
export async function fingerprintCandidate(
  candidateId: string,
  domain?: string,
  apiBase?: string,
): Promise<FingerprintResult> {
  const baseUrl = apiBase ?? (domain ? `https://${domain}` : null);

  if (!baseUrl) {
    return emptyFingerprint();
  }

  // SSRF 策略校验（P2）：阻断私网/回环/云元数据地址，避免 admin 提交的内网探测。
  // 在此单点校验 baseUrl，内部各 probe 函数派生自同主机，无需重复 DNS 解析。
  try {
    await assertSafeUrl(baseUrl);
  } catch {
    return emptyFingerprint();
  }

  const result: FingerprintResult = {
    ...emptyFingerprint(),
    probedAt: new Date().toISOString(),
  };

  // 并行探测各端点
  const [models, chat, responses, messages] = await Promise.allSettled([
    probeEndpoint(baseUrl, '/v1/models'),
    probeEndpoint(baseUrl, '/v1/chat/completions'),
    probeEndpoint(baseUrl, '/v1/responses'),
    probeEndpoint(baseUrl, '/v1/messages'),
  ]);

  result.hasModelsEndpoint = fulfilledOk(models);
  result.hasChatEndpoint = fulfilledOk(chat);
  result.hasResponsesEndpoint = fulfilledOk(responses);
  result.hasMessagesEndpoint = fulfilledOk(messages);

  // 如果 /v1/models 可达，检查返回格式
  if (result.hasModelsEndpoint && models.status === 'fulfilled') {
    result.modelsFormat = await checkModelsFormat(baseUrl);
  }

  // 检查认证方式
  result.authMethod = await checkAuthMethod(baseUrl);

  // 检查价格页
  result.pricingPageFound = await checkPricingPage(baseUrl);

  // 更新数据库
  await prisma.discoveryCandidate.update({
    where: { id: candidateId },
    data: {
      fingerprint: result as unknown as Prisma.InputJsonValue,
      status: 'verifying',
      verifiedAt: new Date(),
    },
  });

  // 创建指纹证据
  await prisma.evidenceChain.create({
    data: {
      candidateId,
      evidenceType: 'fingerprint',
      claim: `Technical fingerprint: models=${result.hasModelsEndpoint}, chat=${result.hasChatEndpoint}, format=${result.modelsFormat}`,
      source: 'observed',
      confidence: 0.8,
      evidenceData: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}

/**
 * 批量指纹探测
 */
export async function fingerprintBatch(
  candidates: Array<{ id: string; domain?: string | null; apiBase?: string | null }>,
): Promise<{ processed: number; withEndpoints: number }> {
  let processed = 0;
  let withEndpoints = 0;

  for (const c of candidates) {
    try {
      const result = await fingerprintCandidate(c.id, c.domain ?? undefined, c.apiBase ?? undefined);
      processed++;
      if (result.hasModelsEndpoint || result.hasChatEndpoint) {
        withEndpoints++;
      }
    } catch {
      // 单个失败不影响批量
    }
  }

  return { processed, withEndpoints };
}

// ── 探测函数 ──

async function probeEndpoint(baseUrl: string, path: string): Promise<boolean> {
  try {
    const url = `${baseUrl}${path}`;
    const res = await safeFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Accept': 'application/json' },
    });
    // 200 或 401（需要认证但端点存在）都算端点存在
    return res.status === 200 || res.status === 401;
  } catch {
    return false;
  }
}

async function checkModelsFormat(baseUrl: string): Promise<'openai' | 'custom' | 'unknown'> {
  try {
    const res = await safeFetch(`${baseUrl}/v1/models`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return 'unknown';
    assertResponseSize(res);
    const data = await readCappedJson<Record<string, unknown>>(res);
    // OpenAI 标准格式: { object: "list", data: [...] }
    if (data.object === 'list' && Array.isArray(data.data)) {
      return 'openai';
    }
    // 非标准但有模型列表
    if (Array.isArray(data.data) || Array.isArray(data.models)) {
      return 'custom';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function checkAuthMethod(baseUrl: string): Promise<'bearer' | 'api_key' | 'x_api_key' | 'unknown'> {
  try {
    // 发送无认证请求，检查 401 响应头
    const res = await safeFetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      const wwwAuth = res.headers.get('www-authenticate') ?? '';
      if (wwwAuth.toLowerCase().includes('bearer')) return 'bearer';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function checkPricingPage(baseUrl: string): Promise<boolean> {
  const paths = ['/pricing', '/price', '/plans', '/billing'];
  for (const path of paths) {
    try {
      const res = await safeFetch(`${baseUrl}${path}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return true;
    } catch {
      // 继续尝试下一个路径
    }
  }
  return false;
}

function emptyFingerprint(): FingerprintResult {
  return {
    hasModelsEndpoint: false,
    hasChatEndpoint: false,
    hasResponsesEndpoint: false,
    hasMessagesEndpoint: false,
    authMethod: 'unknown',
    modelsFormat: 'unknown',
    pricingPageFound: false,
    probedAt: new Date().toISOString(),
  };
}

function fulfilledOk(result: PromiseSettledResult<boolean>): boolean {
  return result.status === 'fulfilled' && result.value;
}
