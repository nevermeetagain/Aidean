# STEP-03-契约与数据 · 契约与数据模型复核

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219）

## 目标
契约与数据模型复核，作为进入下一步的闸门。

## 执行动作
契约唯一源未变（docs/任务规划V0.5.0/contracts）；shared 新 schema（feature-flags、favorites、system）与契约同名；迁移新增 1 条（M-001 已落地），M-002 仍归 TASK-058

## 产出
04_契约冻结包.md、05_数据模型基线.md（承接说明）、00_governance/glossary.md、ADR-P009

## 子智能体审查
- 审查者：review-step3-final（只读、独立于执行者，只输出 PASS / FAIL / UNKNOWN + 证据）
- 结论：终审 Q1 PASS（开关码/收藏 DTO/SystemReady/20003·50010·50011 与契约逐字一致）；Q2 PASS（favorites、feature_flags 两表在 0000_init 已存在，叠加未缺迁移；仅新增 M-001）；Q6 FAIL（05 §5.1/5.2 迁移现状过期）

## 修正与优化
05/03/23/ADR-P002 加 V0.8.0 更正；全部承接说明改为「V0.7.0 历史表述，以 V0.8.0 为准」

## 完成度
100%（Q6 已更正，复核见 STEP-05）

## 进入下一步的条件
审查无未闭环 FAIL；所有修正已重新跑生成器并通过机械校验（无环、0 重叠、RTM orphan 0 / 缺口 0）。
