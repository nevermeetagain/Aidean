"use client";

import { useEffect, useMemo, useRef } from "react";
import type { EChartsOption, EChartsType } from "echarts";
import clsx from "clsx";

export function EChart({
  option,
  className,
  ariaLabel
}: {
  option: EChartsOption;
  className?: string;
  ariaLabel?: string;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);

  const resolvedAria = useMemo(() => ariaLabel ?? "ECharts 图表", [ariaLabel]);

  useEffect(() => {
    let chart: EChartsType | null = null;
    let disposed = false;

    async function mount() {
      const el = elRef.current;
      if (!el) return;

      const echarts = await import("echarts");
      if (disposed) return;

      chart = echarts.init(el, undefined, { renderer: "canvas" });
      chart.setOption(option, { notMerge: true, lazyUpdate: true });

      const ro = new ResizeObserver(() => {
        chart?.resize();
      });
      ro.observe(el);

      return () => ro.disconnect();
    }

    let cleanupResize: void | (() => void);
    mount().then((cleanup) => {
      cleanupResize = cleanup;
    });

    return () => {
      disposed = true;
      cleanupResize?.();
      chart?.dispose();
      chart = null;
    };
  }, [option]);

  return (
    <div
      ref={elRef}
      className={clsx("h-[260px] w-full", className)}
      role="img"
      aria-label={resolvedAria}
    />
  );
}

