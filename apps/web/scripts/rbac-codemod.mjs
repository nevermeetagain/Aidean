// S3.4 RBAC 逐路由权限码 codemod（restructure-admin-nav-rbac-cms · A2）。
// 作用：将 app/api/v1/admin 下所有 route.ts 内的 `requireAdminApi()` 空参调用，
//       按「所在 handler 的 HTTP 方法」注入权限码：GET→admin.<域>.read；POST/PUT/PATCH/DELETE→admin.<域>.write。
// 域来源：路径中 admin 之后的首段目录，经 DIR_TO_DOMAIN 归一（redemption-codes→redemptions；ladder/ranking-weights→configs）。
// 安全：默认 dry-run 仅打印计划；--apply 才写盘。逐点校验：调用点须能定位所属方法、域须在注册表内。
// 运行：node scripts/rbac-codemod.mjs [--apply]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, posix } from "node:path";

const APPLY = process.argv.includes("--apply");
const ADMIN_ROOT = join(process.cwd(), "app", "api", "v1", "admin");

// 目录首段 → 权限域（必须命中 packages/shared/src/permissions.ts 的 ADMIN_DOMAINS）。
const DIR_TO_DOMAIN = {
  announcements: "announcements",
  "api-stations": "api-stations",
  "audit-logs": "audit-logs",
  benchmarks: "benchmarks",
  capabilities: "capabilities",
  configs: "configs",
  discovery: "discovery",
  evaluations: "evaluations",
  "free-quotas": "free-quotas",
  intelligence: "intelligence",
  ladder: "configs", // 特殊：读写 system_configs（天梯呈现参数）
  menus: "menus",
  models: "models",
  news: "news",
  orders: "orders",
  packages: "packages",
  "partner-keys": "partner-keys",
  products: "products",
  protocols: "protocols",
  providers: "providers",
  "ranking-weights": "configs", // 特殊：排名维度权重配置
  "redemption-codes": "redemptions", // 特殊：目录名 ≠ 域名
  scripts: "scripts",
  sync: "sync",
  "tier-mappings": "tier-mappings",
  users: "users",
  vendors: "vendors",
  wallets: "wallets",
};

const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 递归收集 route.ts。 */
function collectRoutes(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectRoutes(p));
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function domainFor(absPath) {
  const rel = relative(ADMIN_ROOT, absPath).split(sep).join(posix.sep);
  const first = rel.split(posix.sep)[0];
  return { first, domain: DIR_TO_DOMAIN[first] ?? null };
}

/** 找出所有 `export const METHOD` / `export async function METHOD` 的位置与方法名。 */
function methodAnchors(content) {
  const anchors = [];
  const re = /export\s+(?:const\s+|async\s+function\s+|function\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  let m;
  while ((m = re.exec(content)) !== null) anchors.push({ index: m.index, method: m[1] });
  return anchors;
}

function methodFor(anchorAt, anchors) {
  let found = null;
  for (const a of anchors) {
    if (a.index <= anchorAt) found = a.method;
    else break;
  }
  return found;
}

const report = { files: 0, calls: 0, gaps: [], unknownDomain: [], noMethod: [], skippedAlreadyTagged: 0 };

for (const abs of collectRoutes(ADMIN_ROOT)) {
  report.files++;
  const original = readFileSync(abs, "utf8");
  const { first, domain } = domainFor(abs);
  if (!domain) {
    report.unknownDomain.push({ file: relative(process.cwd(), abs), first });
    continue;
  }
  const anchors = methodAnchors(original);

  // 收集调用点：requireAdminApi()（严格空参，避免匹配已带参或类型引用）。
  const callRe = /requireAdminApi\(\)/g;
  const edits = [];
  let cm;
  while ((cm = callRe.exec(original)) !== null) {
    const at = cm.index;
    const method = methodFor(at, anchors);
    if (!method) {
      report.noMethod.push({ file: relative(process.cwd(), abs), at });
      continue;
    }
    const action = READ_METHODS.has(method) ? "read" : WRITE_METHODS.has(method) ? "write" : null;
    if (!action) {
      report.noMethod.push({ file: relative(process.cwd(), abs), at, method });
      continue;
    }
    const code = `admin.${domain}.${action}`;
    edits.push({ index: at, original: "requireAdminApi()", replacement: `requireAdminApi("${code}")`, method, code });
  }

  if (edits.length === 0) {
    report.gaps.push({ file: relative(process.cwd(), abs), domain });
    continue;
  }

  // 从后往前替换，保索引有效。
  let next = original;
  for (const e of edits.sort((a, b) => b.index - a.index)) {
    next = next.slice(0, e.index) + e.replacement + next.slice(e.index + e.original.length);
  }
  report.calls += edits.length;

  const rel = relative(process.cwd(), abs).split(sep).join(posix.sep);
  console.log(`[${domain}] ${rel} → ${edits.map((e) => `${e.method}:${e.code}`).join(", ")}`);

  if (APPLY) writeFileSync(abs, next, "utf8");
}

console.log("\n==== 汇总 ====");
console.log(`文件=${report.files} 注入调用=${report.calls} APPLY=${APPLY}`);
console.log(`无 requireAdminApi 调用的文件（需人工确认是否应守卫）: ${report.gaps.length}`);
for (const g of report.gaps) console.log(`  GAP: ${g.file} (预期域 ${g.domain})`);
console.log(`未知域目录: ${report.unknownDomain.length}`);
for (const u of report.unknownDomain) console.log(`  UNKNOWN: ${u.file} (段 '${u.first}')`);
console.log(`无法定位方法/非标准方法的调用点: ${report.noMethod.length}`);
for (const n of report.noMethod) console.log(`  NO-METHOD: ${n.file} @${n.at}${n.method ? " method=" + n.method : ""}`);
