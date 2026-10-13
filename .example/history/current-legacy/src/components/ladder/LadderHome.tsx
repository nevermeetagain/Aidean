"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Mail, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

type Vendor = "OpenAI" | "Anthropic" | "Google" | "字节跳动" | "百度";

type Row = {
  score: number;
  models: Partial<Record<Vendor, string>>;
};

const VENDORS: Vendor[] = ["OpenAI", "Anthropic", "Google", "字节跳动", "百度"];

const SAMPLE_ROWS: Row[] = [
  { score: 92, models: { OpenAI: "GPT-4o" } },
  { score: 91, models: { Anthropic: "Claude 3 Opus", Google: "Gemini 1.5 Pro Ultra" } },
  { score: 90, models: {} },
  { score: 89, models: { Google: "Gemini 1.5 Pro" } },
  { score: 88, models: { Anthropic: "Claude 3 Sonnet", "字节跳动": "豆包 4.0" } },
  { score: 87, models: { OpenAI: "GPT-3.5 Turbo" } },
  { score: 86, models: { Google: "Gemini 1.5 Flash", 百度: "文心一言 4.0" } },
  { score: 85, models: { Anthropic: "Claude 3 Haiku" } }
];

export function LadderHome() {
  const [edition, setEdition] = useState<"pro" | "app">("pro");

  const headerTitle = useMemo(() => {
    return edition === "pro" ? "大模型性能天梯图" : "大模型性能天梯图（应用版）";
  }, [edition]);

  return (
    <div className="space-y-6">
      <section className="relative rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {headerTitle}
            </h1>
            <div className="mt-3 text-sm text-black/60">
              仅演示布局：位置参考设计蓝本，不继承其颜色与样式。
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button variant="primary" className="w-full justify-between lg:w-auto">
              查看更多榜单
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            <div className="text-xs text-black/60">更新日期：2026-03-18</div>
            <a
              className="inline-flex items-center gap-2 text-xs text-black/80 underline-offset-4 hover:underline"
              href="mailto:164093410@qq.com?subject=%E6%95%B0%E6%8D%AE%E7%BA%A0%E9%94%99"
            >
              <Mail className="h-4 w-4" aria-hidden />
              纠错：164093410@qq.com
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={edition === "pro" ? "primary" : "subtle"}
            onClick={() => setEdition("pro")}
          >
            专业版
          </Button>
          <Button
            variant={edition === "app" ? "primary" : "subtle"}
            onClick={() => setEdition("app")}
          >
            应用版
          </Button>

          <div className="mx-2 hidden h-6 w-px bg-black/10 sm:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="subtle">
              类型
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="subtle">
              开源
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="subtle">
              协议
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="subtle">
              标签
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              排序算法
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-black/10">
          <div className="grid grid-cols-[100px_repeat(5,minmax(0,1fr))] border-b border-black/10 text-xs font-semibold text-black/70">
            <div className="px-4 py-3">基准评分</div>
            {VENDORS.map((v) => (
              <div key={v} className="px-4 py-3">
                {v}
              </div>
            ))}
          </div>

          <div className="divide-y divide-black/10">
            {SAMPLE_ROWS.map((row) => (
              <div
                key={row.score}
                className="grid grid-cols-[100px_repeat(5,minmax(0,1fr))] text-sm"
              >
                <div className="px-4 py-3 font-semibold tabular-nums">{row.score}</div>
                {VENDORS.map((v) => (
                  <div key={v} className="px-4 py-3">
                    <span className="truncate">{row.models[v] ?? ""}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <RightBottomDock />
    </div>
  );
}

function RightBottomDock() {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <div className="w-[72px] overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
        <DockButton label="收藏" />
        <DockButton label="对比" />
        <DockButton label="客服" />
      </div>
    </div>
  );
}

function DockButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-14 w-full items-center justify-center text-xs font-medium text-black/80 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
    >
      {label}
    </button>
  );
}
