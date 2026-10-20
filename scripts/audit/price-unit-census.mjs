#!/usr/bin/env node
/**
 * TASK-049 — 存量价格行口径盘点（只读）
 *
 * 用法：DATABASE_URL=postgresql://... node scripts/audit/price-unit-census.mjs [--samples N]
 *
 * 对 model_prices 中 is_current=true 的行，按 billing_currency × billing_unit × source_type
 * 三维分组计数，并给出每组 N 条（默认 5）样例与价格量级（min/max/avg），输出 markdown 到 stdout。
 * 供 U-15 / TASK-048（生效价币种与计价单位归一）判断存量数据口径。
 *
 * 约束：
 *  - 只读：仅使用 groupBy / count / findMany 读查询，不含任何写语句；
 *  - 退出码恒为 0：无 DATABASE_URL 时打印用法；连接或查询失败时打印错误说明；
 *  - @prisma/client 从 apps/web 的依赖解析（pnpm 不把它提升到仓库根）。
 */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')

const argIdx = process.argv.indexOf('--samples')
const SAMPLES = argIdx > -1 ? Math.max(1, Number(process.argv[argIdx + 1]) || 5) : 5

function out(line = '') {
  process.stdout.write(line + '\n')
}

function usage(reason) {
  out('# 价格行口径盘点（TASK-049）')
  out()
  out(`> 未运行：${reason}`)
  out()
  out('用法：`DATABASE_URL=postgresql://user:pass@host:5432/db node scripts/audit/price-unit-census.mjs [--samples 5]`')
  out()
  out('前置：库已 `prisma migrate deploy` 且已 `pnpm db:seed`（或为实际业务库，只读）。')
}

function fmt(v) {
  if (v === null || v === undefined) return '—'
  const s = typeof v === 'object' && typeof v.toString === 'function' ? v.toString() : String(v)
  return s
}

function cell(v) {
  return fmt(v).replace(/\|/g, '\\|')
}

async function loadPrisma() {
  const candidates = [
    resolve(repoRoot, 'apps/web/node_modules/@prisma/client/index.js'),
    resolve(repoRoot, 'node_modules/@prisma/client/index.js'),
  ]
  const hit = candidates.find((p) => existsSync(p))
  if (!hit) throw new Error('找不到 @prisma/client（请先在仓库根执行 pnpm install）')
  const mod = await import(pathToFileURL(hit).href)
  const PrismaClient = mod.PrismaClient ?? mod.default?.PrismaClient
  if (!PrismaClient) throw new Error('@prisma/client 未导出 PrismaClient（请执行 pnpm --filter web db:generate）')
  return new PrismaClient({ log: ['error'] })
}

