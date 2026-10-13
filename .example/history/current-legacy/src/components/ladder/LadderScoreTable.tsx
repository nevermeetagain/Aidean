"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { getVendorColor, type DemoModel, type DemoVendor } from "@/lib/config/demoModels";

// 兼容API返回的扩展模型类型
type LadderRow = Omit<DemoModel, 'type' | 'protocol'> & {
  type: string;
  protocol: string;
  vendorColor?: string;
  slug?: string;
  modelCode?: string;
  scores?: Record<string, number> | null;
  priceInfo?: { input: number; output: number; cache: number | null; currency: string } | null;
};

const SORT_LABELS: Record<string, string> = {
  score: "推理基准得分",
  contextK: "上下文长度",
  speed: "响应速度",
  price: "价格",
};

export function LadderScoreTable({
  models,
  vendors,
  hrefPrefix,
  getVendorLabel,
  getVendorHelp,
  zoomPct = 0,
  variant = "light",
  sortKey = "score",
  accentTextClassName,
}: {
  models: LadderRow[];
  vendors: DemoVendor[];
  hrefPrefix: string;
  getVendorLabel?: (v: DemoVendor) => string;
  getVendorHelp?: (v: DemoVendor) => { title: string; desc: string };
  zoomPct?: 0 | 25 | 50 | 75 | 100 | 125 | 150 | 175 | 200;
  variant?: "light" | "dark" | "amber" | "indigo";
  sortKey?: string;
  accentTextClassName?: string;
}) {

  const isLightColor = useCallback((color: string) => {
    const c = (color || "").trim().toLowerCase();
    if (c === "white" || c === "#fff" || c === "#ffffff") return true;
    const hex = c.startsWith("#") ? c.slice(1) : c;
    if (!(hex.length === 3 || hex.length === 6)) return false;
    const full = hex.length === 3 ? hex.split("").map((x) => x + x).join("") : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.72;
  }, []);

  function VendorHelpDot({ dotColor, help }: { dotColor: string; help: { title: string; desc: string } }) {
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
    const lightBg = isLightColor(dotColor);
    const textClass = lightBg ? "text-slate-900" : "text-white";
    const strokeColor = lightBg ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

    const updatePos = useCallback(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({ left: rect.left + rect.width / 2, top: rect.bottom + 8 });
    }, []);

    useEffect(() => {
      if (!open) return;
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
      return () => {
        window.removeEventListener("scroll", updatePos, true);
        window.removeEventListener("resize", updatePos);
      };
    }, [open, updatePos]);

    const tooltip =
      open &&
      typeof document !== "undefined" &&
      createPortal(
        <span
          className="pointer-events-none fixed hidden w-64 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-xl ring-1 ring-black/10"
          style={{ left: pos.left, top: pos.top, transform: "translateX(-50%)", zIndex: 10000, display: "block" }}
        >
          <span className="font-semibold">{help.title}</span>
          <span className="block mt-1 text-white/85">{help.desc}</span>
        </span>,
        document.body
      );

    const qSize = zoomPct >= 175 ? "text-[7px]" : "text-[8px]";
    return (
      <>
        <span
          ref={triggerRef}
          className="absolute inset-0 inline-flex"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <span
            role="button"
            tabIndex={0}
            aria-label="查看系列说明"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
            }}
            className={clsx(
              "absolute inset-0 inline-flex items-center justify-center rounded-full font-black leading-none",
              qSize,
              textClass
            )}
            style={{ WebkitTextStroke: `0.6px ${strokeColor}`, textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}
          >
            ?
          </span>
        </span>
        {tooltip}
      </>
    );
  }

  const density = useMemo(() => {
    switch (zoomPct) {
      case 25:
        return { indexMinW: "min-w-[168px]", vendorMinW: "min-w-[140px]", th: "px-3 py-2.5", td: "px-3 py-2" };
      case 50:
        return { indexMinW: "min-w-[152px]", vendorMinW: "min-w-[120px]", th: "px-2.5 py-2.5", td: "px-2.5 py-2" };
      case 75:
        return { indexMinW: "min-w-[136px]", vendorMinW: "min-w-[104px]", th: "px-2.5 py-2", td: "px-2.5 py-1.5" };
      case 100:
        return { indexMinW: "min-w-[124px]", vendorMinW: "min-w-[92px]", th: "px-2 py-2", td: "px-2 py-1.5" };
      case 125:
        return { indexMinW: "min-w-[116px]", vendorMinW: "min-w-[84px]", th: "px-1.5 py-2", td: "px-1.5 py-1.5" };
      case 150:
        return { indexMinW: "min-w-[108px]", vendorMinW: "min-w-[76px]", th: "px-1.5 py-1.5", td: "px-1.5 py-1" };
      case 175:
        return { indexMinW: "min-w-[100px]", vendorMinW: "min-w-[68px]", th: "px-1.5 py-1.5", td: "px-1 py-1" };
      case 200:
        return { indexMinW: "min-w-[92px]", vendorMinW: "min-w-[60px]", th: "px-1.5 py-1.5", td: "px-1 py-0.5" };
      case 0:
      default:
        return { indexMinW: "min-w-[180px]", vendorMinW: "min-w-[160px]", th: "px-4 py-3", td: "px-3 py-2.5" };
    }
  }, [zoomPct]);

  const vendorLabelClass = zoomPct >= 150 ? "text-xs font-semibold" : "text-sm font-medium";
  const modelLinkClass = zoomPct >= 175 ? "px-1 py-0.5" : "px-1.5 py-0.5";

  const scoreRows = useMemo(() => {
    if (models.length === 0) return [];
    
    // 根据 sortKey 动态决定按哪个字段分组
    const sortField = sortKey || "score";
    const getValue = (m: LadderRow): number => {
      switch (sortField) {
        case "contextK": return m.contextK;
        case "speed": return m.speed;
        case "price": return m.price;
        case "score":
        default:
          return m.score;
      }
    };
    
    const values = models.map(getValue);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const maxInt = Math.ceil(maxValue);
    const minInt = Math.floor(minValue);

    const rows: { value: number; models: Map<DemoVendor, LadderRow> }[] = [];
    for (let s = maxInt; s >= minInt; s--) {
      const modelsAtValue = new Map<DemoVendor, LadderRow>();
      for (const v of vendors) {
        const match = models.find((m) => m.vendor === v && Math.round(getValue(m)) === s);
        if (match) modelsAtValue.set(v, match);
      }
      if (modelsAtValue.size > 0) {
        rows.push({ value: s, models: modelsAtValue });
      }
    }
    return rows;
  }, [models, vendors, sortKey]);

  if (scoreRows.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center bg-white ring-1 ring-slate-200">
        <div className="text-sm font-medium text-slate-700">没有匹配结果</div>
        <div className="mt-1 text-xs text-slate-500">请调整筛选条件后重试</div>
      </div>
    );
  }

  const sortLabel = SORT_LABELS[sortKey] || SORT_LABELS.score;

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th
                className={clsx(
                  "sticky left-0 z-10 text-left",
                  density.th,
                  density.indexMinW,
                  "bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={clsx("text-xs font-bold", accentTextClassName ?? "text-blue-600")}>
                    排序: {sortLabel}
                  </span>
                </div>
              </th>
              {vendors.map((v) => {
                const vendorColor = getVendorColor(v);
                const label = getVendorLabel ? getVendorLabel(v) : v;
                const help = getVendorHelp ? getVendorHelp(v) : null;
                return (
                  <th key={v} className={clsx("text-left", density.th, density.vendorMinW)}>
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex shrink-0">
                        <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: vendorColor }} />
                        {help && <VendorHelpDot dotColor={vendorColor} help={help} />}
                      </span>
                      <span className={clsx(vendorLabelClass, "text-slate-700")}>{label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scoreRows.map((row, idx) => (
              <tr
                key={row.value}
                className={clsx(
                  "border-b transition-colors",
                  idx % 2 === 0
                    ? "bg-white border-slate-100"
                    : "bg-slate-50/50 border-slate-100"
                )}
              >
                <td
                  className={clsx(
                    "sticky left-0 z-10 font-mono text-sm font-bold",
                    density.th,
                    "bg-inherit text-slate-900"
                  )}
                >
                  {row.value}
                </td>
                {vendors.map((v) => {
                  const model = row.models.get(v);
                  if (!model) {
                    return <td key={v} className={density.td} />;
                  }
                  return (
                    <td key={v} className={density.td}>
                      <Link
                        href={`${hrefPrefix}/${model.id}`}
                        prefetch={false}
                        aria-label={`查看模型详情：${model.name}`}
                        className={clsx(
                          "inline-flex items-center rounded text-xs font-normal transition-colors hover:underline",
                          modelLinkClass,
                          "text-slate-900 hover:bg-blue-50"
                        )}
                      >
                        {model.name}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
