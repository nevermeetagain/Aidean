/**
 * B11-11 守卫 scripts/guard/pagination-guard.mjs 单测：纯函数判定 + 对当前仓库 exit 0（棘轮模式）。
 */
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const GUARD = path.join(REPO_ROOT, "scripts/guard/pagination-guard.mjs");

type Guard = {
  scanContent: (src: string) => { p1: { line: number }[]; p2: { line: number }[] };
  ALLOWLIST_P1: string[];
};

describe("pagination-guard", () => {
  it("scanContent：裸 parseInt / Number(searchParams…) 命中；注释内不命中；行号不因块注释偏移", async () => {
    const g = (await import(/* @vite-ignore */ GUARD)) as Guard;
    const src = [
      "/**",
      " * 示例：parseInt(searchParams.get('page'))",
      " */",
      "// parseInt(x) 行注释",
      "const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));",
      "const n = Number(url.searchParams.get('n'));",
      "const ok = parsePagination(url);",
      'const link = "http://x"; // parseInt in trailing comment',
    ].join("\n");
    const r = g.scanContent(src);
    expect(r.p1.map((x) => x.line)).toEqual([5]);
    expect(r.p2.map((x) => x.line)).toEqual([6]);
  });

  it("参考实现 scripts/[id]/executions 已不在待接入名单（已迁移至共享件）", async () => {
    const g = (await import(/* @vite-ignore */ GUARD)) as Guard;
    expect(g.ALLOWLIST_P1.some((f) => f.includes("scripts/[id]/executions"))).toBe(false);
    // 名单只减不增：B11-11 基线为 15（每接入一个端点删一行）
    expect(g.ALLOWLIST_P1.length).toBeLessThanOrEqual(15);
  });

  it("对当前仓库：棘轮模式 exit 0；strict 模式在名单非空时 exit 1、清空后 exit 0", async () => {
    const g = (await import(/* @vite-ignore */ GUARD)) as Guard;
    const out = execFileSync(process.execPath, [GUARD], { encoding: "utf8" });
    expect(out).toContain("RESULT: PASS");
    const strict = spawnSync(process.execPath, [GUARD, "--strict"], { encoding: "utf8" });
    expect(strict.status).toBe(g.ALLOWLIST_P1.length > 0 ? 1 : 0);
  });
});
