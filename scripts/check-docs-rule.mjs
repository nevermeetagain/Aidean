/**
 * check-docs-rule.mjs —— 文档治理铁律 CI 检查（SubTask G-2 + #42 L4 扩展）。
 *
 * 铁律 1（单一事实来源）：
 *   - 实体文档仅存在于根 docs/；
 *   - apps 下的 docs 目录仅允许映射表 index.json；
 *   - CI 检查：apps 下任何 .md（映射表除外）存在 → 失败。
 *
 * 豁免（决策 2026-08-28）：
 *   - README.md —— README 属仓库/目录导航惯例入口，非"实体功能文档"，
 *     如 apps/web/lib/features/README.md（七域使用纪律）保留原位。
 *     除 README 外 apps 下任何 .md 均阻断。
 *
 * #42 L4 扩展——数字真源断言：
 *   把每轮人肉 grep 降为 CI 门禁。以下数字从代码真源直接计数，
 *   与文档中引用的口径对照。漂移时报告具体期望值 vs 实际值。
 *
 * 用法：node scripts/check-docs-rule.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = join(import.meta.dirname, "..");
const webRoot = join(root, "apps", "web");

/* ── 工具函数 ── */

/** 递归收集 dir 下全部 .md 相对路径（跳过 node_modules / .next / dist） */
function collectMarkdown(dir, base = dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc; // 目录不存在即无违规
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectMarkdown(full, base, acc);
    } else if (name.toLowerCase().endsWith(".md")) {
      acc.push(relative(base, full).split(sep).join("/"));
    }
  }
  return acc;
}

/** 递归收集目录下全部 .ts/.tsx 文件（跳过 node_modules / .next / dist / __tests__） */
function collectTsFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name === "dist" || name === "__tests__") continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectTsFiles(full, acc);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

/** 读取文件内容（容错） */
function readFileSafe(filePath) {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** 计数目录下直接子目录数（一级子目录） */
function countSubdirs(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => {
        try {
          return statSync(join(dir, name)).isDirectory();
        } catch {
          return false;
        }
      }).length;
  } catch {
    return 0;
  }
}

/* ── 铁律 1：apps 下无实体 .md ── */

const violations = collectMarkdown(join(root, "apps")).filter(
  (p) => !p.toLowerCase().endsWith("readme.md")
);

if (violations.length > 0) {
  console.error("[铁律1] apps/ 下存在非映射表实体 .md（实体文档仅允许 docs/）：");
  for (const v of violations) console.error(`  - apps/${v}`);
  console.error("处置：迁入 docs/（更新引用与文档索引），或改名为 README.md 走导航豁免。");
  process.exit(1);
}

console.log("[铁律1] docs rule PASS：apps/ 下无实体 .md（README.md 豁免）。");

/* ── #42 数字真源断言（v2 口径锚化，2026-09-29）──
 *
 * 期望值唯一来源 = 文档口径锚（不再是脚本常量）：
 *   - schema model / enum 数 ← 《数据库文档》§二 标题「共 **N model / M enum**」
 *   - admin API 域数 / admin 前端页面数 ← 《功能设计文档》实现状态行「N 个 API 路由域 / M 个前端页面」
 *
 * 代码变更后只需更新对应文档口径，脚本自动跟随；锚缺失或格式漂移 → 显式 FAIL 并指路。
 * 背景：provider-pricing 轮同步了代码与 facts 常量、漏改本脚本常量与文档口径（#76），故去常量化，
 *      把「每轮要记得改的三处」收敛为「每轮按铁律本来就要改的一处（文档）」。
 */

const failures = [];

function assertNumber(label, expected, actual) {
  if (actual !== expected) {
    failures.push(`[数字漂移] ${label}：文档声称 ${expected}，代码实测 ${actual}`);
  }
}

/** 从文档解析口径锚；解析失败时推入显式错误并返回 null */
function parseAnchor(label, content, re, fixHint) {
  const m = content.match(re);
  if (!m) {
    failures.push(`[口径锚缺失] ${label}：未找到「${fixHint}」格式锚——请维护文档锚后重跑`);
    return null;
  }
  return m;
}

