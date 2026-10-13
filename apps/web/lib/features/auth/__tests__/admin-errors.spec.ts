/**
 * formatZodMessage（P3：统一 40000 文案层）单元用例。
 * 用例以与 zod ZodIssue 同形的结构对象驱动（web 侧不直连 zod 依赖，formatZodMessage 亦只吃结构面）。
 * 覆盖：invalid_enum_value → 中文枚举提示；invalid_type / too_small 中文化；custom（refine）语义透传。
 */
import { describe, expect, it } from "vitest";

import { formatZodMessage, type ZodLikeIssue } from "../../../../app/api/v1/_lib/errors";

function issue(p: Partial<ZodLikeIssue> & { code: string }): ZodLikeIssue {
  return { path: [], ...p };
}

describe("formatZodMessage（40000 文案层）", () => {
  it("invalid_enum_value → 中文枚举白名单提示", () => {
    expect(
      formatZodMessage(issue({ code: "invalid_enum_value", options: ["ENABLED", "DISABLED"], received: "BOGUS" }))
    ).toBe("枚举值非法，允许 ENABLED/DISABLED");
  });

  it("invalid_type → 期望/收到类型中文化", () => {
    expect(
      formatZodMessage(issue({ code: "invalid_type", expected: "number", received: "string" }))
    ).toBe("参数类型非法（期望 number，收到 string）");
  });

  it("too_small → 中文化并携带路径", () => {
    expect(formatZodMessage(issue({ code: "too_small", path: ["a"] }))).toBe("数值低于下限（路径：a）");
    expect(formatZodMessage(issue({ code: "too_small" }))).toBe("数值低于下限（路径：body）");
  });

  it("custom（refine）→ 语义透传不改写", () => {
    expect(
      formatZodMessage(issue({ code: "custom", message: "余额码须带 balanceMinor" }))
    ).toBe("余额码须带 balanceMinor");
  });
});
