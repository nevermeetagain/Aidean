// TASK-068 上架同步单测（无 DB：内存假 client）。真库联表与 uuid 列口径见 EVD-068/pg16-probe.txt。
import { describe, expect, it, vi } from "vitest";
import { MappedEntityIdError, assertMappedEntityId, syncOfferingsForSource } from "./offering-sync";

const P = "01a158ab-0000-7000-8000-000000000001";
const SRC = "01a158ab-0000-7000-8000-0000000000aa";
const FIRST = new Date("2026-10-01T00:00:00.000Z");

function obs(o: Record<string, unknown> = {}) {
  return {
    id: "o1",
    externalModelId: "deepseek-ai/DeepSeek-V3",
    normalizedModelId: "deepseek-v3",
    displayName: "DeepSeek-V3",
    isListed: true,
    priceUnit: "cny_per_1m_tokens",
    priceInput: "2",
    priceOutput: "8",
    priceCacheRead: "0.5",
    firstSeenAt: FIRST,
    ...o,
  };
}

function fakeClient(opts: { mapped?: boolean; observations?: unknown[]; models?: { id: string; modelCode: string }[]; offering?: Record<string, unknown> | null; candidate?: unknown }) {
  const offerings = new Map<string, Record<string, unknown>>();
  if (opts.offering) offerings.set(`${P}|m1`, { id: "of1", ...opts.offering });
  const tx = {
    providerModelOffering: {
      findUnique: vi.fn(async ({ where }: { where: { providerId_modelId: { providerId: string; modelId: string } } }) => {
        const k = `${where.providerId_modelId.providerId}|${where.providerId_modelId.modelId}`;
        return offerings.get(k) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        offerings.set(`${data.providerId}|${data.modelId}`, { id: "of-new", ...data });
        return data;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const [k, v] of offerings) if (v.id === where.id) offerings.set(k, { ...v, ...data });
        return data;
      }),
    },
    evidenceChain: { create: vi.fn(async (_a: { data: Record<string, any> }) => ({})) },
  };
  const client = {
    monitoringSource: {
      findFirst: vi.fn(async (_a: { where: Record<string, unknown> }) =>
        opts.mapped === false ? null : { id: SRC, key: "siliconflow-pricing", endpoint: "https://siliconflow.cn/pricing", mappedEntityId: P.toUpperCase() },
      ),
    },
    modelProvider: { findFirst: vi.fn(async (_a: { where: Record<string, unknown> }) => ({ id: P, code: "siliconflow", priceCurrency: "CNY" })) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    providerModelObservation: { findMany: vi.fn(async () => opts.observations ?? [obs()]) },
    aiModel: { findMany: vi.fn(async () => opts.models ?? [{ id: "m1", modelCode: "deepseek-v3" }]) },
    discoveryCandidate: { findFirst: vi.fn(async () => opts.candidate ?? null), create: vi.fn(async (_a: { data: Record<string, unknown> }) => ({})) },
    ...tx,
  };
  return { client: client as never, raw: client, tx, offerings };
}

