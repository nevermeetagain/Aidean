# 修复恢复脚本客户端目录 Spec

> 版本: v1.0 | 更新: 2026-09-17 | 变更: 从模板建立D2.1路径子项规格。
> change-id: `fix-restore-client-path`

## 为什么（Why）

`scripts/db/restore.sh:51`从scripts/db上移一级后寻找apps/web，实际指向不存在的scripts/apps/web。已用仅执行cd表达式的测试复现，两种工作目录均退出1。依据[数据部署方案](../../archive/验收方案-数据部署.md)D2.1，本次只关闭路径子项。

## 变更清单（What Changes）

修正路径上移层级；新增不执行数据库命令的Node内置测试；记录失败与修复后证据。

## 影响面（Impact）

修改scripts/db/restore.sh；新建scripts/db/restore-path.test.mjs。同步根.docs方案、目录基线和执行记录。继承[开发流程](../../governance/开发流程.md)四层级、六字段及六步循环。无公开接口、数据库模型、依赖或技术栈变化。

## ADDED Requirements

### Requirement: 客户端目录不依赖调用者工作目录

恢复脚本SHALL定位仓库apps/web。

#### Scenario: 从不同目录调用

- **WHEN** 从仓库根或临时目录以绝对脚本路径调用，或从仓库根以相对路径调用
- **THEN** 客户端生成步骤的cd目标为仓库apps/web
- **AND** 回归测试只执行cd表达式，不执行psql、pg_restore或npx。

## MODIFIED Requirements

仅修正已有路径，不改变恢复确认、失败策略、数据操作顺序。本次不认可现有恢复安全性，归档校验、目标身份、失败处理和真实恢复演练仍开放。

## REMOVED Requirements

无。

## 批准边界

用户本轮明确要求依既有方案开始开发并逐步验证，作为本次D2.1确定性路径修复的实施授权；不扩展为生产数据库操作、提交或发布授权。
