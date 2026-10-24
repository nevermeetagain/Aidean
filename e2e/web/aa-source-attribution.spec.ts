/**
 * T120-16 · Artificial Analysis 署名展示 e2e（REQ-M-015 / U-M2）
 *
 * 断言口径（本卡收敛到「模型详情页」，天梯/对比因数据层无 AA 标志顺延，见 EVD/deviation.md）：
 *   1 详情页含 AA 基准（sourceName='artificial-analysis'）→ 可见「数据来源：Artificial Analysis」并链官网（rel=noopener）；
 *   2 详情页含非 AA 基准 → 不出现该署名（无 AA 数据不渲染）；
 *   3 详情页无任何基准 → 空态且不出现署名。
 *
 * 夹具策略沿用 e2e/web/model-detail-benchmark.spec.ts：prisma 建专用模型 + 基准（slug 带运行 id 唯一，
 * 详情页 force-dynamic 恒现渲染），afterAll 级联清理，避免污染共享测试库。
 * 数据源：DATABASE_URL（须与 :3000 dev server 指向同一测试库，否则读侧取不到夹具行）。
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { test, expect } from "../fixtures";

const ROOT = path.resolve(process.cwd());
const WEB_DIR = path.join(ROOT, "apps/web");
const requireFromWeb = createRequire(path.join(WEB_DIR, "package.json"));
const RUN = Date.now().toString(36);
const SLUG = { yes: `e2e-aa-yes-${RUN}`, no: `e2e-aa-no-${RUN}`, none: `e2e-aa-none-${RUN}` };
/** 通过态截图输出目录（沿用 model-detail-benchmark.spec.ts 口径；E2E_SHOT_DIR 未设则不截图） */
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
  throw new Error("缺少 DATABASE_URL：请与 :3000 dev server 使用同一测试库（导出环境变量后重跑）");
}

test.describe.configure({ mode: "serial" });

test.describe("aa-source-attribution · 模型详情页 Artificial Analysis 署名（T120-16）", () => {
  let prisma: any;
  const ids: Record<string, string> = {};

  test.beforeAll(async () => {
    const { PrismaClient } = requireFromWeb("@prisma/client") as { PrismaClient: new (opts: unknown) => any };
    prisma = new PrismaClient({ datasourceUrl: databaseUrl() });
    const vendor = await prisma.vendor.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!vendor) throw new Error("测试库缺 vendor（先跑 pnpm db:seed）");

    for (const [k, slug] of Object.entries(SLUG)) {
      const m = await prisma.aiModel.create({
        data: { modelCode: slug, slug, nameDisplay: `E2E AA ${k} ${RUN}`, vendorId: vendor.id, modelType: "CHAT" },
        select: { id: true },
      });
      ids[k] = m.id;
    }
    // yes：AA 来源基准（读侧仅放行 verifiedStatus=1）
    await prisma.benchmark.create({
      data: {
        modelId: ids.yes, sourceType: "REVIEW", sourceName: "artificial-analysis", benchmarkType: "artificial_analysis",
        verifiedStatus: 1, scores: { intelligence_index: 71.2 }, totalScore: 71.2,
      },
    });
    // no：非 AA 来源基准（同结构但来源不同 → 不应出现 AA 署名）
    await prisma.benchmark.create({
      data: {
        modelId: ids.no, sourceType: "SELF", sourceName: "平台演示数据", benchmarkType: "MMLU",
        verifiedStatus: 1, scores: { accuracy: 88.5 }, totalScore: 88.5,
      },
    });
    // none：无基准（空态）
  });

  test.afterAll(async () => {
    if (!prisma) return;
    await prisma.benchmark.deleteMany({ where: { modelId: { in: Object.values(ids) } } }).catch(() => undefined);
    await prisma.aiModel.deleteMany({ where: { id: { in: Object.values(ids) } } }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  test("含 AA 数据的详情页可见署名并链官网", async ({ page }) => {
    const res = await page.goto(`/models/${SLUG.yes}`);
    expect(res?.status()).toBe(200);
    const attr = page.getByTestId("source-attribution");
    await expect(attr).toBeVisible();
    await expect(attr).toContainText("数据来源：Artificial Analysis");
    const link = attr.locator("a");
    await expect(link).toHaveAttribute("href", "https://artificialanalysis.ai");
    await expect(link).toHaveAttribute("rel", /noopener/);
    if (SHOT_DIR) {
      mkdirSync(SHOT_DIR, { recursive: true });
      await attr.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOT_DIR, "aa-attribution-visible.png") });
    }
  });

  test("非 AA 来源基准的详情页不出现署名", async ({ page }) => {
    await page.goto(`/models/${SLUG.no}`);
    await expect(page.getByTestId("bench-list")).toBeVisible();
    await expect(page.getByTestId("source-attribution")).toHaveCount(0);
    if (SHOT_DIR) {
      mkdirSync(SHOT_DIR, { recursive: true });
      await page.getByTestId("bench-list").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOT_DIR, "aa-attribution-absent.png") });
    }
  });

  test("无基准的详情页不出现署名", async ({ page }) => {
    await page.goto(`/models/${SLUG.none}`);
    await expect(page.getByTestId("bench-empty")).toBeVisible();
    await expect(page.getByTestId("source-attribution")).toHaveCount(0);
  });
});
