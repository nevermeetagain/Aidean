import re, os, json, graphlib, itertools, fnmatch
exec(open(''+os.path.dirname(os.path.abspath(__file__))+'/cards.py').read())
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H=lambda c: float(re.search(r'≈([\d.]+)',c['size']).group(1)) if re.search(r'≈([\d.]+)',c['size']) else 1.5
by={c['id']:c for c in C}
for c in C: c['blocks']=sorted(x['id'] for x in C if c['id'] in x['dep'])
g={c['id']:set(c['dep']) for c in C}
order=list(graphlib.TopologicalSorter(g).static_order())
lvl={}
for i in order: lvl[i]=1+max([lvl[d] for d in g[i]],default=0)
# critical path (hours)
best={};prev={}
for i in order:
  b=max(((best[d],d) for d in g[i]),default=(0,None)); best[i]=b[0]+H(by[i]); prev[i]=b[1]
end=max(best,key=best.get); cp=[]; x=end
while x: cp.append(x); x=prev[x]
cp=cp[::-1]
# transitive ancestors
anc={}
for i in order: anc[i]=set(g[i]).union(*[anc[d] for d in g[i]]) if g[i] else set()
def norm(p): return re.sub(r'（.*?）','',p).strip()
def ov(a,b):
  a=norm(a);b=norm(b)
  pa=a.split('*')[0].split('{')[0]; pb=b.split('*')[0].split('{')[0]
  return pa.startswith(pb) or pb.startswith(pa)
overl=[]
for a,b in itertools.combinations(C,2):
  if a['id'] in anc[b['id']] or b['id'] in anc[a['id']]: continue
  da={norm(z) for z in a['deny']}; db={norm(z) for z in b['deny']}
  hits=[(x,y) for x in a['allow'] for y in b['allow'] if ov(x,y) and norm(y) not in da and norm(x) not in db]
  if hits: overl.append((a['id'],b['id'],hits))
json.dump(dict(order=order,lvl=lvl,cp=cp,cph=best[end],overl=overl),open(os.path.dirname(os.path.abspath(__file__))+'/dag.json','w'),ensure_ascii=False,indent=1)
print('cp',cp,best[end]); print('overlaps',len(overl))
for o in overl: print(o[0],o[1],o[2][:2])

# ======== 产出 ========
V='> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）'
os.makedirs(D+'/05_execution/tasks',exist_ok=True)
def L(xs): return '\n'.join(f'  - `{x}`' if not x.startswith('（') else f'  - {x}' for x in xs) if xs else '  - 无'
for c in C:
  dep=', '.join(c['dep']) or '无'; blk=', '.join(c['blocks']) or '无'
  cond=f"\n> 条件卡：仅在 {c['cond']} 裁决后开工；未裁决前不计入关键路径。\n" if c.get('cond') else ''
  txt=f"""# {c['id']}：{c['name']}

{V}
{cond}
## 归属
- 所属切片：{c['slice']}
- 执行方：**{c['owner']}**
- 来源需求：{c['reqs']}
- 来源方案：{c['src']}

## 目标
{c['goal']}

## 输入
""" + '\n'.join(f'- {x}' for x in c['inputs']) + f"""
- 前置任务：{dep}

## 输出
- 新增/修改的文件路径：
{L(c['outputs'])}
- 证据：`docs/任务规划V0.12.0/06_validation/evidence/EVD-{c['id']}/verify.txt`（≤40 行：命令 + 退出码 + 关键读数）

## Execution Steps
""" + '\n'.join(f'{i}. [ ] {x}' for i,x in enumerate(c['steps'],1)) + """

## 验收标准
""" + '\n'.join(f'- [ ] {x}' for x in c['acc']) + f"""
- [ ] 全量 `tsc` / `lint` / 相关 vitest exit=0；`check-docs-rule` 与 `check-docs-facts` exit=0（推送前一次）

## 验证命令
```bash
{c['cmd']}
```

## 证据路径
`docs/任务规划V0.12.0/06_validation/evidence/EVD-{c['id']}/`

## 允许修改
{L(c['allow'])}

## 禁止修改
{L(c['deny'])}

## 依赖与阻塞
- Depends on：{dep}
- Blocks：{blk}
- 阻塞条件：{c['stop']}

## 建议执行档位
`{c['tier']}`　理由：{'核心机制/安全/数据迁移或 UI 设计决策，错误不可逆或影响面跨模块' if c['tier']=='opus' else ('机械性文档/格式工作，无领域判断' if c['tier']=='haiku' else '边界清晰的实现/测试，契约已冻结')}

## 升级条件
同一验收连续 2 次失败，或需要改动「禁止修改」中的路径 → 停止编码，标 blocked，升一档并报 Hark（熔断，见 10_ §8.4）。

## 预估规模
{c['size']}
"""
  open(f"{D}/05_execution/tasks/{c['id']}.md",'w').write(txt)

