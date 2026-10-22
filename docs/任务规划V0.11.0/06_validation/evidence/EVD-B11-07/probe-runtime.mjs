// B11-07 运行态取证（EVD-B11-07 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// 抓取 /models/<slug> 详情页「在哪里可调用」区块的可见文本
// 用法：node probe-runtime.mjs [slug...]（需 next dev 在 :3000）
const slugs = process.argv.slice(2);
const targets = slugs.length > 0 ? slugs : ["demo-model-041", "demo-model-060"];

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

for (const slug of targets) {
  const url = `http://localhost:3000/models/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  const body = strip(html);
  const lines = body.split("\n");
  // 定位「在哪里可调用」区块到「多源上架观测」之前
  const start = lines.findIndex((l) => l.includes("在哪里可调用"));
  const end = lines.findIndex((l, i) => i > start && l.includes("多源上架观测"));
  const block = start >= 0 ? lines.slice(start, end > start ? end + 3 : start + 40) : [];
  const counts = {
    openrouterText: (html.match(/OpenRouter/g) ?? []).length,
    perMillion: (html.match(/per_million/g) ?? []).length,
    offeringsText: (html.match(/offerings/g) ?? []).length,
  };
  console.log(JSON.stringify({ slug, url, status: res.status, htmlBytes: html.length, counts, block: block.filter((l) => l.trim()) }, null, 1));
}
