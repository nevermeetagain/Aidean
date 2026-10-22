// B11-11 守卫：API 路由查询参数的整数解析必须走共享件 apps/web/lib/http/pagination.ts（DEF-011-15 / Q-11-05=A）。
//
// 规则（apps/web/app/api 下每个 route.ts）：
//   P1) 出现裸 `parseInt(`（含 Number.parseInt）→ 违规。非数字串经 parseInt 得 NaN，`Math.max/min` 不接管 NaN，
//       直送 Prisma skip/take → HTTP 500。应改用 parsePagination / parseLimit / parseOptionalInt；
//   P2) 出现 `Number(…searchParams…)` 直接转换查询参数 → 违规（同样可能得 NaN），除非已人工复核并登记。
//
// 棘轮（ratchet）模式：
//   - ALLOWLIST 里的既存文件（B11-11 待接入的 15 个端点 + 2 处已复核安全写法）命中 → WARN，不阻断 CI；
//   - 名单外的文件命中 → FAIL（新增代码不得再引入裸 parseInt）；
//   - 名单内文件已经干净 → WARN「请从 ALLOWLIST 移除」，提示收紧棘轮；
//   - `--strict`：名单内命中也算 FAIL（全部接入完成后，CI 可切换为 strict 并清空名单）。
//
// 用法：node scripts/guard/pagination-guard.mjs [--strict] [--json]
// 零新依赖：仅 node 内置 fs/path/url。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT, makeReporter } from "./_lib.mjs";

const API_DIR = path.join(ROOT, "apps", "web", "app", "api");

/**
 * 既存待接入名单（B11-11；接入一个删一行）。路径相对仓库根、posix 分隔。
 * 2026-10-22：15/15 已全部接入 `lib/http/pagination.ts`，名单清空。
 * 例外清单为空 → 任一 route.ts 再出现裸 `parseInt` / `Number(searchParams…)` 均直接 FAIL（ratchet 亦阻断）。
 */
export const ALLOWLIST_P1 = [];

/** P2 已人工复核的安全写法（2026-10-22 复核：均有显式兜底，不会把 NaN 送入下游） */
export const ALLOWLIST_P2 = [
  // Number(count) 后紧跟 Number.isInteger + 区间校验 → 40000
  "apps/web/app/api/v1/partner/codes/route.ts",
  // 测试用 mock 上游：Number(...) || 0 兜底
  "apps/web/app/api/v1/mock-upstream/[...path]/route.ts",
];

const P1_RE = /\bparseInt\s*\(/;
const P2_RE = /\bNumber\s*\(\s*[\w.]*searchParams\b/;

/** 去掉注释，避免文档注释里的示例被误判 */
export function stripComments(src) {
  // 块注释替换为等量换行，保持行号不变
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, "")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** 对一个文件内容给出违规行（1-based 行号） */
export function scanContent(src) {
  const lines = stripComments(src).split("\n");
  const p1 = [];
  const p2 = [];
  lines.forEach((l, i) => {
    if (P1_RE.test(l)) p1.push({ line: i + 1, text: l.trim() });
    if (P2_RE.test(l)) p2.push({ line: i + 1, text: l.trim() });
  });
  return { p1, p2 };
}

function walkRoutes(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkRoutes(full, acc);
    else if (name === "route.ts") acc.push(full);
  }
  return acc;
}

function main() {
  const strict = process.argv.includes("--strict");
  const asJson = process.argv.includes("--json");
  const rep = makeReporter("pagination-guard");
  rep.title(`pagination-guard（查询参数整数解析须走 lib/http/pagination.ts${strict ? "，strict" : "，ratchet"}）`);

  const routes = walkRoutes(API_DIR);
  const report = { scanned: routes.length, p1: [], p2: [], staleAllowlist: [] };

  for (const f of routes) {
    const r = path.relative(ROOT, f).split(path.sep).join("/");
    const { p1, p2 } = scanContent(fs.readFileSync(f, "utf8"));
    if (p1.length) {
      report.p1.push({ file: r, lines: p1.map((x) => x.line), allowlisted: ALLOWLIST_P1.includes(r) });
      const msg = `${r}：裸 parseInt ×${p1.length}（行 ${p1.map((x) => x.line).join(",")}）→ 改用 parsePagination/parseLimit/parseOptionalInt`;
      if (ALLOWLIST_P1.includes(r) && !strict) rep.warn(`[待接入] ${msg}`);
      else rep.fail(msg);
    } else if (ALLOWLIST_P1.includes(r)) {
      report.staleAllowlist.push(r);
      rep.warn(`[名单过期] ${r} 已无裸 parseInt，请从 ALLOWLIST_P1 移除（收紧棘轮）`);
    }
    if (p2.length) {
      report.p2.push({ file: r, lines: p2.map((x) => x.line), allowlisted: ALLOWLIST_P2.includes(r) });
      const msg = `${r}：Number(searchParams…) ×${p2.length}（行 ${p2.map((x) => x.line).join(",")}）可能得 NaN`;
      if (ALLOWLIST_P2.includes(r)) rep.pass(`[已复核] ${msg}`);
      else rep.fail(msg);
    }
  }
  for (const a of [...ALLOWLIST_P1, ...ALLOWLIST_P2]) {
    if (!fs.existsSync(path.join(ROOT, ...a.split("/")))) {
      report.staleAllowlist.push(a);
      rep.warn(`[名单过期] ${a} 文件不存在`);
    }
  }
  const pending = report.p1.filter((x) => x.allowlisted).length;
  rep.pass(`扫描 route.ts=${routes.length}；P1 命中文件=${report.p1.length}（待接入名单内 ${pending}）；P2 命中文件=${report.p2.length}`);
  if (asJson) console.log(JSON.stringify(report));
  rep.finish();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
