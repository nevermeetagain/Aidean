/**
 * model-detail-benchmark · 模型详情页「基准弹窗 / 测评示例 / 多源上架」e2e（TASK-075）
 *
 * 覆盖交接任务书 §5 事实锚（TASK-074 / TASK-067 已实现，本 spec 只断言、不改实现）：
 *   - 基准：bench-list / bench-empty / bench-open(aria-haspopup=dialog) / bench-dialog（Esc 与关闭按钮均可关）/ bench-demo-note
 *   - 测评示例：samples-loading / samples-empty / samples-error(role=alert) / samples-ready / samples-answer /
 *     samples-demo-badge（含 seed 预置演示单 results.demo=true）/ 长回答「展开全文 / 收起」
 *   - 多源上架：offerings-loading / -empty / -error（含「重试」）/ -ready / -row（桌面）/ -card（移动）/
 *     -relay-unverified / -attribution；公开接口只放行 tosStatus ∈ {allowed, attribution_required}
 *   - 页面不得出现「即将上线」
 *
 * 夹具策略：详情页 `revalidate = 300`（ISR），已访问过的 slug 会命中页缓存，故每次运行新建**专用夹具模型**
 * （slug 带运行 id，首访必为现渲染），afterAll 级联清理。数据源：DATABASE_URL（与 next start 同一测试库）。
 * - samples-loading：在事务里 `LOCK TABLE evaluation_models` 挡住服务端示例查询 → Suspense 骨架可见 → 提交释放 → 落定。
 * - samples-error：同样持锁，再 `pg_cancel_backend` 取消被锁挡住的示例查询 → 服务端 catch → error 态。
 * - offerings loading/error：客户端 fetch，用 page.route 延迟 / 返回 500 模拟。
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { test, expect } from "../fixtures";

const ROOT = path.resolve(process.cwd());
const WEB_DIR = path.join(ROOT, "apps/web");
const requireFromWeb = createRequire(path.join(WEB_DIR, "package.json"));
const RUN = Date.now().toString(36);
const SLUG = {
  ready: `e2e-mdb-ready-${RUN}`,
  peer: `e2e-mdb-peer-${RUN}`,
  empty: `e2e-mdb-empty-${RUN}`,
  lock: `e2e-mdb-lock-${RUN}`,
  error: `e2e-mdb-error-${RUN}`,
};
const SRC = { relay: `e2e-mdb-relay-${RUN}`, attr: `e2e-mdb-attr-${RUN}`, pending: `e2e-mdb-pending-${RUN}` };
const LONG_ANSWER = `长回答夹具：${"天梯图用于对比模型的能力与价格。".repeat(40)}`; // > COLLAPSE_AT(360)
const SHOT_DIR = process.env.E2E_SHOT_DIR?.trim() || null;

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  for (const file of [".env.local", ".env"]) {
    const full = path.join(WEB_DIR, file);
    if (!existsSync(full)) continue;
    const m = readFileSync(full, "utf8").match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
    if (m) return m[1].trim();
  }
  throw new Error("缺少 DATABASE_URL：请与 next start 使用同一测试库（导出环境变量后重跑）");
}

test.describe.configure({ mode: "serial" });

test.describe("model-detail-benchmark · 模型详情页基准弹窗与测评示例（TASK-075）", () => {
  let prisma: any;
  const ids: Record<string, string> = {};
  let evaluationId: string | null = null;

  const db = () => {
    if (!prisma) throw new Error("PrismaClient 未初始化");
    return prisma;
  };

  /** 持表锁期间等待被挡住的「示例查询」出现在 pg_stat_activity（Lock 等待），返回其 pid 列表 */
  async function waitBlockedExampleQuery(timeoutMs = 15_000): Promise<number[]> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows: { pid: number }[] = await db().$queryRawUnsafe(
        `SELECT pid FROM pg_stat_activity
          WHERE wait_event_type = 'Lock' AND pid <> pg_backend_pid()
            AND query ILIKE '%evaluation%' AND query ILIKE '%is_paid%'`,
      );
      if (rows.length > 0) return rows.map((r) => Number(r.pid));
      await new Promise((r) => setTimeout(r, 200));
    }
    return [];
  }

  test.beforeAll(async () => {
    const { PrismaClient } = requireFromWeb("@prisma/client") as { PrismaClient: new (opts: unknown) => any };
    prisma = new PrismaClient({ datasourceUrl: databaseUrl() });
    const vendor = await prisma.vendor.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!vendor || !user) throw new Error("测试库缺 vendor/user（先跑 pnpm db:seed）");

    for (const [k, slug] of Object.entries(SLUG)) {
      const m = await prisma.aiModel.create({
        data: { modelCode: slug, slug, nameDisplay: `E2E ${k} ${RUN}`, vendorId: vendor.id, modelType: "CHAT" },
        select: { id: true },
      });
      ids[k] = m.id;
    }
    // 基准：ready 模型 1 条已核验基准（读侧只放行 verifiedStatus=1）
    await prisma.benchmark.create({
      data: {
        modelId: ids.ready, sourceType: "SELF", sourceName: "E2E 夹具", benchmarkType: "MMLU", benchmarkSubType: "5-shot",
        verifiedStatus: 1, scores: { accuracy: 88.5, reasoning: 80.1 }, totalScore: 86.2,
      },
    });
    // 测评示例：公开（isPaid=false）已完成演示单，含本模型长回答 + 同伴短回答
    const ev = await prisma.evaluation.create({
      data: {
        userId: user.id, title: `E2E 夹具测评 ${RUN}`, prompt: "用两句话介绍天梯图。", evalType: "comparison",
        comparisonMode: "side-by-side", config: {}, results: { demo: true }, winnerModelId: ids.ready, status: 2,
        progress: 100, isPaid: false, cost: 0, startedAt: new Date(), completedAt: new Date(),
        evaluationModels: {
          create: [
            { modelId: ids.ready, status: "completed", response: LONG_ANSWER, tokensInput: 10, tokensOutput: 200, tokensTotal: 210, latencyMs: 900 },
            { modelId: ids.peer, status: "completed", response: "天梯图是模型选型的对比工具。", tokensInput: 10, tokensOutput: 20, tokensTotal: 30, latencyMs: 400 },
          ],
        },
      },
      select: { id: true },
    });
    evaluationId = ev.id;
    // 多源上架：中转源（allowed，kind=relay → 身份未验证）+ 署名源（attribution_required）
    const now = new Date();
    for (const s of [
      { key: SRC.relay, label: `E2E 中转 ${RUN}`, tier: "C", kind: "relay", tosStatus: "allowed", endpoint: "https://relay.example.com/api/pricing", docsUrl: null, price: "1.5" },
      { key: SRC.attr, label: `E2E 署名源 ${RUN}`, tier: "B", kind: "aggregator", tosStatus: "attribution_required", endpoint: "https://agg.example.com/api/v1/models", docsUrl: "https://agg.example.com/docs", price: "2.5" },
    ]) {
      await prisma.monitoringSource.create({
        data: {
          key: s.key, label: s.label, tier: s.tier, kind: s.kind, endpoint: s.endpoint, docsUrl: s.docsUrl, authRequired: false,
          cadenceCron: "15 2 * * *", tosStatus: s.tosStatus, enabled: false,
          observations: {
            create: {
              externalModelId: `vendor/${SLUG.ready}`, normalizedModelId: SLUG.ready, isListed: true, priceUnit: "usd_per_1m_tokens",
              priceInput: s.price, priceOutput: "6", firstSeenAt: now, lastSeenAt: now,
            },
          },
        },
      });
    }
  });

  test.afterAll(async () => {
    if (!prisma) return;
    await prisma.monitoringSource.deleteMany({ where: { key: { in: Object.values(SRC) } } }).catch(() => undefined);
    if (evaluationId) {
      await prisma.evaluationModel.deleteMany({ where: { evaluationId } }).catch(() => undefined);
      await prisma.evaluation.delete({ where: { id: evaluationId } }).catch(() => undefined);
    }
    await prisma.benchmark.deleteMany({ where: { modelId: { in: Object.values(ids) } } }).catch(() => undefined);
    await prisma.aiModel.deleteMany({ where: { id: { in: Object.values(ids) } } }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  test("基准弹窗：bench-list → bench-open 打开 bench-dialog，Esc 与关闭按钮均可关闭；已核验条无 bench-demo-note", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const res = await page.goto(`/models/${SLUG.ready}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText("即将上线");

    const list = page.getByTestId("bench-list");
    await expect(list).toBeVisible();
    await expect(page.getByTestId("bench-empty")).toHaveCount(0);
    const open = list.getByTestId("bench-open").first();
    await expect(open).toHaveAttribute("aria-haspopup", "dialog");
    await expect(open).toContainText("MMLU");

    await open.click();
    const dialog = page.getByTestId("bench-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("86.2");
    // 读侧只放行已核验基准（verifiedStatus=1）→ 未核验提示不应出现（见 EVD-075/deviation.md）
    await expect(page.getByTestId("bench-demo-note")).toHaveCount(0);
    if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, "desktop-1440-bench-dialog.png") });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await open.click();
    await expect(dialog).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: /关闭/ }).first().click();
    await expect(dialog).toHaveCount(0);
  });

  test("空态：无基准 → bench-empty；无示例 → samples-empty；无公开源 → offerings-empty", async ({ page }) => {
    const res = await page.goto(`/models/${SLUG.empty}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("bench-empty")).toBeVisible();
    await expect(page.getByTestId("bench-list")).toHaveCount(0);
    await expect(page.getByTestId("samples-empty")).toBeVisible();
    await expect(page.getByTestId("samples-ready")).toHaveCount(0);
    await expect(page.getByTestId("offerings-empty")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("即将上线");
  });

  test("测评示例有数据态：samples-ready + samples-answer 并排 + samples-demo-badge + 长回答「展开全文 / 收起」", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/models/${SLUG.ready}`);
    const ready = page.getByTestId("samples-ready");
    await expect(ready).toBeVisible();
    await expect(ready.getByTestId("samples-answer")).toHaveCount(2);
    await expect(ready.getByTestId("samples-demo-badge")).toBeVisible();
    await expect(ready.getByTestId("samples-demo-badge")).toHaveText("演示数据");

    const expand = ready.getByRole("button", { name: "展开全文" });
    await expect(expand).toBeVisible();
    await expand.click();
    await expect(ready.getByRole("button", { name: "收起" })).toBeVisible();
    await expect(ready).toContainText(LONG_ANSWER.slice(-30));
    await ready.getByRole("button", { name: "收起" }).click();
    await expect(ready.getByRole("button", { name: "展开全文" })).toBeVisible();
    if (SHOT_DIR) {
      await page.getByTestId("samples-ready").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOT_DIR, "desktop-1440-samples-ready.png") });
    }
  });

  test("seed 预置演示单（results.demo=true）在其模型详情页显示 samples-demo-badge", async ({ page }) => {
    const seeded = await db().evaluation.findFirst({
      where: { isPaid: false, deletedAt: null, status: 2, results: { path: ["demo"], equals: true }, title: { startsWith: "示例：" } },
      orderBy: { completedAt: "desc" },
      select: { evaluationModels: { take: 1, orderBy: { createdAt: "asc" }, select: { model: { select: { slug: true } } } } },
    });
    const slug = seeded?.evaluationModels[0]?.model.slug;
    expect(slug, "seed 应预置 results.demo=true 的演示单（pnpm db:seed）").toBeTruthy();
    await page.goto(`/models/${slug}`);
    await expect(page.getByTestId("samples-ready")).toBeVisible();
    await expect(page.getByTestId("samples-demo-badge").first()).toBeVisible();
  });

  test("测评示例加载态：服务端示例查询被挡住时显示 samples-loading（Suspense 骨架），释放后落定", async ({ page }) => {
    await db().$transaction(
      async (tx: any) => {
        await tx.$executeRawUnsafe("LOCK TABLE evaluation_models IN ACCESS EXCLUSIVE MODE");
        await page.goto(`/models/${SLUG.lock}`, { waitUntil: "commit" });
        await expect(page.getByTestId("samples-loading")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId("samples-loading")).toHaveAttribute("aria-busy", "true");
        expect((await waitBlockedExampleQuery()).length).toBeGreaterThan(0);
      },
      { timeout: 45_000, maxWait: 10_000 },
    );
    await expect(page.getByTestId("samples-empty")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("samples-loading")).toHaveCount(0);
  });

  test("测评示例错误态：示例查询失败 → samples-error(role=alert)，不阻断详情页", async ({ page }) => {
    await db().$transaction(
      async (tx: any) => {
        await tx.$executeRawUnsafe("LOCK TABLE evaluation_models IN ACCESS EXCLUSIVE MODE");
        await page.goto(`/models/${SLUG.error}`, { waitUntil: "commit" });
        const pids = await waitBlockedExampleQuery();
        expect(pids.length, "示例查询应被表锁挡住").toBeGreaterThan(0);
        for (const pid of pids) await db().$queryRawUnsafe(`SELECT pg_cancel_backend(${pid})`);
      },
      { timeout: 45_000, maxWait: 10_000 },
    );
    const err = page.getByTestId("samples-error");
    await expect(err).toBeVisible({ timeout: 15_000 });
    await expect(err).toHaveAttribute("role", "alert");
    await expect(page.getByTestId("samples-ready")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "基准测试" })).toBeVisible();
  });

  test("多源上架：offerings-loading → offerings-error（重试）→ offerings-ready；桌面 offerings-row、移动 offerings-card、中转 relay-unverified、署名 attribution", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let mode: "slow" | "fail" | "pass" = "slow";
    await page.route(`**/api/v1/models/*/offerings`, async (route) => {
      if (mode === "slow") {
        await new Promise((r) => setTimeout(r, 2_500));
        mode = "fail";
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: 50000, message: "e2e 注入失败", data: null }) });
      }
      return route.continue();
    });
    await page.goto(`/models/${SLUG.ready}`);
    await expect(page.getByTestId("offerings-loading")).toBeVisible();
    await expect(page.getByTestId("offerings-loading")).toHaveAttribute("aria-busy", "true");
    const err = page.getByTestId("offerings-error");
    await expect(err).toBeVisible({ timeout: 15_000 });
    await expect(err).toHaveAttribute("role", "alert");
    mode = "pass";
    await err.getByRole("button", { name: "重试" }).click();

    const ready = page.getByTestId("offerings-ready");
    await expect(ready).toBeVisible({ timeout: 15_000 });
    await expect(ready.getByTestId("offerings-row")).toHaveCount(2);
    await expect(ready.getByTestId("offerings-row").filter({ hasText: `E2E 中转 ${RUN}` }).getByTestId("offerings-relay-unverified")).toBeVisible();
    await expect(ready.getByTestId("offerings-attribution")).toContainText(`E2E 署名源 ${RUN}`);
    await expect(ready.getByTestId("offerings-card").first()).toBeHidden();
    if (SHOT_DIR) {
      await ready.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOT_DIR, "desktop-1440-offerings-ready.png") });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(ready.getByTestId("offerings-card")).toHaveCount(2);
    await expect(ready.getByTestId("offerings-card").first()).toBeVisible();
    await expect(ready.getByTestId("offerings-row").first()).toBeHidden();
    await expect(ready.getByTestId("offerings-card").filter({ hasText: `E2E 中转 ${RUN}` }).getByTestId("offerings-relay-unverified")).toBeVisible();
    if (SHOT_DIR) {
      await ready.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOT_DIR, "mobile-390-offerings-ready.png") });
    }
  });

  test("公开接口白名单：tosStatus=pending 的源观测不进 offerings（仅 allowed / attribution_required 放行）", async ({ request }) => {
    const now = new Date();
    await db().monitoringSource.create({
      data: {
        key: SRC.pending, label: `E2E 待核验 ${RUN}`, tier: "B", kind: "aggregator", endpoint: "https://pending.example.com/models",
        authRequired: false, cadenceCron: "15 2 * * *", tosStatus: "pending", enabled: false,
        observations: {
          create: {
            externalModelId: SLUG.peer, normalizedModelId: SLUG.peer, isListed: true, priceUnit: "usd_per_1m_tokens",
            priceInput: "1", priceOutput: "2", firstSeenAt: now, lastSeenAt: now,
          },
        },
      },
    });
    // peer 模型此前从未请求过 offerings（无 Redis 缓存），首请求即现查
    const res = await request.get(`/api/v1/models/${SLUG.peer}/offerings`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items).toEqual([]);
  });
});
