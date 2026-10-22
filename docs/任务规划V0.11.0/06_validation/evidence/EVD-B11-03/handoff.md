# EVD-B11-03 · 交接规格（B11-03b 剩余 + B11-05 推广）

> 版本: v1.0 | 更新: 2026-10-22 | 变更: 首版——端点契约、五态外壳用法、testid 规范、失败注入测试模板

面向接手 UI 的工程师。后端与外壳已在 `wt/matrix` 落地并通过运行态闭环（见 `verify.txt` §8-9）。**不要改** `lib/features/admin/matrix/*` 与 `lib/admin/panel-resource.ts` 的语义；如需变更请回到核心线。

---

## 一、端点契约（UI 侧消费）

信封恒为 `{ code, message, data, requestId }`；`adminFetch` 已解包为 `{ ok, status, data, message }`。

### 协议兼容矩阵 `/api/v1/admin/protocols`

| 动作 | 请求 | 成功 `data` | 失败 |
|---|---|---|---|
| 列表 | `GET ?page=1&pageSize≤100&entityType=&protocol=` | `{ rows: ProtocolRow[], total, page, pageSize }` | 10004/401、10008/403 |
| 新建/覆盖 | `POST` body 见下 | `ProtocolRow`（upsert：同 `(entityType,entityId,protocol)` 覆盖） | 40000（校验/实体不存在）、20001（model 不存在） |
| 详情 | `GET /[id]` | `ProtocolRow` | 40000「id 非法（须为 UUID）」/「协议兼容记录不存在」 |
| 编辑 | `PATCH /[id]` 任一字段（≥1） | `ProtocolRow` | 40000「未知字段：x」/枚举非法/「…已存在（唯一键冲突）」 |
| 删除 | `DELETE /[id]` | `{ deleted: true, id }` | 40000「…不存在」 |

```ts
type ProtocolRow = {
  id: string; entityType: "model" | "vendor" | "provider" | "station"; entityId: string;
  protocol: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "RESPONSES" | "CUSTOM";
  supported: boolean; probeMethod: "endpoint_check" | "minimal_request" | "documented" | "backfill" | null;
  probeResult: Record<string, unknown> | null; confidence: number /*0..1*/;
  probedAt: string; createdAt: string; updatedAt: string;
};
// POST body：{ entityType, entityId, protocol, supported, probeMethod?, probeResult?, confidence? }（strict）
```

### 能力矩阵 `/api/v1/admin/capabilities`

同上结构；`CapabilityRow = { id, modelId, capability, supported, source: "official"|"benchmark"|"observed", confidence, maxContextLength: number|null, detail, detectedAt, createdAt, updatedAt }`；`capability ∈ MATRIX_CAPABILITIES`（8 值）；POST body `{ modelId, capability, supported, source?="official", confidence?, maxContextLength?, detail? }`；唯一键 `(modelId, capability, source)`；modelId 不存在 → 20001。

**维度常量必须 import，禁止再写字符串数组**：

```ts
import { MATRIX_PROTOCOLS, MATRIX_CAPABILITIES, MATRIX_ENTITY_TYPES, CAPABILITY_SOURCES } from "../../lib/features/admin/matrix/constants";
```

### 写操作后的刷新策略（建议）

- **乐观更新**：PATCH `supported` 切换先本地改 `rows`，失败回滚并 toast `message`。
- **结构变更**（POST/DELETE/改键）：成功后调 `usePanelResource().refresh()`（静默，不闪 loading）；失败不改本地。
- 删除前用既有 `components/admin/ConfirmDialog.tsx`。
- 数据量：回填后协议表 ~1033 行、能力表 ~1704 行 → 列表必须分页或按 `entityType` 过滤（默认建议 `entityType=vendor`，约 33 行）。

---

## 二、五态外壳用法

文件：`apps/web/components/admin/PanelState.tsx`（组件 + `usePanelResource`），判定 `apps/web/lib/admin/panel-resource.ts`。参考接入：`components/admin/ProtocolMatrix.tsx`。

