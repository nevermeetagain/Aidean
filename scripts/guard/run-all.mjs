// TASK-007 守卫聚合器：按序运行全部守卫（TASK-007 四项 + B11-10/B11-11 两项），透传子进程输出，聚合退出码（任一 FAIL → 整体 exit 1）。
// 用法：node scripts/guard/run-all.mjs
// 零新依赖：node 内置 child_process/path/url。跨 cwd 稳定（以脚本自身定位仓库根）。
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GUARD_DIR = path.dirname(fileURLToPath(import.meta.url));
const GUARDS = [
  "root-pollution.mjs",
  "secret-scan.mjs",
  "module-boundary.mjs",
  "port-consistency.mjs",
  "api-method-coverage.mjs", // B11-10：未实现方法 405 信封 + API 兜底 404
  ["pagination-guard.mjs", "--strict"], // B11-11：15 端点已接入、例外清单为空，Hark 2026-10-22 裁定切 strict
];

let failures = 0;
const results = [];

for (const entry of GUARDS) {
  const [g, ...args] = Array.isArray(entry) ? entry : [entry];
  const r = spawnSync(process.execPath, [path.join(GUARD_DIR, g), ...args], { stdio: "inherit" });
  const code = r.status === null ? 1 : r.status; // 无法启动/被信号杀死 → 视为失败
  results.push({ g, code });
  if (code !== 0) failures++;
}

console.log("\n=== run-all: AGGREGATE ===");
for (const { g, code } of results) {
  console.log(`  ${code === 0 ? "PASS" : "FAIL"} ${g} (exit ${code})`);
}
if (failures === 0) {
  console.log(`RESULT: PASS (${GUARDS.length}/${GUARDS.length} 守卫通过)`);
  process.exit(0);
}
console.log(`RESULT: FAIL (${failures}/${GUARDS.length} 守卫失败)`);
process.exit(1);