describe("syncOfferingsForSource（TASK-068）", () => {
  it("新建 offering：listedAt=firstSeenAt、isActive=isListed、原币价格；留一条 EvidenceChain", async () => {
    const f = fakeClient({});
    const r = await syncOfferingsForSource(f.client, SRC);
    expect(r).toMatchObject({ status: "ok", created: 1, updated: 0, candidates: 0 });
    expect(f.tx.providerModelOffering.create.mock.calls[0][0].data).toMatchObject({
      providerId: P,
      modelId: "m1",
      listedAt: FIRST,
      isActive: true,
      priceInput: "2",
      priceOutput: "8",
      priceCache: "0.5",
      priceUnit: "per_million_tokens",
      effectiveFrom: FIRST,
    });
    expect(f.tx.evidenceChain.create).toHaveBeenCalledOnce();
    expect(f.tx.evidenceChain.create.mock.calls[0][0].data).toMatchObject({ providerId: P, modelId: "m1", evidenceType: "change", source: "observed" });
  });

  it("人工字段不被覆盖：更新只含有变化的 sync 字段（下架 → isActive=false），defaultMultiplier/discount* 不出现在 data", async () => {
    const f = fakeClient({
      observations: [obs({ isListed: false })],
      offering: { listedAt: FIRST, isActive: true, priceInput: "2.000000", priceOutput: "8", priceCache: "0.5", priceUnit: "per_million_tokens", defaultMultiplier: "0.8", discountInputMin: "1.1" },
    });
    const r = await syncOfferingsForSource(f.client, SRC);
    expect(r.updated).toBe(1);
    const data = f.tx.providerModelOffering.update.mock.calls[0][0].data;
    expect(data).toEqual({ isActive: false });
    expect(f.offerings.get(`${P}|m1`)).toMatchObject({ defaultMultiplier: "0.8", discountInputMin: "1.1", isActive: false });
  });

  it("幂等：无变化不写库也不写证据（0.5 与 0.500000 视为同值）", async () => {
    const f = fakeClient({ offering: { listedAt: FIRST, isActive: true, priceInput: "2", priceOutput: "8.000000", priceCache: "0.500000", priceUnit: "per_million_tokens" } });
    const r = await syncOfferingsForSource(f.client, SRC);
    expect(r).toMatchObject({ unchanged: 1, created: 0, updated: 0 });
    expect(f.tx.providerModelOffering.update).not.toHaveBeenCalled();
    expect(f.tx.evidenceChain.create).not.toHaveBeenCalled();
  });

  it("未命中（normalizedModelId 不精确等于 AiModel.modelCode）→ 不写 offering，进 DiscoveryCandidate(model)；已有候选不重复", async () => {
    const f = fakeClient({ models: [{ id: "m1", modelCode: "DeepSeek-V3" }] }); // 大小写不同 → 不算命中
    const r = await syncOfferingsForSource(f.client, SRC);
    expect(r).toMatchObject({ created: 0, candidates: 1 });
    expect(f.tx.providerModelOffering.create).not.toHaveBeenCalled();
    expect(f.raw.discoveryCandidate.create.mock.calls[0][0].data).toMatchObject({ candidateType: "model", name: "deepseek-v3", status: "discovered", sourceUrl: "https://siliconflow.cn/pricing" });
    const g = fakeClient({ models: [], candidate: { id: "c1" } });
    expect((await syncOfferingsForSource(g.client, SRC)).candidates).toBe(0);
    expect(g.raw.discoveryCandidate.create).not.toHaveBeenCalled();
  });

  it("观测币种与提供商标价币种不同 → 只同步 listedAt/isActive，价格保留并在证据注明", async () => {
    const f = fakeClient({ observations: [obs({ priceUnit: "usd_per_1m_tokens" })] });
    const r = await syncOfferingsForSource(f.client, SRC);
    expect(r).toMatchObject({ created: 1, priceSkipped: 1 });
    const data = f.tx.providerModelOffering.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("priceInput");
    expect(f.tx.evidenceChain.create.mock.calls[0][0].data.evidenceData).toMatchObject({ priceWritten: false, priceSkipReason: "currency_or_unit_mismatch" });
  });

  it("源未映射到 ModelProvider（或映射 APIStation / 实体已删）→ unmapped，不读观测不写库", async () => {
    const f = fakeClient({ mapped: false });
    expect((await syncOfferingsForSource(f.client, SRC)).status).toBe("unmapped");
    expect(f.raw.providerModelObservation.findMany).not.toHaveBeenCalled();
  });

  it("联表口径（Prisma 查询）：只认 mappedEntityType=ModelProvider；mapped_entity_id 按小写文本精确匹配 model_providers.id", async () => {
    const f = fakeClient({});
    await syncOfferingsForSource(f.client, SRC);
    expect(f.raw.monitoringSource.findFirst.mock.calls[0][0].where).toMatchObject({ id: SRC, deletedAt: null, mappedEntityType: "ModelProvider" });
    expect(f.raw.modelProvider.findFirst.mock.calls[0][0].where).toEqual({ id: P, deletedAt: null });
  });
});

describe("assertMappedEntityId（U-24=A）", () => {
  it("只接受 uuid；code / 空串 / 非字符串被拒", () => {
    expect(assertMappedEntityId(P.toUpperCase())).toBe(P);
    for (const bad of ["siliconflow", "", "01a158ab-0000-7000-8000", 42, null]) {
      expect(() => assertMappedEntityId(bad)).toThrow(MappedEntityIdError);
    }
  });
});
