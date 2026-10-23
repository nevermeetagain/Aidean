// T120-05 守卫：环境变量清单归一（.env.example ↔ process.env）。
// 两部分：
//  (1) 差集＝apps/web 代码读取的 process.env 变量全集 − 三份 example 已登记键（union）＝必须为 ∅（验收①）
//      扫描形态：process.env.X / process.env["X"] / const { X, Y } = process.env
//  (2) 注释覆盖：每个被读取的变量在其登记行上方必须有注释（目标「且带注释」）；
//      并给出「必需/可选」标注核对（注释里须含「必需」或「可选」字样）。
// 反向差集（example − referenced）只报告不阻断：其中被 docker-compose*.yml 使用者标注「compose 使用，保留」，
// 其余标为「代码未读取（保留待确认用途）」——docker/.env.example 与 .env.smtp.example 属本卡禁改路径，故只标注不删除。
// 零新依赖：经 ./_lib.mjs 走 git trackedFiles（跨 cwd 稳定，不受 .next/node_modules 干扰）。
// 用法：node scripts/guard/env-diff.mjs [--json]（--json 供证据归档，输出机器可读摘要）
import fs from "node:fs";
import path from "node:path";
import { trackedFiles, readRepoFile, tryReadRepoFile, makeReporter, ROOT } from "./_lib.mjs";

const rep = makeReporter("env-diff");
const asJson = process.argv.includes("--json");
rep.title("env-diff（环境变量清单归一：referenced − example 必须为 ∅）");

// —— 扫描范围：apps/web 源码（含 app/lib/components/scripts/*.mjs 配置）——
const SCAN_EXT = new Set([".ts", ".tsx", ".mjs", ".js"]);
const SKIP_PATH = /(^|\/)(node_modules|\.next|dist|public|coverage)\//;
const webFiles = trackedFiles().filter(
  (f) => f.startsWith("apps/web/") && !SKIP_PATH.test(f) && SCAN_EXT.has(path.posix.extname(f))
);

const referenced = new Map(); // name -> Set<file>（取证用）
const addRef = (name, file) => {
  if (!referenced.has(name)) referenced.set(name, new Set());
  referenced.get(name).add(file);
};
const DOTTED = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const BRACKET = /process\.env\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/g;
const DESTRUCT = /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*process\.env/g;

for (const f of webFiles) {
  const content = tryReadRepoFile(f);
  if (!content || content.includes("\u0000")) continue;
  for (const re of [DOTTED, BRACKET]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      addRef(m[1], f);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  let m;
  DESTRUCT.lastIndex = 0;
  while ((m = DESTRUCT.exec(content)) !== null) {
    for (const raw of m[1].split(",")) {
      const name = raw.split(":")[0].trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) addRef(name, f);
    }
    if (m.index === DESTRUCT.lastIndex) DESTRUCT.lastIndex++;
  }
}

// —— 三份 example（apps/web/.env.example 为应用模板真源，另两份为 SMTP 专项与 docker 编排）——
const EXAMPLES = [
  "apps/web/.env.example",
  "apps/web/.env.smtp.example",
  "docker/.env.example",
];
const PRIMARY = "apps/web/.env.example";

/** 解析 env 文件：返回 {key: {line, comment}}，comment＝该键上方是否有注释行。 */
function parseExample(rel) {
  const content = tryReadRepoFile(rel);
  if (content === null) return null;
  const keys = new Map();
  const lines = content.split(/\r?\n/);
  let pendingComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const commented = /^\s*#\s*([A-Za-z_][A-Za-z0-9_]*)\s*(=|$)/.exec(line);
    if (commented) {
      keys.set(commented[1], { line: i + 1, comment: true, commentedOut: true });
      pendingComment = true;
      continue;
    }
    if (/^\s*#/.test(line)) {
      pendingComment = true;
      continue;
    }
    if (/^\s*$/.test(line)) continue;
    const active = /^\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (active) {
      keys.set(active[2], { line: i + 1, comment: pendingComment, commentedOut: false });
    }
    pendingComment = false;
  }
  return keys;
}

const exampleKeys = new Map(); // name -> [{file, comment}]
for (const rel of EXAMPLES) {
  const keys = parseExample(rel);
  if (!keys) {
    rep.fail(`example 模板缺失：${rel}`);
    continue;
  }
  for (const [k, meta] of keys) {
    if (!exampleKeys.has(k)) exampleKeys.set(k, []);
    exampleKeys.get(k).push({ file: rel, ...meta });
  }
}

