# V0.12.0 契约增量（冻结草案）

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 契约增量首版

- **唯一源**：运行时唯一源仍是 `packages/shared`（zod schema + `errors.ts`），沿用 ADR-P001 与 `docs/任务规划V0.5.0/contracts/README.md` 的口径；本目录是**增量草案**，由 T120-10 原样落地到 `packages/shared` 后即只读。禁止在 `apps/web` 内另写同名类型。
- **机器可校验**：每个文件是可被 `tsc` 解析的 zod 定义；T120-10 为每个 schema 生成正/反例契约测试（`packages/shared/src/__tests__/contract/v120.contract.spec.ts`）。
- **命名与单位**：沿用全项目口径——时间 ISO-8601 UTC 字符串；金额整数「分」；分页 `{ items, total, page, pageSize }`，`pageSize ≤ 50`，非法分页参数 400（B11-11 `lib/http/pagination.ts`）；成功信封 `{ code: 0, data }`，失败信封 `{ code, message, details? }`（B11-10）。
- **六份契约覆盖**：①API → `01b`、`03b`、`07b`、`07c`；②Errors → `02b`；③Identity → `03b`；④Resources → 本版**无新增**（见 `04b`）；⑤Events → `05b`（DB 状态机，无消息总线）；⑥UX States → `06b`。

| 文件 | 内容 | 落地卡 |
|---|---|---|
| 01b-channel-probe.contract.ts | 自定义渠道连通性探测 | T120-10 → T120-23 |
| 02b-errors-v120.contract.ts | 新增错误码 1 个 + 失败路径表增量 | T120-10 |
| 03b-identity-password.contract.ts | 改密 / 找回密码 / tokenVersion 语义 | T120-10 → T120-18/19/20 |
| 04b-resources.contract.ts | 无新增资源（显式声明） | — |
| 05b-events.contract.ts | 监控运行请求状态机 | T120-10 → T120-12 |
| 06b-ux-states.contract.ts | 通用五态 PanelState props | T120-10 → T120-26 |
| 07b-monitoring-run.contract.ts | 立即运行 / 运行状态端点 | T120-10 → T120-12/15 |
| 07c-reliability.contract.ts | 可靠性读取端点 | T120-10 → T120-14 |
