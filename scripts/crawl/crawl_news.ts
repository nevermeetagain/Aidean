/**
 * AI 资讯数据采集同步脚本
 * 功能：AI 快讯/新闻采集 → 字段标准化 → Prisma upsert
 *
 * 数据源：AI 新闻 RSS/Atom feeds
 * 采集策略：
 *   1. 从预设 RSS feed 列表读取
 *   2. 解析 XML 提取 title/summary/link/publishedDate
 *   3. 按 slug 去重（title → slugify）
 *   4. upsert 到 NewsItem 表，状态默认 DRAFT（需人工审核后发布）
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_news.ts [--limit 50] [--dry-run] [--timeout 15000]
 */

import { createHash } from 'crypto';
import { prisma } from '../../apps/web/lib/db/prisma';

interface FeedSource {
  name: string;
  url: string;
  category: string;
}

/** 预设 RSS feed 列表（AI 科技资讯） */
const FEED_SOURCES: FeedSource[] = [
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'AI实验室' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'AI实验室' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: '开源AI' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', category: '科技评论' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: '科技资讯' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: '科技资讯' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/feed.xml', category: 'AI实验室' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', category: 'AI实验室' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { limit: 0, dryRun: false, timeout: 15000 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.limit = val;
        break;
      }
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--timeout': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.timeout = val;
        break;
      }
      case '--help':
      case '-h':
        console.log(`
AI资讯采集同步脚本

用法: npx tsx scripts/crawl/crawl_news.ts [options]

选项:
  --limit <number>   每个源最多采集的条目数
  --dry-run          仅预览不写入数据库
  --timeout <ms>     单源请求超时（默认 15000ms）
  --help             显示帮助信息
`);
        process.exit(0);
    }
  }
  return config;
}

interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: Date | null;
  category: string;
  sourceName: string;
}

/** 从 title 生成 URL-safe slug */
function slugify(title: string): string {
  const hash = createHash('sha256').update(title).digest('hex').slice(0, 12);
  return `crawl-${hash}`;
}

/** 简易 XML RSS/Atom 解析（不引入外部依赖） */
function parseRssXml(xml: string, source: FeedSource): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS 2.0: <item>...</item>
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of rssItems) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      ?? block.match(/<link[^>]*href="([^"]*)"[^>]*\/>/i)?.[1]?.trim();
    const description = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim();
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();

    if (title && link) {
      items.push({
        title,
        link,
        summary: (description ?? '').replace(/<[^>]+>/g, '').slice(0, 500),
        publishedAt: pubDate ? new Date(pubDate) : null,
        category: source.category,
        sourceName: source.name,
      });
    }
  }

  // Atom 1.0: <entry>...</entry>
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of atomEntries) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = block.match(/<link[^>]*href="([^"]*)"[^>]*>/i)?.[1]?.trim();
    const summary = block.match(/<summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim()
      ?? block.match(/<content>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim();
    const published = block.match(/<published>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      ?? block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1]?.trim();

    if (title && link) {
      items.push({
        title,
        link,
        summary: (summary ?? '').replace(/<[^>]+>/g, '').slice(0, 500),
        publishedAt: published ? new Date(published) : null,
        category: source.category,
        sourceName: source.name,
      });
    }
  }

  return items;
}

async function fetchFeed(source: FeedSource, timeout: number): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    });

    if (!res.ok) {
      console.error(`  ❌ ${source.name}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRssXml(xml, source);
    console.log(`  ✅ ${source.name}: ${items.length} 条`);
    return items;
  } catch (err) {
    console.error(`  ❌ ${source.name}: ${err instanceof Error ? err.message : err}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const config = parseArgs();
  const sources = config.limit > 0 ? FEED_SOURCES.slice(0, config.limit) : FEED_SOURCES;

  console.log('========================================');
  console.log('  AI 资讯采集同步脚本');
  console.log('========================================');
  console.log(`RSS 源数: ${sources.length}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  console.log(`超时: ${config.timeout}ms`);
  console.log('----------------------------------------\n');

  console.log('采集 RSS feeds...\n');
  let allItems: FeedItem[] = [];
  for (const source of sources) {
    const items = await fetchFeed(source, config.timeout);
    // Apply per-source limit if specified
    const limited = config.limit > 0 ? items.slice(0, config.limit) : items;
    allItems = allItems.concat(limited);
  }

  console.log(`\n总采集: ${allItems.length} 条\n`);

  if (config.dryRun) {
    console.log('[dry-run] 跳过数据库写入');
    if (allItems.length > 0) {
      console.log('\n预览前 5 条:');
      for (const item of allItems.slice(0, 5)) {
        console.log(`  - [${item.category}] ${item.title} (${item.sourceName})`);
      }
    }
    console.log('\n========================================\n');
    process.exit(0);
  }

  // Upsert to database
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of allItems) {
    try {
      const slug = slugify(item.title);

      // Check for existing by slug
      const existing = await prisma.newsItem.findUnique({ where: { slug } });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.newsItem.create({
        data: {
          slug,
          title: item.title.slice(0, 200),
          summary: item.summary.slice(0, 500),
          category: item.category,
          contentMarkdown: `> 来源: ${item.sourceName}\n> 链接: ${item.link}\n\n${item.summary}`,
          status: '0', // DRAFT — 需人工审核后发布
          publishedAt: item.publishedAt,
        },
      });
      created++;
    } catch (err) {
      console.error(`  ❌ 写入失败 "${item.title}": ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log('========================================');
  console.log('  同步结果');
  console.log('========================================');
  console.log(`采集: ${allItems.length} | 新建: ${created} | 跳过(已存在): ${skipped} | 失败: ${failed}`);
  console.log(`状态: 全部为 DRAFT，需人工审核后发布`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
