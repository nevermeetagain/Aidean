# docs/ 文档树分类重组 Spec

> change-id: `reorganize-docs-tree` | 语言: 中文 | 版本: v1 | 创建: 2026-09-29 | 更新: 2026-09-29

> 批准依据：管理者本轮指令「帮我归纳和整理文档目录……建立后立即执行」（2026-09-29），即六步循环 APPROVE 步的预授权。

---

## 为什么（Why）

- docs/ 根平铺 30 个实体文档（自 v1.60 归档轮 56→31 后未再分类），需求、设计、架构、运维、待办、历史混杂，检索靠记忆；对照 AGENTS.md 文档治理铁律的类别语义（项目文档 / 待执行方案 / 历史记忆），缺一层物理分类。
- 《文档索引》虽自称唯一真源，但仅零散登记 5 类条目，从未逐篇登记全部根文档——索引能力与文档规模不匹配。
- 存量卫生债：7 个文件存在**双版本横幅**（L1 v0.7.1 占位线 + 标题下真横幅，两套版本线并存）；《登录方案》评审与实施两篇同日定版、互为镜像引用，具备合并条件。

## 变更清单（What Changes）

- 新增 6 个分类目录：`docs/product/{requirements,design,modules}`、`docs/architecture/`、`docs/engineering/`、`docs/governance/`、`docs/plans/`；docs 根仅留 `README.md` + `文档索引.md`。
- 27 个根文档 `git mv` 迁入分类目录；`旧资产迁移清单.md` 归档至 `docs/archive/`（铁律 4 精神：归档非删除）。
- **合并**：《登录方案-评审与决策》（v1.1）并入《登录方案-实施手册》（v1.2）为新 `docs/product/modules/登录方案.md`（v1.3，上篇决策 / 下篇手册），原评审篇 git rm（历史留痕于 git）。
- 修复 7 个双横幅文件：删除 L1 v0.7.1 占位横幅，统一为铁律 3 半角格式单横幅并顺延版本号。
- 引用面同步：CI 脚本 2 处硬路径、AGENTS.md 1 处、根 README 2 处、ci.yml 注释 1 处、代码注释 10 文件 13 处、`apps/web/docs/index.json` 14 条 path、docs 内互链与 `docs/*.md` 行内路径全量重算。
- 新增 5 个分类目录 README（导航桩）+ `docs/specs/reorganize-docs-tree/` 三件套。
- 台账收口：《文档索引》v1.65（新增全量登记表 + 迁移对照表）、《目录结构文档》v3.7、《archive/README》v1.2、《未完成事项目录》v2.19（§7.19）。

**BREAKING**：无运行时行为变更；docs 外部引用全部同轮修复。被合并的《登录方案-评审与决策》内容完整并入后原文件删除（内容零丢失，git 历史留痕）。

## 影响面（Impact）

- Affected specs: 无（纯文档结构变更；establish-dev-workflow 的 specs 目录约定不变）
- Affected code:
  - 移动类：`docs/{27 个根文档}` → 分类目录；`docs/登录方案-评审与决策.md` 删除
  - 新建类：`docs/product/**`、`docs/architecture/`、`docs/engineering/`、`docs/governance/`、`docs/plans/`、各分类 README、`docs/specs/reorganize-docs-tree/`
  - 修改类：`scripts/check-docs-rule.mjs`、`scripts/check-docs-facts.mjs`、`AGENTS.md`、`README.md`、`.github/workflows/ci.yml`、`apps/web/docs/index.json`、10 个代码注释文件、docs 内互链文档

## ADDED Requirements

### Requirement: 分类目录体系

docs/ SHALL 按五域组织实体文档：product（产品：requirements/design/modules 三层）、architecture（架构与数据）、engineering（工程与运维）、governance（治理）、plans（待执行与决策）；docs 根仅保留 README.md 与 文档索引.md。

#### Scenario: 根目录零平铺

- **WHEN** 列举 docs/ 根的 .md 文件
- **THEN** 仅存在 README.md 与 文档索引.md 两个文件
- **AND** 其余 28 个原根文档（30 − 2 根留 − 1 合并消减 + 1 归档入 archive）均在分类目录或 archive/ 下

### Requirement: 引用零断链

所有指向被移动文档的引用 SHALL 同轮修复；修复后全库活文档（docs 非 archive 内容件、代码、脚本、配置）内的 .md 相对链接 SHALL 全部可解析到实际文件。

#### Scenario: 链接解析器全绿

- **WHEN** 对 docs/ 全部 .md（archive/ 内容件除外）执行链接存在性解析
- **THEN** 零死链

### Requirement: CI 口径锚随迁

《数据库文档》《功能设计文档》作为 check-docs-rule / check-docs-facts 的口径锚文档，移动后脚本内路径 SHALL 同步更新且门禁复跑通过。

#### Scenario: docs 门禁绿

- **WHEN** 运行 `node scripts/check-docs-rule.mjs` 与 `node scripts/check-docs-facts.mjs`
- **THEN** 两脚本 exit 0，锚文档从新路径读取成功

## MODIFIED Requirements

（无）

## REMOVED Requirements

（无）
