# docs/ 文档树分类重组 Checklist

> change-id: `reorganize-docs-tree` | 版本: v1.1 | 创建: 2026-09-29 | 更新: 2026-09-29

| # | 检查项 | 证据 | 状态 |
|---|--------|------|------|
| 1 | docs 根仅 README.md + 文档索引.md | 终检输出 `docs 根 .md：README.md , 文档索引.md` | ✅ |
| 2 | 28 个原根文档全部落位（26 迁移 + 1 合并体 + 1 归档） | git status rename 27 条（5 R + 22 RM）+ 1 D | ✅ |
| 3 | 《登录方案》合并体含上篇 A1–A7 + 下篇 0–11，内容零丢失 | 合并体 375 行；268+121−重复头部 | ✅ |
| 4 | 双横幅 ×7 清零（每文件恰 1 横幅，半角铁律 3 格式） | 数据库文档 v2.8 等逐文件核验 | ✅ |
| 5 | check-docs-rule / check-docs-facts 双绿（锚新路径生效） | rule PASS（model=52/enum=36/域=23/页=22）；facts 13/13 | ✅ |
| 6 | 链接解析器零死链 | 181 检查 / 0 死链 | ✅ |
| 7 | 27 个旧路径残留 = 0（活树；archive README 的「原路径」登记性引用除外） | 终检残留 1 处 = archive §十 历史记载（非断链） | ✅ |
| 8 | tsc 0 / vitest 全绿 | shared tsc OK + web turbo typecheck 1/1；shared 104/104 + web 733/733 | ✅ |
| 9 | 铁律 6：目录结构文档已同步 docs/ 树 | v3.7 §二 docs/ 五域树 | ✅ |
| 10 | 台账四件套版本推进（索引 v1.65 / 目录结构 v3.7 / archive README v1.2 / 未完成事项目录 v2.19） | banner diff | ✅ |
