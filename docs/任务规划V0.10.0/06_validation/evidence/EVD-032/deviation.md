EVD-032 偏离说明

1. 本卡提交除「允许修改」4 项外，还包含 docs/任务规划V0.5.0/ 下 30 个文件的
   「文件名编码规范化」rename（mojibake 名 → 正确中文名，相似度 100%，零内容变更）。
   原因：Windows 磁盘上真实文件名本就是正确中文，而 git index 记录的旧名为
   GBK/UTF-8 混淆名；任何一次 git add/commit 触发的重扫描都会将其登记为 rename，
   无法通过 checkout 恢复（磁盘上不存在混淆名文件）。
   性质：非内容性、非功能性的元数据修复，与 TASK-087（mojibake 文件名修复，
   助手 C 卡）口径一致；不触碰铁律 4（.example/history 未动）与冻结契约内容。
   依据：交接任务书 §3.2「卡面未列但确需改的文件在证据里写偏离说明」。

2. 其余改动严格限于允许修改清单：
   - packages/shared/src/schemas/search.schema.ts（新增，契约 §S5 原样落地）
   - packages/shared/src/__tests__/search.spec.ts（新增 18 用例）
   - packages/shared/src/index.ts（仅追加 1 行 export）
   - docs/任务规划V0.10.0/06_validation/evidence/EVD-032/**（证据）
