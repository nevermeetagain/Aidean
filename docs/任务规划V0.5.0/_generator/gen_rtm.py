# > 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档——渲染统一需求追溯矩阵 03a 并做双向追溯校验（需求→任务、任务→需求）
# -*- coding: utf-8 -*-
import os, re, sys, json
from collections import Counter, defaultdict
sys.path.insert(0, os.path.dirname(__file__))
import rtm_data as RD, tasks_data as D
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ids = {t["id"] for t in D.T}
def parse(tk):
    out = set()
    for a, b in re.findall(r"(\d{3})\s*[–-]\s*(\d{3})", tk):
        out |= {f"{i:03d}" for i in range(int(a), int(b) + 1)}
    out |= set(re.findall(r"(?<!\d)(\d{3})(?!\d)", tk))
    return out
req2t = {r["id"]: parse(r["tasks"]) for r in RD.R}
bad = {k: sorted(v - ids) for k, v in req2t.items() if v - ids}
covered = set().union(*req2t.values())
orphan = sorted(ids - covered)
st = Counter(r["st"] for r in RD.R); lab = Counter(r["lab"] for r in RD.R)
lvl_st = defaultdict(Counter)
for r in RD.R:
    k = "MUST" if r["lvl"].startswith("MUST") and "NOT" not in r["lvl"] else ("SHOULD" if r["lvl"].startswith("SHOULD") else ("COULD" if r["lvl"].startswith("COULD") else "MUST NOT/约束"))
    lvl_st[k][r["st"]] += 1
# 未实现/部分实现 且无任务、也非暂不执行/待外部 → 规划缺口
gap = [r["id"] for r in RD.R if r["st"] in ("未实现", "部分实现") and not req2t[r["id"]] and r["lab"] not in ("暂不执行", "待其他员工完成")]
HDR = "> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0——RTM 承 V0.4.0 99 条（代码无 delta）+ 反向审计新增 14 条（REQ-F-053..063、REQ-L-013/014、REQ-NF-012）+ 2 条改判（F-010、M-006）"
L = ["# 03a · 统一需求追溯矩阵（RTM）", "", HDR, "",
     "> 口径：**实现状态**四分（已实现 / 部分实现 / 未实现 / 待澄清；用户已决策暂停的记「未实现」+ 标签「暂不执行」）；**证据标签**沿用指令七标签。证据来自 main@cd5b1a9（业务树=77c7952）真实代码或命令（`06_validation/evidence/EVD-BASELINE-V2/`、`EVD-BASELINE-V4/`）。", "",
     "## 汇总", "",
     f"- 需求条目总数：**{len(RD.R)}**",
     "- 实现状态：" + "｜".join(f"{k} **{st.get(k,0)}**" for k in ["已实现", "部分实现", "未实现", "待澄清"]),
     "- 证据标签：" + "｜".join(f"{k} {v}" for k, v in lab.most_common()),
     "", "| 分级 | 已实现 | 部分实现 | 未实现 | 待澄清 | 合计 |", "|---|---|---|---|---|---|"]
for k in ["MUST", "SHOULD", "COULD", "MUST NOT/约束"]:
    c = lvl_st[k]; L.append(f"| {k} | {c['已实现']} | {c['部分实现']} | {c['未实现']} | {c['待澄清']} | {sum(c.values())} |")
L += ["", "## 双向追溯校验（机械）", "",
      f"- 需求→任务：RTM 引用的任务号均存在：{'✅' if not bad else '❌ ' + json.dumps(bad, ensure_ascii=False)}",
      f"- 任务→需求：{len(ids)} 张卡中未被任何需求行引用的：{'✅ 0 张' if not orphan else '❌ ' + ', '.join('TASK-'+x for x in orphan)}",
      f"- 规划缺口（未实现/部分实现 且无任务、又非「暂不执行/待其他员工完成」）：{'✅ 0 条' if not gap else '❌ ' + ', '.join(gap)}", "",
      "## 矩阵", "", "| ID | 分级 | 来源 | 可验证表述 | 实现状态 | 证据标签 | 证据（代码/命令） | 任务 | V0.1.0→…→V0.5.0 |", "|---|---|---|---|---|---|---|---|---|"]
for r in RD.R:
    _e = lambda x: re.sub(r"(?<!\\)\|", r"\\|", str(x))
    _row = f"| {_e(r['id'])} | {_e(r['lvl'])} | {_e(r['src'])} | {_e(r['stmt'])} | **{_e(r['st'])}** | {_e(r['lab'])} | {_e(r['ev'])} | {_e(r['tasks'])} | {_e(r['v1'])} |"
    assert len(re.findall(r"(?<!\\)\|", _row)) == 10, (r['id'], 'RTM 列数断言失败')
    L.append(_row)
L += ["", "## 未实现 / 部分实现的 MUST·SHOULD（按优先级）", "",
      "| ID | 分级 | 表述 | 状态 | 任务 |", "|---|---|---|---|---|"]
for r in RD.R:
    if r["st"] in ("未实现", "部分实现") and (r["lvl"].startswith("MUST") or r["lvl"].startswith("SHOULD")):
        L.append(f"| {r['id']} | {r['lvl']} | {_e(r['stmt'])} | {r['st']}（{r['lab']}） | {_e(r['tasks'])} |")
L.append("")
open(os.path.join(BASE, "03a_统一需求追溯矩阵.md"), "w", encoding="utf-8").write("\n".join(L))
print(json.dumps(dict(n=len(RD.R), st=st, lab=lab, lvl={k: dict(v) for k, v in lvl_st.items()}, bad=bad, orphan=orphan, gap=gap), ensure_ascii=False))
