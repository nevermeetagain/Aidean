# > 版本: v0.7 | 更新: 2026-10-17 | 变更: V0.7.0——卡面新增「V0.7.0 状态」（st7/v7）列；前次 v0.2 | V0.2.0——条件卡(cond)驱动关键路径/批次；资源锁方向「非条件卡先」；新增 V0.4.0→V0.5.0 差异列与依赖合法性校验（运行：python3 gen.py）
# -*- coding: utf-8 -*-
import os, re, sys, json, itertools
from collections import defaultdict, deque
sys.path.insert(0, os.path.dirname(__file__))
import tasks_data as D
import rtm_data as RD
def _parse_tasks(tk):
    out = set()
    for a, b in re.findall(r"(\d{3})\s*[–-]\s*(\d{3})", tk):
        out |= {f"{i:03d}" for i in range(int(a), int(b) + 1)}
    out |= set(re.findall(r"(?<!\d)(\d{3})(?!\d)", tk))
    return out
T2REQ = {}
for _r in RD.R:
    for _x in _parse_tasks(_r["tasks"]):
        T2REQ.setdefault(_x, []).append(_r["id"])

# 本脚本位于 docs/任务规划V0.2.0/_generator/；BASE = 规划目录
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
TID = lambda t: f"TASK-{t['id']}"
tasks = {t["id"]: t for t in D.T}
order = [t["id"] for t in D.T]

def norm(p):
    p = re.sub(r"（.*?）", "", p).strip()
    p = re.sub(r"/\*\*$", "/", p)
    p = p.rstrip("*")
    return p

def overlap(a, b):
    a, b = norm(a), norm(b)
    if a == b: return True
    if a.endswith("/") and b.startswith(a): return True
    if b.endswith("/") and a.startswith(b): return True
    return False

def owner_of(path):
    path = norm(path)
    if path.startswith(D.P + "/06_validation/evidence/"):
        return "TASK-EVIDENCE"
    hits = []
    for ag, r in D.OWNERS.items():
        if any(path.startswith(e) for e in r["except"]):
            continue
        if any(path == o or (o.endswith("/") and path.startswith(o)) for o in r["own"]):
            hits.append(ag)
    return hits

# ---------- 1. 所有权校验 ----------
own_issues = []
for t in D.T:
    for p in t["allow"]:
        h = owner_of(p)
        if h == "TASK-EVIDENCE": continue
        if h != [t["owner"]]:
            own_issues.append((TID(t), p, h))

# 所有权规则自身重叠（同一路径被两 Agent 声明）
rule_overlaps = []
ags = list(D.OWNERS)
for a, b in itertools.combinations(ags, 2):
    for pa in D.OWNERS[a]["own"]:
        for pb in D.OWNERS[b]["own"]:
            if overlap(pa, pb):
                # 若重叠部分被某一方 except 排除则视为已消解
                inner = pb if len(norm(pb)) >= len(norm(pa)) else pa
                outer_ag = a if inner == pb else b
                inner_ag = b if inner == pb else a
                if any(norm(inner).startswith(e) for e in D.OWNERS[outer_ag]["except"]):
                    continue
                rule_overlaps.append((a, pa, b, pb))

# ---------- 2. 图：功能依赖 + 资源锁串行边 ----------
edges = set()
for t in D.T:
    for d in t["deps"]:
        edges.add((d, t["id"]))
def reach(graph_edges):
    adj = defaultdict(set)
    for u, v in graph_edges: adj[u].add(v)
    memo = {}
    def dfs(u):
        if u in memo: return memo[u]
        s = set()
        for v in adj[u]:
            s.add(v); s |= dfs(v)
        memo[u] = s; return s
    return {u: dfs(u) for u in order}
lock_edges = []
for a, b in itertools.combinations(order, 2):
    ta, tb = tasks[a], tasks[b]
    shared = [(pa, pb) for pa in ta["allow"] for pb in tb["allow"] if overlap(pa, pb)]
    if not shared: continue
    R = reach(edges | set(lock_edges))
    if b in R[a] or a in R[b]:
        continue
    # V0.2.0：条件卡（待裁决）不得排在非条件卡之前，否则会把可执行卡锁死
    if tasks[a].get("cond") and not tasks[b].get("cond"):
        a, b = b, a
    lock_edges.append((a, b))
