"use client";
// 图表懒加载封装样板:echarts 仅经 await import 进入异步 chunk,永不入公共 bundle
// (echarts 为可选 peer,由消费方自装;类型经本地 echarts.d.ts 最小声明)
// 主题色读取 :root 的 --primary CSS 变量,读取失败兜底 #2563eb
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

export interface ECInstanceLike {
  setOption(option: unknown, opts?: { notMerge?: boolean }): void;
  resize(): void;
  dispose(): void;
  on?(eventName: string, handler: (params: { data?: unknown }) => void): void;
}

export interface EChartWrapperProps {
  option: Record<string, unknown>;
  style?: CSSProperties;
  className?: string;
  onReady?: (instance: ECInstanceLike) => void;
}

function themeColor(): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    return v || "#4f46e5";
  } catch {
    return "#4f46e5";
  }
}

function withTheme(option: Record<string, unknown>): Record<string, unknown> {
  return "color" in option ? option : { color: [themeColor()], ...option };
}

export function EChartWrapper({ option, style, className, onReady }: EChartWrapperProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const instRef = useRef<ECInstanceLike | null>(null);
  const optionRef = useRef(option);
  const readyRef = useRef(onReady);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("echarts").then((mod) => {
      if (disposed || !holderRef.current) return;
      const inst = mod.init(holderRef.current, undefined, {}) as unknown as ECInstanceLike;
      inst.setOption(withTheme(optionRef.current));
      instRef.current = inst;
      observer = new ResizeObserver(() => inst.resize());
      observer.observe(holderRef.current);
      readyRef.current?.(inst);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      instRef.current?.dispose();
      instRef.current = null;
    };
    // 初始化仅一次;setOption 更新走下方独立 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    optionRef.current = option;
    instRef.current?.setOption(withTheme(option));
  }, [option]);

  return <div ref={holderRef} style={style} className={cn("h-full w-full min-h-[240px]", className)} />;
}