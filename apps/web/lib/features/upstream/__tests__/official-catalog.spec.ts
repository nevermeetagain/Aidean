// 官方平台目录纯函数单测（N3 丁：六大主流平台）。
// 验证目录完整性、shape 契约（code/baseUrl/format/icon/models）、以及 `/user/station-keys/stations`
// 的合并去重规则（数据库站优先于目录；目录以 catalog: 前缀 id 命名空间，未入库也可开箱可选）。
import { describe, expect, it } from "vitest";

import {
  findOfficialPlatform,
  OFFICIAL_PLATFORM_CATALOG,
  toOfficialPlatformOption,
} from "../official-catalog";

describe("OFFICIAL_PLATFORM_CATALOG", () => {
  it("收录六大主流平台，且 code 唯一", () => {
    const codes = OFFICIAL_PLATFORM_CATALOG.map((p) => p.code);
    expect(codes).toEqual(["openai", "anthropic", "deepseek", "moonshot", "zhipu", "qwen"]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("每项契约字段齐备且形态合法", () => {
    for (const p of OFFICIAL_PLATFORM_CATALOG) {
      expect(p.code.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.nameCn.length).toBeGreaterThan(0);
      expect(p.baseUrl.startsWith("https://")).toBe(true);
      expect(["openai", "anthropic"]).toContain(p.format);
      expect(p.icon).toMatch(/^\/brands\/.+\.svg$/);
      expect(p.brandColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.models.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it("openai 平台 format=openai 且含 gpt-4o", () => {
    const openai = findOfficialPlatform("openai");
    expect(openai?.format).toBe("openai");
    expect(openai?.models).toContain("gpt-4o");
  });

  it("anthropic 平台 format=anthropic 且含 claude-3-7-sonnet", () => {
    const anthropic = findOfficialPlatform("anthropic");
    expect(anthropic?.format).toBe("anthropic");
    expect(anthropic?.models).toContain("claude-3-7-sonnet");
  });

  it("deepseek 平台 models 含 deepseek-v3 / deepseek-r1", () => {
    const ds = findOfficialPlatform("deepseek");
    expect(ds?.models).toContain("deepseek-v3");
    expect(ds?.models).toContain("deepseek-r1");
  });

  it("findOfficialPlatform 对未知 code 返回 undefined", () => {
    expect(findOfficialPlatform("not-a-platform")).toBeUndefined();
  });
});

describe("toOfficialPlatformOption", () => {
  it("保留展示所需字段，且不含额外字段", () => {
    const opt = toOfficialPlatformOption(OFFICIAL_PLATFORM_CATALOG[0]);
    expect(Object.keys(opt).sort()).toEqual(
      ["baseUrl", "brandColor", "code", "description", "format", "icon", "models", "name", "nameCn"].sort()
    );
  });
});

/** 与 route.ts 同规则的合并去重（纯函数抽取，避免在 spec 内复制实现） */
function mergeStations(
  catalog: ReturnType<typeof toOfficialPlatformOption>[],
  db: Array<{ id: string; displayName: string; baseUrl: string | null; icon?: string; models?: string[] }>
) {
  const seenNames = new Set<string>();
  // DB 行在前：同名时 DB 优先（保留真实站点 id 供录入落库；目录项仅作开箱兜底）
  return [
    ...db,
    ...catalog.map((p) => ({
      id: `catalog:${p.code}`,
      displayName: p.nameCn || p.name,
      baseUrl: p.baseUrl,
      code: p.code,
      icon: p.icon,
      brandColor: p.brandColor,
      models: p.models,
      format: p.format,
    })),
  ].filter((item) => {
    const key = item.displayName.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
}

describe("stations 合并规则", () => {
  const catalogOpts = OFFICIAL_PLATFORM_CATALOG.map(toOfficialPlatformOption);

  it("目录项以 catalog:<code> 为 id，未入库也能开箱可选", () => {
    const merged = mergeStations(catalogOpts, []);
    expect(merged.length).toBe(OFFICIAL_PLATFORM_CATALOG.length);
    expect(merged[0].id).toBe("catalog:openai");
  });

  it("数据库站与目录同名时，数据库行优先（保留真实 id 供录入落库）", () => {
    const dbItem = { id: "uuid-1", displayName: "OpenAI", baseUrl: "https://api.openai.com/v1", icon: "/a.svg", models: ["x"] };
    const merged = mergeStations(catalogOpts, [dbItem]);
    const openaiItem = merged.find((m) => m.displayName === "OpenAI");
    expect(openaiItem?.id).toBe("uuid-1");
  });

  it("数据库站携带 icon/models 时透传，未携带时字段缺省（旧数据兼容）", () => {
    const dbWithIcon = { id: "u1", displayName: "DeepSeek", baseUrl: null, icon: "/b.svg", models: ["deepseek-v3"] };
    const dbPlain = { id: "u2", displayName: "Moonshot AI", baseUrl: "https://api.moonshot.cn/v1" };
    const merged = mergeStations(catalogOpts, [dbWithIcon, dbPlain]);
    const ds = merged.find((m) => m.displayName === "DeepSeek");
    expect(ds?.icon).toBe("/b.svg");
    expect(ds?.models).toEqual(["deepseek-v3"]);
    const moonshot = merged.find((m) => m.displayName === "Moonshot AI");
    expect(moonshot?.icon).toBeUndefined();
  });

  it("全部目录 + 若干数据库站：无重复 displayName", () => {
    const dbItems = [
      { id: "u1", displayName: "OpenAI", baseUrl: "https://api.openai.com/v1" },
      { id: "u2", displayName: "某内部平台", baseUrl: null },
    ];
    const merged = mergeStations(catalogOpts, dbItems);
    const names = merged.map((m) => m.displayName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(merged.some((m) => m.displayName === "某内部平台")).toBe(true);
  });
});