/**
 * B11-03a 维度真源锁：MATRIX_PROTOCOLS 必须与 Prisma enum ModelProtocol（ai_models.protocol）逐值一致；
 * 组件引用的协议集合 ⊆ schema 枚举（07_ 卡 B.1.1 验收 3 的机器口径）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ModelProtocol } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { MATRIX_CAPABILITIES, MATRIX_PROTOCOLS } from "../constants";

describe("matrix constants", () => {
  it("MATRIX_PROTOCOLS == Object.values(ModelProtocol)（集合相等）", () => {
    expect([...MATRIX_PROTOCOLS].sort()).toEqual(Object.values(ModelProtocol).sort());
  });

  it("schema.prisma 的 enum ModelProtocol 文本与常量一致（反向自检，不依赖生成物）", () => {
    const schema = readFileSync(join(__dirname, "../../../../../prisma/schema.prisma"), "utf-8");
    const block = schema.match(/enum ModelProtocol \{([\s\S]*?)\}/)![1]!;
    const names = [...block.matchAll(/^\s*([A-Z_]+)\s/gm)].map((m) => m[1]);
    expect(names.sort()).toEqual([...MATRIX_PROTOCOLS].sort());
  });

  it("ProtocolMatrix.tsx 不再含小写蛇形协议硬编码，列来自 MATRIX_PROTOCOLS", () => {
    const src = readFileSync(join(__dirname, "../../../../../components/admin/ProtocolMatrix.tsx"), "utf-8");
    expect(src).toContain("MATRIX_PROTOCOLS");
    expect(src).not.toMatch(/"openai_chat"|"anthropic_messages"|"openai_responses"/);
  });

  it("能力维度 8 项且无重复", () => {
    expect(new Set(MATRIX_CAPABILITIES).size).toBe(8);
  });
});
