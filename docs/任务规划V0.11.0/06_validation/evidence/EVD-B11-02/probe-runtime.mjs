// B11-02 运行态探针（EVD-B11-02 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// /pricing 在 CN / US 国家头下的展示币种、付费样本、原币注记、促销徽标
// 口径同 .scratch/pricing011.mjs；币种仅由部署层国家头决定
// 用法：先起 dev server（带 AIDEAN_ENABLE_MOCK_UPSTREAM=1），再 node <本文件>
import { appendFileSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3000";
writeFileSync(".scratch/b1102-runtime.txt", "", "utf8");
const log = (o) => {
  const s = JSON.stringify(o);
  console.log(s);
  appendFileSync(".scratch/b1102-runtime.txt", s + "\n", "utf8");
};

const probe = async (label, headers) => {
  const res = await fetch(`${BASE}/pricing`, { headers: { ...headers }, cache: "no-store" });
  const html = await res.text();
  const count = (re) => (html.match(re) || []).length;
  const testid = (name) => {
    const m = html.match(new RegExp(`data-testid="${name}"[^>]*>([\\s\\S]{0,200}?)<`, ""));
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  };
  // 逐行切出 <tr data-testid="gateway-price-row">…</tr>，抽取前若干行的纯文本
  const rows = [...html.matchAll(/data-testid="gateway-price-row"[\s\S]*?<\/tr>/g)].map((m) =>
    m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
  const rowWithPromo = rows.find((r) => /限时/.test(r)) ?? null;
  const rowWithSourceNote = rows.find((r) => /官方\s*[$¥]/.test(r)) ?? null;
  const out = {
    label,
    status: res.status,
    displayCurrency: testid("display-currency"),
    priceRows: count(/data-testid="gateway-price-row"/g),
    pendingCount: count(/data-testid="price-pending"/g),
    sourceNoteCount: count(/data-testid="price-source-note"/g),
    promoTagCount: count(/data-testid="price-tag-promo"/g),
    promoBadgeCount: count(/data-testid="price-promo-badge"/g),
    basePriceTagCount: count(/data-testid="price-base"/g),
    freeTextCount: count(/>免费</g),
    fxNote: testid("fx-note"),
    promoRowSample: rowWithPromo ? rowWithPromo.slice(0, 160) : null,
    sourceNoteRowSample: rowWithSourceNote ? rowWithSourceNote.slice(0, 160) : null,
    first3Rows: rows.slice(0, 3).map((r) => r.slice(0, 120)),
  };
  log(out);
  return html;
};

await probe("CN", { "cf-ipcountry": "CN" });
await probe("US", { "cf-ipcountry": "US" });