# task-index
rows='\n'.join(f"| {c['id']} | {c['name']} | {c['slice']} | {c['owner']} | {c['tier']} | {H(c)} | {', '.join(c['dep']) or '—'} | {'条件:'+c['cond'] if c.get('cond') else 'L'+str(lvl[c['id']])} | 待开工 |" for c in sorted(C,key=lambda c:c['id']))
open(f"{D}/05_execution/task-index.md",'w').write(f"""# V0.12.0 任务索引

{V}

> 唯一状态载体。状态取值：待开工 / 进行中 / 待验证 / 已合并（附提交号）/ blocked（附原因）。层级 L 为依赖拓扑层，同层且所有权不相交者可并行。

| 卡 | 名称 | 切片 | 执行方 | 档位 | 工时(h) | 依赖 | 层级 | 状态 |
|---|---|---|---|---|---|---|---|---|
{rows}

合计 {len(C)} 张（条件卡 {sum(1 for c in C if c.get('cond'))} 张）；Hark {sum(1 for c in C if c['owner']=='Hark')} 张 / {sum(H(c) for c in C if c['owner']=='Hark')}h；外部助手 {sum(1 for c in C if c['owner']!='Hark')} 张 / {sum(H(c) for c in C if c['owner']!='Hark')}h。
""")
# DAG
levels={}
for i,l in lvl.items(): levels.setdefault(l,[]).append(i)
dag=[f"L{l}: "+'  '.join(f"{i}[{by[i]['owner'][0:2]}]" for i in sorted(v)) for l,v in sorted(levels.items())]
edges='\n'.join(f"{d} --> {c['id']}" for c in C for d in c['dep'])
open(f"{D}/08_依赖DAG.md",'w').write(f"""# 08 · 依赖 DAG

{V}

## 一、拓扑分层（[Ha]=Hark，[外部]=外部助手）
```text
""" + '\n'.join(dag) + f"""
```

## 二、关键路径（按工时，{best[end]}h）
```text
{' → '.join(cp)}
```
关键路径全部落在 **Hark 的监控/可靠性链（T120-10→14）与设计系统链（T120-27→31）**，外部助手的卡均有浮动时间；因此 Hark 先开 T120-10，外部助手先开 S12-0/S12-1。

## 三、环检测
`graphlib.TopologicalSorter` 静态排序成功，{len(C)} 节点无环（生成器：`_generator/gen.py`）。

## 四、并行判定（机械规则）
可并行 ⟺ ①无共享可变状态 ∧ ②依赖契约已冻结（T120-10 合并后） ∧ ③文件所有权不相交 ∧ ④不共用迁移版本号。
生成器对全部 {len(C)*(len(C)-1)//2} 对卡做路径前缀相交检测，排除「有传递依赖」与「对方禁止清单显式排除」两类后，**剩余重叠 = {len(overl)}**。
同时最多 2 个写入方（Hark + 1 名外部助手），满足 ≤3。

### 可并行组（首批可同时下发）
- **组 P1（第 1 天）**：Hark：T120-10、T120-02、T120-25 | 外部：T120-01 → T120-03、T120-05、T120-06 → T120-09、T120-07、T120-08、T120-04（依据：四条全满足；T120-10 只写 packages/shared 与 docs/ADR，外部卡不触及）
- **组 P2**：Hark：T120-11→12→13、T120-18→19→20、T120-30、T120-26 | 外部：T120-16、T120-32、T120-33（依据：外部卡只写测试/展示组件，与 Hark 的 lib/monitoring、lib/features/auth 不相交）
- **组 P3**：Hark：T120-14、T120-15、T120-21、T120-22、T120-23 | 外部：T120-24
- **组 P4**：Hark：T120-27 → T120-31 | 外部：T120-28、T120-29、T120-34 → T120-36

### 必须串行的链
- 迁移：`20261024000000`(T120-11) → `20261024010000`(T120-12) → `20261024020000`(T120-13)
- 认证：T120-02 → T120-18 → T120-19 → T120-20 → T120-21
- 设计系统：T120-25 → T120-30 → T120-26 → T120-27 → T120-28 / T120-29 → T120-31

## 五、边（Mermaid 源）
```mermaid
graph LR
{edges}
```
""")

