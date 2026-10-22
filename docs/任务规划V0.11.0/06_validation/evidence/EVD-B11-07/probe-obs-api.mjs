// B11-07 观测侧现状（EVD-B11-07 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// /api/v1/models/<slug>/offerings 返回条数
// 说明：该 API 只读 observations 且要求 source.tosStatus ∈ {allowed, attribution_required}；
//       seed 里 5 源一律 pending（U-M6 未裁决，契约禁止对外展示）→ 预期 items=[]（见 deviation §一）。
// 用法：cd <repo root> && node probe-obs-api.mjs（需 next dev 在 :3000）
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE = "http://localhost:3000";

try {
  const models = await prisma.aiModel.findMany({
    where: { deletedAt: null },
    select: { id: true, modelCode: true, slug: true },
  });
  const codes = new Set(models.map((m) => m.modelCode));
  const obs = await prisma.providerModelObservation.findMany({ select: { normalizedModelId: true } });
  const hitCodes = [...new Set(obs.map((o) => o.normalizedModelId).filter((c) => codes.has(c)))];
  const hitModels = models.filter((m) => hitCodes.includes(m.modelCode)).slice(0, 25);

  const probe = async (identifier) => {
    const res = await fetch(`${BASE}/api/v1/models/${encodeURIComponent(identifier)}/offerings`, {
      headers: { accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    const items = body?.data?.items;
    return { identifier, status: res.status, code: body?.code ?? null, items: Array.isArray(items) ? items.length : null };
  };

  const demo = await probe("demo-model-041"); // 人工挂载有行，但观测无该模型名
  const curated = [];
  for (const m of hitModels.slice(0, 5)) curated.push(await probe(m.slug));

  console.log(JSON.stringify({
    tosStatusOfSources: (await prisma.monitoringSource.findMany({ select: { key: true, tosStatus: true } })).map((s) => `${s.key}:${s.tosStatus}`),
    observationHitModelCodes: hitCodes.length,
    demo,
    curatedSamples: curated,
  }, null, 1));
} catch (e) {
  console.error("ERR", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