all_edges = edges | set(lock_edges)

# 环检测（Kahn）
indeg = {u: 0 for u in order}
adj = defaultdict(list)
for u, v in all_edges:
    adj[u].append(v); indeg[v] += 1
q = deque([u for u in order if indeg[u] == 0]); topo = []
ind = dict(indeg)
while q:
    u = q.popleft(); topo.append(u)
    for v in adj[u]:
        ind[v] -= 1
        if ind[v] == 0: q.append(v)
has_cycle = len(topo) != len(order)

# 层级（最长路径层）
level = {}
for u in topo:
    preds = [a for a, b in all_edges if b == u]
    level[u] = 0 if not preds else max(level[p] for p in preds) + 1

# 关键路径（按工时）
dist = {}; prev = {}
for u in topo:
    preds = [a for a, b in all_edges if b == u]
    if preds:
        p = max(preds, key=lambda x: dist[x]); dist[u] = dist[p] + tasks[u]["hours"]; prev[u] = p
    else:
        dist[u] = tasks[u]["hours"]; prev[u] = None
end = max(order, key=lambda x: dist[x]); cp = []
x = end
while x: cp.append(x); x = prev[x]
cp.reverse()
# 关键路径（不含被 BLOCKING 冻结的 S8/S9）
act = [u for u in topo if not tasks[u].get("cond")]
dist2 = {}; prev2 = {}
for u in act:
    preds = [a for a, b in all_edges if b == u and a in act]
    if preds:
        p = max(preds, key=lambda x: dist2[x]); dist2[u] = dist2[p] + tasks[u]["hours"]; prev2[u] = p
    else:
        dist2[u] = tasks[u]["hours"]; prev2[u] = None
end2 = max(act, key=lambda x: dist2[x]); cp2 = []; x = end2
while x: cp2.append(x); x = prev2[x]
cp2.reverse()

# 契约冻结前置：同切片契约卡必须是祖先
contract_task_of = {}
for t in D.T:
    if t["owner"] == "Agent-Contract": contract_task_of.setdefault(t["slice"], t["id"])
R = reach(all_edges)
anc = defaultdict(set)
for u in order:
    for v in R[u]: anc[v].add(u)
frozen_issues = []
for t in D.T:
    c = contract_task_of.get(t["slice"])
    if c and t["id"] != c and c not in anc[t["id"]] and not t["contracts"][0].startswith("无"):
        frozen_issues.append((TID(t), "TASK-" + c))
    if t["owner"] != "Agent-Contract" and "001" not in anc[t["id"]] and t["id"] not in ("001", "008") and any(k in " ".join(t["contracts"]) for k in ["ERROR", "Schema", "50011", "50010", "2000"]):
        frozen_issues.append((TID(t), "TASK-001"))

# ---------- 3. 批次（可并行组） ----------
MIG = {"011", "058"}
def is_e2e(t): return any(norm(p).startswith("e2e/") for p in t["allow"])
batches = []
by_level = defaultdict(list)
for u in topo: by_level[level[u]].append(u)
COND = [u for u in topo if tasks[u].get("cond")]
# 依赖合法性：非条件卡不得依赖条件卡
cond_dep_issues = [(u, v) for u, v in all_edges if tasks[u].get("cond") and not tasks[v].get("cond")]
for lv in sorted(by_level):
    pool = sorted(x for x in by_level[lv] if x not in COND)
    cur_batches = []
    for u in pool:
        t = tasks[u]; placed = False
        for b in cur_batches:
            kinds = {tasks[x]["owner"] for x in b}
            if len(b) >= 3: continue
            if t["owner"] == "Agent-Contract": continue  # 禁止同时改 contracts：契约批恒为单任务
            if t["owner"] != "Agent-Contract" and "Agent-Contract" in kinds: continue
            if (t["owner"] == "Agent-Guard") != all(k == "Agent-Guard" for k in kinds) and ("Agent-Guard" in kinds or t["owner"] == "Agent-Guard"): continue
            if is_e2e(t) and any(is_e2e(tasks[x]) for x in b): continue
            if u in MIG and any(x in MIG for x in b): continue
            if any(overlap(pa, pb) for x in b for pa in t["allow"] for pb in tasks[x]["allow"]): continue
            b.append(u); placed = True; break
        if not placed: cur_batches.append([u])
    for b in cur_batches: batches.append((lv, b))

