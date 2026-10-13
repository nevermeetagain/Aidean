# docs/ 文档树分类重组 Tasks

> change-id: `reorganize-docs-tree` | 版本: v1.1 | 创建: 2026-09-29 | 更新: 2026-09-29

> 方案大纲（≥3 级、原子化）。状态：☐ 待办 / ☑ 完成。

## 1. 前置（PLAN/SPEC/APPROVE）

- ☑ 1.1 全库引用面取证：CI 脚本硬路径（check-docs-rule ×2 / check-docs-facts ×1）、AGENTS.md、根 README、ci.yml 注释、代码注释 10 文件 13 处、index.json 14 条、docs 互链 21 文件
- ☑ 1.2 30 文件画像：版本横幅普查（发现 7 处双横幅）、互链图谱（21/30 有链接）、合并候选判断
- ☑ 1.3 工作区状态核验：会话中途发生 `git checkout main`（.docs/ 旧世界残留），已切回 huaweicloud @7c155303 并验证 30 文件齐整
- ☑ 1.4 SPEC 三件套入库（本目录）

## 2. 结构迁移（IMPLEMENT-A）

- ☑ 2.1 创建分类目录：`product/requirements`、`product/design`、`product/modules`、`architecture`、`engineering`、`governance`、`plans`
- ☑ 2.2 git mv 迁移 26 文件（映射见 文档索引 §十 对照表）
- ☑ 2.3 登录方案合并：`登录方案-实施手册.md` → `product/modules/登录方案.md`（v1.3，上篇 A1–A7 决策 / 下篇 0–11 手册），`git rm 登录方案-评审与决策.md`
- ☑ 2.4 `旧资产迁移清单.md` → `archive/`
- ☑ 2.5 双横幅清理 ×7（UI设计 v1.6 / 功能设计 v0.8.2 / 开发环境搭建 v1.3 / 技术架构 v1.4 / 数据库 v2.8 / 旧资产迁移清单 v1.3 / 测试与验收 v1.14）：删 L1 v0.7.1 占位线，真横幅统一半角铁律 3 格式并顺延

## 3. 引用面修复（IMPLEMENT-B）

- ☑ 3.1 CI 脚本：check-docs-rule.mjs（数据库文档→architecture、功能设计文档→product/design）、check-docs-facts.mjs（数据库文档→architecture）
- ☑ 3.2 AGENTS.md：`docs/开发流程.md` → `docs/governance/开发流程.md`
- ☑ 3.3 根 README.md：目录结构文档→governance、开发环境搭建→engineering
- ☑ 3.4 ci.yml :83 注释：REL-ENG-02 补 archive 路径
- ☑ 3.5 代码注释 ×10 文件：errors.ts / response.ts / formula-parser.ts / sync.ts / seed.ts ×4 / c02-regression.mjs / qa-fe-01-regression.mjs / seed-products.mjs ×3 / docker-compose.dev.yml / g6-openapi-keys.spec.ts / pricing-config.ts
- ☑ 3.6 `apps/web/docs/index.json`：14 条 path 更新
- ☑ 3.7 docs 互链与行内 `docs/*.md` 路径机械重算（含 specs/、ADR/、research/、archive/README 指向被移动文档的引用；archive 内容件冻结不动）+ 顺手修复 specs 历史断链 13 处

## 4. 导航与台账（VERIFY 前收口）

- ☑ 4.1 新建 5 个分类 README（product 含三子目录说明 / architecture / engineering / governance / plans）
- ☑ 4.2 docs/README.md v2.8：导航链接重算 + §8.8 ADR-0005 畸形链接修复
- ☑ 4.3 文档索引 v1.65：全量登记表（§一~§六 逐篇：新路径/版本/定位）+ §九 新目录树 + §十 迁移对照表
- ☑ 4.4 目录结构文档 v3.7：docs/ 树同步（铁律 6）
- ☑ 4.5 archive/README v1.2：登记 旧资产迁移清单（§十）
- ☑ 4.6 未完成事项目录 v2.19：§7.19 本轮回执 + 登记 #77（index.json 生成器缺失）

## 5. 验证（VERIFY）

- ☑ 5.1 `node scripts/check-docs-rule.mjs` exit 0
- ☑ 5.2 `node scripts/check-docs-facts.mjs` 13/13
- ☑ 5.3 自研链接解析器：docs 全部 .md（archive 内容件除外）相对链接零死链（178 检查 0 死链）
- ☑ 5.4 残留扫描：27 个旧根路径在活树（代码+脚本+活文档）零命中
- ☐ 5.5 `pnpm typecheck` 0 错误；`pnpm test` vitest 全绿（回执见提交说明）
- ☐ 5.6 git status 复核：rename 检出正常、无意外文件

## 6. 归档（CLOSE）

- ☑ 6.1 清理临时脚本（.zcode-tmp-*.mjs）
- ☐ 6.2 提交授权交还管理者（本仓约定：commit 需授权），附建议 commit message
