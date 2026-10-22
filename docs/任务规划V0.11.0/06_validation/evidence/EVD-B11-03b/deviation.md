> 版本: v1.0 | 更新: 2026-10-22 | 变更: B11-03b 偏离记录（5 条）

1. **动了后端一个路由（计划只列 UI 三文件）**：`app/api/v1/admin/capabilities/route.ts` 的 GET 原本不支持 `source`、`modelId` 为等值匹配，G4 的 source 下拉与 modelId 搜索无从工作 → 补 `source` 等值筛选、`modelId` 放宽为 contains，并在 matrix-routes.spec.ts 加 3 条 GET 断言。两列均为 String，非法值只落空集不 500。
2. **loader 形参比计划多**：G1 写 `loadCapabilities(signal?, page=1)`，实现为 `(signal?, page=1, source="", modelId="")`；protocols 同理多 `entityType`。保留无参常量 `PROTOCOL_LIST_URL` / `CAPABILITY_LIST_URL`，panel-state.spec 对首屏 URL 的严格断言未改。
3. **弹窗改条件挂载而非 vi.mock**：Dialog 内含 useEffect，而 @aidean/ui 在 node 单测下是第二份 React 副本，首屏 `renderToStaticMarkup` 抛 Invalid hook call（handoff §四预告的场景）。处置偏离模板建议：用 `{creating ? <Dialog/> : null}` 条件挂载（与既有 StationForm 惯例一致），既有 spec 零改动、未引入替身。
4. **运行态数据前置**：卡起点两张矩阵表 0 行，H2 的 ready 态不可能出现 → 先执行既有 `pnpm --filter web db:seed:matrix`（B11-03a 幂等回填，先 --dry-run 核对派生数 1033/1704 与协议分布）再截图。属环境准备，未改代码。
5. **facts 预估偏差**：spec-count +2（207→209）与计划一致；aidean-ui-refs 实测 +1（71→72）——两矩阵文件本就 import @aidean/ui，只有新文件 MatrixPanel.tsx 计入。