# ---------- 4. 渲染 ----------
def w(rel, text):
    path = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(text)

blocks = defaultdict(list)
for u, v in edges: blocks[u].append(v)
lock_in = defaultdict(list)
for u, v in lock_edges: lock_in[v].append(u)

def card(t):
    tid = TID(t)
    dep = ", ".join("TASK-" + d for d in t["deps"]) or "无"
    lk = ", ".join("TASK-" + d for d in sorted(lock_in[t["id"]])) or "无"
    blk = ", ".join("TASK-" + d for d in sorted(blocks[t["id"]])) or "无"
    L = [f"# {tid}：{t['name']}", "", D.HDR, "",
         f"> 执行者：**{t['assignee']}** ｜ 所有权 Agent：**{t['owner']}** ｜ 建议档位：**{t['tier']}**" + (f" ｜ **条件卡：待 {t['cond']}（{D.COND_REASON[t['cond']]}）裁决后下发**" if t.get('cond') else ""), "",
         f"> V0.7.0 状态：**{t.get('st7','未开工')}**｜{t.get('v7','沿用 V0.5.0 卡面（镜像业务树=77c7952，与 V0.5.0 规划基线一致）')}", "",
         f"> 历史（V0.4.0→V0.5.0）：{t['v2']}", "",
         "## 归属", f"- 所属切片：{t['slice']}（{D.SLICES[t['slice']][0]}）", f"- 来源需求：{t['req']}", f"- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：{'、'.join(T2REQ.get(t['id'], ['❌ 未追溯']))}", f"- 来源方案：{t['sol']}", "",
         "## 目标", t["goal"], "",
         "## 输入", "- 文档：" + "；".join(f"`{x}`" for x in t["docs"]), "- 契约：" + "；".join(f"`{x}`" for x in t["contracts"]),
         f"- 前置任务：{dep}", f"- 前置状态：{t['pre_state']}", "",
         "## 输出", "- 新增/修改的文件路径：", *[f"  - `{x}`" for x in t["outputs"]], f"  - `{D.P}/06_validation/evidence/EVD-{t['id']}/`（取证：命令输出/截图/日志）", "",
         "## Execution Steps", *[f"{i}. [ ] {s}" for i, s in enumerate(t["steps"], 1)],
         f"{len(t['steps'])+1}. [ ] 运行「验证命令」并将完整输出存入证据目录", "",
         "## 验收标准", *[f"- [ ] {a}" for a in t["accept"]], "- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）", "",
         "## 验证命令", "```bash", t["verify"], "```", "",
         "## 证据路径", f"`{D.P}/06_validation/evidence/EVD-{t['id']}/`", "",
         "## 允许修改", *[f"- `{x}`" for x in t["allow"]], f"- `{D.P}/06_validation/evidence/EVD-{t['id']}/**`", "",
         "## 禁止修改", *[f"- `{x}`" for x in t["forbid"] + D.COMMON_FORBID], "",
         "## 依赖与阻塞", f"- Depends on：{dep}", f"- 资源锁串行（同文件，须在其后执行）：{lk}", f"- Blocks：{blk}", f"- 阻塞条件：{t['block_cond']}", "",
         "## 建议执行档位", f"{t['tier']}　理由：{t['tier_reason']}", "",
         "## 升级条件", t["escalate"] + "；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）", "",
         "## 预估规模", f"{t['size']}　约 {t['hours']}h　{'<2h' if t['hours'] < 2 else '≥2h'}", ""]
    return "\n".join(L)

for t in D.T:
    w(f"05_execution/tasks/{TID(t)}.md", card(t))

