/**
 * TASK-062 · 模型源监控调度脚本（catalog + public-pricing → 快照 → diff → lastRun*）
 *
 * 薄封装：采集/归一/持久化的真源全在 apps/web/lib（catalog、public-pricing、sync/writers、monitoring/diff），
 * 本脚本只做「选源 → 逐源 try/catch → 记 lastRun* → 汇总退出码」，与调度执行器共用同一实现、防漂移。
 *
 * 规则（卡面）：
 * - --source <key|all>：all = DB 中 enabled 且 authRequired=false 的源；指定 key 必须已注册且启用。
 * - 单源失败不影响他源：异常写 monitoring_sources.lastStatus='failed' + lastError，stderr 打一行原因；
 *   至少一源成功 → exit 0（部分成功）；全部失败 → exit 1。
 * - --dry-run：只采集与计数，不写库。
 *   · MONITOR_FIXTURE_DIR 指向 catalog fixtures 时完全离线（无 DB、无网络），按 fixture 集合输出 3 源计数；
 *   · 未设 fixture 时读 DB 源列表并真实抓取，仅预览计数。
 * - --limit N：仅 dry-run 生效（预览条数）；写库模式拒绝，避免截断观测触发「其余模型被下架」。
 * - 公开定价页（public-pricing）运行前守 robots.txt（best-effort：robots 404/不可达不阻断，命中 Disallow 则停该源）。
 * - T120-12 立即运行：写库模式开跑前原子领取 monitor_run_requests 的 pending（→running，逐行 CAS），
 *   被领取源本轮必跑；逐源结束回写 done(resultCount)/failed(error)；顺手清理 90 天前已结束请求。
 *   dry-run 不领取。被领取但已停用/软删/authRequired 的源直接回写 failed。
 *
 * 用法：
 *   npx tsx scripts/crawl/monitor_catalogs.ts --help
 *   npx tsx scripts/crawl/monitor_catalogs.ts --source openrouter --dry-run
 *   MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures \
 *     npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run
 *   npx tsx scripts/crawl/monitor_catalogs.ts --source all
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProviderModelObservation } from "@aidean/shared";
import { CATALOG_COLLECTORS, getCatalogCollector } from "../../apps/web/lib/monitoring/catalog/registry";
import { CATALOG_MAX_BYTES, collect } from "../../apps/web/lib/monitoring/catalog/types";
import { getPublicPricingCollector } from "../../apps/web/lib/monitoring/public-pricing/registry";
import { blockedPageReason } from "../../apps/web/lib/monitoring/public-pricing/types";
import { readCappedText, safeFetch } from "../../apps/web/lib/security/url-policy";

interface Config {
  source: string;
  dryRun: boolean;
  limit: number;
  help: boolean;
}

const USER_AGENT = "AideanMonitor/1.0 (+catalog)";
const FETCH_TIMEOUT_MS = 30_000;
const ROBOTS_MAX_BYTES = 256 * 1024;

function printHelp(): void {
  console.log(`
模型源监控调度脚本（TASK-062）

用法: npx tsx scripts/crawl/monitor_catalogs.ts [options]

选项:
  --source <key|all>  源 key（monitoring_sources.key）或 all（默认 all）
  --dry-run           仅采集计数，不写数据库；未设 fixture 时仍需 DB 与网络
  --limit <number>    仅 dry-run：每源最多预览 N 条（写库模式拒绝，防误下架）
  --help, -h          显示帮助信息

环境变量:
  MONITOR_FIXTURE_DIR  离线 fixture 目录（catalog/{key}.json + FETCHED_AT.txt）；
                       设置且 --dry-run 时完全不触 DB、不联网
  DATABASE_URL         写库模式必需

退出码:
  0  至少一源成功（部分成功也算）
  1  全部失败 / 无可执行源 / 参数错误
`);
}

function parseArgs(argv: readonly string[]): Config {
  const config: Config = { source: "all", dryRun: false, limit: 0, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--source": {
        const val = argv[++i];
        if (!val || val.startsWith("--")) throw new Error("--source 缺少参数值");
        config.source = val;
        break;
      }
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--limit": {
        const raw = argv[++i];
        const val = Number(raw);
        if (!raw || !Number.isInteger(val) || val <= 0) throw new Error(`--limit 需要正整数，收到: ${raw ?? "(空)"}`);
        config.limit = val;
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        return { ...config, help: true };
      default:
        throw new Error(`未知参数: ${arg}`);
    }
  }
  if (!config.dryRun && config.limit > 0) {
    throw new Error("--limit 仅支持 --dry-run（写库模式截断会触发未列出模型被下架）");
  }
  return config;
}

// ---------------------------------------------------------------- fixture 离线模式

async function readFixtureText(dir: string, key: string): Promise<string | null> {
  const file = path.join(dir, `${key}.json`);
  if (!existsSync(file)) return null;
  return readFile(file, "utf8");
}

async function readFixtureFetchedAt(dir: string): Promise<Date> {
  try {
    const raw = await readFile(path.join(dir, "FETCHED_AT.txt"), "utf8");
    const first = raw.split(/\r?\n/)[0]?.trim();
    const at = first ? new Date(first) : null;
    if (at && Number.isFinite(at.getTime())) return at;
  } catch {
    // fixture 无 FETCHED_AT.txt → 用当前时刻
  }
  return new Date();
}

async function runFixtureDryRun(config: Config, fixtureDir: string): Promise<number> {
  const fetchedAt = await readFixtureFetchedAt(fixtureDir);
  const keys = config.source === "all" ? Object.keys(CATALOG_COLLECTORS) : [config.source];
  console.log(`[fixture] dir=${fixtureDir} fetchedAt=${fetchedAt.toISOString()}`);
  console.log("=== counts ===");

  let okSources = 0;
  let failedSources = 0;
  let total = 0;
  for (const key of keys) {
    try {
      const collector = getCatalogCollector(key);
      if (!collector) {
        throw new Error(`fixture 模式仅支持 catalog 源（可用: ${Object.keys(CATALOG_COLLECTORS).join(", ")}）`);
      }
      const text = await readFixtureText(fixtureDir, key);
      if (text === null) throw new Error(`fixture 缺失: ${path.join(fixtureDir, `${key}.json`)}`);
      const observations = collector.normalize(JSON.parse(text) as unknown, { fetchedAt });
      const shown = config.limit > 0 ? observations.slice(0, config.limit) : observations;
      console.log(`${key}: ${shown.length}`);
      total += shown.length;
      okSources++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[failed] ${key}: ${message}`);
      failedSources++;
    }
  }
  console.log(`=== total: ${okSources} source(s) ok / ${failedSources} failed / ${total} item(s) ===`);
  return okSources > 0 ? 0 : 1;
}

// ---------------------------------------------------------------- 真实抓取

async function fetchPublicPage(endpoint: string): Promise<string> {
  const res = await safeFetch(endpoint, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error(`pricing fetch ${endpoint} → HTTP ${res.status}`);
  }
  const text = await readCappedText(res, CATALOG_MAX_BYTES);
  const blocked = blockedPageReason(text);
  if (blocked) throw new Error(blocked);
  return text;
}

/** best-effort robots 守卫：仅当明确命中 Disallow 前缀时抛错；404/网络失败视为未设限制 */
async function assertRobotsAllowed(endpoint: string): Promise<void> {
  const target = new URL(endpoint);
  const robotsUrl = `${target.origin}/robots.txt`;
  let body: string;
  try {
    const res = await safeFetch(robotsUrl, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return;
    }
    body = await readCappedText(res, ROBOTS_MAX_BYTES);
  } catch {
    return;
  }

  const targetPath = target.pathname || "/";
  let applies = false;
  for (const line of body.split(/\r?\n/)) {
    const cleaned = line.replace(/#.*$/, "").trim();
    if (!cleaned) continue;
    const idx = cleaned.indexOf(":");
    if (idx < 0) continue;
    const field = cleaned.slice(0, idx).trim().toLowerCase();
    const value = cleaned.slice(idx + 1).trim();
    if (field === "user-agent") {
      applies = value === "*" || value.toLowerCase().includes("aidean");
    } else if (applies && field === "disallow" && value && targetPath.startsWith(value)) {
      throw new Error(`robots_disallowed: ${robotsUrl} 禁止 ${value}`);
    }
  }
}

interface Collected {
  text: string;
  observations: ProviderModelObservation[];
  sourceUrl: string;
}

async function collectSource(key: string, endpoint: string, now: Date, checkRobots: boolean): Promise<Collected> {
  const catalog = getCatalogCollector(key);
  if (catalog) {
    const result = await collect(catalog, endpoint, { now });
    return { text: result.fetch.text, observations: result.observations, sourceUrl: result.fetch.url };
  }

  const pricing = getPublicPricingCollector(key);
  if (!pricing) throw new Error(`无 collector: ${key}（catalog 与 public-pricing 均未注册）`);
  if (checkRobots) await assertRobotsAllowed(endpoint);

  const text = await fetchPublicPage(endpoint);
  const parsed = pricing.parse(text, { fetchedAt: now });
  if (!parsed.ok) throw new Error(`parse_failed: ${parsed.reason}`);
  if (parsed.observations.length === 0) throw new Error("parse_failed: 解析出 0 条（不得以空列表冒充成功）");
  return { text, observations: parsed.observations, sourceUrl: endpoint };
}

// ---------------------------------------------------------------- 写库（动态加载，dry-run 不触 DB）

type Deps = {
  prisma: typeof import("../../apps/web/lib/db/prisma").prisma;
  persistCatalogSnapshot: typeof import("../../apps/web/lib/sync/writers/catalog-snapshot").persistCatalogSnapshot;
  detect: typeof import("../../apps/web/lib/monitoring/diff/detect").detect;
  persistCatalogChangeEvents: typeof import("../../apps/web/lib/monitoring/diff/persist").persistCatalogChangeEvents;
  /** TASK-068：观测 → ProviderModelOffering（源未映射 ModelProvider 时返回 unmapped，不写库） */
  syncOfferingsForSource: typeof import("../../apps/web/lib/sync/writers/offering-sync").syncOfferingsForSource;
  /** T120-12：立即运行意图行（领取 / 回写 / 清理） */
  runRequests: {
    claim: typeof import("../../apps/web/lib/monitoring/run-requests").claimPendingRunRequests;
    complete: typeof import("../../apps/web/lib/monitoring/run-requests").completeRunRequest;
    purge: typeof import("../../apps/web/lib/monitoring/run-requests").purgeFinishedRunRequests;
  };
};

/**
 * 本地直跑兜底：npm 入口（pnpm --filter web crawl:monitor）cwd=apps/web 时从 .env 读 DATABASE_URL；
 * 仓库根直跑时退到 apps/web/.env。只补空缺，不覆盖已注入的环境变量（调度执行器会继承 env）。
 */
function hydrateDatabaseUrlFromEnvFile(): void {
  if (process.env.DATABASE_URL) return;
  const candidates = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "apps/web/.env")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const matched = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(readFileSync(file, "utf8"));
    if (matched) {
      process.env.DATABASE_URL = matched[1].trim();
      return;
    }
  }
}

