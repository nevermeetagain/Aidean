/**
 * TASK-101 · fx_daily 单测（fixture，不联网、不连库）。
 * 覆盖卡面 5 项：正常写入 / 同日重跑幂等 / 源 5xx 不覆盖 / 非法数值拒绝 / 时区按 Asia/Shanghai 取日期。
 */
import { describe, expect, it } from "vitest";

import {
  FX_SOURCE,
  FX_SOURCE_URL_DEFAULT,
  FxSourceError,
  parseFrankfurterRate,
  runFxDaily,
  toDecimalString,
  type FetchLike,
  type FxStore,
} from "../fx_daily";
import type { FxDailyRate } from "../../../packages/shared/src/utils/price-normalization";

/** Frankfurter v2 /rate/usd/cny 真实响应形状（2026-10-20 实测样本） */
const FIXTURE_OK = '{"date":"2026-10-20","base":"USD","quote":"CNY","rate":6.6761}';

function memoryStore(seed: FxDailyRate[] = []) {
  const rows = new Map<string, FxDailyRate>(seed.map((r) => [r.rateDate, r]));
  let inserts = 0;
  const store: FxStore = {
    async insertIfAbsent(row) {
      if (rows.has(row.rateDate)) return false; // 模拟唯一键 ON CONFLICT DO NOTHING
      rows.set(row.rateDate, row);
      inserts += 1;
      return true;
    },
    async findByDate(d) {
      const r = rows.get(d);
      return r ? { rate: r.rate } : null;
    },
  };
  return { store, rows, inserts: () => inserts };
}

function fetchReturning(status: number, body: string, calls: string[] = []): FetchLike {
  return async (url) => {
    calls.push(url);
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
}

const AT = new Date("2026-10-20T03:00:00Z"); // 北京 11:00

describe("fx_daily 每日汇率采集", () => {
  it("正常写入：拉取 → 契约校验 → 写入当日一行", async () => {
    const m = memoryStore();
    const calls: string[] = [];
    const r = await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK, calls), store: m.store, now: () => AT });
    expect(r.status).toBe("inserted");
    expect(calls).toEqual([FX_SOURCE_URL_DEFAULT]);
    const row = m.rows.get("2026-10-20")!;
    expect(row).toMatchObject({ rateDate: "2026-10-20", base: "USD", quote: "CNY", rate: "6.6761", source: FX_SOURCE });
    expect(row.fetchedAt).toBe(AT.toISOString());
    expect(m.inserts()).toBe(1);
  });

  it("同日重跑幂等：已有当日快照则不拉源、不新增、不改写", async () => {
    const m = memoryStore();
    await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK), store: m.store, now: () => AT });
    const calls: string[] = [];
    const later = new Date("2026-10-20T12:00:00Z"); // 北京 20:00，同一汇率日
    const changed = '{"date":"2026-10-20","base":"USD","quote":"CNY","rate":7.01}';
    const r = await runFxDaily({ fetchImpl: fetchReturning(200, changed, calls), store: m.store, now: () => later });
    expect(r).toEqual({ status: "exists", rateDate: "2026-10-20", rate: "6.6761" });
    expect(calls).toHaveLength(0);
    expect(m.inserts()).toBe(1);
    expect(m.rows.size).toBe(1);
  });

  it("并发写冲突（唯一键命中）返回 exists，不覆盖", async () => {
    const m = memoryStore();
    const racing: FxStore = {
      findByDate: async () => (m.rows.size ? { rate: m.rows.values().next().value!.rate } : null),
      insertIfAbsent: async (row) => {
        // 另一进程抢先写入
        m.rows.set(row.rateDate, { ...row, rate: "6.7" });
        return false;
      },
    };
    const r = await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK), store: racing, now: () => AT });
    expect(r).toEqual({ status: "exists", rateDate: "2026-10-20", rate: "6.7" });
  });

  it("源 5xx：抛 FxSourceError(http)，不写库，前一日快照保留", async () => {
    const prev: FxDailyRate = {
      rateDate: "2026-10-19",
      base: "USD",
      quote: "CNY",
      rate: "6.68",
      source: FX_SOURCE,
      sourceUrl: FX_SOURCE_URL_DEFAULT,
      fetchedAt: "2026-10-19T02:00:00.000Z",
    };
    const m = memoryStore([prev]);
    await expect(runFxDaily({ fetchImpl: fetchReturning(503, "Service Unavailable"), store: m.store, now: () => AT })).rejects.toMatchObject({
      name: "FxSourceError",
      kind: "http",
    });
    expect(m.inserts()).toBe(0);
    expect([...m.rows.keys()]).toEqual(["2026-10-19"]);
    expect(m.rows.get("2026-10-19")!.rate).toBe("6.68");
  });

  it("网络错误：抛 FxSourceError(network)，不写库", async () => {
    const m = memoryStore();
    const boom: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(runFxDaily({ fetchImpl: boom, store: m.store, now: () => AT })).rejects.toMatchObject({ kind: "network" });
    expect(m.rows.size).toBe(0);
  });

  it.each([
    ["零", '{"base":"USD","quote":"CNY","rate":0}'],
    ["负数", '{"base":"USD","quote":"CNY","rate":-6.6}'],
    ["NaN 串", '{"base":"USD","quote":"CNY","rate":"abc"}'],
    ["缺 rate", '{"base":"USD","quote":"CNY"}'],
    ["越界过小（倒数错位）", '{"base":"USD","quote":"CNY","rate":0.1498}'],
    ["越界过大（单位错位）", '{"base":"USD","quote":"CNY","rate":667.61}'],
  ])("非法数值拒绝：%s → value 错误且不写库", async (_label, body) => {
    const m = memoryStore();
    await expect(runFxDaily({ fetchImpl: fetchReturning(200, body), store: m.store, now: () => AT })).rejects.toMatchObject({ kind: "value" });
    expect(m.rows.size).toBe(0);
  });

  it("币对不符 / 非 JSON 拒绝", () => {
    expect(() => parseFrankfurterRate('{"base":"EUR","quote":"CNY","rate":7.7}')).toThrow(FxSourceError);
    expect(() => parseFrankfurterRate("<html>")).toThrow(/JSON/);
  });

  it("时区按 Asia/Shanghai 取日期：UTC 16:30 已是北京次日", async () => {
    const m = memoryStore();
    const utcLate = new Date("2026-10-19T16:30:00Z"); // UTC 仍为 10-19，北京 10-20 00:30
    const r = await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK), store: m.store, now: () => utcLate });
    expect(r.status).toBe("inserted");
    expect([...m.rows.keys()]).toEqual(["2026-10-20"]);

    const m2 = memoryStore();
    const utcEarly = new Date("2026-10-19T15:59:59Z"); // 北京 10-19 23:59:59
    await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK), store: m2.store, now: () => utcEarly });
    expect([...m2.rows.keys()]).toEqual(["2026-10-19"]);
  });

  it("dry-run（store=null）只校验不写", async () => {
    const r = await runFxDaily({ fetchImpl: fetchReturning(200, FIXTURE_OK), store: null, now: () => AT });
    expect(r.status).toBe("dry-run");
  });

  it("toDecimalString 去尾零且最多 8 位", () => {
    expect(toDecimalString(6.6761)).toBe("6.6761");
    expect(toDecimalString(7)).toBe("7");
    expect(toDecimalString(7.123456789)).toBe("7.12345679");
  });
});
