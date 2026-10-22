/**
 * RK-11-07 / RK-11-09 契约单测：
 * - bundle-scripts 的源→产物映射与 script-executor 的产物探测同一口径（两处漂移即红）
 * - node-modules-integrity 深扫能识别 entries=0 / 缺 package.json 的空壳，且不把依赖 symlink 误报
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planScriptRun } from "../script-executor";

const bundle = await import("../../../../../../scripts/build/bundle-scripts.mjs");
const integrity = await import("../../../../../../scripts/guard/node-modules-integrity.mjs");

describe("RK-11-07 · 产物映射口径一致", () => {
  it("每个白名单源在 bundle 的 distRelOf 路径上，正是 executor 在镜像内会选中的文件", () => {
    const entries: string[] = bundle.listEntries();
    expect(entries.length).toBeGreaterThanOrEqual(4);
    for (const src of entries) {
      const distAbs = join("/app", bundle.distRelOf(src));
      const plan = planScriptRun(src, { cwd: "/app", platform: "linux", execPath: "/node", exists: (p: string) => p === distAbs });
      expect(plan.args[0]).toBe(distAbs);
    }
  });

  it("已登记的 4 个调度脚本都在打包范围内", () => {
    const entries: string[] = bundle.listEntries();
    for (const s of ["scripts/crawl/crawl_models.ts", "scripts/ranking/update_ranking.ts", "scripts/crawl/crawl_llmtest.ts", "scripts/crawl/fx_daily.ts"]) {
      expect(entries).toContain(s);
    }
  });
});

describe("RK-11-09 · node_modules 空壳深扫", () => {
  const mk = () => {
    const root = mkdtempSync(join(tmpdir(), "nmi-"));
    const pnpm = join(root, "node_modules", ".pnpm");
    const pkg = (id: string, name: string, files: string[]) => {
      const d = join(pnpm, id, "node_modules", ...name.split("/"));
      mkdirSync(d, { recursive: true });
      for (const f of files) writeFileSync(join(d, f), "{}");
    };
    return { pnpm, pkg };
  };

  it("健康仓 → 0 空壳", () => {
    const { pnpm, pkg } = mk();
    pkg("next@15.0.3", "next", ["package.json", "index.js"]);
    pkg("@prisma+client@6.19.3", "@prisma/client", ["package.json"]);
    const r = integrity.scanPnpmStore(pnpm);
    expect(r.scanned).toBe(2);
    expect(r.shells).toEqual([]);
  });

  it("entries=0 与缺 package.json 都算空壳（含 scope 包）", () => {
    const { pnpm, pkg } = mk();
    pkg("next@15.0.3", "next", []);
    pkg("@prisma+client@6.19.3", "@prisma/client", ["index.js"]);
    pkg("ok@1.0.0", "ok", ["package.json"]);
    const names = integrity.scanPnpmStore(pnpm).shells.map((s: { name: string }) => s.name).sort();
    expect(names).toEqual(["@prisma/client", "next"]);
  });

  it("同 id 下的依赖目录（非本包）不计入扫描，避免重复与误报", () => {
    const { pnpm, pkg } = mk();
    pkg("next@15.0.3", "next", ["package.json"]);
    pkg("next@15.0.3", "react", []); // 依赖位：真实环境是 symlink，此处模拟为空目录
    const r = integrity.scanPnpmStore(pnpm);
    expect(r.scanned).toBe(1);
    expect(r.shells).toEqual([]);
  });

  it("关键包清单包含 next 与 @prisma/client", () => {
    expect(integrity.CRITICAL).toEqual(expect.arrayContaining(["next", "@prisma/client"]));
  });
});
