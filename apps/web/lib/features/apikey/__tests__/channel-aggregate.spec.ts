/**
 * API 渠道聚合（乙 · 后端统一）单测。
 *
 * 覆盖 `listApiChannels` 的纯读逻辑：
 *  - custom 在前、station 在后（面板分组语义）；
 *  - custom 按 priority asc, createdAt asc 排序（与 FREE_PROXY 分发口径一致）；
 *  - station 格式从 protocols 推导（含 anthropic → anthropic，否则 openai）；
 *  - custom format enum → 小写契约；
 *  - kind 专属字段（stationId / priority/groupName/weight）仅在对应 kind 出现；
 *  - 数据库为唯一事实源：无伪行合成，空库返回空数组。
 *
 * 策略：vi.mock lib/db/prisma，直接调 listApiChannels 断言映射结果（不触 route 鉴权层）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  stationRows: [] as Array<Record<string, unknown>>,
  customRows: [] as Array<Record<string, unknown>>,
  lastStationQuery: undefined as unknown,
  lastCustomQuery: undefined as unknown,
}));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    stationUserKey: {
      findMany: vi.fn(async (args: unknown) => {
        state.lastStationQuery = args;
        return state.stationRows;
      }),
    },
    customChannel: {
      findMany: vi.fn(async (args: unknown) => {
        state.lastCustomQuery = args;
        return state.customRows;
      }),
    },
  },
}));

import { listApiChannels } from "../channel-aggregate";

beforeEach(() => {
  state.stationRows = [];
  state.customRows = [];
  state.lastStationQuery = undefined;
  state.lastCustomQuery = undefined;
});

describe("listApiChannels 聚合", () => {
  it("custom 在前、station 在后（面板分组语义）", async () => {
    state.customRows = [
      {
        id: "cc-1",
        name: "我的中转",
        baseUrl: "https://relay.example.com/v1",
        keyMasked: "sk-****aaaa",
        format: "OPENAI",
        models: ["gpt-4o"],
        priority: 10,
        groupName: "主用",
        weight: 3,
        isActive: true,
        createdAt: new Date("2026-09-01T00:00:00Z"),
      },
    ];
    state.stationRows = [
      {
        id: "suk-1",
        stationId: "st-openai-real",
        name: null,
        keyMasked: "sk-****bbbb",
        isActive: true,
        createdAt: new Date("2026-09-10T00:00:00Z"),
        station: {
          displayName: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          protocols: ["OPENAI"],
          models: ["gpt-4o"],
        },
      },
    ];

    const items = await listApiChannels("u-1");
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe("custom");
    expect(items[1].kind).toBe("station");
  });

  it("custom 排序：priority asc, createdAt asc（与 FREE_PROXY 口径一致）", async () => {
    // 排序由 Prisma 查询 orderBy 承担，此处校验查询参数而非结果顺序
    await listApiChannels("u-1");
    expect(state.lastCustomQuery).toMatchObject({
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  });

  it("station 排序：createdAt desc", async () => {
    await listApiChannels("u-1");
    expect(state.lastStationQuery).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("仅查本人数据（userId 过滤）", async () => {
    await listApiChannels("u-rw2");
    expect(state.lastStationQuery).toMatchObject({ where: { userId: "u-rw2" } });
    expect(state.lastCustomQuery).toMatchObject({ where: { userId: "u-rw2" } });
  });

  it("station 查询排除软删站点（deletedAt: null）", async () => {
    await listApiChannels("u-1");
    expect(state.lastStationQuery).toMatchObject({
      where: { station: { deletedAt: null } },
    });
  });

  it("station 查询仅取计费模式 UPSTREAM 的站点（与非 UPSTREAM 隔离）", async () => {
    await listApiChannels("u-1");
    expect(state.lastStationQuery).toMatchObject({
      where: { station: { billingRule: { billingMode: "UPSTREAM" } } },
    });
    // custom 侧无 station 关系，不应携带该过滤
    expect(state.lastCustomQuery).not.toMatchObject({
      where: { station: { billingRule: { billingMode: "UPSTREAM" } } },
    });
  });

  it("station 格式：protocols 含 anthropic → anthropic", async () => {
    state.stationRows = [
      {
        id: "suk-a",
        stationId: "st-anthropic",
        name: null,
        keyMasked: "sk-****c",
        isActive: true,
        createdAt: new Date(),
        station: {
          displayName: "Anthropic",
          baseUrl: "https://api.anthropic.com/v1",
          protocols: ["ANTHROPIC"],
          models: ["claude-3-5-sonnet"],
        },
      },
    ];
    const items = await listApiChannels("u-1");
    expect(items[0].format).toBe("anthropic");
    expect(items[0].stationId).toBe("st-anthropic");
  });

  it("station 格式：无 protocols 或缺省 → openai（云服务主流兼容缺省）", async () => {
    state.stationRows = [
      {
        id: "suk-b",
        stationId: "st-qwen",
        name: null,
        keyMasked: "sk-****d",
        isActive: true,
        createdAt: new Date(),
        station: { displayName: "Qwen", baseUrl: "https://dashscope.example/v1", protocols: [], models: [] },
      },
    ];
    const items = await listApiChannels("u-1");
    expect(items[0].format).toBe("openai");
  });

  it("custom format：enum ANTHROPIC → 'anthropic'；OPENAI → 'openai'", async () => {
    state.customRows = [
      {
        id: "cc-a",
        name: "A",
        baseUrl: "https://a.example/v1",
        keyMasked: "sk-****e",
        format: "ANTHROPIC",
        models: [],
        priority: 100,
        groupName: null,
        weight: 1,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "cc-b",
        name: "B",
        baseUrl: "https://b.example/v1",
        keyMasked: "sk-****f",
        format: "OPENAI",
        models: [],
        priority: 100,
        groupName: null,
        weight: 1,
        isActive: true,
        createdAt: new Date(),
      },
    ];
    const items = await listApiChannels("u-1");
    expect(items[0].format).toBe("anthropic");
    expect(items[1].format).toBe("openai");
  });

  it("custom kind 携带 priority/groupName/weight 三专属字段", async () => {
    state.customRows = [
      {
        id: "cc-1",
        name: "主渠道",
        baseUrl: "https://r.example/v1",
        keyMasked: "sk-****g",
        format: "OPENAI",
        models: ["deepseek-chat"],
        priority: 5,
        groupName: "国内",
        weight: 7,
        isActive: false,
        createdAt: new Date(),
      },
    ];
    const [item] = await listApiChannels("u-1");
    expect(item).toMatchObject({ priority: 5, groupName: "国内", weight: 7, isActive: false });
    expect(item).not.toHaveProperty("stationId");
    expect(item.apiKeyMasked).toBe("sk-****g");
    expect(item.models).toEqual(["deepseek-chat"]);
  });

  it("空库返回空数组（不合成 catalog 伪行）", async () => {
    const items = await listApiChannels("u-1");
    expect(items).toEqual([]);
  });

  it("脱敏：永不包含 keyCipher/明文 apiKey 字段", async () => {
    state.stationRows = [
      {
        id: "suk-1",
        stationId: "st-openai-real",
        name: null,
        keyMasked: "sk-****bbbb",
        keyCipher: "SECRET_SHOULD_NOT_LEAK",
        isActive: true,
        createdAt: new Date(),
        station: { displayName: "OpenAI", baseUrl: "https://api.openai.com/v1", protocols: ["OPENAI"], models: [] },
      },
    ];
    const items = await listApiChannels("u-1");
    const raw = JSON.stringify(items[0]);
    expect(raw).not.toContain("SECRET_SHOULD_NOT_LEAK");
    expect(raw).not.toContain("keyCipher");
  });

  it("station 名称回退链：displayName → name → stationId", async () => {
    // 场景 1：有 displayName
    state.stationRows = [
      {
        id: "suk-1",
        stationId: "st-x",
        name: null,
        keyMasked: "sk-****h",
        isActive: true,
        createdAt: new Date(),
        station: { displayName: "平台A", baseUrl: null, protocols: [], models: [] },
      },
    ];
    let items = await listApiChannels("u-1");
    expect(items[0].name).toBe("平台A");

    // 场景 2：station 缺失（外键悬空，如站点被物理删）——用 name
    state.stationRows = [
      {
        id: "suk-2",
        stationId: "st-gone",
        name: "备用名",
        keyMasked: "sk-****i",
        isActive: true,
        createdAt: new Date(),
        station: null,
      },
    ];
    items = await listApiChannels("u-1");
    expect(items[0].name).toBe("备用名");

    // 场景 3：name 亦缺 → 回退 stationId（前端不渲染 undefined）
    state.stationRows = [
      {
        id: "suk-3",
        stationId: "st-gone",
        name: null,
        keyMasked: "sk-****j",
        isActive: true,
        createdAt: new Date(),
        station: null,
      },
    ];
    items = await listApiChannels("u-1");
    expect(items[0].name).toBe("st-gone");
  });
});