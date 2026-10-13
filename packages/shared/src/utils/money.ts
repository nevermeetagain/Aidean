// 金额工具:以分(bigint)作为记账唯一最小单位
// 语义约定:yuanToFen 输入单位=元,返回单位=分('10' -> 1000n;数值入参同样按元解释)
// fenToYuan 固定输出两位小数(1050n -> '10.50',负值 '-2.50')
const YUAN_RE = /^(-)?(\d{1,15})(?:\.(\d{1,2}))?$/;

/**
 * 元 -> 分。字符串与小数均走十进制字符串解析,杜绝 0.1*100 类浮点误差。
 * 允许最多两位小数,超过精度直接抛错(拒绝静默截断);负数金额不允许录入。
 */
export function yuanToFen(input: string | number): bigint {
  if (typeof input === "number" && !Number.isFinite(input)) {
    throw new Error(`非法金额:非有限数字 ${String(input)}`);
  }
  const s = (typeof input === "number" ? String(input) : input).trim();
  const m = YUAN_RE.exec(s);
  if (!m) throw new Error(`非法金额:${input}`);
  if (m[1] === "-") throw new Error("负数金额不被允许");
  const fen = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return fen;
}

/** 分 -> 元字符串(固定两位小数,支持负值展示) */
export function fenToYuan(fen: bigint): string {
  const neg = fen < 0n;
  const abs = neg ? -fen : fen;
  const yuan = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${yuan}.${cents}`;
}

/** 记账守卫:任何运算后的余额/流水必须为非负 */
export function assertNonNegative(fen: bigint): void {
  if (fen < 0n) throw new RangeError(`记账金额不可为负,收到 ${fen} 分`);
}