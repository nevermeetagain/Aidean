# Checklist · 修复恢复脚本客户端目录

> 版本: v1.1 | 更新: 2026-09-17 | 变更: 记录实际红绿对照及范围内检查，保留未执行的全量构建门禁。

## 分组一 · 路径修复

- [x] R-1 旧路径回归可证伪（SubTask 1.1.1）[测试]
  - 在临时根目录保留 scripts/db 与 apps/web/prisma 布局，复制同一测试，先写入旧路径脚本，再写入修复脚本。分别执行 `node --test scripts/db/restore-path.test.mjs`：旧版 0/3、退出1；新版 3/3、退出0。早先未保留布局的临时副本结果不作为本项依据。临时工件已清理。
- [x] R-2 正确目录与三调用上下文（SubTask 1.1.2）[测试]
  - `node --test scripts/db/restore-path.test.mjs`：真实工作树 3/3、退出0。覆盖绝对路径从仓库根/临时目录调用、相对路径从仓库根调用；断言规范化后的准确 apps/web 路径及 package.json、prisma/schema.prisma 存在。
  - 测试仅抽取 cd 表达式，不执行 psql、pg_restore、npx；不能证明实际恢复成功。
- [x] R-3 Shell 语法（SubTask 1.1.2）[命令]
  - `bash -n scripts/db/restore.sh`：退出0。
- [x] R-4 范围内文档及差异检查（SubTask 1.1.2）[命令]
  - `node scripts/check-docs-rule.mjs`：退出0，只证明该检查器覆盖的 apps 下 Markdown 规则，README 豁免；不是全部文档治理通过。
  - `git diff --check`：退出0；存在 Git 的 LF 将转 CRLF 提示，不将其描述为无警告。
- [x] R-5 对应文档同步（SubTask 1.1.2）[断言]
  - 数据部署方案 v1.1 仍保留 D2.1 整体未通过；目录基线 v2.8 登记脚本/测试及规格目录；文档索引 v1.19 提供三件套入口。

## 全局回归门禁

- [ ] G-1 `pnpm install && pnpm build` 连续退出0 [命令]
  - 未执行。不以范围内测试代替此门禁；Task 1.1 整体 CLOSE 未通过。
- [x] G-2 与开发流程回归联动 [断言]
  - R-2 自动化检查已登记并执行；任务书保留六字段，G-1 未勾选。

## 边界

归档校验、目标库身份、必要步骤失败退出、真实备份恢复和生产验收均不属于已证明结果。没有执行数据库恢复、提交或发布。checklist 曾在文档同步前提前勾选，现以实际工件及范围内复核结果更正，不追认当时的完成声明。
