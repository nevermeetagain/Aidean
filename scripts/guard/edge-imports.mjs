// T120-02 守卫：Edge middleware 导入图纯净性。
// 规则：从 apps/web/middleware.ts 出发，沿**相对**说明符（静态 from / export-from / 动态 import() / require()）
//   遍历 apps/web 内的导入闭包；任一文件引用 node-only 模块（@prisma/*、prisma、ioredis、redis、node:*），
//   或解析到 apps/web/lib/db/prisma.ts（prisma 客户端单例），即判 FAIL 并回溯引入链路。
// 目的：根除「middleware → auth/constants → 动态 import ../../db/prisma」把 Prisma 客户端（含 WASM
//   查询引擎 / setImmediate）打进 Edge middleware 产物的问题（T120-02 / ADR-0012）。
// 零新依赖：node 内置 fs/path/url + _lib.mjs（仓库根、统一 PASS/FAIL/SUMMARY 退出码）。
// 注：与 module-boundary 同口径按**原文**扫描（含注释），故 middleware 图内文件的文档注释
//   切勿内联带引号的说明符字面量（如 import("...")/export ... from "..."），否则会误命中。
// 用法：node scripts/guard/edge-imports.mjs [--entry <apps/web 下 posix 相对路径>]
import fs from "node:fs";
import path from "node:path";
import { ROOT, makeReporter } from "./_lib.mjs";

const rep = makeReporter("edge-imports");
rep.title("edge-imports（middleware Edge 闭包不得含 prisma/ioredis/node:）");

// —— 入口（默认 middleware.ts，可 --entry 覆盖以便变异检验） ——
const argv = process.argv.slice(2);
function argVal(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
}
const entryRel = argVal("--entry") || "apps/web/middleware.ts";
const ENTRY = path.join(ROOT, ...entryRel.split("/"));
if (!fs.existsSync(ENTRY)) {
  rep.fail(`入口不存在：${entryRel}`);
  rep.finish();
}

// —— node-only 模块判定：命中即污染 Edge 闭包 ——
const NODE_ONLY_PREFIXES = ["@prisma", "prisma", "ioredis", "redis", "node:"];
function nodeOnlyHit(spec) {
  for (const p of NODE_ONLY_PREFIXES) {
    if (spec === p || spec.startsWith(p + "/") || (p === "node:" && spec.startsWith("node:"))) return p;
  }
  return null;
}
// 解析到本仓库 prisma 客户端单例文件（即便其内部懒加载方式变化也能拦截）
const PRISMA_SINGLETON_POSIX = "apps/web/lib/db/prisma.ts";

// —— 抽取一个源文件里的全部 import 说明符（与 module-boundary 同款正则）——
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

// 相对说明符 → apps/web 下的真实源文件（探测扩展名与 index）；无法解析（样式/资源/越界）→ null。
const RESOLVE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const APPS_WEB = path.join(ROOT, "apps", "web");
function resolveLocal(fromAbs, spec) {
  const base = path.resolve(path.dirname(fromAbs), spec);
  const cands = [];
  for (const e of RESOLVE_EXT) cands.push(base + e);
  for (const e of RESOLVE_EXT) cands.push(path.join(base, "index" + e));
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
const posix = (abs) => path.relative(ROOT, abs).replace(/\\/g, "/");
const inAppsWeb = (abs) => path.resolve(abs).startsWith(APPS_WEB + path.sep);

// —— BFS：从入口遍历相对导入图，记录首达路径父链 ——
const parent = new Map(); // abs file → abs file (首次发现它的前驱)
const visited = new Set();
const offenders = []; // { fileRel, spec, hit, chain: [rel...] }
const queue = [ENTRY];
visited.add(ENTRY);
parent.set(ENTRY, null);
let scanned = 0;

function chainOf(abs) {
  const outArr = [];
  let cur = abs;
  while (cur) {
    outArr.unshift(posix(cur));
    cur = parent.get(cur) ?? null;
  }
  return outArr;
}

while (queue.length > 0) {
  const file = queue.shift();
  scanned++;
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\u0000")) continue; // 二进制跳过
  for (const spec of specifiers(content)) {
    const hit = nodeOnlyHit(spec);
    if (hit) {
      offenders.push({ fileRel: posix(file), spec, hit, chain: chainOf(file) });
      continue; // node-only 命中即记录，无需（也无法）解析其本地路径
    }
    if (!spec.startsWith(".")) continue; // 裸包（jose/next/@aidean/shared 等）：不进 node_modules 递归
    const resolved = resolveLocal(file, spec);
    if (!resolved || !inAppsWeb(resolved)) continue;
    if (posix(resolved) === PRISMA_SINGLETON_POSIX) {
      offenders.push({ fileRel: posix(file), spec, hit: "lib/db/prisma(单例)", chain: [...chainOf(file), posix(resolved)] });
      continue;
    }
    if (!visited.has(resolved)) {
      visited.add(resolved);
      parent.set(resolved, file);
      queue.push(resolved);
    }
  }
}

// —— 结果 ——
if (offenders.length === 0) {
  rep.pass(`middleware Edge 闭包纯净：扫描 ${scanned} 个 apps/web 源文件，未发现 prisma/ioredis/node: 引用。`);
} else {
  for (const o of offenders) {
    rep.fail(`Edge 污染：${o.fileRel} 引用 "${o.spec}"（node-only: ${o.hit}）\n         链路：${o.chain.join(" → ")}`);
  }
}

rep.finish();
