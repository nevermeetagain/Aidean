# EVD-B11-03 · 偏离与待确认

> 版本: v1.0 | 更新: 2026-10-22 | 变更: B11-03a 后端 + 五态外壳参考实现收口记录（Q-11-01=A）

## 一、范围（2026-10-22 用户重新分工后）

| 项 | 本轮（核心/架构） | 移交（初级助手，见 `handoff.md`） |
|---|---|---|
| B11-03a 端点 | ✅ service + `[id]` GET/PATCH/DELETE + zod + 错误码 + 审计 + RBAC + 回填写入路径 + 文档锚 + 单测 + 运行态闭环 | — |
| 五态外壳 | ✅ `PanelState.tsx` + `panel-resource.ts` + 单测；仅接入 `ProtocolMatrix`（参考） | 推广到其他面板（B11-05） |
| B11-03b 组件 | 仅为接入外壳所需的最小改动（列改 `MATRIX_PROTOCOLS`、外壳包裹） | 原生 `<table>`→`@aidean/ui` Table、增删改 UI、`CapabilityMatrix` 接入外壳、截图 |
| B11-05 | 未做（不建 `EVD-B11-05/`） | 全部 |

## 二、偏离

1. **schema 落位**：卡面写「修改 `packages/shared/src/schemas/*`」。`packages/shared/src` 为冻结契约区，未静默扩写；request schema 驻留 `apps/web/lib/features/admin/matrix/schemas.ts`。若需上移 `@aidean/shared`，请走契约评审（升格项 E-1）。
2. **错误码零新增**：不存在 → `40000`、唯一冲突 → `40000`、模型引用缺失 → `20001`，与 vendors/[id]、feature-flags/[id] 同口径。语义化 404/409 需新码或改 HTTP 映射，属 Q-11-03 范围（升格项 E-2）。
3. **协议维度收敛**：`protocol_compatibilities.protocol` 校验收紧为 `ModelProtocol` 五值（schema 注释里的 `streaming/tool_calling/vision…` 等能力类旧值不再接受；表内原 0 行，无存量迁移）。`entityType` 扩为 `model|vendor|provider|station`（schema 注释原为 provider|station，列为 varchar 无约束，零迁移）。
4. **列表 route.ts 有小改**：两条列表路由仅改 POST 块（委派 service）+ 1 行 import 替换（`writeAudit`→service）；GET 块零改动。与并行的分页 helper/405 改动可能在 import 区相邻行产生文本冲突，解法：保留对方 GET/import 改动 + 本轮 `upsert*` import 与 POST 块。
5. **check-docs-facts 期望值**：route 163→165、spec 195→199、aidean-ui-refs 70→71。其他并行线也在改同几行，合并时需按最终实测重算（R10-01）。
6. **PostgreSQL 版本**：运行态用 apt 的 **PG 17.11**（沙箱源无 16）；涉及的 SQL（createMany ON CONFLICT DO NOTHING、唯一索引）在 16/17 行为一致，但严格说 PG16 运行态 **待确认**。
7. **JWT**：dev 下未配 Redis 时各路由 bundle 各自生成 RS256 密钥，登录 cookie 在 admin 路由验签失败（首轮 curl 401）。运行态以 `JWT_PRIVATE_KEY`（临时 openssl 生成，未入库）启动 next dev 解决——属环境配置，非本轮代码问题。
8. **列表 pageSize**：服务端封顶 100，`ProtocolMatrix` 原请求 200（静默截断）已改为显式 100；回填后协议表 1033 行，面板只展示第一页，分页/筛选 UI 属 B11-03b。

## 三、待确认（未运行，不宣称）

- 403 越权的**运行态**实测（单测已覆盖 `requireAdminApi` 抛 10008→403；未建无权限账号做 curl）。
- `/admin/protocols` 页面运行态五态截图（Playwright 未跑）；error/forbidden 由单测 + 注入 fetch 验证。
- `pnpm --filter web build`（未跑）。
- 全量 vitest 在 service 文案修正前跑过（1539 passed）；修正后仅定向复跑 57 测全绿。

## 四、运行态副作用说明

- 运行态收尾时执行过 `pkill -f next-server -u <uid>`；同 uid 下其他工作树（如 `ag-ev`）若当时有 `next dev`/`next-server` 进程，可能被一并终止。事后 `ps` 仅见 auth-probe 的 `next build` 存活。如有并行线 dev server 异常退出，请重启。

## 五、升格

- **E-1**：矩阵 request schema 是否上移 `@aidean/shared`（契约评审）。
- **E-2**：单资源不存在/唯一冲突是否引入语义化 HTTP（404/409）——与 Q-11-03 合并裁决。
