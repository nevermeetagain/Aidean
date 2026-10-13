import { describe, expect, it } from "vitest";
import { ErrorResponseShapeSchema, PaginationMetaSchema, envelope } from "../schemas/common.schema";

describe("envelope 泛型信封", () => {
  it("包装任意 data parse 通过;data=null 放行", () => {
    const Env = envelope(PaginationMetaSchema);
    expect(Env.safeParse({ code: 0, message: "ok", data: null, requestId: "r1" }).success).toBe(true);
    expect(Env.safeParse({
      code: 0, message: "ok",
      data: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      requestId: "r2",
    }).success).toBe(true);
  });
  it("错误响应基形:data 恒 null", () => {
    expect(ErrorResponseShapeSchema.safeParse({ code: 40001, message: "x", data: null, requestId: "r" }).success).toBe(true);
    expect(ErrorResponseShapeSchema.safeParse({ code: 40001, message: "x", data: {}, requestId: "r" }).success).toBe(false);
  });
});