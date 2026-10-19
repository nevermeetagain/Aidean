// TASK-007 守卫聚合器：按序运行四项守卫，透传子进程输出，聚合退出码（任一 FAIL → 整体 exit 1）。
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
];

let failures = 0;
const results = [];

for (const g of GUARDS) {
  const r = spawnSync(process.execPath, [path.join(GUARD_DIR, g)], { stdio: "inherit" });
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
