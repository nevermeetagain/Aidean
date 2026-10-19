// TASK-004 · 契约测试生成器（唯一入口：node scripts/contract/gen-contract-tests.mjs）
// 读取【冻结真源的文本形态】并生成表驱动契约测试到 packages/shared/src/__tests__/contract/*.generated.spec.ts。
// 生成的 spec 在测试期 import 真实 @aidean/shared 模块做断言；本生成器在 CI 中重跑 + `git diff --exit-code` 防手改/防漂移。
// 设计纪律：
//   1) 纯文本解析（node .mjs 不能 import TS），只针对固定稳定形态取数，避免脆弱通用解析；
//   2) 输出确定性：键排序、无时间戳、无绝对路径 → 同输入必同输出（幂等）；
//   3) 解析失败即非零退出（§4 码表无法稳定解析 → 交 TASK-009 规范表格，不静默生成残缺测试）。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const SRC_ERRORS = resolve(ROOT, "packages/shared/src/errors.ts");
const SRC_PERMS = resolve(ROOT, "packages/shared/src/permissions.ts");
const DOC_API = resolve(ROOT, "docs", "architecture", "API接口文档.md");
const CONTRACT_IDENTITY = resolve(ROOT, "docs", "任务规划V0.5.0", "contracts", "03-identity.contract.ts");
const OUT_DIR = resolve(ROOT, "packages/shared/src/__tests__/contract");

const fail = (msg) => {
  console.error(`[gen-contract-tests] FAIL: ${msg}`);
  process.exit(1);
};

const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch (e) {
    fail(`无法读取 ${p}：${e.message}`);
  }
};

// —— 1. 解析 shared/src/errors.ts：ERROR_CODES(name→value) 与 DEFAULT_STATUS_BY_CODE(code→status) ——
function extractBlock(text, startRe, endMarker, label) {
  const m = startRe.exec(text);
  if (!m) fail(`未找到 ${label}`);
  const start = m.index + m[0].length;
  const end = text.indexOf(endMarker, start);
  if (end === -1) fail(`${label} 结束标记未找到`);
  return text.slice(start, end);
}

function parseErrorCodes(errorsText) {
  const block = extractBlock(errorsText, /export const ERROR_CODES = \{/, "} as const", "ERROR_CODES 块");
  const codes = {};
  const re = /^\s*([A-Z][A-Z0-9_]+):\s*(\d+)\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(block)) !== null) codes[m[1]] = Number(m[2]);
  if (Object.keys(codes).length < 22) fail(`ERROR_CODES 解析异常（仅 ${Object.keys(codes).length} 码，<22）`);
  return codes;
}

function parseStatusMap(errorsText) {
  const block = extractBlock(errorsText, /export const DEFAULT_STATUS_BY_CODE[^=]*=\s*\{/, "\n}", "DEFAULT_STATUS_BY_CODE 块");
  const map = {};
  const re = /^\s*(\d+):\s*(\d+)\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(block)) !== null) map[Number(m[1])] = Number(m[2]);
  return map; // 允许为空（但现网有 10 条）
}

// —— 2. 解析 API接口文档.md §4 三列码表：| 码位 | 标识 | 语义 |（3xxxx/4xxxx 登记表）——
function parseDocCodeTable(docText) {
  const secStart = docText.indexOf("## 4. 统一响应");
  const secEnd = docText.indexOf("## 5. ", secStart);
  if (secStart === -1 || secEnd === -1) fail("未能定位 §4 统一响应 章节边界");
  const section = docText.slice(secStart, secEnd);
  const rows = [];
  const re = /^\|\s*(\d{5})\s*\|\s*([A-Z][A-Z0-9_]+)\s*\|/gm;
  let m;
  while ((m = re.exec(section)) !== null) rows.push({ code: Number(m[1]), identifier: m[2] });
  if (rows.length === 0) fail("§4 码表无法稳定解析（0 行）→ 请先由 TASK-009 规范表格");
  // 去重并按码位排序（确定性）
  const uniq = new Map();
  for (const r of rows) uniq.set(r.code, r.identifier);
  return [...uniq.entries()].sort((a, b) => a[0] - b[0]).map(([code, identifier]) => ({ code, identifier }));
}

