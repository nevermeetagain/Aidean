// TASK-007 守卫②：密钥/凭据明文扫描（规格步骤2）。
// 目标：在「可执行源码 / 配置」里捕获私钥头、AWS AKIA、sk- 令牌、password= 明文赋值。
// 零新依赖：node 内置 + git。判定基于当前工作区内容（tracked 文件），确定性、跨 cwd 稳定。
//
// 作用域口径（重要，避免历史文档/示例造成不可收敛的假阳性）：
//   扫描 git ls-files 全量 tracked 文本文件，但「排除」以下——它们是文档/底稿/示例/测试夹具/
//   本守卫自身，历史上合法含占位或脱敏令牌，且非"新引入源码泄露"的防护对象：
//     · 前缀：scripts/guard/（本守卫，含检测正则字面量，自匹配）、.example/、参考文档/、docs/（文档与归档）
//     · 后缀/文件名：*.md、*.txt、*.example、*.sample、*.lock、pnpm-lock.yaml、package-lock.json、yarn.lock
//     · 测试：*.spec.*、*.test.*、任意路径段 /__tests__/、/history/
//   注：docs/archive/UpdatedHistory.prompts-archive.txt 存在 4 处历史 sk- 令牌（既存、非本任务引入、
//   归档只读），依 TASK-007「既存违规登记例外并上报」原则由本路径豁免覆盖，并在 EVD-007 显式上报，
//   建议独立安全任务轮换/移除；本守卫不因此放宽对源码新增泄露的拦截。
import { trackedFiles, readRepoFile, looksBinary, makeReporter } from "./_lib.mjs";

const rep = makeReporter("secret-scan");
rep.title("secret-scan（密钥/凭据明文扫描）");

const EXCLUDED_PREFIX = ["scripts/guard/", ".example/", "参考文档/", "docs/"];
const EXCLUDED_LOCK = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

function isExcluded(p) {
  if (EXCLUDED_PREFIX.some((pre) => p.startsWith(pre))) return true;
  if (EXCLUDED_LOCK.has(p)) return true;
  if (/\.(md|txt|example|sample|lock)$/i.test(p)) return true;
  if (/\.(spec|test)\.[cm]?[jt]sx?$/i.test(p)) return true;
  if (p.includes("/__tests__/") || p.includes("/history/")) return true;
  return false;
}

// 规则：value=false 高信号（命中即泄露，无需值判断）；value=true 需过占位值黑名单。
const RULES = [
  { name: "私钥头", re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/, value: false },
  { name: "AWS AKIA", re: /\bAKIA[0-9A-Z]{16}\b/, value: false },
  // 覆盖经典 sk-<base62> 与新式 sk-proj-<base62>（OpenAI 项目密钥）；字符类不含裸 -/_，避免误伤 foo-sk-bar 之类标识符（CodeReview m-2）。
  { name: "sk- 令牌", re: /\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b/, value: false },
  // 大小写不敏感，但保留 (^|[^\w]) 前缀边界：排除 hashedPassword/placeholderPassword/TEST_PASSWORD/REDIS_PASSWORD/adminPassword
  // 等「password 前为单词字符」的代码标识符；独立词 PASSWORD= / password= （行首或空格/符号后）均被捕获（CodeReview M-3）。
  { name: "password= 明文", re: /(^|[^\w])password\s*=\s*['"]?([^'"\s&,;)]{8,})/i, value: true, valueGroup: 2 },
];

// 占位/示例/环境变量引用值黑名单：命中则视为非真实凭据，跳过。
// admin123/test123 = seed.ts 公开开发种子口令（全站 e2e 夹具同源，非机密），显式豁免以维持 HEAD exit 0（CodeReview M-3 取舍）。
const PLACEHOLDER_VALUE =
  /(example|your[_-]|changeme|change-me|placeholder|sample|dummy|redacted|xxxx|<.*>|\$\{|process\.env|env\.|password|secret[_-]?key|\{\{|null|undefined|true|false|\[redacted|admin123|test123)/i;

function mask(v) {
  const t = v.replace(/^['"]|['"]$/g, "");
  if (t.length <= 6) return "•••";
  return `${t.slice(0, 3)}…${t.slice(-1)}`.replace(/[A-Za-z0-9]/g, "•");
}

let hits = 0;
let scanned = 0;
const skippedExcluded = [];

for (const f of trackedFiles()) {
  if (isExcluded(f)) {
    skippedExcluded.push(f);
    continue;
  }
  let content;
  try {
    content = readRepoFile(f);
  } catch {
    continue;
  }
  if (content == null || looksBinary(content)) continue;
  scanned++;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      const m = line.match(rule.re);
      if (!m) continue;
      if (rule.value) {
        const val = m[rule.valueGroup] || "";
        if (PLACEHOLDER_VALUE.test(val)) continue;
      }
      hits++;
      // 安全铁律：不回显密钥值，仅脱敏。
      const hint = rule.value ? ` 值(脱敏)=${mask(m[rule.valueGroup] || "")}` : "";
      rep.fail(`检出疑似明文密钥 [${rule.name}] @ ${f}:${i + 1}${hint}`);
    }
  }
}

rep.pass(`扫描源码/配置文本文件 ${scanned} 个；按作用域豁免 ${skippedExcluded.length} 个（文档/底稿/示例/测试/lock/守卫自身）。`);
if (hits === 0) {
  rep.pass("在作用域内未发现私钥头 / AKIA / sk- 令牌 / password= 明文凭据。");
}

rep.finish();
