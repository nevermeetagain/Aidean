#!/usr/bin/env node
/**
 * check-docs-facts.mjs — 文档数字口径断言（Task T-4.4.1）
 *
 * 断言项：每条含实测计数 + 期望值；失败时输出 diff 并 exit(1)。
 * 用法：node scripts/check-docs-facts.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// #46 修复：Windows 下 new URL("..", import.meta.url).pathname 得 "/E:/…" 导致盘符重复，
// 改用 fileURLToPath + dirname 获取跨平台安全的根路径。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// #66 修复（未完成事项目录）：原断言依赖 POSIX 命令（grep/sed/find/ls/wc，execSync 硬编码
// shell:'/bin/sh'），Windows 下 spawnSync ENOENT → actual 全空、10 断言假失败。改为纯 node 实现。
// 排除清单对齐 CI/Ubuntu 下符号链接不进入 node_modules 的既有行为（#46 实测 Windows grep 曾
// 闯入 pnpm junction 致 queryraw-biz=6 假红）。
const EXCLUDED_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "coverage",
  "test-results", "playwright-report", ".turbo", "standalone",
]);

function walk(relDir, matchName) {
  const out = [];
  const stack = [join(ROOT, relDir)];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!EXCLUDED_DIRS.has(e.name)) stack.push(full);
      } else if (matchName(e.name, full)) {
        out.push(full);
      }
    }
  }
  return out;
}

function readFile(rel) {
  try {
    return readFileSync(join(ROOT, rel), "utf-8");
  } catch {
    return "";
  }
}

/** 文件内命中正则的行数（对应 grep -c） */
const countPatternLines = (rel, re) => readFile(rel).split("\n").filter((l) => re.test(l)).length;