// —— 3. 解析 shared/src/permissions.ts：ADMIN_DOMAINS 域数（键计数）——
function parseDomainCount(permsText) {
  const block = extractBlock(permsText, /export const ADMIN_DOMAINS = \{/, "} as const", "ADMIN_DOMAINS 块");
  const re = /^\s*"?[a-z][a-z-]*"?:\s*"[^"]+"\s*,?\s*$/gm;
  let count = 0;
  while (re.exec(block) !== null) count += 1;
  if (count < 1) fail("ADMIN_DOMAINS 解析异常（0 域）");
  return count;
}

// —— 4. 解析 contracts/03-identity.contract.ts：PermissionCodeSchema 正则源 + AUTHZ_BOUNDARY deny 码 ——
function parseIdentityContract(ctText) {
  const reMatch = ctText.match(/PermissionCodeSchema\s*=\s*z\.string\(\)\.regex\((\/.*?\/[gimsuy]*)\)/);
  if (!reMatch) fail("未能解析 PermissionCodeSchema 正则");
  const permCodeRegex = reMatch[1]; // 形如 /^admin\.[a-z-]+\.(read|write)$/
  const deny = [];
  const reDeny = /deny:\s*(-?\d+)/g;
  let m;
  while ((m = reDeny.exec(ctText)) !== null) deny.push(Number(m[1]));
  const uniqDeny = [...new Set(deny)].sort((a, b) => a - b);
  if (uniqDeny.length === 0) fail("未能解析 AUTHZ_BOUNDARY deny 码");
  return { permCodeRegex, denyCodes: uniqDeny };
}

// ============================ 生成 ============================
const errorsText = read(SRC_ERRORS);
const permsText = read(SRC_PERMS);
const docText = read(DOC_API);
const idText = read(CONTRACT_IDENTITY);

const codes = parseErrorCodes(errorsText);
const statusMap = parseStatusMap(errorsText);
const docRows = parseDocCodeTable(docText);
const domainCount = parseDomainCount(permsText);
const { permCodeRegex, denyCodes } = parseIdentityContract(idText);

const HEADER = (sources) =>
  `// AUTO-GENERATED — DO NOT EDIT\n` +
  `// 由 scripts/contract/gen-contract-tests.mjs 生成（TASK-004 / REQ-NF-001 / ADR-P001）。\n` +
  `// 真源：${sources}\n` +
  `// 重生成：node scripts/contract/gen-contract-tests.mjs ；CI 以 git diff --exit-code 防漂移/手改。\n\n`;

// —— 错误码契约 spec ——
const sortedCodeEntries = Object.entries(codes).sort((a, b) => a[1] - b[1]);
const codesLiteral = sortedCodeEntries.map(([k, v]) => `  ${k}: ${v},`).join("\n");
const statusLiteral = Object.entries(statusMap)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([c, s]) => `  ${c}: ${s},`)
  .join("\n");
const docRowsLiteral = docRows.map((r) => `  { code: ${r.code}, identifier: "${r.identifier}" },`).join("\n");

