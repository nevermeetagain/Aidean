# T120-26 偏离
1. `usePanelResource` 留在 `apps/web/components/admin/PanelState.tsx`：它依赖 `apps/web/lib/admin/{panel-resource,load-guard}.ts`（判定唯一口径），而 `apps/web/lib/**` 不在本卡允许路径，ui 包也不应反向依赖 web。本卡只迁展示外壳。
2. `PanelResource` 类型与 `panelTestIds` 在 ui 内有一份结构等价副本（结构化类型互相可赋值，web 侧单测经重导出路径验证）。建议后续由拥有 `apps/web/lib/admin/**` 的卡把 web 侧改为从 `@aidean/ui` 重导出，收敛为单源。
3. 错误 / 禁止态由 red-*/amber-* 原色改为 danger/warning 语义令牌，色值接近但不完全相同（行为、testid、文案不变）。