# 所有权矩阵
own={}
for c in C:
  for p in c['allow']: own.setdefault(norm(p),[]).append(c['id'])
rows='\n'.join(f"| `{p}` | {'Hark' if all(by[i]['owner']=='Hark' for i in ids) else ('外部助手' if all(by[i]['owner']!='Hark' for i in ids) else 'Hark+外部（串行）')} | {', '.join(ids)} |" for p,ids in sorted(own.items()))
open(f"{D}/09_所有权矩阵.md",'w').write(f"""# 09 · 所有权矩阵（Agent × 路径）

{V}

## 一、角色
| 角色 | 本版本由谁担任 | 唯一可写 |
|---|---|---|
| Agent-Contract | **Hark**（T120-10） | `packages/shared/src/errors.ts`、`packages/shared/src/schemas/**`、`docs/ADR/ADR-0011-*` |
| Agent-Core（App/API/Data 的核心部分） | **Hark** | `lib/monitoring/**`、`lib/features/auth/**`（测试文件按卡细分）、`lib/features/gateway/probe.ts`、`prisma/schema.prisma` 与 3 个新迁移、`packages/ui/**`、`app/globals.css`、`middleware.ts`、Dock / 监控后台 / 改密页 UI |
| Agent-Impl（常规实现与测试） | **外部助手（1 名）** | `e2e/**`（除 3 个 Hark 新 spec）、`docs/**`（除 ADR-0011/12/13 与 UI设计文档）、`components/admin/**`（除 monitoring/ 与 PanelState）、单测目录、`.env.example`、`lib/config/**` |
| Agent-Guard | 外部助手（新守卫）+ Hark（edge-imports） | `scripts/guard/*`（逐文件见下表） |

规则：同时写入方 = 2（≤3）；契约（T120-10）合并前，任何依赖新 schema 的卡不得开工；跨所有权修改 = blocked，提 ADR，不得「先写了再说」。

## 二、路径 × 卡（生成器自动汇总；无传递依赖的两卡之间重叠 = {len(overl)}）
| 路径 | 归属 | 卡 |
|---|---|---|
{rows}

同一路径出现多张卡时，它们之间都存在传递依赖（串行），或一方在「禁止修改」中显式排除了该文件——由 `_generator/gen.py` 机械校验。
""")

# 成本预算
sl={}
for c in C:
  s=sl.setdefault(c['slice'],dict(n=0,haiku=0,sonnect=0,opus=0,fable=0,h=0)); s['n']+=1; s[c['tier']]+=1; s['h']+=H(c)