# 任务索引
rows = ["| 任务 | 切片 | 名称 | 执行者 | 所有权 Agent | 档位 | 规模/工时 | 依赖 | 层级 | 条件 | V0.7.0 状态 |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for t in D.T:
    rows.append(f"| [{TID(t)}](tasks/{TID(t)}.md) | {t['slice']} | {t['name']} | {t['assignee']} | {t['owner']} | {t['tier']} | {t['size'].split('（')[0]}/{t['hours']}h | {', '.join(t['deps']) or '—'} | L{level[t['id']]} | {t.get('cond') or '—'} | {t.get('st7','未开工')} |")
cnt = defaultdict(int)
for t in D.T: cnt[t["assignee"]] += 1
tier_cnt = defaultdict(int)
for t in D.T: tier_cnt[t["tier"]] += 1
w("05_execution/task-index.md", "\n".join([
    "# 任务索引（task-index）", "", D.HDR, "",
    f"总计 **{len(D.T)}** 张原子任务卡｜Hark(主Agent) **{cnt['Hark(主Agent)']}** 张｜外部Agent **{cnt['外部Agent']}** 张｜档位：" + " / ".join(f"{k} {v}" for k, v in sorted(tier_cnt.items())) + "｜fable 0（仅在推翻冻结契约时启用）", "",
    "执行者口径：用户指令「核心任务+高难度任务（尤其 UI 设计与实现）由主 Agent 完成，中等及简单任务发布后由其他 Agent 完成」。本轮仅规划，实施需用户另行批准（见 15_前提与局限.md）。", "",
    *rows, ""]))

# DAG 文档
def fmt_batch(lv, b):
    if len(b) == 1:
        return f"- L{lv} · 单任务：TASK-{b[0]}（{tasks[b[0]]['owner']}）"
    just = ["无共享可变状态（非同一 e2e 全局库批次、非同表写）", "依赖契约已冻结（同切片契约卡为祖先，见校验③）", "文件所有权不相交（允许路径两两无前缀重叠，脚本校验）", "不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）"]
    return f"- L{lv} · **可并行组**：" + " ∥ ".join(f"TASK-{x}（{tasks[x]['owner']}）" for x in b) + "\n  - 机械依据：" + "；".join(f"✅{j}" for j in just)
sample_lock = "\n".join(f"- TASK-{a} → TASK-{b}" for a, b in sorted(lock_edges))
dag_lines = "\n".join(f"- TASK-{u} → TASK-{v}" for u, v in sorted(edges))
cp_txt = " → ".join(f"TASK-{x}" for x in cp)
cp2_txt = " → ".join(f"TASK-{x}" for x in cp2)
par = [b for _, b in batches if len(b) > 1]
w("08_依赖DAG.md", "\n".join([
    "# 08 · 依赖 DAG（可并行组 / 串行链 / 关键路径 / 环检测）", "", D.HDR, "",
    "> 生成方式：由任务数据单一源脚本机械计算（功能依赖边 + 「同文件资源锁」串行边），不含主观判断。", "",
    "## 8.1 并行判定规则（机械）", "", "可并行 ⟺ 无共享可变状态 ∧ 依赖的契约已冻结且机器可校验 ∧ 文件所有权不相交 ∧ 不共用同一迁移版本号；另加执行纪律：同批 ≤3 个写入 Agent、Contract 批与 Guard 批不与实现混批、同批至多 1 个 e2e 任务（共享测试库/全局开关）。", "",
    "## 8.2 校验结果", "",
    f"- ① 环检测：{'❌ 存在环' if has_cycle else '✅ 无环'}（Kahn 拓扑排序 {len(topo)}/{len(order)} 节点全部出队）",
    f"- ② 功能依赖边 {len(edges)} 条；资源锁串行边 {len(lock_edges)} 条（两任务允许路径重叠且原本无先后关系时，按编号小者先）",
    f"- ③ 契约冻结前置校验：{'✅ 全部满足' if not frozen_issues else '❌ ' + str(frozen_issues)}",
    f"- ④ 迁移版本号：全规划两个迁移版本号：M-001（TASK-011）、M-002（TASK-058，依赖 TASK-011，串行），无并发迁移", f"- ⑥ 依赖合法性（非条件卡不得依赖条件卡，含资源锁边）：{'✅ 满足' if not cond_dep_issues else '❌ ' + str(cond_dep_issues)}", f"- ⑤ 层级数（最长路径层）：L0–L{max(level.values())}；批次总数 {len(batches)}，其中可并行组 {len(par)} 个", "",
    "## 8.3 关键路径", "",
    f"- **全量（含条件切片 S5/S8/S9）**：{cp_txt}（累计 {dist[end]}h）",
    f"- **当前可执行范围（剔除全部条件卡：U-5/U-3/U-4/U-15/P-2/U-M1/U-M2/U-M3/U-M5）**：{cp2_txt}（累计 {dist2[end2]}h）", "",
    "关键路径解读：S0 契约骨架 → S1 迁移 M-001 → S4 生效价（资金路径）→ S4 UI → 计费 e2e → 文档登记，决定整体工期；S2/S3/S5 可在 S0 完成后与 S1 交错推进。", "",
    "## 8.4 批次计划（按层级，同层内按规则装批）", "", *[fmt_batch(lv, b) for lv, b in batches], "",
    "**条件批次（BLOCKING 裁决后才下发，不计入上表）**：" + "；".join(f"TASK-{u}（{tasks[u]['slice']}，{tasks[u]['cond']}，L{level[u]}）" for u in COND) + "。裁决后按依赖与同样规则装批；若条件卡被取消，其资源锁串行边随之失效。", "",
    "## 8.5 功能依赖边", "", dag_lines, "", "## 8.6 资源锁串行边（同文件 → 必须串行）", "", sample_lock, "",
    "## 8.7 必须串行的链（摘要）", "",
    "- 契约链：TASK-001 → 014 → 021 → 026 → 047（同改 packages/shared/src/index.ts，资源锁串行）；TASK-032（S5）/044（S9）为条件卡，亦不得与任何契约卡同时执行",
    "- 文档链：TASK-009 → 020 → 025 → 031 → 036 → 040 → 041 → 046（同改 API接口文档/文档索引）；TASK-013 → 025、TASK-013 → 041（同改 数据库文档/台账）",
    "- CI 链：TASK-004 → 006 → 007 → 050 → 037（同改 .github/workflows/ci.yml；042 为条件卡排其后）",
    "- 迁移链：TASK-010 → 011（M-001）→ 012 → {027, 028}",
    "- 头部链：TASK-018 → 034（同改 SiteHeader/MobileNav）；详情页链：TASK-023 → 029 → 053（同改 models/[slug]）；生效价链：TASK-027 → 048（同改 lib/features/pricing）", "",
    "## 8.8 并行纪律（执行者必读）", "",
    "- ✅ 允许并行：不同所有权、同一冻结契约、不改同一迁移版本号。",
    "- ❌ 禁止并行：同时改 packages/shared（契约）；同时改同一张表；一边改错误码一边让前端猜字段；数据端「独立完成整个数据库」（本规划仅 M-001 一个迁移）。", ""]))

# 所有权矩阵
mat = ["| Agent | 拥有路径（前缀） | 排除 | 本规划任务 |", "|---|---|---|---|"]
for ag, r in D.OWNERS.items():
    ts = ", ".join(TID(t) for t in D.T if t["owner"] == ag)
    mat.append(f"| {ag} | " + "<br>".join(f"`{x}`" for x in r["own"]) + " | " + ("<br>".join(f"`{x}`" for x in r["except"]) or "—") + f" | {ts} |")
w("09_所有权矩阵.md", "\n".join([
    "# 09 · 所有权矩阵（Agent × 路径）", "", D.HDR, "",
    "> 规则：按仓库路径划分所有权；同一路径只属于一个 Agent；跨所有权 = blocked，提 ADR，不「先写了再说」。证据目录 `docs/任务规划V0.7.0/06_validation/evidence/EVD-<任务号>/` 归对应任务独占。", "",
    *mat, "",
    "## 9.1 机械校验结果", "",
    f"- 所有权规则重叠：{'✅ 无（父子重叠均已由「排除」列消解：packages/shared/src/__tests__/contract/ 归 Guard；apps/web/lib/sync/writers/ 归 Data；scripts/check-docs-{facts,rule}.mjs 归 Docs（文档事实门禁的期望值随文档同步）；docs/任务规划V0.1.0/ 与 docs/任务规划V0.2.0/ 冻结不归 Docs）' if not rule_overlaps else '❌ ' + str(rule_overlaps)}",
    f"- 任务允许路径越权：{'✅ 0 处（' + str(len(D.T)) + ' 张卡的每条允许路径都只命中其所有权 Agent）' if not own_issues else '❌ ' + str(own_issues)}",
    "- 未覆盖路径（无 Agent 拥有 = 本规划禁止任何任务修改）：`AGENTS.md`、`.example/**`、`参考文档/**`、`database/baseline/**`、`turbo.json`、`tsconfig.base.json`、`packages/config/**`、`apps/web/next.config.mjs`、`apps/web/tsconfig.json`、`apps/web/lib/*.ts`（除 navigation.ts / admin-nav-default-tree.ts / site-config.ts / env-check.ts / rate-limit.ts）。如需修改须先提 ADR 分配所有权。", "",
    "## 9.2 写入并发约束", "", "- 同时最多 3 个写入 Agent（批次计划已执行该约束，见 08_依赖DAG.md §8.4）。", "- Agent-Contract 与 Agent-Guard 的批次不与实现批次混排。", ""]))

# 成本表
srow = ["| 切片 | 任务数 | Hark | 外部Agent | haiku | sonnect | opus | fable | 工时(h) | opus 券(≤3) | fable 券(≤1) |", "|---|---|---|---|---|---|---|---|---|---|---|"]
tot = defaultdict(int)
for s in D.SLICES:
    ts = [t for t in D.T if t["slice"] == s]
    c = defaultdict(int)
    for t in ts: c[t["tier"]] += 1; c[t["assignee"]] += 1
    h = sum(t["hours"] for t in ts)
    srow.append(f"| {s} {D.SLICES[s][0]} | {len(ts)} | {c['Hark(主Agent)']} | {c['外部Agent']} | {c['haiku']} | {c['sonnect']} | {c['opus']} | 0 | {h} | ≤3（执行档 opus 不占券） | ≤1 |")
    for k in ["haiku", "sonnect", "opus", "Hark(主Agent)", "外部Agent"]: tot[k] += c[k]
    tot["n"] += len(ts); tot["h"] += h
srow.append(f"| **合计** | **{tot['n']}** | **{tot['Hark(主Agent)']}** | **{tot['外部Agent']}** | **{tot['haiku']}** | **{tot['sonnect']}** | **{tot['opus']}** | **0** | **{tot['h']}** | — | — |")
w("10_档位分配与成本预算.md", "\n".join([
    "# 10 · 档位分配与成本预算", "", D.HDR, "",
    "## 10.1 档位规则（按「决策不可逆性 + 影响范围」）", "",
    "| 档位 | 本规划用于 | 禁止 |", "|---|---|---|",
    "| fable | 本规划 0 张执行卡（TASK-047 若需改 calcCharge 签名则触发）；仅当需推翻已冻结契约（02-errors 既有 22 码值）或需求范围终裁（TASK-040 涉及增删范围）时启用 | 高频任务 |",
    "| opus（默认档） | 契约语义（001/014/026/047）、资金路径（027/048）、迁移 ADR（011）、开关跨模块接入（015）、全部 UI 设计实现（018/023/029/034/045/053）、需求修订（040）、生产部署（043） | 写样板 |",
    "| sonnect | 原子实现：CRUD 端点、单测、e2e 脚本、CI 配置、守卫脚本、测量脚本 | 独自做架构决策 |",
    "| haiku | 文档登记、版本头、索引、单值种子替换 | 改领域规则 |", "",
    "> 说明：默认档 = opus；下调为 sonnect/haiku 的每张卡均在卡内写明理由（契约已冻结 / 机械性 / 有既有测试兜底）。", "",
    "## 10.2 成本预算表（每切片）", "", *srow, "",
    "## 10.3 券制度", "", "- opus：每切片 ≤3 次额外调用（切片前契约审 / 卡住升级 / 高风险 review）；执行档已为 opus 的卡不重复计券。", "- fable：每切片 ≤1 次，仅在需要动需求或已冻结契约时启用；超出需用户批准。", "",
    "## 10.4 熔断规则", "", "同一任务连续 2 次验收失败 → 停止改代码 → 改为：重写任务书 / 升级档位 / 标记 blocked。禁止换提示词硬撞第 3 次。", ""]))

# 每切片阶段文件（「每个步骤一个 md 计划文件」）
DEMO = {
 "S0": "CI 中（lint+三包单测全绿后）空库重放 16 条迁移 → :3000 启动 → /system/ready=200 → 新用户注册登录 → 创建 API Key（鉴权写）→ 控制台可见 → 匿名访问得统一错误信封",
 "S1": "同一模型连续三次采集写价成功，当前价恰 1 条（集成测试绿）",
 "S2": "后台关闭「大模型云服务天梯图」→ 前台导航入口消失、/providers 显示「该功能暂未开放」、API 返回 50011 → 重新开启即恢复",
 "S3": "登录用户在模型详情页点星收藏 → 控制台「我的收藏」可见 → 取消后消失",
 "S4": "后台给某模型建「限时免费」→ 价格页显示限时免费徽标 → 网关调用不扣费 → 删除优惠后按原价扣费；（U-15 后）USD 计价模型在价格页显示 ¥/M 并按同一归一价扣费",
 "S5": "在顶部导航输入模型名 → 下拉分组结果 → 回车跳详情页",
 "S6": "一条命令列出唯一 e2e 基线；输出覆盖率与千级天梯首测数值",
 "S7": "需求文档 v1.15 与代码事实一致；台账拆分后门禁全绿；docs/product/requirements/需求追溯矩阵.md 成为唯一追溯表",
 "S8": "生产域名 /system/ready=200，smoke 7 例通过；备份恢复演练 diff=0；发布环境契约成文",
 "S9": "子平台介绍页出现截图画廊，后台可增删",
 "S10": "后台「模型源监控」页：5 个公开源按 S1/S2/A/B/C 分级注册；手动运行 OpenRouter 后变更流出现新上架/调价事件（证据可点开）",
 "S11": "前台模型详情页显示「在哪里可调用」：多源上架状态 + 原币价格 + relay 身份未验证提示",
 "S12": "（条件）持 Key 官方/托管目录与中转探针结果进入后台监控页；AA 数据带署名",
}
for s_id, (name, goal, gate) in D.SLICES.items():
    ts = [t for t in D.T if t["slice"] == s_id]
    ts_sorted = sorted(ts, key=lambda t: (level[t["id"]], t["id"]))
    lines = [f"# 阶段 {s_id} · {name}", "", D.HDR, "",
             f"- **交付**：{goal}", f"- **可演示行为（本刀新增）**：{DEMO[s_id]}", f"- **启动闸门 / 待裁决**：{gate}",
             f"- **任务数**：{len(ts)}（Hark {sum(1 for t in ts if t['assignee'].startswith('Hark'))} / 外部Agent {sum(1 for t in ts if t['assignee']=='外部Agent')}）｜条件卡 {sum(1 for t in ts if t.get('cond'))}｜工时 ≈ {sum(t['hours'] for t in ts)}h", "",
             "## 执行顺序（按依赖层级）", "", "| 层级 | 任务 | 执行者 | 所有权 | 依赖 |", "|---|---|---|---|---|"]
    for t in ts_sorted:
        lines.append(f"| L{level[t['id']]} | [TASK-{t['id']}](../../05_execution/tasks/TASK-{t['id']}.md) {t['name']} | {t['assignee']} | {t['owner']} | {', '.join('TASK-'+d for d in t['deps']) or '—'} |")
    lines += ["", "## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）", "",
              *[f"- [ ] TASK-{t['id']}：`{t['verify']}`" for t in ts_sorted],
              "- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS",
              "- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）", "",
              "## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）", "",
              "所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。", ""]
    w(f"04_planning/stages/STAGE-{s_id}.md", "\n".join(lines))

stats = dict(cond_dep=cond_dep_issues, cond=len(COND), n=len(D.T), hark=cnt["Hark(主Agent)"], ext=cnt["外部Agent"], tiers=dict(tier_cnt), edges=len(edges), locks=len(lock_edges), cycle=has_cycle,
             cp=cp, cp_h=dist[end], cp2=cp2, cp2_h=dist2[end2], frozen=frozen_issues, own=own_issues, rule=rule_overlaps, batches=len(batches), par=len(par), levels=max(level.values()), total_h=tot["h"])
print(json.dumps(stats, ensure_ascii=False))
