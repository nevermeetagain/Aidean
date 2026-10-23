T120-07 偏离记录（5 条，每条 ≤5 行）· 抄送 Hark

① 卡面「输入」`v011_status.md` 仓内不存在
`Get-ChildItem -Recurse -Filter v011_status.md` 返回空（该文件名被 V0.12 规划文档 10+ 处引用，属规划期虚构载体）。
等价取证源改为可核验三件：`git log`（逐卡终提交号）、`docs/任务规划V0.12.0/02_事实基线.md` D-08/D-09、`docs/任务规划V0.11.0/25_执行记录.md` §九。
后果：卡→提交号映射全部落到 git 实况，未凭「输入文件」想象填写；建议 Hark 把 10_ §引用处的 v011_status 改指真实载体，或补建该文件。

② 卡面「禁止修改」与「允许修改」字面冲突
「禁止修改」含 `docs/任务规划V0.*/（历史版本只读，T120-08 除外）`，而「允许修改／输出」明列 `docs/任务规划V0.11.0/` 的 README／07_／12_。
按「更具体的显式授权优先」执行：只改被点名的三个 V0.11.0 文件 + CHANGELOG.md，未触碰其它 `任务规划V0.*`（含 V0.10.0/V0.11.0 的 00_/25_/15_ 等）。
`git diff --name-only origin/main...HEAD` 只有 4 个允许路径为证；若裁决口径应为「禁止优先」，本卡须整组回退，请 Hark 明示。

③ `12_` 单行 >400 字符由 8 条增至 13 条
为保 `00_`／`25_` 对 `12_` L36／L60 的行号锚，采用「既有行零增删 + 只在原行尾扩写 + 文末追加 §五」，故长行随之变多（78→93 行）。
卡面验收只约束 README 的行数与行长，未约束 12_／07_／CHANGELOG，故不构成验收失败。
后续若要收敛长行，只能整体重排 `12_` 并同步追改 `00_`／`25_` 的行号引用，属 T120-08 或专卡范围。

④ 卡面验证命令在本机 shell 下不可直接执行
命令写成 `node -e "..." && node scripts/check-docs-rule.mjs`，PowerShell 5.1 不支持 `&&`，且内联中文路径 + 反引号会让 shell 停在 `>>` 续行。
改为等价载体 `node .scratch/t12007-verify.mjs`（同一 `readFileSync(...).split('\n')` + `Math.max(...map(l=>l.length))` 读数逻辑）与 `.scratch/t12007-gates.mjs`（spawnSync 取 exit）。
读数与卡面命令一一对应：LINES／MAXLINE／rule exit／facts exit／tsc／lint／vitest，见同目录 `verify.txt`。

⑤ 终提交号唯一性说明（防按中间态取号）
本卡提交经 4 次 rebase + 3 次 amend，中间态 `99657098`/`f0968de8`/`0e955f33`/`dfe1f16f`/`b150c15e`/`2ca57715` 已不在 main 历史上。
有效终提交＝`8c4b2c62`（父 `b1789607`），task-index 与 README／EVD 一律以此为准；未使用 `--force`，未新建分支。
