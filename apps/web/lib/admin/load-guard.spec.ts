import { describe, expect, it } from "vitest";
import { createLoadGuard } from "./load-guard";

describe("load-guard（#35④ 晚到响应守卫）", () => {
  it("仅最新票可回写：旧票在新 begin 后失效", () => {
    const g = createLoadGuard();
    const t1 = g.begin();
    expect(t1.token).toBe(1);
    expect(t1.isCurrent()).toBe(true);
    const t2 = g.begin();
    expect(t2.token).toBe(2);
    expect(t1.isCurrent()).toBe(false); // 晚到的旧响应必须被丢弃
    expect(t2.isCurrent()).toBe(true);
  });

  it("begin 会中止上一张票的信号（旧请求应随之取消）", () => {
    const g = createLoadGuard();
    const t1 = g.begin();
    expect(t1.signal.aborted).toBe(false);
    const t2 = g.begin();
    expect(t1.signal.aborted).toBe(true);
    expect(t2.signal.aborted).toBe(false);
  });

  it("abort 后当前票立即失效，但序号不回退", () => {
    const g = createLoadGuard();
    const t1 = g.begin();
    g.abort();
    expect(t1.isCurrent()).toBe(false);
    expect(t1.token).toBe(g.currentToken());
    const t2 = g.begin();
    expect(t2.token).toBe(2);
    expect(t2.isCurrent()).toBe(true);
  });

  it("abort 后重新 begin 不受影响（卸载后重挂载/手动 reload 场景）", () => {
    const g = createLoadGuard();
    g.begin();
    g.abort();
    g.abort(); // 幂等
    const t = g.begin();
    expect(t.signal.aborted).toBe(false);
    expect(t.isCurrent()).toBe(true);
  });
});
