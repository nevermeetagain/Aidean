/**
 * Candidate Discovery — 第一层：候选发现
 *
 * 从多个数据源联合发现数据库完全不知道的新平台。
 * 数据源: Registry + Search + GitHub + News + Crawl
 *
 * 依据: AI市场发现与智能引擎设计文档.md §1.2
 * 核心原则: "自动发现不是神奇地知道所有网站，
 *            而是把开放互联网中可观测的证据转化为候选实体。"
 */

import type { Candidate, SourceType, CandidateType } from './types';
import { prisma } from '../db/prisma';
import { assertResponseSize, readCappedJson, readCappedText, safeFetch } from '../security/url-policy';
import {
  parseLlmtestComposite,
  mapLlmtestItemsToCandidates,
  LLMTEST_COMPOSITE_URL,
  type LlmtestLeaderboardItem,
} from './llmtest';

// ── 搜索关键词集 ──
const SEARCH_KEYWORDS = [
  'OpenAI compatible API',
  'LLM API endpoint',
  'AI model inference API',
  'large language model API',
  'AI 推理 API',
  '大模型 API 接口',
  'LLM gateway',
  'AI API aggregator',
];

// ── GitHub 搜索关键词 ──
const GITHUB_TOPICS = [
  'llm-api',
  'openai-compatible',
  'ai-gateway',
  'llm-inference',
  'model-serving',
];

/**
 * 从 Registry 数据源发现候选
 * 已知: OpenRouter / HuggingFace / Models.dev / Artificial Analysis / LiteLLM
 * 这些已有 sync adapters，此处补充发现 Registry 中新出现但 DB 中不存在的条目
 */
export async function discoverFromRegistries(): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  // OpenRouter models 端点：发现新 provider
  try {
    const res = await safeFetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      assertResponseSize(res);
      const data = await readCappedJson<{ data?: Array<{ id: string; top_provider?: { name?: string } }> }>(res);
      const providers = new Set<string>();
      for (const model of data.data ?? []) {
        // OpenRouter model id 格式: "provider/model"
        const providerName = model.id.split('/')[0];
        if (providerName) providers.add(providerName);
      }
      // 检查哪些 provider 在 DB 中不存在
      for (const name of providers) {
        const exists = await prisma.modelProvider.findFirst({
          where: { name: { contains: name, mode: 'insensitive' } },
          select: { id: true },
        });
        if (!exists) {
          candidates.push({
            candidateType: 'provider',
            name,
            domain: `${name}.ai`,
            sourceType: 'registry',
            sourceUrl: 'https://openrouter.ai/api/v1/models',
          });
        }
      }
    }
  } catch {
    // 网络错误时跳过此源
  }

  return candidates;
}

/**
 * 从搜索引擎发现候选
 * 使用预定义关键词搜索，提取域名作为候选
 */
export async function discoverFromSearch(): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      // 使用 DuckDuckGo Lite（无需 API Key）
      const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(keyword)}`;
      const res = await safeFetch(url, {
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        assertResponseSize(res);
        const html = await readCappedText(res);
        // 提取结果中的域名
        const domains = extractDomainsFromHtml(html);
        for (const domain of domains) {
          // 检查是否已存在
          const exists = await prisma.discoveryCandidate.findFirst({
            where: { domain },
            select: { id: true },
          });
          if (!exists) {
            candidates.push({
              candidateType: 'provider',
              name: domain.split('.')[0],
              domain,
              sourceType: 'search',
              sourceUrl: url,
              sourceKeyword: keyword,
            });
          }
        }
      }
    } catch {
      // 单个关键词失败不影响其他
    }
  }

  return candidates;
}

/**
 * 从 GitHub 发现候选
 * 搜索特定 topic 的仓库，提取新 SDK / 推理引擎 / API wrapper
 */
export async function discoverFromGitHub(): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  for (const topic of GITHUB_TOPICS) {
    try {
      const url = `https://api.github.com/search/repositories?topic=${topic}&sort=stars&per_page=10`;
      const res = await safeFetch(url, {
        headers: { 'Accept': 'application/vnd.github+json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        assertResponseSize(res);
        const data = await readCappedJson<{
          items?: Array<{
            full_name: string;
            html_url: string;
            description?: string;
            homepage?: string;
          }>;
        }>(res);
        for (const repo of data.items ?? []) {
          const domain = repo.homepage ? extractDomain(repo.homepage) : undefined;
          if (domain) {
            const exists = await prisma.discoveryCandidate.findFirst({
              where: { domain },
              select: { id: true },
            });
            if (!exists) {
              candidates.push({
                candidateType: 'tool',
                name: repo.full_name,
                domain,
                description: repo.description,
                sourceType: 'github',
                sourceUrl: repo.html_url,
                sourceKeyword: topic,
              });
            }
          }
        }
      }
    } catch {
      // 单个 topic 失败不影响其他
    }
  }

  return candidates;
}