```tsx
import { adminFetch } from "./adminFetch";
import { PanelState, usePanelResource } from "./PanelState";

// 1) loader 导出为模块级常量，便于单测注入 fetch
export const loadXxx = (signal?: AbortSignal) => adminFetch<{ rows: Row[] }>("/api/v1/admin/xxx?pageSize=100", { signal });

export function XxxPanel() {
  const { resource, reload, refresh } = usePanelResource(loadXxx, (d) => d.rows.length === 0);
  return (
    <PanelState testId="admin-xxx" resource={resource} onRetry={reload}
      emptyText="暂无 xxx" emptyAction={<Button onClick={openCreate}>新建</Button>}>
      {(data) => <XxxTable rows={data.rows} onChanged={refresh} />}
    </PanelState>
  );
}
```

规则：
- **失败永不落 empty**：`ok=false` → `error`（含 5xx/405 空体/断网 status=0）；`403` → `forbidden`（无重试）；`400` → error 但无重试按钮。
- 只在外壳层包裹，**不要改面板内部表单字段**（B11-04b 正在迁移 raw select/textarea/label）。
- 非列表形状的面板（如配置表单）用自定义 `isEmpty`，或 `isEmptyList` 处理 `[] / {rows} / {items}`。
- 晚到响应由 `load-guard` 丢弃，不要再自写 `loading` state。

## 三、testid 命名规范

| 位置 | testid | 备注 |
|---|---|---|
| 面板根 | `admin-<模块>` | 恒在；携带 `data-state="loading|empty|error|forbidden|ready"` |
| 加载 | `admin-<模块>-loading` | |
| 空态 | `admin-<模块>-empty` | |
| 错误 | `admin-<模块>-error` | |
| 重试 | `admin-<模块>-retry` | 仅 error 且 retryable 且传了 `onRetry` |
| 无权限 | `admin-<模块>-forbidden` | |
| 数据 | `admin-<模块>-ready` | |
| 行内操作（建议） | `admin-<模块>-row-<id>`、`admin-<模块>-edit-<id>`、`admin-<模块>-delete-<id>`、`admin-<模块>-create` | 由面板自行添加 |

`<模块>` 用 kebab-case，与路由段一致（`protocols`、`capabilities`、`free-quotas`…）。由 `panelTestIds(prefix)` 生成，勿手拼。

## 四、失败注入测试模板（落 `lib/**`，node 环境，无 testing-library）

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toPanelResource } from "../../lib/admin/panel-resource";           // 路径按 spec 位置调整
import { loadXxx, XxxPanel } from "../../components/admin/XxxPanel";

const stub = (status: number, body: string, ct = "application/json") =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": ct } })));
const isEmpty = (d: { rows: unknown[] }) => d.rows.length === 0;

describe("XxxPanel 五态", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("首屏 loading + 根 testid", () => {
    const html = renderToStaticMarkup(createElement(XxxPanel));
    expect(html).toContain('data-testid="admin-xxx"');
    expect(html).toContain('data-state="loading"');
  });
  it("500 → error 可重试（不是 empty）", async () => {
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    expect(toPanelResource(await loadXxx(), isEmpty)).toMatchObject({ status: "error", retryable: true });
  });
  it("断网 → error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadXxx(), isEmpty).status).toBe("error");
  });
  it("403 → forbidden；200 空 → empty", async () => {
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadXxx(), isEmpty).status).toBe("forbidden");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [] } }));
    expect(toPanelResource(await loadXxx(), isEmpty).status).toBe("empty");
  });
});
```

注：若被测组件 import 了带 hooks 的 `@aidean/ui` 组件导致 null dispatcher，参照 `lib/monitoring/__tests__/model-detail-ui.spec.ts` 用 `vi.mock("@aidean/ui", …)` 替身。运行态截图（Playwright 注入 `page.route(…, r => r.fulfill({ status: 500 }))`）放 `EVD-B11-03b/` 或 `EVD-B11-05/`。

## 五、剩余清单

- B11-03b：`ProtocolMatrix`/`CapabilityMatrix` 原生 `<table>` → `@aidean/ui` `Table*`（两文件 `<table` 计数=0）；`CapabilityMatrix` 接外壳 + 列改 `MATRIX_CAPABILITIES`；增删改 UI；分页/筛选；error/empty/ready × 桌面/移动截图。
- B11-05：外壳推广 ≥20 个 admin 文件含 testid；3 个面板注入 500 截图；`adminmatrix011.mjs` 复跑数值写入 `EVD-B11-05/coverage.txt`；`docs/UI界面交互文档.md` 同步本节 testid 规范。
- 每新增 spec / 引用 `@aidean/ui` 的组件文件，同步 `scripts/check-docs-facts.mjs` 的 spec-count / aidean-ui-refs（R10-01）。
