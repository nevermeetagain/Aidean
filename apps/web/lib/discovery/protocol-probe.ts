/**
 * Protocol Probe — 第四层：协议探测
 *
 * 逐项测试具体协议能力，形成兼容矩阵。
 * 探测: OpenAI Chat / Responses / Anthropic Messages / Streaming / Tool / Vision / MCP
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.5
 */

import type { ProtocolType, ProtocolProbeResult } from './types';
import { Prisma } from "@prisma/client";
import { prisma } from '../db/prisma';
import { assertSafeUrl, safeFetch } from '../security/url-policy';

/**
 * 对单个候选执行协议探测
 */
export async function probeProtocols(
  candidateId: string,
  domain?: string,
  apiBase?: string,
): Promise<ProtocolProbeResult[]> {
  const baseUrl = apiBase ?? (domain ? `https://${domain}` : null);
  if (!baseUrl) return [];

  // SSRF 策略校验（P2）：阻断私网/回环/云元数据地址，避免 admin 提交的内网探测。
  // 单点校验 baseUrl；内部各 probe 派生自同主机，无需重复 DNS 解析。
  try {
    await assertSafeUrl(baseUrl);
  } catch {
    return [];
  }

  const results: ProtocolProbeResult[] = [];

  // 基于端点存在性探测
  const probes: Array<{ protocol: ProtocolType; fn: () => Promise<ProtocolProbeResult> }> = [
    { protocol: 'openai_chat', fn: () => probeEndpointProtocol(baseUrl, '/v1/chat/completions', 'openai_chat') },
    { protocol: 'openai_responses', fn: () => probeEndpointProtocol(baseUrl, '/v1/responses', 'openai_responses') },
    { protocol: 'anthropic_messages', fn: () => probeEndpointProtocol(baseUrl, '/v1/messages', 'anthropic_messages') },
    { protocol: 'streaming', fn: () => probeStreamingSupport(baseUrl) },
    { protocol: 'tool_calling', fn: () => probeToolCallingSupport(baseUrl) },
    { protocol: 'structured_output', fn: () => probeStructuredOutputSupport(baseUrl) },
    { protocol: 'vision', fn: () => probeVisionSupport(baseUrl) },
    { protocol: 'reasoning', fn: () => probeReasoningSupport(baseUrl) },
    { protocol: 'mcp', fn: () => probeMcpSupport(baseUrl) },
    { protocol: 'audio', fn: () => probeEndpointProtocol(baseUrl, '/v1/audio', 'audio') },
    { protocol: 'pdf', fn: () => probePdfSupport(baseUrl) },
  ];

  for (const { fn } of probes) {
    try {
      const result = await fn();
      results.push(result);
    } catch {
      // 单个协议探测失败不影响其他
    }
  }

  // 写入数据库
  for (const result of results) {
    await prisma.protocolCompatibility.upsert({
      where: {
        entityType_entityId_protocol: {
          entityType: 'provider',
          entityId: candidateId,
          protocol: result.protocol,
        },
      },
      create: {
        entityType: 'provider',
        entityId: candidateId,
        protocol: result.protocol,
        supported: result.supported,
        probeMethod: result.probeMethod,
        probeResult: (result.detail ?? undefined) as Prisma.InputJsonValue | undefined,
        confidence: result.confidence,
      },
      update: {
        supported: result.supported,
        probeMethod: result.probeMethod,
        probeResult: (result.detail ?? undefined) as Prisma.InputJsonValue | undefined,
        confidence: result.confidence,
      },
    });
  }

  // 创建协议证据
  const supportedProtocols = results.filter(r => r.supported).map(r => r.protocol);
  if (supportedProtocols.length > 0) {
    await prisma.evidenceChain.create({
      data: {
        candidateId,
        evidenceType: 'protocol',
        claim: `Supported protocols: ${supportedProtocols.join(', ')}`,
        source: 'observed',
        confidence: 0.75,
        evidenceData: { protocols: supportedProtocols },
      },
    });
  }

  return results;
}

