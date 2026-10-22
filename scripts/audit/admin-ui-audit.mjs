#!/usr/bin/env node
/**
 * B11-04b / B11-05 / B11-03b 统一度量器（替代未入库的 .scratch/rawbtn011.mjs、adminmatrix011.mjs）。
 * 扫描 apps/web/components/admin/**.tsx，逐文件输出：
 *   rawButton/rawSelect/rawTextarea/rawLabel/rawTable —— 原生 JSX 标签数
 *   usesUiButton —— 是否从 @aidean/ui 导入 Button；mixed = usesUiButton && rawButton>0
 *   testid —— data-testid 出现次数；panelState —— 是否使用 PanelState/usePanelResource
 *   errorState —— 是否有显式错误态（PanelState 或 error/错误 文案分支）；retry —— 是否有重试入口
 * 用法：node scripts/audit/admin-ui-audit.mjs [--json] [--files a.tsx,b.tsx]
 * 汇总行给出 B11-04b/05/03b 验收所需的计数，结果可直接贴入 EVD。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "apps", "web", "components", "admin");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : []; });
const count = (s, re) => (s.match(re) || []).length;
const argv = process.argv.slice(2);
const only = argv.includes("--files") ? argv[argv.indexOf("--files") + 1].split(",") : null;

const rows = walk(DIR).filter((p) => !only || only.some((f) => p.endsWith(f))).map((p) => {
  const s = readFileSync(p, "utf8");
  const uiImport = (s.match(/import\s*\{([^}]*)\}\s*from\s*["']@aidean\/ui["']/g) || []).join(" ");
  const r = {
    file: relative(DIR, p).replace(/\\/g, "/"),
    rawButton: count(s, /<button[\s>]/g),
    rawSelect: count(s, /<select[\s>]/g),
    rawTextarea: count(s, /<textarea[\s>]/g),
    rawLabel: count(s, /<label[\s>]/g),
    rawTable: count(s, /<table[\s>]/g),
    usesUiButton: /\bButton\b/.test(uiImport),
    testid: count(s, /data-testid=|testId=/g),
    panelState: /\bPanelState\b|usePanelResource/.test(s),
    errorState: /\bPanelState\b|set(Error|Err)\(|\berror\s*\?|错误|失败/.test(s),
    retry: /onRetry|重试|reload\(/.test(s),
  };
  r.mixed = r.usesUiButton && r.rawButton > 0;
  return r;
}).sort((a, b) => (b.rawButton + b.rawSelect + b.rawTextarea + b.rawLabel) - (a.rawButton + a.rawSelect + a.rawTextarea + a.rawLabel));

const sum = (k) => rows.reduce((n, r) => n + (typeof r[k] === "number" ? r[k] : r[k] ? 1 : 0), 0);
const summary = {
  files: rows.length,
  rawButton: sum("rawButton"), rawSelect: sum("rawSelect"), rawTextarea: sum("rawTextarea"), rawLabel: sum("rawLabel"), rawTable: sum("rawTable"),
  mixedFiles: rows.filter((r) => r.mixed).length,
  filesWithTestid: rows.filter((r) => r.testid > 0).length,
  filesWithPanelState: rows.filter((r) => r.panelState).length,
  filesWithoutErrorState: rows.filter((r) => !r.errorState).length,
  filesWithoutRetry: rows.filter((r) => !r.retry).length,
};
if (argv.includes("--json")) { console.log(JSON.stringify({ summary, rows }, null, 2)); process.exit(0); }
console.log("file\tbtn\tsel\tta\tlbl\ttbl\tuiBtn\tmixed\ttestid\tpanel\terr\tretry");
for (const r of rows) console.log([r.file, r.rawButton, r.rawSelect, r.rawTextarea, r.rawLabel, r.rawTable, r.usesUiButton ? "Y" : "-", r.mixed ? "MIX" : "-", r.testid, r.panelState ? "Y" : "-", r.errorState ? "Y" : "-", r.retry ? "Y" : "-"].join("\t"));
console.log("SUMMARY " + JSON.stringify(summary));
