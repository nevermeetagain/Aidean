// TASK-007 守卫①：根目录污染（规格步骤1）。
// 双重拦截，覆盖「本地脏树游离」与「CI 提交型污染」两类真实场景（CodeReview M-2）：
//   A) 提交型：根级 tracked 文件必须 ⊆ scripts/guard/root-allowlist.txt 基线；基线之外的根级 tracked 文件 = 污染 → FAIL。
//   B) 游离型：未跟踪且未被 .gitignore 忽略的根级文件（随手 drop 的 .log/.tmp/脚本）→ FAIL（CI 干净检出下恒空，本地有效）。
//   C) 漂移：基线登记项当前已不在根级 tracked（文件被移除/改名）→ WARN（提示更新基线，不阻断）。
// 负向自测：在根新建一个未忽略文件 → FAIL；或提交一个不在基线的根级文件 → FAIL。
import { git, trackedFiles, readRepoFile, makeReporter } from "./_lib.mjs";

const rep = makeReporter("root-pollution");
rep.title("root-pollution（根目录污染）");

const top = (p) => !p.includes("/");

// 基线（提交态唯一真源）
const baseline = readRepoFile("scripts/guard/root-allowlist.txt")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("#"));
const baselineSet = new Set(baseline);

// 当前根级 tracked 文件
const trackedRoot = trackedFiles().filter(top).sort();

// A) 提交型污染：tracked 根级 ⊖ 基线
const committedPollution = trackedRoot.filter((f) => !baselineSet.has(f));
if (committedPollution.length === 0) {
  rep.pass(`根级 tracked 文件（${trackedRoot.length} 个）全部 ∈ 基线（${baseline.length} 项），无提交型污染。`);
} else {
  for (const f of committedPollution) {
    rep.fail(`提交型污染：根级 tracked 文件不在基线 root-allowlist.txt 中：${f}`);
  }
}

// C) 基线漂移：基线项已不在 tracked 根级
const drift = baseline.filter((b) => !trackedRoot.includes(b));
for (const b of drift) {
  rep.warn(`基线漂移：root-allowlist.txt 登记项当前不在根级 tracked（可能已移除/改名）：${b}`);
}

// B) 游离型污染：未跟踪且非忽略的根级文件
const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"])
  .split("\0")
  .filter(Boolean)
  .map((p) => p.replace(/\\/g, "/"))
  .filter(top);
if (untracked.length === 0) {
  rep.pass("未发现新增/游离的根级文件（未跟踪非忽略集合为空）。");
} else {
  for (const f of untracked) {
    rep.fail(`游离根级文件（未跟踪、未被 .gitignore 忽略）：${f}`);
  }
}

rep.finish();
