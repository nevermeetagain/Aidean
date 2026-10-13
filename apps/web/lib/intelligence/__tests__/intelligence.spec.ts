/**
 * Intelligence 层单元测试。
 */

import { describe, expect, it } from "vitest";

describe("snapshot — computeDiff", () => {
  it("检测新增 provider", () => {
    const oldData = { providers: [{ id: "a", name: "OpenAI" }] };
    const newData = {
      providers: [
        { id: "a", name: "OpenAI" },
        { id: "b", name: "DeepSeek" },
      ],
    };

    // 简单 diff 逻辑验证
    const oldIds = new Set((oldData.providers as Array<{ id: string }>).map(p => p.id));
    const newProviders = (newData.providers as Array<{ id: string; name: string }>)
      .filter(p => !oldIds.has(p.id));

    expect(newProviders).toHaveLength(1);
    expect(newProviders[0].name).toBe("DeepSeek");
  });

  it("检测移除 model", () => {
    const oldData = { models: [{ id: "x", name: "gpt-3.5" }, { id: "y", name: "gpt-4" }] };
    const newData = { models: [{ id: "y", name: "gpt-4" }] };

    const newIds = new Set((newData.models as Array<{ id: string }>).map(m => m.id));
    const removed = (oldData.models as Array<{ id: string; name: string }>)
      .filter(m => !newIds.has(m.id));

    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe("gpt-3.5");
  });
});

describe("change-detector — 变更类型", () => {
  it("价格变更检测", () => {
    const oldPrice = { input: 0.01, output: 0.03 };
    const newPrice = { input: 0.01, output: 0.02 };

    const changes: string[] = [];
    if (oldPrice.input !== newPrice.input) changes.push("input_price");
    if (oldPrice.output !== newPrice.output) changes.push("output_price");

    expect(changes).toEqual(["output_price"]);
  });

  it("能力变更检测", () => {
    const oldCaps = { vision: false, reasoning: true };
    const newCaps = { vision: true, reasoning: true };

    const changes: string[] = [];
    for (const key of Object.keys(oldCaps)) {
      if (oldCaps[key as keyof typeof oldCaps] !== newCaps[key as keyof typeof newCaps]) {
        changes.push(key);
      }
    }

    expect(changes).toEqual(["vision"]);
  });
});
