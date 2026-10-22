#!/usr/bin/env node
/**
 * RK-11-09 · node_modules 包目录「空壳」深扫守卫 + 归因取证。
 *
 * 症状签名（12_风险与待裁决 RK-11-09）：pnpm 虚拟仓 `node_modules/.pnpm/<id>/node_modules/<pkg>` 目录仍在，
 * 但 entries=0（或缺 package.json）；`next` 空壳会让 build 直接 exit=1，`@prisma/client` 空壳会让 seed/运行期崩。
 *
 * 本守卫做两件事，不做任何修复（修复路径仍是归档口径，由人决定是否执行）：
 *   1. 深扫：遍历 `.pnpm/*\/node_modules/*`（含 @scope/*），报出 entries=0 或缺 package.json 的包目录。
 *   2. 取证：一旦异常>0，把「空壳清单 + 各自 mtime（聚类窗口）+ 当时在跑的 node/pnpm/IDE 进程快照」
 *      追加写入 `.scratch/nm-integrity.log`（已 gitignore），让下一次事故自带归因材料，
 *      从而不必再以「故意重现、摧毁环境」为代价做归因实验。
 *
 * 用法：
 *   node scripts/guard/node-modules-integrity.mjs [--root <dir>] [--phase prebuild|postbuild|manual]
 * 退出码：0 = 无空壳；1 = 发现空壳（附修复命令提示）；2 = 未找到 node_modules/.pnpm（未安装，跳过不算失败时用 --allow-missing）。
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ROOT = resolve(arg("--root", resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const PHASE = arg("--phase", "manual");
const ALLOW_MISSING = argv.includes("--allow-missing");

/** 关键包：任一为空壳即视为构建必失败（报告里置顶） */
export const CRITICAL = ["next", "@prisma/client", "react", "react-dom", "typescript", "tsx", "esbuild"];

/** 纯函数：给定 .pnpm 目录，返回空壳列表（可注入 fs 以便单测） */
export function scanPnpmStore(pnpmDir, fs = { readdirSync, statSync, existsSync }) {
  const shells = [];
  let scanned = 0;
  for (const id of fs.readdirSync(pnpmDir)) {
    if (id.startsWith(".")) continue; // .modules.yaml / lock 等
    const nm = join(pnpmDir, id, "node_modules");
    if (!fs.existsSync(nm)) continue;
    for (const top of fs.readdirSync(nm)) {
      if (top === ".bin" || top === ".prisma") continue;
      const tops = top.startsWith("@")
        ? fs.readdirSync(join(nm, top)).map((n) => [`${top}/${n}`, join(nm, top, n)])
        : [[top, join(nm, top)]];
      for (const [name, dir] of tops) {
        let st;
        try {
          st = fs.statSync(dir);
        } catch {
          continue; // 断链 symlink 由 pnpm 自己负责，不在本签名内
        }
        if (!st.isDirectory()) continue;
        // 只认「本 id 自身的包」，跳过 pnpm 为依赖建的 symlink（它们指向别的 id，会在那个 id 下被扫到）
        if (!id.startsWith(name.replace("/", "+") + "@")) continue;
        scanned += 1;
        const entries = fs.readdirSync(dir);
        if (entries.length === 0 || !entries.includes("package.json")) {
          shells.push({ name, id, dir, entries: entries.length, mtimeMs: st.mtimeMs });
        }
      }
    }
  }
  return { scanned, shells };
}

function processSnapshot() {
  try {
    if (process.platform === "win32") {
      return execFileSync("tasklist", ["/v", "/fo", "csv"], { encoding: "utf8", timeout: 15000 })
        .split(/\r?\n/)
        .filter((l) => /node|pnpm|npm|code|qoder|cursor|msmpeng|searchindexer|esbuild|next/i.test(l))
        .join("\n");
    }
    return execFileSync("ps", ["-eo", "pid,ppid,lstart,args"], { encoding: "utf8", timeout: 15000 })
      .split("\n")
      .filter((l, i) => i === 0 || /node|pnpm|npm|esbuild|next/i.test(l))
      .join("\n");
  } catch (e) {
    return `进程快照失败：${e instanceof Error ? e.message : String(e)}`;
  }
}

function main() {
  const pnpmDir = join(ROOT, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) {
    console.log(`[nm-integrity] 未找到 ${pnpmDir}（尚未安装）`);
    process.exit(ALLOW_MISSING ? 0 : 2);
  }
  const t0 = Date.now();
  const { scanned, shells } = scanPnpmStore(pnpmDir);
  const ms = Date.now() - t0;
  if (shells.length === 0) {
    console.log(`[nm-integrity] OK phase=${PHASE} scanned=${scanned} shells=0 (${ms}ms)`);
    return;
  }
  const critical = shells.filter((s) => CRITICAL.includes(s.name));
  const times = shells.map((s) => s.mtimeMs).sort((a, b) => a - b);
  const window = `${new Date(times[0]).toISOString()} – ${new Date(times[times.length - 1]).toISOString()}`;
  const lines = [
    `===== ${new Date().toISOString()} phase=${PHASE} host-platform=${process.platform} pid=${process.pid} ppid=${process.ppid}`,
    `scanned=${scanned} shells=${shells.length} critical=${critical.map((s) => s.name).join(",") || "-"}`,
    `mtime 窗口=${window}`,
    ...shells.map((s) => `  ${s.name}  entries=${s.entries}  mtime=${new Date(s.mtimeMs).toISOString()}  ${s.id}`),
    `--- 进程快照 ---`,
    processSnapshot(),
    "",
  ];
  try {
    mkdirSync(join(ROOT, ".scratch"), { recursive: true });
    appendFileSync(join(ROOT, ".scratch", "nm-integrity.log"), lines.join("\n") + "\n");
  } catch {
    /* 取证失败不影响判定 */
  }
  console.error(`[nm-integrity] FAIL phase=${PHASE} 发现 ${shells.length} 个空壳包（关键包：${critical.map((s) => s.name).join(", ") || "无"}）`);
  for (const s of shells.slice(0, 20)) console.error(`  ${s.name} (${s.id}) entries=${s.entries}`);
  if (shells.length > 20) console.error(`  ……另 ${shells.length - 20} 个，见 .scratch/nm-integrity.log`);
  console.error(`  mtime 窗口：${window}`);
  console.error(
    "  归档修复口径（不改依赖）：pnpm install --frozen-lockfile --force --prefer-offline --config.confirm-modules-purge=false",
  );
  console.error("  取证已追加至 .scratch/nm-integrity.log（含进程快照）——请连同该文件一起上报，勿删除。");
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
