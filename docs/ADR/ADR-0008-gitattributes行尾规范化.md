# ADR-0008：.gitattributes 行尾规范化锁定（建议实施，实施需单独批准）

> 状态：提议 | 日期：2026-10-08 | 关联：《未完成事项目录》#82（v2.30 登记）、§7.27 pnpm store/CRLF 事故注记、台账既有「CRLF 全文件污染误判」判例

## 一、背景

1. 本仓库从未有过 `.gitattributes`（实测 `Test-Path .gitattributes = False`），行尾行为完全依赖各开发机的 `core.autocrlf`。当前开发机实测 `core.autocrlf = true`。
2. 历史上曾发生一次「CRLF 全文件污染」误判：diff 中出现整文件行尾重写，掩盖真实语义变更，审查成本高（台账判例）。
3. 本轮 2000 文件抽样实测：**509/2000（25.5%）跟踪文件工作树含 CRLF**。`autocrlf=true` 下这些文件的仓库对象通常已存 LF（签出时转换），故 renormalization 的**对象库改动面预计远小于工作树表面 CRLF 面**；但 26,724 个跟踪文件（含 `.example/history/` 归档大目录）中确切的对象级差异**必须经 dry-run 实测后才能量化**——本 ADR 不给虚构数字。
4. `autocrlf` 是本地配置：任何新克隆、CI runner、协作者机器的取值都不可控；文本文件行尾入库形态处于「无人治理」状态，跨平台（Windows/Linux 混用，生产为 Linux 容器）时是慢性漂移源。

## 二、决策（提议）

**引入根级 `.gitattributes` 锁定行尾真源，并做一次隔离的 renormalization 提交。** 结论为「建议实施，实施需管理者单独批准」；批准前本 ADR 仅存档，不动任何存量文件。

拟用最小规则集：

```gitattributes
# 文本默认：入库 LF，签出 LF（Windows 不再转 CRLF）
* text=auto eol=lf
# 明确文本类型（防探测误判）
*.ts text eol=lf
*.tsx text eol=lf
*.css text eol=lf
*.mjs text eol=lf
*.json text eol=lf
*.md text eol=lf
*.ps1 text eol=crlf
# 二进制显式豁免（防止对探针产物/依赖锁二进制段做行尾转换）
*.png binary
*.jpg binary
*.woff2 binary
*.sqlite binary
```

注：`*.ps1 eol=crlf` 因 Windows PowerShell 5.1 对无 BOM/行尾敏感脚本的兼容性问题而单独锁定，若 dry-run 证明无必要可去除。

## 三、影响与风险

1. **renormalization 提交会触碰全部行尾不一致文本文件**，属「零语义变更、海量 diff」型提交：
   - 与在途分支/PR rebase 时是冲突放大器 → 必须选**无在途并行写入的窗口**执行；
   - 事后 `git log -p` 审查噪声大 → 提交信息须注明「纯行尾规范化」，配合 `git diff -w` 复核零语义变更。
2. 本仓库当前为单人协作主干模式（huaweicloud 唯一主干，ADR-0007），并行冲击面小，是执行该操作的低摩擦窗口。
3. CI（ubuntu，LF 原生）行为不变；Windows 端 `autocrlf` 被 `.gitattributes` 覆盖，跨机一致性由「各机自觉」升级为「仓库强制」，从根上消灭 CRLF 误判类事故。
4. `.example/history/` 大目录若含行尾不一致文件，会显著放大 renormalization diff——dry-run 后如属实，可批准追加 `.example/** -text`（豁免不转换）以控制提交面。

## 四、实施步骤（批准后执行）

1. 备份指针：记录当时 HEAD hash（回滚锚点）。
2. 写入 `.gitattributes`（本 ADR §二 规则集，dry-run 后可含 `.example/** -text` 修订）。
3. `git add --renormalize .` 后**先不提交**，跑四项验证：
   - `git diff --cached --stat` 量化实际改动文件数（写入台账 #82 实施回执，替代本 ADR 的预估空白）；
   - 抽样 `git diff --cached -w` 确认零语义变更；
   - `pnpm --filter web exec tsc --noEmit` exit 0；
   - `pnpm --filter web test` 全绿 + `pwsh scripts/check-gates.ps1` PASS。
4. 单一提交：`chore(repo): renormalize line endings to LF (.gitattributes)`。
5. `pnpm install --force` 重建本机 node_modules 链接（防 pnpm 对脚本文件行尾的缓存差异），复跑门禁。

## 五、回滚方案

`git revert` renormalization 提交 + 删除 `.gitattributes` 即可完全恢复；对象库无数据丢失风险（纯行尾形态变更）。回滚锚点见步骤 4.1 记录值。

## 六、未采用的备选

- **仅设规则不 renormalize**：存量混合行尾仍在，首次编辑老文件即产生「顺带全文件行尾重写」的脏 diff——治标不治本，弃。
- **依赖各机 autocrlf 自觉**：不可移植、不可验证，正是历史事故根因，弃。
