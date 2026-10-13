import { describe, expect, it } from "vitest";
import { LadderQuerySchema, MatrixResponseSchema } from "../schemas/ladder.schema";

describe("ladder 域契约", () => {
  it("type 仅接受 models|stations", () => {
    expect(LadderQuerySchema.safeParse({ type: "models" }).success).toBe(true);
    expect(LadderQuerySchema.safeParse({ type: "tools" }).success).toBe(false);
  });
  it("矩阵行宽松化:未知附加字段透传", () => {
    const r = MatrixResponseSchema.parse({
      type: "stations",
      rows: [{ tierLabel: "T0", vendors: [{ name: "v" }], extra: 1 }],
    });
    expect((r.rows[0] as Record<string, unknown>).extra).toBe(1);
  });
});