// TASK-007 守卫③：模块边界（规格步骤3）。
// 规则：
//   A) packages/** 不得 import apps/**（共享包不得反向依赖应用层）。
//   B) apps/web/components/** 不得 import @prisma/client 或 lib/db/**（表现层不直连数据访问，
//      DB 访问应下沉到 lib/server 层；组件只消费注入/查询结果）。
// 既存违规（非本任务引入）依 TASK-007「阻塞条件：登记为白名单例外并上报」处理：命中 ALLOWLIST → WARN 不 FAIL；
// 新增（非例外文件）同类越界 → FAIL。
import { trackedFiles, readRepoFile, looksBinary, makeReporter } from "./_lib.mjs";

const rep = makeReporter("module-boundary");
rep.title("module-boundary（模块边界）");

// 既存违规白名单（grandfathered）：{ file, rule } 精确匹配。rule ∈ {"apps","db","prisma"}。
// 说明：apps/web/components/home/ProductSection.tsx 为 Server Component，直读 prisma 消灭「静态底稿 vs DB」双源，
// 属数据访问下线的历史过渡实现（非本任务引入）。登记为例外并上报，后续应在独立任务把取数下沉到 lib 层后移除本例外。
const ALLOWLIST = [
  { file: "apps/web/components/home/ProductSection.tsx", rule: "db", note: "既存 Server Component 直读 DB（过渡实现），登记例外并上报" },
];
const isGrandfathered = (file, rule) => ALLOWLIST.some((a) => a.file === file && a.rule === rule);

// 抽取一个源文件里的全部 import 说明符（静态 from / require / 动态 import()）。
const SPEC_RE = [
  /(?:^|[\s;)])(?:import|export)\s+(?:[^;'"()]*?\sfrom\s)?["']([^"']+)["']/g,
  /(?:^|[\s;)])(?:import|export)[\s\n]*["']([^"']+)["']/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
];
function specifiers(content) {
  const set = new Set();
  for (const re of SPEC_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) set.add(m[1]);
  }
  return [...set];
}

const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// —— A) packages/** ↛ apps/** ——
let aViolations = 0;
let aScanned = 0;
for (const f of trackedFiles()) {
  if (!f.startsWith("packages/")) continue;
  if (!SCANNABLE_EXT.test(f)) continue;
  let c;
  try { c = readRepoFile(f); } catch { continue; }
  if (c == null || looksBinary(c)) continue;
  aScanned++;
  for (const s of specifiers(c)) {
    // 命中：说明符把 apps/ 作为路径段（含相对回溯 ../../apps/…）或引用 @aidean/web 包。
    if (/(^|[\\/])apps[\\/]/.test(s) || s.startsWith("@aidean/web")) {
      aViolations++;
      if (isGrandfathered(f, "apps")) rep.warn(`例外(packages→apps) @ ${f} → "${s}"`);
      else rep.fail(`越界 packages→apps：${f} 引用 "${s}"`);
    }
  }
}
rep.pass(`A) packages/** 扫描 ${aScanned} 个源文件，反向依赖 apps/** 违规 ${aViolations} 处。`);

// —— B) apps/web/components/** ↛ @prisma/client · lib/db ——
let bNew = 0;
let bGrand = 0;
let bScanned = 0;
for (const f of trackedFiles()) {
  if (!f.startsWith("apps/web/components/")) continue;
  if (!SCANNABLE_EXT.test(f)) continue;
  let c;
  try { c = readRepoFile(f); } catch { continue; }
  if (c == null || looksBinary(c)) continue;
  bScanned++;
  for (const s of specifiers(c)) {
    let rule = null;
    if (s === "@prisma/client" || s.startsWith("@prisma/client/")) rule = "prisma";
    else if (/(^|[\\/.])lib\/db([\\/.]|$)/.test(s) || s.endsWith("/db/prisma") || s.includes("lib/db/")) rule = "db";
    if (!rule) continue;
    if (isGrandfathered(f, rule)) {
      bGrand++;
      const a = ALLOWLIST.find((x) => x.file === f && x.rule === rule);
      rep.warn(`例外(components→${rule}) @ ${f} 引用 "${s}"：${a.note}`);
    } else {
      bNew++;
      rep.fail(`越界 components→${rule}：${f} 引用 "${s}"`);
    }
  }
}
rep.pass(`B) apps/web/components/** 扫描 ${bScanned} 个组件文件：新增越界 ${bNew} 处，既存例外 ${bGrand} 处。`);

if (aViolations === 0 && bNew === 0) {
  rep.pass(`模块边界成立：无新增越界${bGrand > 0 ? `（另有 ${bGrand} 处既存例外已上报）` : ""}。`);
}

rep.finish();