async function loadDeps(): Promise<Deps> {
  hydrateDatabaseUrlFromEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL（写库/无 fixture 的 dry-run 需要数据库；离线请设 MONITOR_FIXTURE_DIR）");
  }
  const [db, writer, diff, persist, offering, runRequests] = await Promise.all([
    import("../../apps/web/lib/db/prisma"),
    import("../../apps/web/lib/sync/writers/catalog-snapshot"),
    import("../../apps/web/lib/monitoring/diff/detect"),
    import("../../apps/web/lib/monitoring/diff/persist"),
    import("../../apps/web/lib/sync/writers/offering-sync"),
    import("../../apps/web/lib/monitoring/run-requests"),
  ]);
  return {
    prisma: db.prisma,
    persistCatalogSnapshot: writer.persistCatalogSnapshot,
    detect: diff.detect,
    persistCatalogChangeEvents: persist.persistCatalogChangeEvents,
    syncOfferingsForSource: offering.syncOfferingsForSource,
    runRequests: {
      claim: runRequests.claimPendingRunRequests,
      complete: runRequests.completeRunRequest,
      purge: runRequests.purgeFinishedRunRequests,
    },
  };
}

interface RunResult {
  count: number;
  created: boolean;
  events: number;
  idempotent: boolean;
}

/** Prisma Decimal | string | null → 十进制字符串（detect 只接受 string|number|null） */
function decimalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

