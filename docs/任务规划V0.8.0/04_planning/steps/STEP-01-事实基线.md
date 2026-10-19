# STEP-01-事实基线 · 建立 c2da219 事实基线

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219）

## 目标
建立 c2da219 事实基线，作为进入下一步的闸门。

## 执行动作
拉取 origin/main（cdd8500→c2da219，ff-only）；读 71 个 delta 文件；跑 shared/web tsc、vitest、lint、build、docs 门禁；证据落 EVD-BASELINE-V8

## 产出
01_规划快照.md、02_事实基线.md、06_validation/evidence/EVD-BASELINE-V8/

## 子智能体审查
- 审查者：review-step1-facts（只读、独立于执行者，只输出 PASS / FAIL / UNKNOWN + 证据）
- 结论：C1–C13 全部 PASS；反证 X1（生成器缺失影响 2 份 spec + 1 个 CI 门）、X2（代码注释指向不存在的根 contracts/）、X3（docs 门禁排在单测前，CI 先挂文档步）

## 修正与优化
X1 → 085 验收加防漂移 CI 门；X2 → D8-07 + 术语表映射 + U-20；X3 → D8-02 注明、16_ 启动顺序 090 先于 089

## 完成度
100%（13/13 PASS，3 条反证已落入规划）

## 进入下一步的条件
审查无未闭环 FAIL；所有修正已重新跑生成器并通过机械校验（无环、0 重叠、RTM orphan 0 / 缺口 0）。
