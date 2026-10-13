// standalone 产物补全：next build 的 output:"standalone" 不会自动携带
// .next/static 与 public，缺任何一项都会导致运行期静态资源/图片 404
// （2026-09-14 logo 碎图事故根因）。本脚本由 package.json postbuild 钩子
// 在每次构建后自动执行，保证 standalone 目录自足、可直接 node server.js 起服。
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(webRoot, ".next", "standalone", "apps", "web");

if (!existsSync(target)) {
  console.error(`[postbuild] standalone 目录不存在：${target}`);
  process.exit(1);
}

const jobs = [
  { from: join(webRoot, ".next", "static"), to: join(target, ".next", "static") },
  { from: join(webRoot, "public"), to: join(target, "public") },
];

for (const { from, to } of jobs) {
  if (!existsSync(from)) {
    console.error(`[postbuild] 缺少源目录：${from}`);
    process.exit(1);
  }
  cpSync(from, to, { recursive: true });
  console.log(`[postbuild] copied ${from.replace(webRoot, "apps/web")} -> ${to.replace(webRoot, "apps/web")}`);
}