/**
 * 批量协议探测
 */
export async function probeProtocolsBatch(
  candidates: Array<{ id: string; domain?: string | null; apiBase?: string | null }>,
): Promise<{ processed: number; totalSupported: number }> {
  let processed = 0;
  let totalSupported = 0;

  for (const c of candidates) {
    try {
      const results = await probeProtocols(c.id, c.domain ?? undefined, c.apiBase ?? undefined);
      processed++;
      totalSupported += results.filter(r => r.supported).length;
    } catch {
      // 单个失败不影响批量
    }
  }

  return { processed, totalSupported };
}

// ── 各协议探测实现 ──

async function probeEndpointProtocol(
  baseUrl: string,
  path: string,
  protocol: ProtocolType,
): Promise<ProtocolProbeResult> {
  try {
    const res = await safeFetch(`${baseUrl}${path}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol,
      supported,
      probeMethod: 'endpoint_check',
      confidence: supported ? 0.8 : 0.6,
      detail: { httpStatus: res.status },
    };
  } catch {
    return { protocol, supported: false, probeMethod: 'endpoint_check', confidence: 0.5 };
  }
}

async function probeStreamingSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // 检查 /v1/chat/completions 是否支持 stream 参数
  // 通过文档/端点存在性间接判断
  try {
    const res = await safeFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    // 如果 chat 端点存在，streaming 大概率支持（OpenAI 兼容标准）
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'streaming',
      supported,
      probeMethod: 'documented',
      confidence: supported ? 0.6 : 0.4, // 较低置信度，需实际请求验证
    };
  } catch {
    return { protocol: 'streaming', supported: false, probeMethod: 'documented', confidence: 0.3 };
  }
}

async function probeToolCallingSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // 通过端点存在性间接判断
  try {
    const res = await safeFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'tool_calling',
      supported,
      probeMethod: 'documented',
      confidence: supported ? 0.5 : 0.3,
    };
  } catch {
    return { protocol: 'tool_calling', supported: false, probeMethod: 'documented', confidence: 0.3 };
  }
}

async function probeStructuredOutputSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  try {
    const res = await safeFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'structured_output',
      supported,
      probeMethod: 'documented',
      confidence: supported ? 0.5 : 0.3,
    };
  } catch {
    return { protocol: 'structured_output', supported: false, probeMethod: 'documented', confidence: 0.3 };
  }
}

async function probeVisionSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // 需要实际请求验证，此处仅做端点存在性判断
  try {
    const res = await safeFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'vision',
      supported: false, // 保守判断，需实际请求
      probeMethod: 'documented',
      confidence: 0.3,
      detail: { endpointExists: supported },
    };
  } catch {
    return { protocol: 'vision', supported: false, probeMethod: 'documented', confidence: 0.2 };
  }
}

async function probeReasoningSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // 检查是否有 /v1/responses 端点（OpenAI reasoning API）
  try {
    const res = await safeFetch(`${baseUrl}/v1/responses`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'reasoning',
      supported,
      probeMethod: 'endpoint_check',
      confidence: supported ? 0.6 : 0.3,
    };
  } catch {
    return { protocol: 'reasoning', supported: false, probeMethod: 'endpoint_check', confidence: 0.3 };
  }
}

async function probeMcpSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // MCP 是较新协议，通过路径探测
  try {
    const res = await safeFetch(`${baseUrl}/v1/mcp`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const supported = res.status === 200 || res.status === 401;
    return {
      protocol: 'mcp',
      supported,
      probeMethod: 'endpoint_check',
      confidence: supported ? 0.7 : 0.4,
    };
  } catch {
    return { protocol: 'mcp', supported: false, probeMethod: 'endpoint_check', confidence: 0.4 };
  }
}

async function probePdfSupport(baseUrl: string): Promise<ProtocolProbeResult> {
  // PDF 支持通常通过 vision 或 chat 端点
  return {
    protocol: 'pdf',
    supported: false,
    probeMethod: 'documented',
    confidence: 0.2,
  };
}
