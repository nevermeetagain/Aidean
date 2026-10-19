# > 版本: v0.7 | 更新: 2026-10-17 | 变更: V0.7.0 沿用——按执行者与所有权把全部卡拆成 Hark + P1/P2/P3 四份自包含任务书（运行：python3 gen_agents.py）
import os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
import tasks_data as D
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
def grp(t):
    if "Hark" in t["assignee"]: return "Hark"
    return {"Agent-API": "P1", "Agent-Contract": "P1", "Agent-Data": "P2", "Agent-Docs": "P2", "Agent-Guard": "P3", "Agent-App": "P1"}[t["owner"]]
T = {t["id"]: t for t in D.T}
# 拓扑序（Kahn，同层按编号）
indeg = {i: 0 for i in T}; ch = collections.defaultdict(list)
for t in D.T:
    for d in t["deps"]:
        if d in T: indeg[t["id"]] += 1; ch[d].append(t["id"])
ready = sorted([i for i, v in indeg.items() if v == 0]); topo = []
while ready:
    i = ready.pop(0); topo.append(i)
    for c in ch[i]:
        indeg[c] -= 1
        if indeg[c] == 0: ready.append(c); ready.sort()
assert len(topo) == len(T), "依赖有环"
META = {
 "Hark": ("Hark（主 Agent）自执行计划——核心/高难度/全部 UI", "所有执行者为 Hark(主Agent) 的卡：契约语义、迁移、资金路径、真库 CI、需求口径、全部前台/后台 UI。"),
 "P1": ("P1 完整任务书——API 与契约实现线（Agent-API / Agent-Contract 的外部卡）", "你只做本书列出的卡。你的写入范围是这些卡「允许修改」的路径（属于 Agent-API：apps/web/app/api/、apps/web/lib/features/、lib/sync（不含 writers）、lib/discovery、lib/monitoring 等；以及少量 Agent-Contract 的 packages/shared/src/ 卡）。"),
 "P2": ("P2 完整任务书——数据与文档线（Agent-Data / Agent-Docs 的外部卡）", "你只做本书列出的卡。写入范围：apps/web/prisma/（不含新迁移，迁移只由 Hark 的 TASK-011/058 创建）、lib/db、lib/sync/writers、docs/（不含 docs/任务规划V0.*/）、CHANGELOG.md、scripts/check-docs-*.mjs。"),
 "P3": ("P3 完整任务书——守卫/测试/CI 线（Agent-Guard 的外部卡）", "你只做本书列出的卡。写入范围：.github/、scripts/（不含 check-docs-*）、apps/web/scripts/、e2e/、playwright.config.ts、vitest.config.ts、package.json/lock、docker/、deploy/、packages/shared/src/__tests__/contract/。"),
}
COMMON = """## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`（B-0' 已裁决 A'：镜像 main 为唯一开发线，2026-10-19）。开工前 `git fetch && git status`，与 origin/main 一致后再动；V0.10.0 基线见 `25_执行记录.md` 末尾的推送 sha；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。已完成卡（089/026/082/027/056/058/060/057 及 V0.8.0 判镜像落地的 0 工时卡）不在本书，依赖它们的卡可直接开工。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**APPROVE 已由用户给出（2026-10-19，Hark 核心卡）；外部卡仍按各卡条件执行**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.10.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。
"""
def card_text(i):
    return open(os.path.join(BASE, "05_execution/tasks", f"TASK-{i}.md"), encoding="utf-8").read().replace("\n# ", "\n#### ").replace("# TASK-", "#### TASK-", 1)
os.makedirs(os.path.join(BASE, "21_Agent任务书"), exist_ok=True)
summary = []
for g, (title, scope) in META.items():
    ids = [i for i in topo if grp(T[i]) == g]
    hrs = sum(T[i]["hours"] for i in ids); cond = [i for i in ids if T[i].get("cond")]
    rows = ["| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |", "|---|---|---|---|---|---|---|---|"]
    for n, i in enumerate(ids, 1):
        t = T[i]; deps = "、".join((d if grp(T[d]) == g else f"★{d}({grp(T[d])})") for d in t["deps"] if d in T) or "—"
        rows.append(f"| {n} | TASK-{i} | {t['slice']} | {t['name'][:48]} | {t['tier']} | {t['hours']}h | {deps} | {t.get('cond') or '—'} |")
    waits = sorted({d for i in ids for d in T[i]["deps"] if d in T and grp(T[d]) != g})
    blocks = sorted({c for i in ids for c in ch[i] if grp(T[c]) != g})
    L = [f"# {title}", "", D.HDR, "", f"> 本书自包含：{len(ids)} 张卡（其中条件卡 {len(cond)} 张），合计 {hrs:g}h。按「序」执行（全局拓扑序）。", "",
         "## 范围", scope, "", COMMON, "## 1. 执行顺序", "", *rows, "",
         f"## 2. 跨线等待", f"- 你要等待的他人卡：{'、'.join('TASK-'+d+'('+grp(T[d])+')' for d in waits) or '无'}",
         f"- 等你完成才能开工的他人卡：{'、'.join('TASK-'+c+'('+grp(T[c])+')' for c in blocks) or '无'}", "",
         "## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）", ""]
    for i in ids: L += [card_text(i), "", "---", ""]
    fn = {"Hark": "Hark-自执行计划.md", "P1": "P1-完整任务书-API与契约线.md", "P2": "P2-完整任务书-数据与文档线.md", "P3": "P3-完整任务书-守卫测试CI线.md"}[g]
    open(os.path.join(BASE, "21_Agent任务书", fn), "w", encoding="utf-8").write("\n".join(L))
    summary.append((g, len(ids), len(cond), hrs, len(waits), len(blocks), fn))
