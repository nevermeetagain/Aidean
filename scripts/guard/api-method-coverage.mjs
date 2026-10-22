// B11-10 守卫：API 非 2xx 出口信封化的回归锁（DEF-011-13 / Q-11-03=B）。
//
// 规则（apps/web/app/api 下每个 route.ts）：
//   A) 普通路由必须在文件内以
//        export const { …未实现方法… } = methodNotAllowed([…已实现方法…]);
//      覆盖全部未实现的 HTTP 方法，使其返回 405 信封 + Allow 头，而非 Next 的 0 字节空体；
//      - 解构的键集合 == HTTP 全集 − 已实现 −（有 GET 时的 HEAD，Next 由 GET 自动派生）；
//      - methodNotAllowed 的实参 == 文件内真实导出的方法（Allow 头才准确）；
//   B) API 兜底路由 app/api/[[...slug]]/route.ts 必须存在，且以 routeNotFound() 导出全部 7 个方法；
//   C) 不支持的导出形态（`export { x as GET }` / `export * from`）直接 FAIL，避免静态分析被绕过。
//
// 用法：
//   node scripts/guard/api-method-coverage.mjs          # 校验（CI；任一违规 exit 1）
//   node scripts/guard/api-method-coverage.mjs --fix    # 生成/更新各 route.ts 末尾的存根块（幂等）
// 零新依赖：仅 node 内置 fs/path。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT, makeReporter } from "./_lib.mjs";

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const API_DIR = path.join(ROOT, "apps", "web", "app", "api");
const LIB_FILE = path.join(API_DIR, "v1", "_lib", "method-not-allowed.ts");
const CATCH_ALL = path.join(API_DIR, "[[...slug]]", "route.ts");
const MARKER = "// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）";

const REAL_EXPORT_RE = /^export\s+(?:async\s+)?(?:const|let|var|function)\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/gm;
const STUB_RE = /export\s+const\s*\{([^}]*)\}\s*=\s*methodNotAllowed\(\s*\[([^\]]*)\]\s*\)\s*;?/m;
const UNSUPPORTED_RE = /^export\s*(?:\{[^}]*\b(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b[^}]*\}|\*)/m;

const splitNames = (s) =>
  s
    .split(",")
    .map((x) => x.replace(/["'\s]/g, ""))
    .filter(Boolean);

/** 解析一个 route.ts：真实实现的方法 + 存根块（若有） */
export function analyzeRoute(content) {
  const implemented = new Set();
  for (const m of content.matchAll(REAL_EXPORT_RE)) implemented.add(m[1]);
  const stubMatch = content.match(STUB_RE);
  const stub = stubMatch
    ? { names: splitNames(stubMatch[1]), arg: splitNames(stubMatch[2]), text: stubMatch[0] }
    : null;
  return { implemented: HTTP_METHODS.filter((m) => implemented.has(m)), stub, unsupported: UNSUPPORTED_RE.test(content) };
}

/** 期望由存根导出的方法（按 HTTP_METHODS 顺序） */
export function expectedStubNames(implemented) {
  const set = new Set(implemented);
  return HTTP_METHODS.filter((m) => !set.has(m) && !(m === "HEAD" && set.has("GET")));
}

function walkRoutes(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkRoutes(full, acc);
    else if (name === "route.ts") acc.push(full);
  }
  return acc;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

function importPathFor(file) {
  let r = path.relative(path.dirname(file), LIB_FILE).split(path.sep).join("/").replace(/\.ts$/, "");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

function renderBlock(file, implemented) {
  const names = expectedStubNames(implemented);
  const arg = implemented.map((m) => `"${m}"`).join(", ");
  return [
    `${MARKER}。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。`,
    `import { methodNotAllowed } from "${importPathFor(file)}";`,
    `export const { ${names.join(", ")} } = methodNotAllowed([${arg}]);`,
  ].join("\n");
}

function fixFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const { implemented, stub, unsupported } = analyzeRoute(content);
  if (unsupported || implemented.length === 0) return false;
  const block = renderBlock(file, implemented);
  let next;
  if (stub) {
    // 连同 marker 与 import 行整体替换
    const start = content.indexOf(MARKER);
    const end = content.indexOf(stub.text) + stub.text.length;
    next = start >= 0 && start < end ? content.slice(0, start) + block + content.slice(end) : content.replace(stub.text, block.split("\n").pop());
  } else {
    next = content.replace(/\s*$/, "") + "\n\n" + block + "\n";
  }
  if (next !== content) {
    fs.writeFileSync(file, next);
    return true;
  }
  return false;
}

function main() {
  const fix = process.argv.includes("--fix");
  const routes = walkRoutes(API_DIR).filter((f) => f !== CATCH_ALL);

  if (fix) {
    let changed = 0;
    for (const f of routes) if (fixFile(f)) changed++;
    console.log(`[api-method-coverage --fix] scanned=${routes.length} changed=${changed}`);
  }

  const rep = makeReporter("api-method-coverage");
  rep.title("api-method-coverage（未实现方法 405 信封 + API 兜底 404）");

  if (!fs.existsSync(LIB_FILE)) rep.fail(`缺少共享件 ${rel(LIB_FILE)}`);

  let ok = 0;
  for (const f of routes) {
    const content = fs.readFileSync(f, "utf8");
    const { implemented, stub, unsupported } = analyzeRoute(content);
    const r = rel(f);
    if (unsupported) {
      rep.fail(`${r}：使用了不支持静态分析的导出形态（export { … as METHOD } / export *），请改为 export const METHOD = …`);
      continue;
    }
    if (implemented.length === 0) {
      rep.fail(`${r}：未检出任何 HTTP 方法导出`);
      continue;
    }
    if (!stub) {
      rep.fail(`${r}：缺少 methodNotAllowed 存根（未实现方法会返回 Next 0 字节 405）。运行 --fix 生成`);
      continue;
    }
    const want = expectedStubNames(implemented);
    const sameNames = want.length === stub.names.length && want.every((m) => stub.names.includes(m));
    const sameArg = implemented.length === stub.arg.length && implemented.every((m) => stub.arg.includes(m));
    if (!sameNames) rep.fail(`${r}：存根导出 {${stub.names.join(",")}} ≠ 期望 {${want.join(",")}}`);
    if (!sameArg) rep.fail(`${r}：methodNotAllowed([${stub.arg.join(",")}]) ≠ 真实导出 [${implemented.join(",")}]（Allow 头会失真）`);
    if (sameNames && sameArg) ok++;
  }
  rep.pass(`route.ts 覆盖 ${ok}/${routes.length}`);

  if (!fs.existsSync(CATCH_ALL)) {
    rep.fail(`缺少 API 兜底路由 ${rel(CATCH_ALL)}（未知 /api/* 会回落 HTML 404）`);
  } else {
    const c = fs.readFileSync(CATCH_ALL, "utf8");
    const m = c.match(/export\s+const\s*\{([^}]*)\}\s*=\s*routeNotFound\(\s*\)/);
    const names = m ? splitNames(m[1]) : [];
    const missing = HTTP_METHODS.filter((x) => !names.includes(x));
    if (!m || missing.length) rep.fail(`${rel(CATCH_ALL)}：routeNotFound() 未覆盖 ${missing.join(",") || "全部方法"}`);
    else rep.pass(`API 兜底路由覆盖 7/7 方法`);
  }
  rep.finish();
}

// 作为模块被单测 import 时不执行 main
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