// 1. Prisma schema model 数 / enum 数 ← 《数据库文档》§二 标题锚
const schemaContent = readFileSafe(join(webRoot, "prisma", "schema.prisma"));
const schemaModelCount = (schemaContent.match(/^model /gm) || []).length;
const schemaEnumCount = (schemaContent.match(/^enum /gm) || []).length;
const dbDoc = readFileSafe(join(root, "docs", "architecture", "数据库文档.md"));
const dbModelsAnchor = parseAnchor(
  "《数据库文档》§二 model 数",
  dbDoc,
  /共 \*\*(\d+) model/,
  "共 **N model / M enum**"
);
if (dbModelsAnchor) {
  assertNumber("Prisma schema model 数（锚：数据库文档 §二）", Number(dbModelsAnchor[1]), schemaModelCount);
}
const dbEnumsAnchor = parseAnchor(
  "《数据库文档》§二 enum 数",
  dbDoc,
  /(\d+) enum\*\*/,
  "共 **N model / M enum**"
);
if (dbEnumsAnchor) {
  assertNumber("Prisma schema enum 数（锚：数据库文档 §二）", Number(dbEnumsAnchor[1]), schemaEnumCount);
}

/** 递归统计目录下 page.tsx 总数（app/(admin)/admin/ 口径） */
function countPageFiles(dir, acc = 0) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name !== "node_modules" && name !== ".next") {
        acc = countPageFiles(full, acc);
      }
    } else if (name === "page.tsx") {
      acc += 1;
    }
  }
  return acc;
}

// 2/3. admin API 域数 / admin 前端页面数 ← 《功能设计文档》实现状态行锚
const adminApiDir = join(webRoot, "app", "api", "v1", "admin");
const adminApiDomains = countSubdirs(adminApiDir);
const adminPages = countPageFiles(join(webRoot, "app", "(admin)", "admin"));
const fnDoc = readFileSafe(join(root, "docs", "product", "design", "功能设计文档.md"));
const fnAnchor = parseAnchor(
  "《功能设计文档》实现状态行",
  fnDoc,
  /(\d+) 个 API 路由域\s*\/\s*(\d+) 个前端页面/,
  "N 个 API 路由域 / M 个前端页面"
);
if (fnAnchor) {
  assertNumber("admin API 域数（锚：功能设计文档 §3.5 实现状态行）", Number(fnAnchor[1]), adminApiDomains);
  assertNumber("admin 前端页面数（锚：功能设计文档 §3.5 实现状态行）", Number(fnAnchor[2]), adminPages);
}

// 4. @aidean/ui 引用数（admin 组件中 import @aidean/ui 的文件数）
const adminComponentsDir = join(webRoot, "components", "admin");
const adminComponentFiles = collectTsFiles(adminComponentsDir);
const aideanUiImports = adminComponentFiles.filter(
  (f) => readFileSafe(f).includes("@aidean/ui")
).length;
// 注意：新增的 TierMappingsManager/FreeQuotasManager 也 import @aidean/ui，
// 但这个断言只验证「至少 N 个」而非精确等值，因为组件数随开发增长
if (aideanUiImports < 20) {
  failures.push(`[数字漂移] @aidean/ui 引用 admin 组件数：期望 ≥20，实测 ${aideanUiImports}`);
}

// 5. Next.js 版本（package.json 中 "next" 版本）
const pkgContent = readFileSafe(join(webRoot, "package.json"));
const nextMatch = pkgContent.match(/"next":\s*"[\^~]?(\d+)\./); // 只取大版本（15.5.28 → 15）
const nextVersion = nextMatch ? nextMatch[1] : "?";
assertNumber("Next.js 大版本", 15, Number(nextVersion));

/* ── 汇报 ── */

if (failures.length > 0) {
  console.error("\n[铁律-数字] 数字真源断言 FAIL：");
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\n处置：以代码实测为准更新口径锚文档——《数据库文档》§二标题（model/enum 数）、《功能设计文档》§3.5 实现状态行（admin 域/页数）；脚本期望值自动跟随文档锚，无需改本脚本。"
  );
  process.exit(1);
}

console.log(
  `[铁律-数字] 数字真源断言 PASS（锚=文档，代码=实测）：schema model=${schemaModelCount}, enum=${schemaEnumCount}, admin API 域=${adminApiDomains}, admin 页面=${adminPages}, Next.js=${nextVersion}.x`
);
