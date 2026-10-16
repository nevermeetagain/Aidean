# > 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0 新增——由任务数据单一源渲染「剩余可执行大纲」（≥3 级、带序号、原子化）
# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import tasks_data as D
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PHASES = [
    ("一", "地基：契约唯一源 + 步行骨架 + 守卫", ["S0"]),
    ("二", "数据完整性：价格历史唯一约束", ["S1"]),
    ("三", "模型源监控（本轮核心新增）", ["S10", "S11", "S12"]),
    ("四", "核心业务缺口：功能开关 / 收藏 / 生效价与计价归一", ["S2", "S3", "S4"]),
    ("五", "测试资产与量级基线", ["S6"]),
    ("六", "文档治理收口", ["S7"]),
    ("七", "条件刀（待用户裁决后启用）", ["S5", "S8", "S9"]),
]
L = ["# 20 · 剩余可执行大纲（多层级 · 原子化 · 带序号）", "", D.HDR, "",
     "> 层级：**第 1 级 = 阶段**，**第 2 级 = 切片**（可演示行为），**第 3 级 = 原子任务**（TASK 卡，执行者/档位/工时/依赖），**第 4 级 = 执行步骤**，**第 5 级 = 验收**。由 `_generator/gen_outline.py` 从 `tasks_data.py` 机械渲染，与任务卡同源。",
     "> 执行者口径：`Hark(主Agent)` = 核心/高难度（含全部 UI 设计与实现）；`外部Agent` = 中等/简单，发布后等待其他 Agent 完成。⛔ = 条件卡（待裁决）。", ""]
tot = 0
for pn, (pid, pname, slices) in enumerate(PHASES, 1):
    ts_all = [t for t in D.T if t["slice"] in slices]
    h = sum(t["hours"] for t in ts_all); tot += h
    L.append(f"## {pn}. 阶段{pid}：{pname}（{len(ts_all)} 卡 / {h}h）"); L.append("")
    for sn, s in enumerate(slices, 1):
        name, goal, gate = D.SLICES[s]
        ts = [t for t in D.T if t["slice"] == s]
        L.append(f"### {pn}.{sn} {s} {name}"); L.append("")
        L.append(f"- 交付：{goal}"); L.append(f"- 闸门：{gate}"); L.append(f"- 计划文件：`04_planning/stages/STAGE-{s}.md`"); L.append("")
        for tn, t in enumerate(ts, 1):
            flag = f" ⛔待 {t['cond']}" if t.get("cond") else ""
            dep = ", ".join(t["deps"]) or "—"
            L.append(f"#### {pn}.{sn}.{tn} TASK-{t['id']} {t['name']}{flag}")
            L.append(f"- 执行者 **{t['assignee']}** ｜ {t['owner']} ｜ {t['tier']} ｜ {t['hours']}h ｜ 依赖 {dep} ｜ 卡片 `05_execution/tasks/TASK-{t['id']}.md`")
            for k, st in enumerate(t["steps"], 1):
                L.append(f"  - {pn}.{sn}.{tn}.{k} {st}")
            L.append(f"  - {pn}.{sn}.{tn}.{len(t['steps'])+1} 验收：" + "；".join(t["accept"]))
            L.append("")
L.append(f"---\n合计 **{len(D.T)}** 张卡 / **{tot}h**（含条件卡）。顺序建议见 16_第一刀与启动顺序.md；依赖与并行见 08_依赖DAG.md。\n")
open(os.path.join(BASE, "20_剩余可执行大纲.md"), "w", encoding="utf-8").write("\n".join(L))
print("outline ok", len(D.T), tot)
