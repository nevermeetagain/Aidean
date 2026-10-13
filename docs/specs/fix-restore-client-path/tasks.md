# 恢复客户端路径任务

> 版本: v1.1 | 更新: 2026-09-17 | 变更: 记录路径回归红绿对照与范围内检查；全量构建未执行，整体未关闭。

## 阶段1：路径修复

本级职责：修复并核验客户端目录定位；前置为明确的路径缺陷证据；产出为脚本、回归测试与检查记录。

### Task 1.1 定位正确目录

【依赖】用户开始实施授权；【产出】脚本与无数据库回归测试。

#### SubTask 1.1.1 路径护栏
- [x] 完成
- 【目标】固定真实脚本cd行为的失败证据。
- 【范围】新建scripts/db/restore-path.test.mjs。
- 【验收】旧脚本在三种调用上下文均失败；不执行恢复。
- 【验证命令】node --test scripts/db/restore-path.test.mjs
- 【产出】可重跑Node内置测试。
- 【依赖】spec范围确定。
- 【执行记录】2026-09-17：旧路径（`../apps/web`）经临时副本在绝对路径-仓库根、绝对路径-临时目录、相对路径-仓库根三上下文均复现退出1（cd: No such file or directory），未触碰现脚本、未执行psql/pg_restore/npx；回归测试就位（仅执行cd表达式并校验落点含package.json与prisma/schema.prisma）。

#### SubTask 1.1.2 修正并验证
- [x] 完成
- 【执行记录】2026-09-17：restore.sh:51 改为 `../../apps/web`；修复前同命令两工作目录均退出1，修复后均退出0（落点 `/e/Code/Aidean/apps/web`）；`node --test scripts/db/restore-path.test.mjs` 3/3 通过；`bash -n` 通过；docs 检查与 git diff --check 均退出0，见 checklist R-4；全量构建 G-1 未执行，Task 1.1 不标记整体完成。
- 【目标】正确定位apps/web。
- 【范围】修改scripts/db/restore.sh与对应.docs记录、目录基线。
- 【验收】三种上下文通过；bash语法通过；文档检查通过。
- 【验证命令】node --test scripts/db/restore-path.test.mjs；bash -n scripts/db/restore.sh；node scripts/check-docs-rule.mjs
- 【产出】修复与证据链。
- 【依赖】1.1.1失败证据。
