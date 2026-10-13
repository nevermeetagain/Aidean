// Token 计费纯函数(SubTask 1.4.2 权威实现)
// 公式:扣费(分) = 上游单价 x 内部加价系数 x token数 x 计费倍率 / 10000
//   其中单价单位为 元/百万token,故 1_000_000 除后乘 100 得分,合并为除以 10^4。
// 实现要点:
//   1) 各因子转为十进制整数+小数位数再全整数运算,规避浮点累积误差
//   2) 仅对最终商做 round half up,其余过程零舍入
//   3) 加价系数与倍率为平台敏感参数,永不进入公开 Zod 契约(见 gateway/billing schema 注释)
// 缓存价说明:函数本身只接受"计费 tokens"(上游合计口径),缓存命中折价由调用方聚合后再传入。

export interface CalcChargeInput {
  /** 上游单价,元/百万 tokens */
  pricePerMillionToken: number;
  /** 本次计费 tokens(调用方已完成缓存命中剔除等聚合) */
  tokens: number;
  /** 内部加价系数,默认 1.0 */
  markupRate?: number;
  /** 计费倍率,默认 1.0 */
  tokenMultiplier?: number;
}

function decompose(v: number): [bigint, number] {
  if (!Number.isFinite(v) || v < 0) throw new Error(`非法数值因子:${v}`);
  let s = String(v);
  if (/e/i.test(s)) s = v.toFixed(18);
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`非法数值因子:${v}`);
  const dot = s.indexOf(".");
  let digits: string;
  let exp: number;
  if (dot < 0) {
    digits = s;
    exp = 0;
  } else {
    digits = s.replace(".", "");
    exp = s.length - dot - 1;
  }
  while (exp > 0 && digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    exp -= 1;
  }
  return [BigInt(digits || "0"), exp];
}

function pow10(n: number): bigint {
  let r = 1n;
  for (let i = 0; i < n; i += 1) r *= 10n;
  return r;
}

export function calcCharge(input: CalcChargeInput): bigint {
  const rate = input.markupRate ?? 1.0;
  const mult = input.tokenMultiplier ?? 1.0;
  const { pricePerMillionToken, tokens } = input;
  if (!Number.isSafeInteger(tokens) || tokens < 0) {
    throw new Error(`tokens 必须是非负安全整数:${String(tokens)}`);
  }
  const [pi, pe] = decompose(pricePerMillionToken);
  const [ri, re] = decompose(rate);
  const [mi, me] = decompose(mult);
  const numerator = pi * ri * mi * BigInt(tokens);
  if (numerator === 0n) return 0n;
  const denom = pow10(pe + re + me + 4);
  // round half up 正数域:floor(N/D + 1/2) 等价于 (2N+D)/(2D) 整除截断
  return (2n * numerator + denom) / (2n * denom);
}