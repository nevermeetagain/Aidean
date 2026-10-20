#!/usr/bin/env node
/**
 * TASK-039 · 千级模型天梯量级基线（只测量，不优化）。
 *
 * 做什么：
 *   1. 在**临时库**（DATABASE_URL 含 ci/test 标识）批量插入 N（默认 1000）个 AiModel + 每模型 1 条 Benchmark，
 *      全部挂在专用厂商 `bench1k-vendor` 下，modelCode/slug 统一 `bench1k-` 前缀；
 *   2. 对运行中的应用（默认 http://127.0.0.1:3000）计时 GET /api/v1/ladder?type=models（预热 1 次 + 采样 20 次，
 *      node fetch 循环计时，不依赖 autocannon），输出原始样本与 p50/p95（nearest-rank）；
 *   3. 取 /models 首屏 HTML 字节数（服务端返回体，未解压字节 + 解码后字节）；
 *   4. 结束（含异常）一律清理本脚本插入的数据（按前缀/厂商定点删除，Benchmark 随 AiModel 级联），库回到原状。
 *
 * 安全闸：DATABASE_URL 的库名或主机不含 ci/test 标识 → 拒绝运行（exit 2），不连库、不写库。
 * 不进 seed、不改业务代码；只读 apps/web 的 Prisma Client。
 *
 * 用法：
 *   node scripts/test/benchmark/ladder-1k.mjs --dry-run              # 不连库不发请求：打印计划 + 自检（安全闸/数据生成/统计）
 *   DATABASE_URL=postgresql://…/aidean_ci node scripts/test/benchmark/ladder-1k.mjs \
 *       [--n=1000] [--runs=20] [--base=http://127.0.0.1:3000] [--out=<md 路径>] [--json=<json 路径>]
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");

export const PREFIX = "bench1k-";
export const VENDOR_CODE = `${PREFIX}vendor`;
export const LADDER_PATH = "/api/v1/ladder?type=models";
export const MODELS_PAGE = "/models";

// ---------------------------------------------------------------- 参数
export function parseArgs(argv) {
  const out = { dryRun: false, n: 1000, runs: 20, base: process.env.BENCH_BASE || "http://127.0.0.1:3000", out: null, json: null };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--n=")) out.n = Number(a.slice(4));
    else if (a.startsWith("--runs=")) out.runs = Number(a.slice(7));
    else if (a.startsWith("--base=")) out.base = a.slice(7).replace(/\/$/, "");
    else if (a.startsWith("--out=")) out.out = a.slice(6);
    else if (a.startsWith("--json=")) out.json = a.slice(7);
    else throw new Error(`未知参数：${a}`);
  }
  if (!Number.isInteger(out.n) || out.n < 1 || out.n > 5000) throw new Error("--n 须为 1..5000 的整数");
  if (!Number.isInteger(out.runs) || out.runs < 1 || out.runs > 200) throw new Error("--runs 须为 1..200 的整数");
  return out;
}

// ---------------------------------------------------------------- 安全闸
/**
 * 仅当 DATABASE_URL 的「库名」或「主机名」以分词形式含 ci / test 时放行（如 aidean_ci、aidean-test、ci-postgres）。
 * 解析失败、缺失、或标识只出现在密码/查询串里 → 拒绝。
 */
export function isTempDatabaseUrl(url) {
  if (!url || typeof url !== "string") return { ok: false, reason: "DATABASE_URL 未设置" };
  let u;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: "DATABASE_URL 无法解析" };
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) return { ok: false, reason: `非 PostgreSQL 协议：${u.protocol}` };
  const db = decodeURIComponent(u.pathname.replace(/^\//, ""));
  const host = u.hostname;
  const marker = /(^|[^a-z0-9])(ci|test)([^a-z0-9]|$)/i;
  if (marker.test(db) || marker.test(host)) return { ok: true, reason: `临时库标识命中（db=${db} host=${host}）` };
  return { ok: false, reason: `库名/主机不含 ci/test 标识（db=${db || "∅"} host=${host || "∅"}）` };
}

// ---------------------------------------------------------------- 数据生成（纯函数，可 dry-run 自检）
const MODEL_TYPES = ["CHAT", "REASONING", "MULTIMODAL", "CODE"];
export function buildModels(n, vendorId) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const idx = String(i + 1).padStart(4, "0");
    rows.push({
      modelCode: `${PREFIX}model-${idx}`,
      slug: `${PREFIX}model-${idx}`,
      nameDisplay: `Bench1k Model ${idx}`,
      vendorId,
      modelType: MODEL_TYPES[i % MODEL_TYPES.length],
      contextLength: 8192 * (1 + (i % 16)),
      isOpenSource: i % 3 === 0,
      benchmarkScore: 40 + ((i * 37) % 600) / 10, // 40.0..99.9 确定性分布
      sortOrder: 100000 + i, // 排在真实种子之后，不打乱既有排序
      isActive: true,
      status: "ACTIVE",
    });
  }
  return rows;
}
export function buildBenchmarks(models) {
  return models.map((m) => ({
    modelId: m.id,
    sourceType: "SELF",
    sourceName: "TASK-039 ladder-1k",
    benchmarkType: "composite",
    scores: { composite: m.benchmarkScore },
    totalScore: Number(m.benchmarkScore).toFixed(2),
  }));
}

