# 任务卡模板（V0.12.0）

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版

```markdown
# T120-XX：<任务名称>
## 归属        所属切片 / 执行方 / 来源需求 REQ-xx / 来源方案 ADR-xx·DESIGN-xx
## 目标        一句话，可验证
## 输入        文档 / 契约（schema 名）/ 前置任务 / 前置状态
## 输出        新增/修改文件（精确到文件或目录）+ EVD 路径
## Execution Steps   1. [ ] … （动作级，可勾选）
## 验收标准    可自动化优先；不可自动化写清人工判据
## 验证命令    可直接复制执行
## 证据路径    docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-XX/
## 允许修改    path patterns
## 禁止修改    path patterns（默认含 packages/shared 契约、他卡迁移、历史规划、.example/）
## 依赖与阻塞  Depends on / Blocks / 阻塞条件
## 建议执行档位 haiku|sonnect|opus|fable + 理由
## 升级条件    连续 2 次验收失败 / 需动禁止路径 → 停、升档、报 Hark
## 预估规模    小/中/大 + 工时
```
