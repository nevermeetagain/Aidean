/**
 * TASK-065 · /admin/monitoring 五态 + 手动运行后变更流出现 listed 事件（E2E）
 *
 * 覆盖（MONITORING_UX_STATES.adminMonitoring）：
 *   1) fixture 离线：MONITOR_FIXTURE_DIR + --dry-run 跑采集脚本（不联网、不写库）；
 *   2) ready：真实测试库渲染源表，管理员点击 openrouter「手动运行」（POST 202 受理），
 *      调度侧 monitor_catalogs.ts 落库后 UI 轮询看到 lastRunAt 变化并刷新变更流；
 *   3) empty：源与变更均为空 → monitoring-empty；
 *   4) loading：源列表响应未归前 → monitoring-loading；
 *   5) error：源列表 500 → monitoring-error；
 *   6) forbidden：MODERATOR 无角色分配（isStaff=true、权限集为空）→ monitoring-forbidden。
 *
 * 关于「手动运行」的落库口径（与 DESIGN-004 §3 一致）：
 *   端点只受理并占锁（202），实际采集由独立进程 monitor_catalogs.ts 执行。E2E 进程无法等待
 *   外部调度器，故本 spec 在受理后用 Prisma 写入与调度脚本 writeSource() 等价的
 *   snapshot / observation / listed event 行并更新 lastRunAt——被测对象是 UI 的受理→轮询→
 *   刷新链路，而非调度器本身（调度器的离线 fixture 路径由用例 1 覆盖）。
 *
 * 数据源：DATABASE_URL（与 next start 同一测试库）；缺省时回退 apps/web/.env(.local)。
 * 幂等：openrouter 源 upsert、观察行按 (sourceId, externalModelId) upsert、快照 sha 每次唯一，
 *       可重复执行；MODERATOR 账号 upsert 并清空角色分配。
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { test, expect } from "../fixtures";

const ROOT = path.resolve(process.cwd());
const WEB_DIR = path.join(ROOT, "apps/web");
const FIXTURE_DIR = path.join(WEB_DIR, "lib/monitoring/catalog/__tests__/fixtures");
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/models?output_modalities=all";
const NORMALIZED_MODEL_ID = "e2e/monitoring-listed";
const MODERATOR = { email: "e2e-moderator@aidean.com", password: "E2eModerator123!@#" };

const requireFromWeb = createRequire(path.join(WEB_DIR, "package.json"));

/** 读取 apps/web 的 .env / .env.local（仅缺省时兜底；local 覆盖 env） */
function databaseUrlFromFiles(): string | null {
  const merged: Record<string, string> = {};
  for (const file of [".env", ".env.local"]) {
    const full = path.join(WEB_DIR, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      merged[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return merged.DATABASE_URL?.trim() || null;
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  const url = fromEnv || databaseUrlFromFiles();
  if (!url) {
    throw new Error("缺少 DATABASE_URL：请与 next start 使用同一测试库（导出环境变量后重跑）");
  }
  return url;
}

function envelope(data: unknown): string {
  return JSON.stringify({ code: 0, message: "ok", data, requestId: "e2e-monitoring" });
}

test.describe.configure({ mode: "serial" });

test.describe("模型源监控（TASK-065）", () => {
  let prisma: any;

  const ensureDb = () => {
    if (!prisma) throw new Error("PrismaClient 未初始化（beforeAll 未执行或 DATABASE_URL 缺失）");
    return prisma;
  };

  test.beforeAll(async () => {
    const { PrismaClient } = requireFromWeb("@prisma/client") as { PrismaClient: new (opts: unknown) => any };
    prisma = new PrismaClient({ datasourceUrl: resolveDatabaseUrl() });
    // seed 已注册 openrouter；空库/旧库缺行时补建，保证本 spec 自洽
    await prisma.monitoringSource.upsert({
      where: { key: "openrouter" },
      create: {
        key: "openrouter",
        label: "OpenRouter",
        tier: "B",
        kind: "aggregator",
        endpoint: OPENROUTER_ENDPOINT,
        docsUrl: "https://openrouter.ai/docs/api/api-reference/models/get-models",
        authRequired: false,
        cadenceCron: "15 2 * * *",
        tosStatus: "pending",
        enabled: true,
      },
      update: { enabled: true, deletedAt: null },
    });
  });

  test.afterAll(async () => {
    await prisma?.$disconnect().catch(() => undefined);
  });

  test("fixture 模式离线跑采集脚本（MONITOR_FIXTURE_DIR，不联网不写库）", async () => {
    const tsxPkg = requireFromWeb.resolve("tsx/package.json") as string;
    const tsxCli = path.join(path.dirname(tsxPkg), "dist", "cli.mjs");
    const result = spawnSync(
      process.execPath,
      [tsxCli, "../../scripts/crawl/monitor_catalogs.ts", "--source", "all", "--dry-run"],
      {
        cwd: WEB_DIR,
        env: { ...process.env, MONITOR_FIXTURE_DIR: FIXTURE_DIR },
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(result.status, output).toBe(0);
    expect(output).toContain("openrouter:");
    expect(output).toContain("aihubmix:");
    expect(output).toContain("quanzil:");
    expect(output).toContain("3 source(s) ok / 0 failed");
  });

  test("ready：管理员手动运行 openrouter 后，变更流出现 listed 事件", async ({ page }) => {
    const db = ensureDb();

    await page.goto("/admin/monitoring");
    await expect(page.getByTestId("monitoring-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("monitoring-source-openrouter")).toBeVisible();
    await expect(page.getByTestId("monitoring-status-openrouter")).toBeVisible();

    const runButton = page.getByTestId("monitoring-run-openrouter");
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // 202 受理语义：仅提示「已触发」，采集结果由调度侧异步落库
    await expect(page.getByTestId("monitoring-notice")).toContainText("已触发", { timeout: 10_000 });

    // 模拟调度侧 writeSource()：新快照 + 观察行 + listed 事件 + lastRun*（毫秒级时间戳驱动轮询判定）
    const source = await db.monitoringSource.findUnique({
      where: { key: "openrouter" },
      select: { id: true },
    });
    expect(source?.id).toBeTruthy();

    const now = new Date();
    const snapshot = await db.catalogSnapshot.create({
      data: {
        sourceId: source.id,
        fetchedAt: now,
        itemCount: 1,
        rawSha256: createHash("sha256").update(`e2e-${now.toISOString()}-${Math.random()}`).digest("hex"),
        rawBytes: 64,
        rawSample: "e2e fixture snapshot（TASK-065）",
        sourceUrl: OPENROUTER_ENDPOINT,
      },
    });
    await db.providerModelObservation.upsert({
      where: { sourceId_externalModelId: { sourceId: source.id, externalModelId: NORMALIZED_MODEL_ID } },
      create: {
        sourceId: source.id,
        externalModelId: NORMALIZED_MODEL_ID,
        normalizedModelId: NORMALIZED_MODEL_ID,
        displayName: "E2E Listed Model",
        isListed: true,
        priceUnit: "usd_per_1m_tokens",
        priceInput: "0.5",
        priceOutput: "1.5",
        firstSeenAt: now,
        lastSeenAt: now,
        lastSnapshotId: snapshot.id,
      },
      update: {
        normalizedModelId: NORMALIZED_MODEL_ID,
        isListed: true,
        lastSeenAt: now,
        lastSnapshotId: snapshot.id,
        delistedAt: null,
      },
    });
    await db.catalogChangeEvent.create({
      data: {
        sourceId: source.id,
        snapshotId: snapshot.id,
        kind: "listed",
        externalModelId: NORMALIZED_MODEL_ID,
        normalizedModelId: NORMALIZED_MODEL_ID,
        sourceUrl: OPENROUTER_ENDPOINT,
        detectedAt: now,
      },
    });
    await db.monitoringSource.update({
      where: { key: "openrouter" },
      data: { lastRunAt: now, lastStatus: "ok", lastCount: 1, lastError: null },
    });

    // 轮询 5s/次：lastRunAt 变化 → 完成提示 → 静默刷新变更流
    await expect(page.getByTestId("monitoring-notice")).toContainText("采集完成", { timeout: 25_000 });
    await expect(page.getByTestId("monitoring-status-openrouter")).toHaveText("成功");

    const firstItem = page.getByTestId("monitoring-change-item").first();
    await expect(firstItem).toContainText(NORMALIZED_MODEL_ID, { timeout: 20_000 });
    await expect(firstItem.getByTestId("monitoring-change-kind-listed")).toHaveText("上架");
    await expect(runButton).toBeEnabled();
  });

  test("empty：源与变更均为空时展示空态", async ({ page }) => {
    await page.route("**/api/v1/admin/monitoring/sources*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: envelope({ items: [] }) }),
    );
    await page.route("**/api/v1/admin/monitoring/changes*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      }),
    );

    await page.goto("/admin/monitoring");
    await expect(page.getByTestId("monitoring-empty")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("monitoring-empty")).toContainText("尚未注册监控源或尚无变更");
  });

  test("loading：源列表响应未归前展示加载态", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/admin/monitoring/sources", async (route) => {
      await gate;
      await route.continue();
    });

    await page.goto("/admin/monitoring");
    await expect(page.getByTestId("monitoring-loading")).toBeVisible({ timeout: 15_000 });
    release();
    await expect(page.getByTestId("monitoring-ready")).toBeVisible({ timeout: 20_000 });
  });

  test("error：源列表接口失败展示错误态与重试入口", async ({ page }) => {
    await page.route("**/api/v1/admin/monitoring/sources", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: 50000, message: "E2E 注入失败", data: null, requestId: "e2e" }),
      }),
    );

    await page.goto("/admin/monitoring");
    await expect(page.getByTestId("monitoring-error")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("monitoring-error")).toContainText("E2E 注入失败");
    await expect(page.getByTestId("monitoring-error").getByRole("button", { name: "重试" })).toBeVisible();
  });

  test.describe("未授权用户", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("forbidden：MODERATOR 无角色分配时展示无权限态", async ({ page }) => {
      const db = ensureDb();
      const { hash } = requireFromWeb("@node-rs/bcrypt") as { hash: (s: string, cost: number) => Promise<string> };
      const password = await hash(MODERATOR.password, 12);

      const moderator = await db.user.upsert({
        where: { email: MODERATOR.email },
        create: {
          email: MODERATOR.email,
          password,
          nickname: "E2E 审核员",
          role: "MODERATOR",
          status: "ACTIVE",
          emailVerified: true,
        },
        update: {
          password,
          role: "MODERATOR",
          status: "ACTIVE",
          emailVerified: true,
          deletedAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      // isStaff=true（role=MODERATOR）但权限集为空 → 页面可进、监控不可读
      await db.userRoleAssignment.deleteMany({ where: { userId: moderator.id } });

      await page.goto("/admin/login");
      await page.locator('input[type="email"], input[name="email"]').first().fill(MODERATOR.email);
      await page.locator('input[type="password"], input[name="password"]').first().fill(MODERATOR.password);
      await page.locator('button[type="submit"], button:has-text("登录")').first().click();
      await page.waitForURL(/\/admin(\/)?(\?.*)?$/, { timeout: 15_000 });

      await page.goto("/admin/monitoring");
      await expect(page.getByTestId("monitoring-forbidden")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("monitoring-forbidden")).toContainText("无权限查看模型源监控");
      await expect(page.getByTestId("monitoring-ready")).toHaveCount(0);
    });
  });
});