rows='\n'.join(f"| {k} | {v['n']} | {v['haiku']} | {v['sonnect']} | {v['opus']} | {v['fable']} | {v['h']} |" for k,v in sorted(sl.items()))
tot={t:sum(v[t] for v in sl.values()) for t in ['n','haiku','sonnect','opus','fable','h']}
open(f"{D}/10_档位分配与成本预算.md",'w').write(f"""# 10 · 档位分配与成本预算

{V}

## 一、分配原则
按「决策不可逆性 × 影响范围」分档，默认 `opus`：
- `opus`：契约、迁移、认证与安全、调度机制、设计令牌与 UI 设计实现（Hark 的 18 张卡全部在此档）。
- `sonnect`：契约冻结后的实现、测试、批量迁移（外部助手主力）。
- `haiku`：文档状态回写、格式化（T120-07、T120-09、T120-35）。
- `fable`：本版本 **0 次计划使用**；仅当需要改动既有错误码值 / 已冻结 schema 字段（T120-10 升级条件）时启用。

## 二、预算表
| 切片 | 任务数 | haiku | sonnect | opus | fable | 工时(h) |
|---|---|---|---|---|---|---|
{rows}
| **合计** | **{tot['n']}** | {tot['haiku']} | {tot['sonnect']} | {tot['opus']} | {tot['fable']} | **{tot['h']}** |

## 三、券制度
- `opus` 额外券：每切片 ≤3 次（切片前契约审 / 卡住升级 / 高风险 review），外部助手的卡升级到 opus 也计入。
- `fable`：每切片 ≤1 次，仅限动需求或已冻结契约；超出须用户批准。

## 四、熔断（§8.4）
同一任务连续 2 次验收失败 → 停止改代码 → 重写任务书 / 升档 / 标 blocked。**禁止换提示词硬撞第 3 次。**

## 五、工期估算（非承诺）
- Hark：{sum(H(c) for c in C if c['owner']=='Hark')}h；外部助手：{sum(H(c) for c in C if c['owner']!='Hark')}h（含条件卡 {sum(H(c) for c in C if c.get('cond'))}h）。
- 关键路径 {best[end]}h（见 08_）。两方并行时日历工期约由关键路径决定；工时为单人专注估算，未含评审往返。
""")
# 07 卡全集
def body(c):
  t=open(f"{D}/05_execution/tasks/{c['id']}.md").read().split('\n')
  t=[x for x in t[1:] if not x.startswith('> 版本:')]
  return f"## {c['id']}：{c['name']}\n"+'\n'.join(x.replace('\n## ','\n### ') if False else ('#'+x if x.startswith('## ') else x) for x in t)
open(f"{D}/07_原子任务卡全集.md",'w').write(f"# 07 · 原子任务卡全集\n\n{V}\n\n> 三级结构：Work Package（切片 S12-x）→ Atomic Task（T120-xx）→ Execution Step（每卡「Execution Steps」）。单卡正文以 `05_execution/tasks/T120-xx.md` 为准，本文件为同源生成的合订本。\n\n"+'\n\n---\n\n'.join(body(c) for c in sorted(C,key=lambda c:(c['slice'],c['id']))))

# 03a RTM
R=json.load(open(''+os.path.dirname(os.path.abspath(__file__))+'/rtm.json'))
m={}
for c in C:
  for r in re.findall(r'REQ-[A-Z]+-\d+',c['reqs']): m.setdefault(r,[]).append(c['id'])
