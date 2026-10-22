#!/usr/bin/env node
/**
 * RK-11-07 · 把可调度脚本预编译为生产镜像可直接 `node` 执行的 ESM 单文件。
 *
 * 背景：生产镜像 runner 阶段只含 Next standalone 产物，既无 `scripts/*.ts` 源，也无 tsx，
 * 故 `script-executor` 在容器内对任何已登记脚本都只能 status=2。本脚本在 builder 阶段把
 * 白名单内脚本（与 `lib/features/admin/script-validation.ts` 的 SCRIPT_PATH_ALLOWLIST 同构：
 * `scripts/<crawl|ranking>/<file>.ts`）连同其 `apps/web/lib/**` 依赖打成单文件：
 *
 *   scripts/crawl/fx_daily.ts  →  apps/web/scripts-dist/crawl/fx_daily.mjs
 *
 * 口径：
 * - 输出放在 `apps/web/` 下，使运行期 `@prisma/client` 经 `apps/web/node_modules` 解析
 *   （standalone 已为 web 追踪出 @prisma/client 与查询引擎；外置它而非打进 bundle，保证引擎与 web 同一份）。
 * - 仅 `@prisma/client` 外置；Node 内建模块天然外置；其余全部内联，运行期不依赖 tsx / tsconfig paths。
 * - esbuild 取自 tsx 的依赖（仓库已锁定的同一份），不新增顶层依赖、不动 lockfile。
 * - 同时写出 manifest.json（源路径 → 产物路径 + sha256），供冒烟与审计核对。
 *
 * 用法：node scripts/build/bundle-scripts.mjs [--check]
 *   --check  只校验产物与源一一对应（每个白名单源都有产物），不重新构建；缺失则 exit 1。
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB = join(ROOT, "apps", "web");
const OUT = join(WEB, "scripts-dist");
const SCRIPT_DIRS = ["crawl", "ranking"];
const ALLOW = /^scripts\/(?:crawl|ranking)\/[\w.-]+\.ts$/; // 与 SCRIPT_PATH_ALLOWLIST 同构

export function listEntries(root = ROOT) {
  const out = [];
  for (const d of SCRIPT_DIRS) {
    const dir = join(root, "scripts", d);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith(".ts") || f.name.endsWith(".d.ts")) continue;
      const rel = `scripts/${d}/${f.name}`;
      if (ALLOW.test(rel)) out.push(rel);
    }
  }
  return out.sort();
}

/** 源相对路径 → 产物相对路径（相对仓库根），与 script-executor.compiledCandidates 同一口径 */
export function distRelOf(srcRel) {
  return srcRel.replace(/^scripts\//, "apps/web/scripts-dist/").replace(/\.ts$/, ".mjs");
}

function loadEsbuild() {
  const req = createRequire(import.meta.url);
  const tsxPkg = req.resolve("tsx/package.json", { paths: [WEB, ROOT] });
  return req(req.resolve("esbuild", { paths: [dirname(tsxPkg)] }));
}

async function build() {
  const entries = listEntries();
  if (entries.length === 0) throw new Error("未找到任何白名单脚本（scripts/crawl|ranking/*.ts）");
  // 入口判定契约：脚本若用 `/<name>\.ts$/.test(process.argv[1])` 判断「是否作为入口」，
  // 打包成 .mjs 后会静默不执行（exit 0、output 为空 → 调度记成功的假阳性）。构建期即拦截。
  const bad = entries.filter((e) => /\.ts\$\/\.test\(\s*process\.argv\[1\]/.test(readFileSync(join(ROOT, e), "utf8")));
  if (bad.length) throw new Error(`入口判定只认 .ts，打包后不会执行：${bad.join(", ")}（改为 /\.(?:ts|mjs)$/）`);
  const esbuild = loadEsbuild();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: entries,
    outbase: "scripts",
    outdir: OUT,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outExtension: { ".js": ".mjs" },
    tsconfig: join(WEB, "tsconfig.json"),
    external: ["@prisma/client", ".prisma/*"],
    // 依赖里的 CJS 代码可能调用 require()；ESM 产物需显式提供
    banner: { js: "import { createRequire as __aideanCreateRequire } from 'node:module'; const require = __aideanCreateRequire(import.meta.url);" },
    legalComments: "none",
    logLevel: "warning",
  });
  const manifest = { generatedBy: "scripts/build/bundle-scripts.mjs", esbuild: esbuild.version, scripts: {} };
  for (const src of entries) {
    const dist = distRelOf(src);
    const buf = readFileSync(join(ROOT, dist));
    manifest.scripts[src] = { dist, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
  }
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[bundle-scripts] ${entries.length} scripts → ${relative(ROOT, OUT)} (esbuild ${esbuild.version})`);
  for (const [s, m] of Object.entries(manifest.scripts)) console.log(`  ${s} → ${m.dist} ${m.bytes}B`);
}

function check() {
  const missing = listEntries().filter((s) => !existsSync(join(ROOT, distRelOf(s))));
  if (missing.length) {
    console.error(`[bundle-scripts --check] 缺少产物：\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[bundle-scripts --check] OK ${listEntries().length} scripts`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) check();
  else build().catch((e) => { console.error(e); process.exit(1); });
}