const assertions = [
  {
    id: "schema-models",
    desc: "schema.prisma model 数 = 72（M-002 模型源监控 TASK-058 新增 MonitoringSource/CatalogSnapshot/ProviderModelObservation/CatalogChangeEvent，68→72；前次 S3 RBAC 64→68）",
    check: () => String(countPatternLines("apps/web/prisma/schema.prisma", /^model /)),
    expect: "72",
  },
  {
    id: "seed-models",
    desc: "seed.ts 模型条数（modelsData 静态条目 + DEMO_MODEL_COUNT 生成器）≥ 50（下限式，R-83 T1：模型数不限由后台配置）",
    check: () => {
      const src = readFile("apps/web/prisma/seed.ts");
      const curated = src.split("\n").filter((l) => /^\s*\{ name: ['"`].*vendorName: /.test(l)).length;
      // R-83 T5 演示数据为运行时生成，静态解析显式常量 DEMO_MODEL_COUNT 求和
      const demo = src.match(/DEMO_MODEL_COUNT\s*=\s*(\d+)/);
      return String(curated + (demo ? Number(demo[1]) : 0));
    },
    expect: ">=50",
  },
  {
    id: "seed-no-official",
    desc: "seed.ts 中无 OFFICIAL/官方测试（provenance 修复后）",
    check: () => String(countPatternLines("apps/web/prisma/seed.ts", /OFFICIAL|官方测试/)),
    expect: "0",
  },
  {
    id: "lib-features-count",
    desc: "lib/features 子目录数 = 22（S7.4 announcements 起 17→18；TASK-090 收口以代码实测同步 18→22，含 lib/features/pricing 等新增目录）",
    check: () => {
      try {
        return String(readdirSync(join(ROOT, "apps/web/lib/features"), { withFileTypes: true }).filter((e) => e.isDirectory()).length);
      } catch {
        return "0";
      }
    },
    expect: "22",
  },
  {
    id: "aidean-ui-refs",
    desc: "@aidean/ui 在 apps/web/components 的 import 数 = 68（TASK-074 新增 BenchmarkDialog 67→68，R10-01；前次 TASK-029 65→67）",
    check: () =>
      String(
        walk("apps/web/components", () => true).filter((f) => {
          try {
            return readFileSync(f, "utf-8").includes("@aidean/ui");
          } catch {
            return false;
          }
        }).length
      ),
    expect: "68",
  },
  {
    id: "route-count",
    desc: "apps/web route.ts 文件数（含 app/ 全域）= 157（TASK-066 新增 models/[id]/offerings 156→157，R10-01；前次 TASK-095 154→156）",
    check: () => String(walk("apps/web/app", (n) => n === "route.ts").length),
    expect: "157",
  },
  {
    id: "page-count",
    desc: "apps/web page.tsx 文件数 = 57（TASK-090 收口以代码实测同步 56→57）",
    check: () => String(walk("apps/web/app", (n) => n === "page.tsx").length),
    expect: "57",
  },
  {
    id: "next-version",
    desc: "Next.js 版本 = 15.x",
    check: () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "apps/web/package.json"), "utf-8"));
      const v = pkg.dependencies?.next ?? pkg.devDependencies?.next ?? "";
      return v.match(/15\./) ? "15.x" : v;
    },
    expect: "15.x",
  },
  {
    id: "spec-count",
    desc: "spec 文件总数 = 179（TASK-061 新增 monitoring/diff/{detect,persist}.spec 177→179，R10-01；前次 TASK-067/074 176→177）",
    check: () =>
      String(walk("e2e", (n) => n.endsWith(".spec.ts")).length + walk("apps/web", (n) => n.endsWith(".spec.ts")).length),
    expect: "179",
  },
  {
    id: "queryraw-biz",
    desc: "apps/web 业务代码 $queryRaw/$executeRaw = 0",
    check: () =>
      String(
        walk("apps/web", (n) => n.endsWith(".ts") || n.endsWith(".tsx")).filter((f) => {
          try {
            const s = readFileSync(f, "utf-8");
            return s.includes("$queryRaw") || s.includes("$executeRaw");
          } catch {
            return false;
          }
        }).length
      ),
    expect: "0",
  },
  {
    id: "batch-count",
    desc: "admin batch 路由数 = 15",
    check: () =>
      String(
        walk("apps/web/app/api", (n, full) => n === "route.ts" && full.replace(/\\/g, "/").includes("/batch/route.ts")).length
      ),
    expect: "15",
  },
  {
    // 铁律 6 护栏：DB 模型变更必须同步《数据库文档》（#71 曾漏登 display_name/category）
    id: "db-doc-product-fields",
    desc: "《数据库文档》products 行已登记 display_name 与 ProductCategory（DB 模型变更文档同步）",
    check: () => {
      const s = readFileSync(join(ROOT, "docs/architecture/数据库文档.md"), "utf-8");
      return s.includes("display_name") && s.includes("ProductCategory") ? "2/2" : "0/2";
    },
    expect: "2/2",
  },
  {
    // 单一事实来源护栏：分类中文文案只允许定义在 lib/product-label.ts（#73 收口第 5 份拷贝）
    id: "category-label-single-source",
    desc: "apps/web 中硬编码「label: \"特供\"」式分类映射 = 0（文案唯一来源 lib/product-label.ts）",
    check: () =>
      String(
        walk("apps/web", (n) => n.endsWith(".ts") || n.endsWith(".tsx")).filter((f) => {
          try {
            return readFileSync(f, "utf-8").includes('label: "特供"');
          } catch {
            return false;
          }
        }).length
      ),
    expect: "0",
  },
  {
    // 铁律 2 护栏（2026-10-04 冲突审计轮）：用量统计聚合读侧（WF-21 stats 端点）必须保持
    // 《API架构设计方案》§7.5 锚 ↔ 《API接口文档》§5.4 回链 双向互引（v1.39 轮曾单侧漏登）
    id: "usage-stats-anchor-pair",
    desc: "《API架构设计方案》含 usage-stats-architecture 锚 且《API接口文档》含其回链（铁律 2 双向互引）",
    check: () => {
      const arch = readFile("docs/architecture/API架构设计方案.md");
      const api = readFile("docs/architecture/API接口文档.md");
      const a = arch.includes('id="usage-stats-architecture"');
      const b = api.includes("API架构设计方案.md#usage-stats-architecture");
      return a && b ? "2/2" : "0/2";
    },
    expect: "2/2",
  },
];

let failed = 0;
for (const a of assertions) {
  const actual = a.check();
  // ">=N" 前缀 = 数值下限断言（R-83 T1）：模型数不限、仅防误删，其余仍为精确相等
  const pass = a.expect.startsWith(">=")
    ? Number(actual) >= Number(a.expect.slice(2))
    : actual === a.expect || actual.includes(a.expect);
  const status = pass ? "✅" : "❌";
  console.log(`${status} ${a.id}: ${a.desc} → expected=${a.expect}, actual=${actual}`);
  if (!pass) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${assertions.length} assertions passed.`);
  process.exit(0);
}
