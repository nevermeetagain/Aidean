// TASK-007 守卫脚本共享工具（零新依赖：仅 node 内置 fs/path/url/child_process）。
// 所有守卫经此解析仓库根、调用 git、读文件，行为确定、跨 cwd 稳定。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 仓库根 = scripts/guard/_lib.mjs 的上两级（不受 cwd 影响）
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** 运行 git，返回 stdout（utf8）。失败抛错。args 为参数数组。 */
export function git(args) {
  const r = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.error) {
    throw new Error(`git ${args.join(" ")} 无法执行：${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} 失败（exit ${r.status}）：${(r.stderr || "").trim()}`);
  }
  return r.stdout || "";
}

/** git ls-files -z → 相对 posix 路径数组（tracked）。 */
export function trackedFiles() {
  return git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}

/** 读仓库内文件（utf8）。rel 为 posix 相对路径。 */
export function readRepoFile(rel) {
  return fs.readFileSync(path.join(ROOT, ...rel.split("/")), "utf8");
}

/** 安全读：文件不存在或读失败返回 null（守卫据此跳过而非崩溃）。 */
export function tryReadRepoFile(rel) {
  try {
    return readRepoFile(rel);
  } catch {
    return null;
  }
}

/** 二进制启发式：含 NUL 字节视为二进制，跳过文本扫描。 */
export function looksBinary(content) {
  return content.includes("\u0000");
}

// —— 统一输出：PASS/WARN/FAIL 前缀，末行 SUMMARY，便于 CI 日志与证据归档 ——
export const out = {
  pass: (m) => console.log(`  [PASS] ${m}`),
  warn: (m) => console.log(`  [WARN] ${m}`),
  fail: (m) => console.log(`  [FAIL] ${m}`),
  title: (m) => console.log(`\n=== ${m} ===`),
};

/** 报告器：累计 fail/warn 计数，决定进程退出码。 */
export function makeReporter(name) {
  let failures = 0;
  let warns = 0;
  return {
    name,
    title(msg) {
      out.title(msg);
    },
    fail(msg) {
      failures++;
      out.fail(msg);
    },
    warn(msg) {
      warns++;
      out.warn(msg);
    },
    pass(msg) {
      out.pass(msg);
    },
    finish() {
      out.title(`${name}: SUMMARY`);
      console.log(`  failures=${failures} warnings=${warns}`);
      if (failures > 0) {
        console.log(`RESULT: FAIL (${name})`);
        process.exit(1);
      }
      console.log(`RESULT: PASS${warns > 0 ? ` (with ${warns} warning(s))` : ""} (${name})`);
      process.exit(0);
    },
  };
}