const errorsSpec =
  HEADER("packages/shared/src/errors.ts + docs/architecture/API接口文档.md §4 + contracts/03-identity.contract.ts") +
  `import { describe, expect, it } from "vitest";\n` +
  `import { ERROR_CODES, DEFAULT_STATUS_BY_CODE, httpStatusOf, ErrorBodySchema, type ErrorCodeValue } from "../../errors";\n\n` +
  `// —— 生成期自真源解析的冻结数据（测试期与 live 模块交叉断言）——\n` +
  `const CODE_TABLE = {\n${codesLiteral}\n} as const;\n\n` +
  `const DOC_REGISTERED: ReadonlyArray<{ code: number; identifier: string }> = [\n${docRowsLiteral}\n];\n\n` +
  `const HTTP_STATUS_MAP: Readonly<Record<number, number>> = {\n${statusLiteral}\n};\n\n` +
  `const AUTHZ_DENY_CODES: ReadonlyArray<number> = [${denyCodes.join(", ")}];\n\n` +
  `const liveCodes = ERROR_CODES as Record<string, number>;\n` +
  `const liveCodeValues: number[] = Object.values(liveCodes);\n` +
  `const liveStatus = DEFAULT_STATUS_BY_CODE as Record<number, number | undefined>;\n\n` +
  `describe("[contract] 错误码表 ↔ API接口文档 §4（doc 登记 ⊆ 代码表，先登记后实现）", () => {\n` +
  `  it("生成期码表与 live ERROR_CODES 逐值一致（防 shared 漂移未重生成）", () => {\n` +
  `    for (const [k, v] of Object.entries(CODE_TABLE)) {\n` +
  `      expect(liveCodes, \`码 \${k} 应存在于 ERROR_CODES\`).toHaveProperty(k);\n` +
  `      expect(liveCodes[k], \`码 \${k} 值漂移\`).toBe(v);\n` +
  `    }\n` +
  `    expect(Object.keys(liveCodes).length).toBe(Object.keys(CODE_TABLE).length);\n` +
  `  });\n\n` +
  `  it("§4 每个登记码在代码表同名同值（doc 不登记代码表之外的码）", () => {\n` +
  `    for (const { code, identifier } of DOC_REGISTERED) {\n` +
  `      expect(liveCodes, \`§4 登记的 \${identifier} 应在 ERROR_CODES\`).toHaveProperty(identifier);\n` +
  `      expect(liveCodes[identifier], \`\${identifier} 码值应 = \${code}\`).toBe(code);\n` +
  `    }\n` +
  `  });\n` +
  `});\n\n` +
  `describe("[contract] HTTP 状态映射（DEFAULT_STATUS_BY_CODE + httpStatusOf 规则）", () => {\n` +
  `  it("live 映射与生成期快照逐值一致", () => {\n` +
  `    for (const [c, s] of Object.entries(HTTP_STATUS_MAP)) {\n` +
  `      expect(liveStatus[Number(c)], \`code \${c} 状态漂移\`).toBe(s);\n` +
  `    }\n` +
  `    expect(Object.keys(liveStatus).length).toBe(Object.keys(HTTP_STATUS_MAP).length);\n` +
  `  });\n\n` +
  `  it("映射表每个键都是已登记码值", () => {\n` +
  `    for (const c of Object.keys(HTTP_STATUS_MAP)) {\n` +
  `      expect(liveCodeValues, \`映射键 \${c} 应为合法码\`).toContain(Number(c));\n` +
  `    }\n` +
  `  });\n\n` +
  `  it("httpStatusOf：命中映射优先，否则 50000→500 / 其余→400", () => {\n` +
  `    for (const c of liveCodeValues) {\n` +
  `      const expected = HTTP_STATUS_MAP[c] ?? (c === 50000 ? 500 : 400);\n` +
  `      expect(httpStatusOf(c as ErrorCodeValue), \`httpStatusOf(\${c})\`).toBe(expected);\n` +
  `    }\n` +
  `  });\n` +
  `});\n\n` +
  `describe("[contract] 错误信封 ErrorBodySchema", () => {\n` +
  `  it("已登记码信封通过；未登记码/非空 data/空 message 拒绝", () => {\n` +
  `    const registered = DOC_REGISTERED[0].code;\n` +
  `    expect(ErrorBodySchema.safeParse({ code: registered, message: "m", data: null, requestId: "r" }).success).toBe(true);\n` +
  `    expect(ErrorBodySchema.safeParse({ code: 99999, message: "m", data: null, requestId: "r" }).success).toBe(false);\n` +
  `    expect(ErrorBodySchema.safeParse({ code: registered, message: "m", data: { x: 1 }, requestId: "r" }).success).toBe(false);\n` +
  `    expect(ErrorBodySchema.safeParse({ code: registered, message: "", data: null, requestId: "r" }).success).toBe(false);\n` +
  `  });\n` +
  `});\n\n` +
  `describe("[contract] AUTHZ_BOUNDARY deny 码 ∈ 错误码表（或 -1 序列化白名单哨兵）", () => {\n` +
  `  it("每条拒绝边界引用的错误码都已登记", () => {\n` +
  `    for (const deny of AUTHZ_DENY_CODES) {\n` +
  `      if (deny === -1) continue;\n` +
  `      expect(liveCodeValues, \`AUTHZ deny \${deny} 应为已登记码\`).toContain(deny);\n` +
  `    }\n` +
  `  });\n` +
  `});\n`;