// —— (1) 差集 referenced − example ——
const missing = [...referenced.keys()].filter((k) => !exampleKeys.has(k)).sort();
if (missing.length === 0) {
  rep.pass(`referenced − example = ∅（代码读取 ${referenced.size} 个变量，全部已登记）`);
} else {
  for (const k of missing) {
    rep.fail(`代码读取但三份 example 均未登记：${k}（见于 ${[...referenced.get(k)].slice(0, 3).join(", ")}）`);
  }
}

// —— (1b) 目标口径：应用模板 apps/web/.env.example 自身也必须覆盖全集 ——
const primary = parseExample(PRIMARY) ?? new Map();
const missingInPrimary = [...referenced.keys()].filter((k) => !primary.has(k)).sort();
if (missingInPrimary.length === 0) {
  rep.pass(`应用模板 ${PRIMARY} 覆盖全部 ${referenced.size} 个被读取变量`);
} else {
  for (const k of missingInPrimary) rep.fail(`${PRIMARY} 未登记：${k}`);
}

// —— (2) 注释与必需/可选标注（口径＝应用模板 ${PRIMARY}，禁改的 docker/.env.example 不在此列） ——
let commentGaps = 0;
let tierGaps = 0;
for (const k of [...referenced.keys()].sort()) {
  const e = primary.get(k);
  if (!e) continue; // 已由 (1b) 报 FAIL
  if (!e.comment) {
    rep.fail(`${k} 在 ${PRIMARY}:${e.line} 上方无注释（目标要求「带注释」）`);
    commentGaps++;
    continue;
  }
  // 必需/可选标注：取该登记行上方的连续注释块判定
  if (!/必需|可选/.test(commentBlockAbove(PRIMARY, e.line))) {
    rep.fail(`${k} 的注释未标注「必需/可选」`);
    tierGaps++;
  }
}
if (commentGaps === 0 && tierGaps === 0) rep.pass(`每个被读取变量在 ${PRIMARY} 均有注释且含「必需/可选」标注`);

/** 登记行上方的连续注释块文本（lineNo 为 1 基，故自上一行起向上收）。 */
function commentBlockAbove(file, lineNo) {
  const content = tryReadRepoFile(file);
  if (!content) return "";
  const lines = content.split(/\r?\n/);
  const block = [];
  for (let i = lineNo - 2; i >= 0; i--) {
    const l = lines[i];
    if (/^\s*#/.test(l) || /^\s*$/.test(l)) {
      if (/^\s*$/.test(l) && block.length > 0) break;
      block.unshift(l);
      continue;
    }
    break;
  }
  return block.join(" ");
}

// —— (3) 反向差集：example − referenced（只报告，不阻断） ——
const composeText = ["docker/docker-compose.dev.yml", "docker/docker-compose.prod.yml"]
  .map((f) => tryReadRepoFile(f) ?? "")
  .join("\n");
const redundant = [...exampleKeys.keys()].filter((k) => !referenced.has(k)).sort();
const composeKept = [];
const unreferencedRest = [];
for (const k of redundant) {
  const re = new RegExp(`\\$\\{?${k}\\b`);
  (re.test(composeText) ? composeKept : unreferencedRest).push(k);
}
rep.pass(
  `反向差集 ${redundant.length} 项：其中 ${composeKept.length} 项被 docker-compose 使用（保留并标注）：${composeKept.join(", ") || "—"}`
);
if (unreferencedRest.length > 0) {
  rep.warn(
    `代码未读取且 compose 未引用的 ${unreferencedRest.length} 项（属禁改路径或待确认，保留）：${unreferencedRest.join(", ")}`
  );
}

if (asJson) {
  const payload = {
    scannedWebFiles: webFiles.length,
    referencedCount: referenced.size,
    referenced: [...referenced.keys()].sort(),
    referencedSites: Object.fromEntries([...referenced].map(([k, v]) => [k, [...v]])),
    exampleCounts: Object.fromEntries(EXAMPLES.map((f) => [f, (parseExample(f) ?? new Map()).size])),
    missing: missingInPrimary,
    redundantCount: redundant.length,
    composeKept,
    unreferencedRest,
  };
  fs.writeFileSync(
    path.join(ROOT, ".scratch", "t120-05-env-diff.json"),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
}

rep.finish();