ST={'done':'已实现','partial':'部分','not':'未实现','unclear':'待澄清','frozen':'冻结','cancelled':'已取消'}
def cell(x): return str(x or '').replace('|','／').replace('\n',' ')[:160]
rows='\n'.join(f"| {r['id']} | {cell(r['title'])[:60]} | {cell(r.get('priority'))} | {ST.get(r['status'],r['status'])} | {cell(r.get('evidence'))[:120]} | {cell(r.get('missing'))[:120] or '—'} | {', '.join(m.get(r['id'],[])) or ('—' if r['status'] in ('done','cancelled') else '本版不排（见 12_）')} |" for r in R)
from collections import Counter
cnt=Counter(r['status'] for r in R)
unmapped=[r['id'] for r in R if r['status'] in('partial','not') and r['id'] not in m]
open(f"{D}/03a_统一需求追溯矩阵.md",'w').write(f"""# 03a · 统一需求追溯矩阵（V0.12.0，基线 main@3b9f88c）

{V}

> 唯一的「需求 → 现状 → 任务」追溯表。行集 = V0.10.0 RTM 的 115 条需求（原 158 行含 43 行重复的差距表，已去重）+ 本次新增 35 条（REQ-N-001…035，来源：`项目需求更新分析.md` R-72…R-82、界面交互/功能设计/SSO 文档中无 RTM 行覆盖的条目、V0.11 B11 卡、EVD-UX-01 修复、`docs/archive/reference/补充.txt`）。
> 状态以 **真实代码** 为准，证据列为 文件:行 / 路由 / 模型名；运行态与视觉项基于代码 + 既有 EVD 判断（未在本规划中重跑浏览器）。生成：`_generator/build_rtm.py` → `rtm.json` → `gen.py`。

## 汇总
共 **{len(R)}** 条：已实现 {cnt['done']} · 部分 {cnt['partial']} · 未实现 {cnt['not']} · 待澄清 {cnt['unclear']} · 冻结 {cnt['frozen']} · 已取消 {cnt['cancelled']}。
部分 + 未实现 = {cnt['partial']+cnt['not']} 条，其中 {cnt['partial']+cnt['not']-len(unmapped)} 条已挂 V0.12 卡；**未挂卡 {len(unmapped)} 条**（{', '.join(unmapped)}）的处置理由见 `12_风险与待裁决.md` §三「本版明确不做」。

| REQ | 需求 | 优先级 | 现状 | 证据 | 缺口 | V0.12 卡 |
|---|---|---|---|---|---|---|
{rows}
""")
print('unmapped',unmapped)

# steps：每个切片一个步骤文件
SL={"S12-0":"步行骨架：门禁真绿","S12-1":"真相归一","S12-2":"监控调度闭环","S12-3":"可靠性","S12-4":"合规展示","S12-5":"账户安全","S12-6":"用户端体验","S12-7":"设计系统收敛","S12-8":"测试补齐与收口"}
os.makedirs(f"{D}/04_planning/steps",exist_ok=True)
idx=[]
for n,(k,t) in enumerate(SL.items(),1):
  cs=sorted([c for c in C if c['slice']==k],key=lambda c:lvl[c['id']])
  fn=f"STEP-{n:02d}-{k}-{t.split('：')[0]}.md"; idx.append(f"| {n} | [{k} {t}](./{fn}) | {len(cs)} | {sum(H(c) for c in cs)} |")
  body='\n'.join(f"| {c['id']} | {c['name']} | {c['owner']} | {', '.join(c['dep']) or '—'} | {c['tier']} | {H(c)} |" for c in cs)
  sub='\n'.join(f"#### {c['id']} {c['name']}\n"+'\n'.join(f"- {n}.{i}.{j} {s}" for j,s in enumerate(c['steps'],1)).replace(f"- {n}.{i}.","- "+f"{n}.{i}.") for i,c in enumerate(cs,1))
  open(f"{D}/04_planning/steps/{fn}",'w').write(f"""# STEP-{n:02d} · {k} {t}

{V}

## 目标
见 `06_垂直切片清单.md` 中 {k} 行的「可演示行为」。

## 进入条件
- APPROVE 已获批；本步骤所有卡的 Depends on 已为「已合并」。
- 执行方开卡前：`git status` 干净 → `git fetch origin && git rebase origin/main`。

## 卡（按依赖层排序）
| 卡 | 名称 | 执行方 | 依赖 | 档位 | 工时 |
|---|---|---|---|---|---|
{body}

## 三级执行大纲（{n}.卡序.步骤序）
{sub}

## 退出条件
- 本步骤全部卡在 task-index 中为「已合并」并附提交号；各卡 EVD 的 verify.txt 存在。
- 独立验证者对每张卡给出 PASS（只看 diff + 运行结果）。
""")
open(f"{D}/04_planning/steps/README.md",'w').write(f"# 执行步骤索引\n\n{V}\n\n每个步骤一个文件，编号即推荐顺序；步骤之间允许按 08_ 的可并行组交错。\n\n| 序 | 步骤 | 卡数 | 工时(h) |\n|---|---|---|---|\n"+'\n'.join(idx)+"\n")
