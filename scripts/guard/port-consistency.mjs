// TASK-007 守卫④：端口区间一致性（规格步骤4）。
// 两部分：
//  (1) Aidean 自身入口（apps/web/package.json dev/start、两份 playwright.config baseURL/webServer、
//      Dockerfile PORT/EXPOSE、auth/constants.ts AUTH_ISSUER/AUTH_ISSUER_CONTAINER）端口必须 ∈ aideanSelf 区间。
//  (2) seed.ts 中「URL 含 callback」的 localhost 回调端口，逐一必须落在 port-ranges.json 登记区间：
//      命中 confirmed=true 区间 → PASS；命中 confirmed=false（P-1/P-2 未裁决）→ WARN；全部区间之外 → FAIL。
// 端口区间真源：scripts/guard/port-ranges.json（不含任何凭据）。
import { trackedFiles, readRepoFile, tryReadRepoFile, makeReporter } from "./_lib.mjs";

const rep = makeReporter("port-consistency");
rep.title("port-consistency（端口区间一致性）");

// —— 载入区间登记表 ——
let cfg;
try {
  cfg = JSON.parse(readRepoFile("scripts/guard/port-ranges.json"));
} catch (e) {
  rep.fail(`无法读取 scripts/guard/port-ranges.json：${e.message}`);
  rep.finish();
}
const SELF = cfg.aideanSelf; // { min, max, confirmed }
const RANGES = cfg.ranges || [];
const inSelf = (p) => Number.isInteger(p) && p >= SELF.min && p <= SELF.max;
const matchRange = (p) => RANGES.find((r) => p >= r.min && p <= r.max) || null;

// 通用：从内容里按给定正则捕获端口数字集合。
// 加固（CodeReview M-1）：非全局正则的 exec 会停在 index 0 造成 while 死循环→OOM。
// 这里强制以带 g 的副本运行，并对零宽匹配前移 lastIndex，双重防死循环；对调用方是否写 /g 均稳健。
function portsFrom(content, re) {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const gre = new RegExp(re.source, flags);
  const found = [];
  let m;
  while ((m = gre.exec(content)) !== null) {
    found.push(Number(m[1]));
    if (m.index === gre.lastIndex) gre.lastIndex++;
  }
  return found;
}

// —— (1) Aidean 自身入口 ∈ [SELF.min, SELF.max] ——
const SELF_ANCHORS = [
  {
    file: "apps/web/package.json",
    label: "apps/web dev/start 显式端口",
    extract(c) {
      // scripts.dev / scripts.start 里的 -p/--port；无显式端口=默认 3000。
      let j;
      try { j = JSON.parse(c); } catch { return null; }
      const s = `${(j.scripts && j.scripts.dev) || ""} ${(j.scripts && j.scripts.start) || ""}`;
      const found = portsFrom(s, /(?:--port|-p)[ =](\d{2,5})/g);
      return { ports: found, emptyIsOk: true, note: found.length ? "" : "未显式指定端口→Next 默认 3000" };
    },
  },
  {
    file: "e2e/playwright.config.ts",
    label: "e2e/playwright baseURL/webServer 端口",
    extract: (c) => ({ ports: portsFrom(c, /localhost:(\d{2,5})/g) }),
  },
  {
    file: "playwright.config.ts",
    label: "根 playwright baseURL/webServer 端口",
    extract: (c) => ({ ports: portsFrom(c, /localhost:(\d{2,5})/g) }),
  },
  {
    file: "Dockerfile",
    label: "Dockerfile PORT/EXPOSE",
    extract: (c) => ({ ports: portsFrom(c, /(?:ENV\s+PORT=|EXPOSE\s+)(\d{2,5})/g) }),
  },
  {
    file: "apps/web/lib/features/auth/constants.ts",
    label: "auth AUTH_ISSUER / AUTH_ISSUER_CONTAINER",
    extract: (c) => ({ ports: portsFrom(c, /(?:localhost|host\.docker\.internal):(\d{2,5})/g) }),
  },
];

for (const anchor of SELF_ANCHORS) {
  const content = tryReadRepoFile(anchor.file);
  if (content == null) {
    rep.warn(`入口锚点缺失，无法核验：${anchor.file}`);
    continue;
  }
  const r = anchor.extract(content);
  if (!r) {
    rep.warn(`入口锚点解析失败：${anchor.file}`);
    continue;
  }
  const ports = r.ports || [];
  if (ports.length === 0) {
    if (r.emptyIsOk) rep.pass(`入口 ${anchor.label}：合规（${r.note || "默认端口在区间"}）。`);
    else rep.warn(`入口 ${anchor.label}：未从 ${anchor.file} 提取到端口，需人工确认。`);
    continue;
  }
  const bad = ports.filter((p) => !inSelf(p));
  if (bad.length === 0) {
    rep.pass(`入口 ${anchor.label}：端口 ${[...new Set(ports)].join(",")} 全部 ∈ [${SELF.min},${SELF.max}]。`);
  } else {
    rep.fail(`入口 ${anchor.label}：端口 ${[...new Set(bad)].join(",")} 越出 Aidean 自身区间 [${SELF.min},${SELF.max}]（${anchor.file}）。`);
  }
}

// —— (2) seed.ts OIDC localhost 回调端口 ∈ 登记区间 ——
const SEED_REL = "apps/web/prisma/seed.ts";
const seed = tryReadRepoFile(SEED_REL);
if (seed == null) {
  rep.warn(`未找到 ${SEED_REL}，跳过回调端口核验。`);
} else {
  // 仅取「同一 URL token 含 callback」的 localhost 端口（排除 baseUrl/mock 等非回调端口，如 59998）。
  const tokenRe = /http:\/\/localhost:(\d{2,5})([^\s"'`)]*)/g;
  const callbackPorts = [];
  let m;
  while ((m = tokenRe.exec(seed)) !== null) {
    if (m[2].includes("callback")) callbackPorts.push(Number(m[1]));
  }
  if (callbackPorts.length === 0) {
    rep.warn(`${SEED_REL} 未发现含 callback 的 localhost 回调端口（可能已改名/迁移），请人工确认。`);
  } else {
    for (const p of [...new Set(callbackPorts)]) {
      const range = matchRange(p);
      if (!range) {
        rep.fail(`seed 回调端口 ${p} 不在任何登记区间内（port-ranges.json），越界。`);
      } else if (range.confirmed) {
        rep.pass(`seed 回调端口 ${p} ∈ ${range.platform} [${range.min},${range.max}]（已裁决）。`);
      } else {
        rep.warn(`seed 回调端口 ${p} ∈ ${range.platform} [${range.min},${range.max}]（未裁决 P-1/P-2，暂不阻断）。`);
      }
    }
  }
}

// 附带：确认区间表自身 aideanSelf 与端口铁律一致（3000–3100）。
if (SELF.min === 3000 && SELF.max === 3100) {
  rep.pass(`区间登记表 aideanSelf = [3000,3100]，与端口铁律一致。`);
} else {
  rep.warn(`区间登记表 aideanSelf = [${SELF.min},${SELF.max}]，与端口铁律 3000–3100 不一致，请核对 port-ranges.json。`);
}

rep.finish();