// —— RBAC 契约 spec ——
const identitySpec =
  HEADER("packages/shared/src/permissions.ts + contracts/03-identity.contract.ts") +
  `import { describe, expect, it } from "vitest";\n` +
  `import { ADMIN_DOMAIN_KEYS, ALL_PERMISSION_CODES, SYSTEM_ROLES, PERMISSION_WILDCARD } from "../../permissions";\n\n` +
  `// 生成期冻结：域数（ADMIN_DOMAINS 键计数）与权限码形（来自 PermissionCodeSchema）\n` +
  `const EXPECTED_DOMAIN_COUNT = ${domainCount};\n` +
  `const PERMISSION_CODE_RE = ${permCodeRegex};\n\n` +
  `describe("[contract] RBAC 权限注册表（A2 唯一契约源）", () => {\n` +
  `  it("域数稳定（漂移须同步 seed-rbac 并重生成）", () => {\n` +
  `    expect(ADMIN_DOMAIN_KEYS.length).toBe(EXPECTED_DOMAIN_COUNT);\n` +
  `    expect(ALL_PERMISSION_CODES.length).toBe(EXPECTED_DOMAIN_COUNT * 2); // 每域 read+write\n` +
  `  });\n\n` +
  `  it("每个权限码匹配 admin.<域>.<read|write> 码形", () => {\n` +
  `    for (const code of ALL_PERMISSION_CODES) {\n` +
  `      expect(PERMISSION_CODE_RE.test(code), \`非法权限码形: \${code}\`).toBe(true);\n` +
  `    }\n` +
  `  });\n\n` +
  `  it("系统角色权限集 ⊆ 注册表 ∪ 通配（不引用未登记码）", () => {\n` +
  `    const registry = new Set(ALL_PERMISSION_CODES);\n` +
  `    for (const role of SYSTEM_ROLES) {\n` +
  `      for (const p of role.permissions) {\n` +
  `        if (p === PERMISSION_WILDCARD) continue;\n` +
  `        expect(registry.has(p), \`\${role.code} 引用未登记权限码 \${p}\`).toBe(true);\n` +
  `      }\n` +
  `    }\n` +
  `  });\n` +
  `});\n`;

// —— 信封 round-trip 契约 spec ——
const envelopeSpec =
  HEADER("packages/shared/src/schemas/common.schema.ts（envelope / ErrorResponseShapeSchema）") +
  `import { describe, expect, it } from "vitest";\n` +
  `import { z } from "zod";\n` +
  `import { envelope, ErrorResponseShapeSchema } from "../../schemas/common.schema";\n\n` +
  `describe("[contract] 统一信封 round-trip（四要素 code/message/data/requestId）", () => {\n` +
  `  it("成功信封：data 载荷按 schema 校验通过", () => {\n` +
  `    const schema = envelope(z.object({ id: z.string(), n: z.number() }));\n` +
  `    const ok = schema.safeParse({ code: 0, message: "ok", data: { id: "a", n: 1 }, requestId: "r-1" });\n` +
  `    expect(ok.success).toBe(true);\n` +
  `  });\n\n` +
  `  it("成功信封：data=null 允许（nullable），载荷形状非法拒绝", () => {\n` +
  `    const schema = envelope(z.object({ id: z.string() }));\n` +
  `    expect(schema.safeParse({ code: 0, message: "ok", data: null, requestId: "r" }).success).toBe(true);\n` +
  `    expect(schema.safeParse({ code: 0, message: "ok", data: { id: 1 }, requestId: "r" }).success).toBe(false);\n` +
  `  });\n\n` +
  `  it("错误信封基形：data 恒 null，非空 data / code 非整拒绝", () => {\n` +
  `    expect(ErrorResponseShapeSchema.safeParse({ code: 40000, message: "x", data: null, requestId: "r" }).success).toBe(true);\n` +
  `    expect(ErrorResponseShapeSchema.safeParse({ code: 40000, message: "x", data: {}, requestId: "r" }).success).toBe(false);\n` +
  `    expect(ErrorResponseShapeSchema.safeParse({ code: 1.5, message: "x", data: null, requestId: "r" }).success).toBe(false);\n` +
  `  });\n` +
  `});\n`;

// —— 写出（确定性）——
mkdirSync(OUT_DIR, { recursive: true });
const outputs = [
  ["errors.generated.spec.ts", errorsSpec],
  ["identity.generated.spec.ts", identitySpec],
  ["envelope.generated.spec.ts", envelopeSpec],
];
for (const [name, content] of outputs) {
  writeFileSync(resolve(OUT_DIR, name), content, "utf8");
}

console.log(
  `[gen-contract-tests] 生成 ${outputs.length} 个契约 spec：` +
    `码表 ${Object.keys(codes).length} 码 / HTTP 映射 ${Object.keys(statusMap).length} 条 / ` +
    `§4 登记 ${docRows.length} 行 / 域 ${domainCount} / AUTHZ deny ${denyCodes.length} 条` +
    ` → packages/shared/src/__tests__/contract/`,
);
