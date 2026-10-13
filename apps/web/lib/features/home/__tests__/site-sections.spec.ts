/**
 * S8 跑马灯/关于正文 CMS 化单测（finalize-admin-ia-and-ops-gaps B4）：
 * 覆盖 shared parse 兜底 + home 读服务（loadHomeContent）的 DB 成功解析与故障降级。纯注入，无需数据库。
 */
import { describe, expect, it, vi } from "vitest";

import {
  parseMarqueeNames,
  parseAboutBody,
  splitAboutParagraphs,
  MARQUEE_NAMES_DEFAULT,
  ABOUT_BODY_DEFAULT,
} from "@aidean/shared";
import { loadHomeContent } from "../config";

const findMany = vi.fn();
const client = { systemConfig: { findMany } } as never;

describe("parseMarqueeNames 兜底", () => {
  it("合法 JSON 数组 → 名单；非法/空 → 回默认", () => {
    expect(parseMarqueeNames('["甲","乙"]')).toEqual(["甲", "乙"]);
    expect(parseMarqueeNames(undefined)).toEqual(MARQUEE_NAMES_DEFAULT);
    expect(parseMarqueeNames("not-json")).toEqual(MARQUEE_NAMES_DEFAULT);
    expect(parseMarqueeNames('[]')).toEqual(MARQUEE_NAMES_DEFAULT); // min(1) 拒绝空数组
  });
  it("默认名单为 12 项，可两行半切分", () => {
    expect(MARQUEE_NAMES_DEFAULT).toHaveLength(12);
  });
});

describe("parseAboutBody / splitAboutParagraphs", () => {
  it("非空且不超长 → trim 后正文；空/超界 → 回默认", () => {
    expect(parseAboutBody("  你好  ")).toBe("你好");
    expect(parseAboutBody("   ")).toBe(ABOUT_BODY_DEFAULT);
    expect(parseAboutBody("x".repeat(6000))).toBe(ABOUT_BODY_DEFAULT);
  });
  it("正文按换行切段，过滤空白段", () => {
    expect(splitAboutParagraphs("第一段\n\n第二段\n")).toEqual(["第一段", "第二段"]);
    expect(splitAboutParagraphs("单段")).toEqual(["单段"]);
  });
});

describe("loadHomeContent 跑马灯/关于正文读取", () => {
  it("DB 有行：解析 partners.marquee 与 about.body 并入结果", async () => {
    findMany.mockResolvedValue([
      { configKey: "home.hero", configValue: "" },
      { configKey: "home.valuePoints", configValue: "" },
      { configKey: "home.modelEntries", configValue: "" },
      { configKey: "partners.marquee", configValue: '["甲方","乙方","丙方","丁方"]' },
      { configKey: "about.body", configValue: "自定义关于正文" },
    ]);
    const out = await loadHomeContent(client);
    expect(out.marquee).toEqual(["甲方", "乙方", "丙方", "丁方"]);
    expect(out.aboutBody).toBe("自定义关于正文");
  });

  it("DB 故障：整体回退默认（marquee/aboutBody 非空，页面不崩）", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    const out = await loadHomeContent(client);
    expect(out.marquee).toEqual(MARQUEE_NAMES_DEFAULT);
    expect(out.aboutBody).toBe(ABOUT_BODY_DEFAULT);
  });

  it("缺行/非法值：单键回退默认，其余键不受影响", async () => {
    findMany.mockResolvedValue([
      { configKey: "home.hero", configValue: "" },
      { configKey: "home.valuePoints", configValue: "" },
      { configKey: "home.modelEntries", configValue: "" },
      // partners.marquee / about.body 缺行 → parse 回默认
    ]);
    const out = await loadHomeContent(client);
    expect(out.marquee).toEqual(MARQUEE_NAMES_DEFAULT);
    expect(out.aboutBody).toBe(ABOUT_BODY_DEFAULT);
  });
});
