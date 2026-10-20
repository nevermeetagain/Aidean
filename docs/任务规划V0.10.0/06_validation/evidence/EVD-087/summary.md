# EVD-087：V0.5.0 规划树文件名 mojibake 修复

> 卡片：TASK-087 | 执行：助手 C | 日期：2026-10-20

## 结论
- 27 个双编码（mojibake）文件名已 `git mv` 为正字；`git ls-files | grep -cP` = 0，独立扫描 = 0。
- 重命名逐文件 sha256 前后一致（内容零改动）；`contracts/` 与 `database/` 无 diff。
- README 相对链接断链从 12 降至 0；修复方式为指向 V0.4.0 同名继承文件（21_Agent任务书 指向 V0.10.0 现行版本）。
- docs rule exit=0；docs facts exit=0（14/14）；见 verify.txt 全文。

## 事实与口径
- `EVD-BASELINE-V7/mojibake-map.txt` 登记 24 个；实际扫描到 27 个（多出 3 个未被该映射覆盖），全部处理。
- 22 个可由 GB18030 反解恢复；5 个不可逆，按语义人工命名：
  `09_所有权矩阵.md`、`ADR-P002-功能开关失败策略与权限复用.md`、`ADR-P003-价格当前行部分唯一索引.md`、
  `ADR-P004-需求文档与代码口径对齐.md`、`DESIGN-001-功能开关运行时.md`。
- `19_执行过程记录.md` 原文件名已正确（内部 GBK 内容），未改。
- `03_solution/` 下 10 个文件与 V0.4.0 同名文件字节一致；按卡面“仅改文件名”保留，不删除（见 duplicates-check.txt）。

## 并发事件（必须记录）
- 27 个 rename 已 staged 时，并行助手在共享工作树上执行提交，rename 被并入 `7bf9764d feat(TASK-032)`。
- 未做历史改写（禁止）；本卡提交仅补 README 引用与证据。文件名修复本身已随 `7bf9764d` 进入 `mirror/main`。

## 证据索引
- `before.txt`：开工 HEAD、24/27 计数、tracked 总数
- `rename-map.tsv` / `rename-log.txt`：旧名 → 新名、sha256 前后值
- `verify.txt`：卡面验收命令、docs 门禁、diff 范围、链接与重复文件核对
- `link-check.txt`：CJK 文件名清单与断链明细
- `duplicates-check.txt`：与 V0.4.0 的字节一致清单
- `gate-rule-before.txt` / `gate-facts-before.txt` / `baseline-web-test.txt`：开工基线