/**
 * 从新闻源发现候选
 * 监控 Product Hunt / Hacker News 中的 AI 相关新产品
 */
export async function discoverFromNews(): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  try {
    // Hacker News Algolia API
    const url = 'https://hn.algolia.com/api/v1/search?tags=story&query=AI+API+launch';
    const res = await safeFetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      assertResponseSize(res);
      const data = await readCappedJson<{
        hits?: Array<{ title?: string; url?: string; created_at?: string }>;
      }>(res);
      for (const hit of data.hits ?? []) {
        if (hit.url) {
          const domain = extractDomain(hit.url);
          if (domain && !isKnownAggregator(domain)) {
            const exists = await prisma.discoveryCandidate.findFirst({
              where: { domain },
              select: { id: true },
            });
            if (!exists) {
              candidates.push({
                candidateType: 'provider',
                name: hit.title?.slice(0, 100) ?? domain,
                domain,
                sourceType: 'news',
                sourceUrl: hit.url,
              });
            }
          }
        }
      }
    }
  } catch {
    // 网络错误时跳过
  }

  return candidates;
}

/**
 * 从爬取源发现候选（当前接入 llmtest.cn API 站点榜单公开数据接口）。
 *
 * L0 实证：GET https://llmtest.cn/api/leaderboard/composite → 200 公开，data[] 为被监控的中转站/网关。
 * 映射为 discovery 候选（sourceType='crawl', candidateType='gateway'），经既有人工审核状态机 promote 到 APIStation。
 * 幂等：按 domain 预检（同域候选已存在则跳过），与其余发现源口径一致；
 * 网络失败 / 接口异形 → 返回空数组，不阻断其他源。
 */
export async function fetchLlmtestItems(): Promise<LlmtestLeaderboardItem[]> {
  const res = await safeFetch(LLMTEST_COMPOSITE_URL, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`llmtest composite HTTP ${res.status}`);
  assertResponseSize(res);
  const json = await readCappedJson<unknown>(res);
  return parseLlmtestComposite(json);
}

/**
 * @param preloaded T120-13：调用方已拉取的 composite 项（crawl_llmtest 同一份数据同时写观测，避免二次请求）。
 */
export async function discoverFromCrawl(preloaded?: LlmtestLeaderboardItem[]): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  try {
    const items = preloaded ?? (await fetchLlmtestItems());
    const mapped = mapLlmtestItemsToCandidates(items);
    for (const c of mapped) {
      if (!c.domain) continue;
      const exists = await prisma.discoveryCandidate.findFirst({
        where: { domain: c.domain },
        select: { id: true },
      });
      if (!exists) candidates.push(c);
    }
  } catch {
    // 网络/解析失败：跳过，不阻断其他发现源
  }
  return candidates;
}

/**
 * 执行全部发现源
 */
export async function discoverAllCandidates(
  sources: SourceType[] = ['registry', 'search', 'github', 'news', 'crawl'],
): Promise<Candidate[]> {
  const all: Candidate[] = [];

  const sourceMap: Record<SourceType, () => Promise<Candidate[]>> = {
    registry: discoverFromRegistries,
    search: discoverFromSearch,
    github: discoverFromGitHub,
    news: discoverFromNews,
    crawl: discoverFromCrawl,
  };

  for (const source of sources) {
    try {
      const found = await sourceMap[source]();
      all.push(...found);
    } catch {
      // 单源失败不影响其他
    }
  }

  return all;
}

// ── 工具函数 ──

function extractDomainsFromHtml(html: string): string[] {
  const domains = new Set<string>();
  // 提取 <a class="result-link" href="..."> 中的域名
  const linkRegex = /href="https?:\/\/([^\/"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const domain = match[1].replace(/^www\./, '');
    if (isValidDomain(domain) && !isKnownAggregator(domain)) {
      domains.add(domain);
    }
  }
  return Array.from(domains).slice(0, 20); // 每次搜索最多 20 个
}

function extractDomain(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function isValidDomain(domain: string): boolean {
  return domain.includes('.') && !domain.startsWith('localhost') && domain.length > 4;
}

function isKnownAggregator(domain: string): boolean {
  const known = [
    'google.com', 'github.com', 'duckduckgo.com', 'hn.algolia.com',
    'openrouter.ai', 'huggingface.co', 'models.dev', 'artificialanalysis.ai',
    'lmsys.org', 'epoch.ai', 'llm-stats.com',
  ];
  return known.some(k => domain.includes(k));
}
