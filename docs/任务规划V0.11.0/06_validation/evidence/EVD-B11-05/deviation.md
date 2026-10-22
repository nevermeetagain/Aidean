B11-05 · 偏离与取舍（相对计划第 191–197 行「每面板标准 6 步」与 handoff §二/§三）

D-05-1 无新建入口的面板不产 `-create`
  CandidateManager / IntelligenceDashboard / EvaluationManager 三个面板本身没有「新建」按钮
  （只读看板 / 只读列表 / 「刷新」不算新建入口），故只有根 + 子态 + `row-<id>`，无 `-create`。
  未为了让 testid 齐而伪造按钮。

D-05-2 Prices 的 `-create` 受权限门控
  `admin-prices-create`（「新建定价」）仅在 `canWrite` 为真时渲染；只读管理员看到的 DOM 无该 testid。
  与改造前一致（按钮本来就受权限控制），非外壳新增行为。

D-05-3 AdminDataTable 基座自身计入 filesWithTestid（+1）
  为支持 `rowTestId`，基座 `AdminDataTable.tsx` 内出现 `data-testid=`，被度量器计入，
  因此收尾 filesWithTestid=28 = 13 基线 + 14 面板 + 1 基座；filesWithPanelState=18 = 4 + 14。
  已在 coverage.txt 显式登记，避免后续误读为「多做了面板」。

D-05-4 RedemptionManager 一页三外壳 + 签名变化用静默刷新
  该页 3 张表 / 2 个资源，按计划只给一个前缀，实际按资源拆为 `admin-redemptions`、
  `-batches`、`-keys`（派生前缀，仍由 panelTestIds 生成）。三表共用同一 resource，
  故签名变化调 `refresh()` 而非 `reload()`——否则翻页会把整片列表塌陷成 loading。
  批次号输入框只作草稿不入签名（沿用「敲字不即时请求」口径），重置/查看明细/生成经 queryNonce 强制重取。

D-05-5 SyncManager 的 `-create` 语义为「触发 dry-run」
  SyncBatch 的唯一新建入口就是 dry-run 按钮，故 `admin-sync-create` 落在它上面；
  一个 resource 驱动 batches/changes 两个 tab，外壳内按 tab 选列定义（tab 切换必过 loading，
  因此 ready 分支读 tab state 是安全的）。

D-05-6 PartnerKeys 的按钮门控由 `busy` 改 `batchBusy`
  改造前的 `busy` 同时门控首屏加载与批量操作；接外壳后加载态由 resource 承载，
  门控只保留 `batchBusy`（批量执行中）。批量操作期间表格行仍可勾选，与改造前一致。

D-05-7 IntelligenceDashboard 用自定义 isEmpty
  非列表形状（快照聚合），按计划第 206 行用 `snapshots.length === 0` 作 isEmpty，
  未借用 isEmptyList。

D-05-8 free-quotas 运行态 ready 需临时夹具（数据侧，非实现偏离）
  库内 UserFreeQuota 为 0 行（seed 未建，B11-04b L2-B 已记录），L3 重试后只能落 empty。
  为拿到 ready 证据，经 admin API 临时建 1 条并在取证后删除复原（total 回 0）。
  详见 l2l3.txt「fixture 说明」。

未偏离但值得复核的点（留给 H.1 语义复核）
  - 各面板 loader 的 URL/参数口径逐字未变（`buildXxxUrl` 常量导出即为单测锁定点）；
  - 所有写后刷新走 refresh()，无一处自写 loading state；
  - 失败态一律由外壳承载，面板内不再保留 `{error && …}` 横幅。