async function main() {
  if (!process.env.DATABASE_URL) {
    usage('未设置 DATABASE_URL')
    return
  }

  let prisma
  try {
    prisma = await loadPrisma()
  } catch (err) {
    usage(String(err?.message ?? err))
    return
  }

  try {
    const where = { isCurrent: true }
    const total = await prisma.modelPrice.count({ where })
    const allRows = await prisma.modelPrice.count()

    const groups = await prisma.modelPrice.groupBy({
      by: ['billingCurrency', 'billingUnit', 'sourceType'],
      where,
      _count: { _all: true },
      _min: { priceInput: true, priceOutput: true },
      _max: { priceInput: true, priceOutput: true },
      _avg: { priceInput: true, priceOutput: true },
      orderBy: [{ billingCurrency: 'asc' }, { billingUnit: 'asc' }, { sourceType: 'asc' }],
    })

    const byCurrency = await prisma.modelPrice.groupBy({
      by: ['billingCurrency'],
      where,
      _count: { _all: true },
      orderBy: { billingCurrency: 'asc' },
    })

    const byMode = await prisma.modelPrice.groupBy({
      by: ['billingMode', 'billingUnit'],
      where,
      _count: { _all: true },
      orderBy: [{ billingMode: 'asc' }, { billingUnit: 'asc' }],
    })

    const groupSum = groups.reduce((s, g) => s + g._count._all, 0)

    out('# 价格行口径盘点（TASK-049）')
    out()
    out(`- 生成时间：${new Date().toISOString()}`)
    out(`- 范围：model_prices WHERE is_current = true`)
    out(`- is_current 行总数：${total}（全表 ${allRows} 行）`)
    out(`- 分组合计：${groupSum}（${groupSum === total ? '= 总数 ✓' : '≠ 总数 ✗'}）`)
    out()

    out('## 1. 三维分组计数（billingCurrency × billingUnit × sourceType）')
    out()
    out('| billingCurrency | billingUnit | sourceType | 行数 | priceInput min / avg / max | priceOutput min / avg / max |')
    out('|---|---|---|---:|---|---|')
    for (const g of groups) {
      const pin = `${fmt(g._min.priceInput)} / ${g._avg.priceInput == null ? '—' : Number(g._avg.priceInput).toFixed(4)} / ${fmt(g._max.priceInput)}`
      const pout = `${fmt(g._min.priceOutput)} / ${g._avg.priceOutput == null ? '—' : Number(g._avg.priceOutput).toFixed(4)} / ${fmt(g._max.priceOutput)}`
      out(`| ${cell(g.billingCurrency)} | ${cell(g.billingUnit)} | ${cell(g.sourceType)} | ${g._count._all} | ${pin} | ${pout} |`)
    }
    if (groups.length === 0) out('| — | — | — | 0 | — | — |')
    out(`| **合计** | | | **${groupSum}** | | |`)
    out()

    out('## 2. 按币种汇总')
    out()
    out('| billingCurrency | 行数 |')
    out('|---|---:|')
    for (const g of byCurrency) out(`| ${cell(g.billingCurrency)} | ${g._count._all} |`)
    out()

    out('## 3. 按计费模式 × 计价单位')
    out()
    out('| billingMode | billingUnit | 行数 |')
    out('|---|---|---:|')
    for (const g of byMode) out(`| ${cell(g.billingMode)} | ${cell(g.billingUnit)} | ${g._count._all} |`)
    out()

    out(`## 4. 每组样例（每组最多 ${SAMPLES} 条，按 model slug 排序）`)
    out()
    for (const g of groups) {
      const rows = await prisma.modelPrice.findMany({
        where: { ...where, billingCurrency: g.billingCurrency, billingUnit: g.billingUnit, sourceType: g.sourceType },
        select: {
          id: true,
          priceInput: true,
          priceOutput: true,
          priceCache: true,
          pricePerRequest: true,
          billingMode: true,
          sourceName: true,
          effectiveFrom: true,
          model: { select: { slug: true, nameDisplay: true } },
        },
        orderBy: { model: { slug: 'asc' } },
        take: SAMPLES,
      })
      out(`### ${cell(g.billingCurrency)} · ${cell(g.billingUnit)} · ${cell(g.sourceType)}（${g._count._all} 行）`)
      out()
      out('| model slug | 名称 | priceInput | priceOutput | priceCache | pricePerRequest | billingMode | sourceName |')
      out('|---|---|---:|---:|---:|---:|---|---|')
      for (const r of rows) {
        out(
          `| ${cell(r.model?.slug)} | ${cell(r.model?.nameDisplay)} | ${cell(r.priceInput)} | ${cell(r.priceOutput)} | ${cell(r.priceCache)} | ${cell(r.pricePerRequest)} | ${cell(r.billingMode)} | ${cell(r.sourceName)} |`,
        )
      }
      out()
    }
  } catch (err) {
    out()
    out(`> 查询失败（脚本仍以 0 退出）：${String(err?.message ?? err).split('\n').map((l) => l.trim()).filter(Boolean).pop()}`)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main()
  .catch((err) => {
    out(`> 意外错误（脚本仍以 0 退出）：${String(err?.message ?? err)}`)
  })
  .finally(() => {
    process.exitCode = 0
  })
