/**
 * B-R1 打回修复守卫：seed systemConfigsData ↔ admin/configs CONFIG_REGISTRY 真源一致性。
 *
 * 背景（B-N7 打回）：白名单扩至 6 键后，`ladder_score_granularity` 未落 seed，而 seed 走
 * `systemConfig.deleteMany() → create`，幂等重跑会把库内该行删掉 → GET 退化为兜底值（updatedAt=null），
 * 与「seed 为真源、registry 仅缺行兜底」的自注相悖。
 *
 * 本守卫把该风险固化为自动化失败项（无需 DB）：
 *   ① 白名单 6 键必须全部出现在 seed；
 *   ② 同名键的 configValue 必须等于 registry defaultValue（值真源一致）；
 *   ③ configGroup / configType 必须与 registry 一致。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import {
  ADMIN_CONFIG_REGISTRY,
  ADMIN_CONFIG_KEYS,
  normalizeConfigValue,
  PRICING_CONFIG_KEYS,
  PRICING_CURRENCIES,
} from "@aidean/shared";

const SEED_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../prisma/seed.ts"
);

/** 从 seed.ts 文本解析 systemConfigsData（不执行 seed，避免副作用/连库） */
function parseSeedConfigs(): Array<{
  configKey: string;
  configGroup: string;
  configType: string;
  configValue: string;
}> {
  const src = readFileSync(SEED_PATH, "utf8");
  const start = src.indexOf("const systemConfigsData = [");
  expect(start, "seed.ts 未找到 systemConfigsData").toBeGreaterThan(-1);
  const end = src.indexOf("\n]", start);
  const block = src.slice(start, end);
  return block
    .split("\n")
    .filter((line) => line.includes("configKey:"))
    .map((line) => ({
      configKey: /configKey:\s*'([^']+)'/.exec(line)?.[1] ?? "",
      configGroup: /configGroup:\s*'([^']+)'/.exec(line)?.[1] ?? "",
      configType: /configType:\s*'([^']+)'/.exec(line)?.[1] ?? "",
      configValue: /configValue:\s*'([^']*)'/.exec(line)?.[1] ?? "",
    }));
}

const REGISTRY = ADMIN_CONFIG_REGISTRY;
const SEED = parseSeedConfigs();

describe("seed ↔ CONFIG_REGISTRY 真源一致性（B-R1 守卫）", () => {
  it("① 白名单键与注册表一一对应且全部在 seed 中", () => {
    const keys = REGISTRY.map((entry) => entry.configKey);
    expect([...keys].sort()).toEqual([...ADMIN_CONFIG_KEYS].sort());
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(["about.contactEmail", "about.wechatQrUrl"]));
    const seedKeys = new Set(SEED.map((s) => s.configKey));
    for (const entry of REGISTRY) {
      expect(seedKeys.has(entry.configKey), `seed 缺失白名单键：${entry.configKey}`).toBe(true);
    }
  });

  it("all registry defaults pass their own validators", () => {
    for (const entry of REGISTRY) {
      expect(normalizeConfigValue(entry, entry.defaultValue), entry.configKey).toEqual({ ok: true, value: entry.defaultValue });
    }
  });

  it("② 同名键 configValue === registry defaultValue（值真源一致）", () => {
    const byKey = new Map(SEED.map((s) => [s.configKey, s]));
    for (const entry of REGISTRY) {
      const seedRow = byKey.get(entry.configKey);
      expect(seedRow, `seed 缺失：${entry.configKey}`).toBeTruthy();
      expect(
        seedRow?.configValue,
        `${entry.configKey} seed 值与 registry defaultValue 不一致`
      ).toBe(entry.defaultValue);
    }
  });

  it("③ configGroup / configType 与 registry 一致", () => {
    const byKey = new Map(SEED.map((s) => [s.configKey, s]));
    for (const entry of REGISTRY) {
      const seedRow = byKey.get(entry.configKey);
      expect(seedRow?.configGroup, `${entry.configKey} configGroup 不一致`).toBe(entry.configGroup);
      expect(seedRow?.configType, `${entry.configKey} configType 不一致`).toBe(entry.configType);
    }
  });

  it("⑤ 读侧契约 pricing 常量与 REGISTRY 一致（键存在 + 货币枚举 == valueRule.allowed）", () => {
    const evalEntry = REGISTRY.find((e) => e.configKey === PRICING_CONFIG_KEYS.evalPerModel);
    const currencyEntry = REGISTRY.find((e) => e.configKey === PRICING_CONFIG_KEYS.currency);
    expect(evalEntry, "REGISTRY 缺 pricing.evalPerModel").toBeTruthy();
    expect(currencyEntry, "REGISTRY 缺 pricing.currency").toBeTruthy();
    expect(currencyEntry?.valueRule).toMatchObject({ kind: "string", allowed: [...PRICING_CURRENCIES] });
    expect(evalEntry?.valueRule.kind).toBe("number");
  });

  it("④ site.title 空串在 seed 与 registry 双侧均为空（allowEmpty:true 语义可承载）", () => {
    const title = REGISTRY.find((e) => e.configKey === "site.title");
    expect(title?.defaultValue).toBe("");
    expect(title?.valueRule).toMatchObject({ kind: "string", allowEmpty: true });
    expect(SEED.find((s) => s.configKey === "site.title")?.configValue).toBe("");
  });
});