async function writeSource(
  deps: Deps,
  key: string,
  now: Date,
  collected: Collected,
): Promise<RunResult> {
  const { prisma, persistCatalogSnapshot, detect, persistCatalogChangeEvents } = deps;
  const source = await prisma.monitoringSource.findFirst({
    where: { key, deletedAt: null },
    select: { id: true },
  });
  if (!source) throw new Error(`monitoring_sources 未注册: ${key}`);

  // diff 需要「写入前」的上一快照与跨源首见集合（writer 会刷新 lastSnapshotId，必须先读）。
  const prevSnapshot = await prisma.catalogSnapshot.findFirst({
    where: { sourceId: source.id },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
  const currModelIds = [...new Set(collected.observations.map((o) => o.normalizedModelId))];
  const [prevRows, seenRows] = await Promise.all([
    prevSnapshot
      ? prisma.providerModelObservation.findMany({
          where: { sourceId: source.id, lastSnapshotId: prevSnapshot.id },
          select: {
            externalModelId: true,
            normalizedModelId: true,
            isListed: true,
            priceUnit: true,
            priceInput: true,
            priceOutput: true,
            lastSeenAt: true,
          },
        })
      : Promise.resolve([]),
    // 全目录首见集合：除「本源上一快照」外的全部历史（其他源 + 本源更早快照/delisted 行）；
    // 上一快照的行由 prevRows 覆盖，两者并集即 detect 的 seenNormalizedBefore。
    prisma.providerModelObservation.findMany({
      where: {
        normalizedModelId: { in: currModelIds },
        NOT: prevSnapshot
          ? { AND: [{ sourceId: source.id }, { lastSnapshotId: prevSnapshot.id }] }
          : { sourceId: source.id },
      },
      select: { normalizedModelId: true },
    }),
  ]);

  const sha256 = createHash("sha256").update(collected.text, "utf8").digest("hex");
  const items = collected.observations.map((o) => ({
    externalModelId: o.externalModelId,
    normalizedModelId: o.normalizedModelId,
    displayName: o.displayName,
    vendorHint: o.vendorHint,
    priceUnit: o.priceUnit,
    priceInput: o.priceInput,
    priceOutput: o.priceOutput,
    priceCacheRead: o.priceCacheRead,
    contextLength: o.contextLength,
  }));

  const snapshot = await persistCatalogSnapshot(key, now, items, sha256, {
    rawBytes: Buffer.byteLength(collected.text, "utf8"),
    rawSample: collected.text.slice(0, 2048),
    sourceUrl: collected.sourceUrl,
  });
  if (snapshot.skipped) throw new Error(`空目录守卫: ${snapshot.reason ?? "empty"}`);

  let events = 0;
  if (!snapshot.idempotent) {
    const seen = new Set<string>([
      ...prevRows.map((r) => r.normalizedModelId),
      ...seenRows.map((r) => r.normalizedModelId),
    ]);
    const changes = detect(
      prevRows.map((r) => ({
        externalModelId: r.externalModelId,
        normalizedModelId: r.normalizedModelId,
        isListed: r.isListed,
        priceUnit: r.priceUnit,
        priceInput: decimalText(r.priceInput),
        priceOutput: decimalText(r.priceOutput),
        lastSeenAt: r.lastSeenAt,
      })),
      collected.observations.map((o) => ({
        externalModelId: o.externalModelId,
        normalizedModelId: o.normalizedModelId,
        isListed: o.isListed,
        priceUnit: o.priceUnit,
        priceInput: o.priceInput,
        priceOutput: o.priceOutput,
        lastSeenAt: o.lastSeenAt,
      })),
      {
        sourceKey: key,
        snapshotId: snapshot.snapshotId,
        sourceUrl: collected.sourceUrl,
        detectedAt: now,
        seenNormalizedBefore: seen,
      },
    );
    const persisted = await persistCatalogChangeEvents(changes);
    events = persisted.events;

    // TASK-068 上架同步（同 hash 重放跳过；源未映射 ModelProvider → unmapped 不写）
    const src = await deps.prisma.monitoringSource.findFirst({ where: { key, deletedAt: null }, select: { id: true } });
    if (src) {
      const sync = await deps.syncOfferingsForSource(deps.prisma, src.id, { now });
      if (sync.status === "ok") {
        console.log(`[monitor] ${key} offerings: +${sync.created} ~${sync.updated} =${sync.unchanged} candidates+${sync.candidates}`);
      }
    }
  }

  return {
    count: items.length,
    created: snapshot.created,
    events,
    idempotent: snapshot.idempotent,
  };
}

async function markSource(
  deps: Deps,
  key: string,
  now: Date,
  status: "ok" | "failed",
  count: number | null,
  error: string | null,
): Promise<void> {
  await deps.prisma.monitoringSource.updateMany({
    where: { key, deletedAt: null },
    data: { lastRunAt: now, lastStatus: status, lastCount: count, lastError: error },
  });
}

async function runReal(config: Config): Promise<number> {
  const deps = await loadDeps();
  try {
    const sources = await deps.prisma.monitoringSource.findMany({
      where: { deletedAt: null, enabled: true },
      orderBy: { key: "asc" },
      select: { key: true, endpoint: true, authRequired: true },
    });
    const selected = config.source === "all" ? sources : sources.filter((s) => s.key === config.source);

    // T120-12：领取立即运行请求（仅写库模式）；领取即 running，本轮结束必回写
    const claimed = new Map<string, string[]>();
    if (!config.dryRun) {
      await deps.runRequests.purge(deps.prisma).catch((e: unknown) => {
        console.warn(`[warn] 清理过期运行请求失败: ${e instanceof Error ? e.message : String(e)}`);
      });
      const rows = await deps.runRequests.claim(deps.prisma, {
        sourceKey: config.source === "all" ? undefined : config.source,
      });
      for (const row of rows) claimed.set(row.sourceKey, [...(claimed.get(row.sourceKey) ?? []), row.id]);
    }
    const finishClaimed = async (
      key: string,
      outcome: { status: "done"; resultCount: number } | { status: "failed"; error: string },
    ): Promise<void> => {
      for (const id of claimed.get(key) ?? []) {
        try {
          await deps.runRequests.complete(deps.prisma, id, outcome);
        } catch (e) {
          console.error(`[failed] ${key}: 回写运行请求 ${id} 失败: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      claimed.delete(key);
    };
    for (const key of [...claimed.keys()]) {
      if (!selected.some((s) => s.key === key)) {
        await finishClaimed(key, { status: "failed", error: "源未启用或已删除" });
      }
    }

    if (selected.length === 0) {
      throw new Error(config.source === "all" ? "没有 enabled 的监控源" : `源未注册或未启用: ${config.source}`);
    }

    let okSources = 0;
    let failedSources = 0;
    for (const source of selected) {
      const now = new Date();
      if (source.authRequired) {
        // 当前无凭证体系（U-M1：不引入 API Key）；authRequired 源不跑，避免空转。
        console.warn(`[skip] ${source.key}: authRequired=true（无凭证配置，跳过）`);
        await finishClaimed(source.key, { status: "failed", error: "该源需要 API Key，未配置凭证" });
        continue;
      }
      try {
        const collected = await collectSource(source.key, source.endpoint, now, true);
        const preview = config.limit > 0 ? collected.observations.slice(0, config.limit) : collected.observations;
        if (config.dryRun) {
          console.log(`[dry-run] ${source.key}: ${preview.length} 条（未写库）`);
          okSources++;
          continue;
        }
        const result = await writeSource(deps, source.key, now, collected);
        await markSource(deps, source.key, now, "ok", result.count, null);
        await finishClaimed(source.key, { status: "done", resultCount: result.count });
        console.log(
          `[ok] ${source.key}: ${result.count} 条 | 新快照=${result.created ? "yes" : "no"} | 幂等=${result.idempotent ? "yes" : "no"} | 事件=${result.events}`,
        );
        okSources++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`[failed] ${source.key}: ${message}`);
        failedSources++;
        if (!config.dryRun) {
          try {
            await markSource(deps, source.key, now, "failed", null, message.slice(0, 2000));
          } catch (markError) {
            console.error(`[failed] ${source.key}: 记录 lastError 失败: ${markError instanceof Error ? markError.message : String(markError)}`);
          }
          await finishClaimed(source.key, { status: "failed", error: message });
        }
      }
    }

    console.log(`=== total: ${okSources} source(s) ok / ${failedSources} failed ===`);
    return okSources > 0 ? 0 : 1;
  } finally {
    await deps.prisma.$disconnect().catch(() => undefined);
  }
}

// ---------------------------------------------------------------- 入口

async function main(): Promise<number> {
  let config: Config;
  try {
    config = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`参数错误: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  if (config.help) return 0;

  const fixtureDir = process.env.MONITOR_FIXTURE_DIR?.trim();
  if (config.dryRun && fixtureDir) return runFixtureDryRun(config, fixtureDir);
  return runReal(config);
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error("monitor_catalogs 执行失败:", err instanceof Error ? err.stack ?? err.message : err);
    process.exitCode = 1;
  },
);
