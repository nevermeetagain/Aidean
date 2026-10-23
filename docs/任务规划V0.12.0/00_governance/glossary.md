# 术语表增量（V0.12.0）

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 新增术语；落地时并入 docs/governance/术语表.md（由 T120-10 一并登记）

| 术语 | 定义 | 唯一名（代码） |
|---|---|---|
| 扫描节拍 | monitor_catalogs 被 run-due 唤起的固定周期（15 分钟），与各源的采集频率不同 | `monitor_catalogs` ScheduledScript |
| 采集频率 | 每个监控源自己的 cron（上海时区），决定该源是否 due | `MonitoringSource.cadenceCron` |
| 运行请求 | 管理员「立即运行」产生的一条意图记录，状态 pending/running/done/failed | `MonitorRunRequest` |
| 可靠性观测 | 某站点在一个上海自然日内的成功/失败计数与可用率 | `ReliabilityObservation` |
| 会话版本 | 用户令牌世代号；改密、重置、封禁时 +1，旧令牌即失效 | `users.token_version` / `claims.ver` |
| 渠道探测 | 服务端对用户自定义渠道做的一次只读连通性检查 | `ChannelProbeResponse` |
| 语义色令牌 | 按用途而非色相命名的颜色变量（surface/fg/muted/line/accent/status） | `--color-*` |
| 五态 | loading / empty / error / forbidden / ready（沿用既有定义，本版上移到 @aidean/ui） | `PanelState` |
| Dock | 右下角常驻可折叠面板（收藏 / 对比 / 客服） | `components/site/Dock` |