cov = sum(s[1] for s in summary); assert cov == len(T), cov
print(summary, "cover", cov)

# ---- V0.10.0：用户只有 1 个外部助手 → 合并 P1+P2+P3 为单人任务书（全局拓扑序）
ext_ids = [i for i in topo if grp(T[i]) != "Hark"]
import re as _re2
def _locks(i):
    txt = card_text(i)
    m = _re2.search(r"资源锁串行（同文件，须在其后执行）：([^\n]*)", txt)
    return _re2.findall(r"TASK-(\d{3})", m.group(1)) if m else []
def _hark_anc(i, seen=None):
    seen = seen or set()
    if any(d in T and grp(T[d]) == "Hark" for d in _locks(i)):
        return True  # M7：资源锁指向 Hark 卡 → 须等待
    for d in T[i]["deps"]:
        if d in T and d not in seen:
            seen.add(d)
            if grp(T[d]) == "Hark" or T[d].get("cond") or _hark_anc(d, seen): return True
    return False
ready_ids = [i for i in ext_ids if not T[i].get("cond") and not _hark_anc(i)]
wait_ids = [i for i in ext_ids if not T[i].get("cond") and i not in ready_ids]
cond_ids = [i for i in ext_ids if T[i].get("cond")]
def _row(n, i):
    t = T[i]; deps = "、".join((f"★{d}(Hark)" if grp(T[d]) == "Hark" else d) for d in t["deps"] if d in T) or "—"
    return f"| {n} | TASK-{i} | {grp(t)} | {t['name'][:46]} | {t['tier']} | {t['hours']}h | {deps} |"
H = ["| 序 | 任务 | 原线 | 名称 | 档位 | 工时 | 依赖（★=Hark 卡，须等待合并） |", "|---|---|---|---|---|---|---|"]
L = ["# 外部助手单人任务书（P1+P2+P3 合并，V0.10.0）", "", D.HDR, "",
     f"> 用户只有 1 个外部助手：本书把 P1/P2/P3 三线的外部卡按全局拓扑序合并。A 段 {len(ready_ids)} 张可立即开工（{sum(T[i]['hours'] for i in ready_ids):g}h）；"
     f"B 段 {len(wait_ids)} 张须等 Hark 卡合并；C 段 {len(cond_ids)} 张为条件卡，裁决前不执行。单人串行，资源锁里的他人卡不构成并发冲突，按本书顺序即可。", "",
     COMMON,
     "12. R10-01：本卡新增/删除 route.ts、page.tsx、*.spec.ts 或 lib/features 子目录时，同卡同步 `scripts/check-docs-facts.mjs` 对应期望值（只改数值与说明），收尾必须 `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0——V0.9.0 的 059/028/093 因漏此步使 main CI 变红。",
     "13. 卡面矛盾（目标要求的改动不在允许范围）→ 停下上报，不得先改；规划方授权后在 EVD-<卡号>/authorized-deviations.md 记录。", "",
     "## A. 立即可开工（按序串行）", "", *H, *[_row(n, i) for n, i in enumerate(ready_ids, 1)], "",
     "## B. 等待 Hark 卡合并后开工", "", *H, *[_row(n, i) for n, i in enumerate(wait_ids, 1)], "",
     "## C. 条件卡（裁决前不执行）", "", *H, *[_row(n, i) for n, i in enumerate(cond_ids, 1)], "",
     "## 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）", ""]
for i in ready_ids + wait_ids + cond_ids:
    L += [card_text(i), "", "---", ""]
open(os.path.join(BASE, "21_Agent任务书", "外部助手-单人任务书.md"), "w", encoding="utf-8").write("\n".join(L))
print("single", len(ready_ids), len(wait_ids), len(cond_ids))
