# 任务卡模板（task-template）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952）（模板沿用 V0.5.0，新增「V0.7.0 状态」行）

> V0.7.0 状态：<未开工 | 条件·待裁决 | 他线声称完成·证据不足 | 待裁决 B-0 | 已关闭(EVD-086 PASS)>｜<一句话依据>

````markdown
# TASK-XXX：<任务名称>

> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: <简述>
> 执行者：<Hark(主Agent) | 外部Agent> ｜ 所有权 Agent：<Agent-*> ｜ 建议档位：<haiku|sonnect|opus|fable>

## 归属
- 所属切片：S-N
- 来源需求：REQ-F-xxx / REQ-NF-xxx / REQ-C-xxx
- 来源方案：SOL-xxx / ADR-Pxxx / DESIGN-xxx

## 目标
<一句话，可验证>

## 输入
- 文档：<路径:行>
- 契约：<具体 schema/常量名>
- 前置任务：<TASK-xxx>
- 前置状态：<如「迁移 M-001 已合并」>

## 输出
- 新增/修改的文件路径：<精确到文件或目录>

## Execution Steps
1. [ ] <可执行动作>

## 验收标准
- [ ] <可自动化检查优先>
- [ ] diff 仅落在「允许修改」范围内

## 验证命令
```bash
<可直接复制执行；pnpm 命令跨 Windows/Linux 通用>
```

## 证据路径
docs/任务规划V0.2.0/06_validation/evidence/EVD-XXX/

## 允许修改
- <path pattern>

## 禁止修改
- .example/history/** · docs/任务规划V0.2.0/contracts/** · AGENTS.md · <其他>

## 依赖与阻塞
- Depends on： · 资源锁串行： · Blocks： · 阻塞条件：<遇到什么就停>

## 建议执行档位
<档位>　理由：<一句话>

## 升级条件
<条件>；通用熔断：连续 2 次验收失败 → 停止改代码，重写任务书/升级/blocked

## 预估规模
<小/中/大>　约 Nh　<是否 <2h>
````

合法性：任一字段缺失 = 非法任务，执行者停止并要求补齐（开发流程.md §二 纪律①）。