// ---------------------------------------------------------------- 统计
/** nearest-rank 百分位：p∈(0,100]，样本升序后取 ceil(p/100*n)-1 位 */
export function percentile(samples, p) {
  if (!samples.length) return null;
  const s = [...samples].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * s.length));
  return s[rank - 1];
}
export function summarize(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    min: s[0],
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    max: s[s.length - 1],
    mean: Number((sum / s.length).toFixed(2)),
  };
}

// ---------------------------------------------------------------- 测量
async function timeFetch(url) {
  const t0 = performance.now();
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = Number((performance.now() - t0).toFixed(2));
  return { ms, status: res.status, bytes: buf.length, body: buf };
}

async function measure(base, runs) {
  const ladderUrl = `${base}${LADDER_PATH}`;
  const warm = await timeFetch(ladderUrl);
  if (warm.status !== 200) throw new Error(`ladder 预热返回 HTTP ${warm.status}`);
  let ladderTotal = null;
  try {
    const j = JSON.parse(warm.body.toString("utf8"));
    ladderTotal = j?.data?.total ?? j?.data?.pagination?.total ?? null;
  } catch {
    /* 非 JSON 时仅记录字节 */
  }
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const r = await timeFetch(ladderUrl);
    if (r.status !== 200) throw new Error(`ladder 第 ${i + 1} 次返回 HTTP ${r.status}`);
    samples.push(r.ms);
  }
  // /models 首屏 HTML：一次「原始传输字节」（不声明 gzip，即服务端未压缩体）
  const page = await timeFetch(`${base}${MODELS_PAGE}`);
  return {
    ladder: { url: ladderUrl, warmupMs: warm.ms, responseBytes: warm.bytes, total: ladderTotal, samples, stats: summarize(samples) },
    modelsPage: { url: `${base}${MODELS_PAGE}`, status: page.status, htmlBytes: page.bytes, ms: page.ms },
  };
}

