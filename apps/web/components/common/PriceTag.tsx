/**
 * PriceTag —— 前台价格统一渲染（TASK-029；契约⑥「前台价格徽标」五态）。
 *
 * 口径（DESIGN-002 / EffectivePrice DTO）：
 *   - value 为生效价（窗口内优惠价，否则当前价）；isPromotion=true 时 basePrice 为原价（划线展示）。
 *   - 价格为 0 → 「免费」；优惠期为 0 → 徽标「限时免费」。
 *   - 无优惠不渲染徽标（empty 态）；解析失败由调用方回落当前价并传 isPromotion=false（error 态）。
 *   - 截止时间按 Asia/Shanghai 展示（站点受众口径；服务端渲染与浏览器时区无关）。
 * 纯展示、无 hooks：RSC 与客户端组件均可直接使用。
 */
import { cn } from "@aidean/ui";

const SYMBOLS: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", HKD: "HK$" };

/** 单价格式化：0 → 免费；≥1 两位、≥0.01 三位、更小四位（与 /pricing 原口径一致） */
export function formatPriceValue(value: number | string | null | undefined, currency = "CNY"): string {
  if (value === null || value === undefined || value === "") return "未公开";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "未公开";
  if (n <= 0) return "免费";
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  const digits = n >= 1 ? 2 : n >= 0.01 ? 3 : 4;
  return `${symbol}${n.toFixed(digits)}`;
}

const SH_FMT = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO → 「MM/DD HH:mm」（Asia/Shanghai）；非法输入返回 null（徽标省略截止时间而非报错） */
export function formatPromoDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return SH_FMT.format(d);
}

export function PromoBadge({ free, endsAt, className }: { free: boolean; endsAt?: string | null; className?: string }) {
  const deadline = formatPromoDeadline(endsAt);
  const label = free ? "限时免费" : "限时优惠";
  return (
    <span
      data-testid="price-promo-badge"
      title={deadline ? `${label}，截至 ${deadline}（北京时间）` : label}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        free
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-600",
        className,
      )}
    >
      {label}
      {deadline ? <span className="font-normal opacity-80">· 截至 {deadline}</span> : null}
    </span>
  );
}

export interface PriceTagProps {
  value: number | string | null | undefined;
  currency?: string;
  /** 单位后缀，如「/M Tokens」；不传则不显示 */
  unit?: string;
  isPromotion?: boolean;
  basePrice?: number | string | null;
  promotionEndsAt?: string | null;
  /** 同一行多个价格时，仅一处显示徽标（如只在输入价旁显示） */
  showBadge?: boolean;
  /** 徽标「限时免费」判定：须由调用方按输入价与输出价同时为 0 传入；缺省时按本价格是否为 0（review-029 M1） */
  free?: boolean;
  align?: "start" | "end";
  className?: string;
}

export function PriceTag({
  value,
  currency = "CNY",
  unit,
  isPromotion = false,
  basePrice = null,
  promotionEndsAt = null,
  showBadge = true,
  free,
  align = "start",
  className,
}: PriceTagProps) {
  const text = formatPriceValue(value, currency);
  const isFree = text === "免费";
  // 数值比较（"1.000000" 与 "1" 视为相同，review-029 S6）
  const showBase = isPromotion && basePrice !== null && basePrice !== undefined && Number(basePrice) !== Number(value);
  return (
    <span
      data-testid={isPromotion ? "price-tag-promo" : "price-tag"}
      className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1", align === "end" && "justify-end", className)}
    >
      <span className={cn("tabular-nums", isPromotion ? "font-semibold text-rose-600" : undefined, isPromotion && isFree && "text-emerald-700")}>
        {text}
        {unit && text !== "未公开" && !isFree ? <span className="ml-0.5 text-[0.85em] font-normal text-slate-400">{unit}</span> : null}
      </span>
      {showBase ? (
        <s data-testid="price-base" className="tabular-nums text-[0.85em] text-slate-400" aria-label={`原价 ${formatPriceValue(basePrice, currency)}`}>
          {formatPriceValue(basePrice, currency)}
        </s>
      ) : null}
      {isPromotion && showBadge ? <PromoBadge free={free ?? isFree} endsAt={promotionEndsAt} /> : null}
    </span>
  );
}
