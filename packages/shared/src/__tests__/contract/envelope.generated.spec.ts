// AUTO-GENERATED — DO NOT EDIT
// 由 scripts/contract/gen-contract-tests.mjs 生成（TASK-004 / REQ-NF-001 / ADR-P001）。
// 真源：packages/shared/src/schemas/common.schema.ts（envelope / ErrorResponseShapeSchema）
// 重生成：node scripts/contract/gen-contract-tests.mjs ；CI 以 git diff --exit-code 防漂移/手改。

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { envelope, ErrorResponseShapeSchema } from "../../schemas/common.schema";

describe("[contract] 统一信封 round-trip（四要素 code/message/data/requestId）", () => {
  it("成功信封：data 载荷按 schema 校验通过", () => {
    const schema = envelope(z.object({ id: z.string(), n: z.number() }));
    const ok = schema.safeParse({ code: 0, message: "ok", data: { id: "a", n: 1 }, requestId: "r-1" });
    expect(ok.success).toBe(true);
  });

  it("成功信封：data=null 允许（nullable），载荷形状非法拒绝", () => {
    const schema = envelope(z.object({ id: z.string() }));
    expect(schema.safeParse({ code: 0, message: "ok", data: null, requestId: "r" }).success).toBe(true);
    expect(schema.safeParse({ code: 0, message: "ok", data: { id: 1 }, requestId: "r" }).success).toBe(false);
  });

  it("错误信封基形：data 恒 null，非空 data / code 非整拒绝", () => {
    expect(ErrorResponseShapeSchema.safeParse({ code: 40000, message: "x", data: null, requestId: "r" }).success).toBe(true);
    expect(ErrorResponseShapeSchema.safeParse({ code: 40000, message: "x", data: {}, requestId: "r" }).success).toBe(false);
    expect(ErrorResponseShapeSchema.safeParse({ code: 1.5, message: "x", data: null, requestId: "r" }).success).toBe(false);
  });
});