// ---------------------------------------------------------------- 报告
export function renderMarkdown(r) {
  const s = r.ladder.stats;
  return [
    "# TASK-039 千级模型天梯量级基线",
    "",
    `- 采集时间：${r.at}`,
    `- 数据：临时库插入 ${r.n} 个 AiModel（+${r.n} Benchmark，前缀 \`${PREFIX}\`），结束已清理：${r.cleaned ? "是" : "否"}`,
    `- 库：${r.dbVerdict}`,
    `- 应用：${r.base}`,
    "",
    "## GET " + LADDER_PATH,
    "",
    `| 样本数 | min | p50 | p95 | max | mean | 预热 | 响应字节 | total |`,
    `|---|---|---|---|---|---|---|---|---|`,
    `| ${s.n} | ${s.min} | **${s.p50}** | **${s.p95}** | ${s.max} | ${s.mean} | ${r.ladder.warmupMs} | ${r.ladder.responseBytes} | ${r.ladder.total ?? "—"} |`,
    "",
    "原始样本（ms）：" + r.ladder.samples.join(", "),
    "",
    "## /models 首屏 HTML",
    "",
    `- HTTP ${r.modelsPage.status}，HTML ${r.modelsPage.htmlBytes} 字节，耗时 ${r.modelsPage.ms} ms`,
    "",
    "> 只测量不优化（REQ-NF-007 基线）；单位 ms，nearest-rank 百分位，node fetch 串行循环。",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------- 自检（dry-run）
function selfTest() {
  const checks = [];
  const ok = (name, cond) => checks.push({ name, pass: Boolean(cond) });
  ok("拒绝：生产风格库名 aidean", !isTempDatabaseUrl("postgresql://u:p@db.prod:5432/aidean").ok);
  ok("拒绝：标识只在密码里", !isTempDatabaseUrl("postgresql://u:test@db:5432/aidean").ok);
  ok("拒绝：库名 contest（非分词）", !isTempDatabaseUrl("postgresql://u:p@db:5432/contest").ok);
  ok("拒绝：缺失", !isTempDatabaseUrl(undefined).ok);
  ok("拒绝：非 PG 协议", !isTempDatabaseUrl("mysql://u:p@db/aidean_ci").ok);
  ok("放行：aidean_ci", isTempDatabaseUrl("postgresql://u:p@localhost:5432/aidean_ci").ok);
  ok("放行：aidean-test", isTempDatabaseUrl("postgresql://u:p@localhost:5432/aidean-test").ok);
  ok("放行：主机 ci-postgres", isTempDatabaseUrl("postgresql://u:p@ci-postgres:5432/aidean").ok);
  const models = buildModels(1000, "vendor-x");
  ok("生成 1000 行", models.length === 1000);
  ok("modelCode 唯一", new Set(models.map((m) => m.modelCode)).size === 1000);
  ok("slug 唯一且带前缀", new Set(models.map((m) => m.slug)).size === 1000 && models.every((m) => m.slug.startsWith(PREFIX)));
  ok("分数落在 40..100", models.every((m) => m.benchmarkScore >= 40 && m.benchmarkScore < 100));
  const bms = buildBenchmarks(models.map((m, i) => ({ ...m, id: `id-${i}` })));
  ok("Benchmark 1:1", bms.length === 1000 && bms.every((b) => /^\d+\.\d{2}$/.test(b.totalScore)));
  const st = summarize([5, 1, 4, 2, 3, 10, 9, 8, 7, 6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  ok("p50(1..20)=10", st.p50 === 10);
  ok("p95(1..20)=19", st.p95 === 19);
  return checks;
}

// ---------------------------------------------------------------- 主流程
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const verdict = isTempDatabaseUrl(process.env.DATABASE_URL);

  if (args.dryRun) {
    console.log("[ladder-1k] DRY-RUN：不连库、不写库、不发请求");
    console.log(`[ladder-1k] 计划：插入 ${args.n} AiModel + ${args.n} Benchmark（厂商 ${VENDOR_CODE}，前缀 ${PREFIX}）`);
    console.log(`[ladder-1k] 计划：GET ${args.base}${LADDER_PATH} 预热 1 + 采样 ${args.runs}；GET ${args.base}${MODELS_PAGE} HTML 字节`);
    console.log(`[ladder-1k] 计划：结束按前缀删除插入数据（Benchmark 级联）`);
    console.log(`[ladder-1k] 当前 DATABASE_URL 安全闸：${verdict.ok ? "放行" : "拒绝"} —— ${verdict.reason}`);
    const checks = selfTest();
    for (const c of checks) console.log(`  ${c.pass ? "PASS" : "FAIL"} ${c.name}`);
    const failed = checks.filter((c) => !c.pass).length;
    console.log(`[ladder-1k] 自检 ${checks.length - failed}/${checks.length} PASS`);
    process.exit(failed ? 1 : 0);
  }

  if (!verdict.ok) {
    console.error(`[ladder-1k] 拒绝运行：${verdict.reason}。本脚本只允许在 ci/test 临时库执行。`);
    process.exit(2);
  }

  const require = createRequire(resolve(REPO, "apps/web/package.json"));
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  let cleaned = false;
  const cleanup = async () => {
    const vendor = await prisma.vendor.findUnique({ where: { code: VENDOR_CODE } });
    const del = await prisma.aiModel.deleteMany({ where: { modelCode: { startsWith: PREFIX } } });
    if (vendor) await prisma.vendor.delete({ where: { id: vendor.id } });
    cleaned = true;
    console.log(`[ladder-1k] 清理：删除 ${del.count} 个 ${PREFIX}* 模型（Benchmark 级联）${vendor ? "，删除厂商 " + VENDOR_CODE : ""}`);
  };

  try {
    // 前次中断残留先清
    await cleanup();
    cleaned = false;
    const vendor = await prisma.vendor.create({ data: { code: VENDOR_CODE, name: "Bench1k Vendor", priority: 99 } });
    const rows = buildModels(args.n, vendor.id);
    const t0 = performance.now();
    await prisma.aiModel.createMany({ data: rows });
    const created = await prisma.aiModel.findMany({
      where: { modelCode: { startsWith: PREFIX } },
      select: { id: true, benchmarkScore: true },
    });
    await prisma.benchmark.createMany({ data: buildBenchmarks(created) });
    console.log(`[ladder-1k] 插入 ${created.length} 模型 + Benchmark，用时 ${(performance.now() - t0).toFixed(0)} ms`);

    const m = await measure(args.base, args.runs);
    const report = { at: new Date().toISOString(), n: args.n, base: args.base, dbVerdict: verdict.reason, ...m };
    await cleanup();
    report.cleaned = cleaned;

    const md = renderMarkdown(report);
    console.log(md);
    console.log(JSON.stringify({ ladder: report.ladder.stats, samples: report.ladder.samples, htmlBytes: report.modelsPage.htmlBytes }));
    if (args.out) {
      mkdirSync(dirname(resolve(args.out)), { recursive: true });
      writeFileSync(resolve(args.out), md);
    }
    if (args.json) {
      mkdirSync(dirname(resolve(args.json)), { recursive: true });
      writeFileSync(resolve(args.json), JSON.stringify(report, null, 2));
    }
  } finally {
    if (!cleaned) {
      try {
        await cleanup();
      } catch (e) {
        console.error(`[ladder-1k] 清理失败，请手动删除 ${PREFIX}* 数据：${e?.message ?? e}`);
      }
    }
    await prisma.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`[ladder-1k] 失败：${e?.stack ?? e}`);
    process.exit(1);
  });
}
