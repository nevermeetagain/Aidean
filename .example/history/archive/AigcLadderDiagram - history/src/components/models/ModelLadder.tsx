"use client";

import { useMemo } from "react";

import { LadderScoreTable } from "@/components/demo/LadderScoreTable";
import { useSiteTheme } from "@/lib/siteTheme";
import { DEMO_MODELS, DEMO_VENDORS, type DemoModel, type DemoVendor } from "@/lib/demoModels";

export type ModelLadderKind = "default" | "mobile" | "image" | "video" | "audio";

const KIND_META: Record<ModelLadderKind, { title: string; desc: string }>= {
  default: { title: "模型天梯图", desc: "以统一维度对比模型能力，支持点击进入模型详情。" },
  mobile: { title: "移动端模型天梯图", desc: "面向移动端/轻量部署场景的模型对比视图。" },
  image: { title: "图像模型天梯图", desc: "以视觉/多模态为主的模型对比视图。" },
  video: { title: "视频模型天梯图", desc: "以多模态能力为主的视频相关模型对比视图。" },
  audio: { title: "音频模型天梯图", desc: "以语音相关能力为主的模型对比视图。" },
};

function pickModels(kind: ModelLadderKind): DemoModel[] {
  if (kind === "image") return DEMO_MODELS.filter((m) => m.type === "视觉" || m.type === "多模态");
  if (kind === "video") return DEMO_MODELS.filter((m) => m.type === "多模态" || m.tags.includes("多模态"));
  if (kind === "audio") return DEMO_MODELS.filter((m) => m.type === "语音" || m.tags.includes("语音交互"));
  // mobile：当前 demo 数据集中没有明确的“移动端”字段，为避免空表，这里先不做过滤
  return DEMO_MODELS;
}

function pickVendors(models: DemoModel[]): DemoVendor[] {
  const set = new Set<DemoVendor>();
  for (const m of models) set.add(m.vendor);
  return DEMO_VENDORS.filter((v) => set.has(v));
}

export function ModelLadder({ kind = "default" }: { kind?: ModelLadderKind }) {
  const { theme, resolvedMode } = useSiteTheme();
  // 强制浅色模式 - 根据需求 v1.6
const isDark = false;

  const meta = KIND_META[kind] ?? KIND_META.default;

  const models = useMemo(() => pickModels(kind), [kind]);
  const vendors = useMemo(() => pickVendors(models), [models]);

  return (
    <div className={isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}>
      <section className={isDark ? "border-b border-slate-800 bg-slate-950" : "border-b border-slate-200 bg-white"}>
        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Aidean · Models</div>
            <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${isDark ? "text-white" : "text-slate-900"}`}>{meta.title}</h1>
            <p className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{meta.desc}</p>
          </div>
        </div>
      </section>

      <section className="w-full py-8">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className={`rounded-2xl p-4 shadow-sm ring-1 ${isDark ? "bg-slate-900/40 ring-slate-800" : "bg-white ring-slate-200"}`}>
            <LadderScoreTable
              models={models}
              vendors={vendors}
              hrefPrefix="/models"
              variant={isDark ? "dark" : "light"}
              accentTextClassName={isDark ? "text-emerald-400" : theme.primaryText}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
