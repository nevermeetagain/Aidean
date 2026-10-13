// 产品路线图时间线（Server Component，零客户端 JS）。
// 单一真源：首页「产品路线图」区块与 /roadmap 页面共用本组件，
// 避免两处各写一份里程碑导致版本口径漂移。
// 数据来源（2026-09-28）：system_configs 键 roadmap.milestones（后台可配，/admin/configs 编辑），
// 由页面（RoadmapSection //roadmap）经 lib/features/roadmap/config.ts 读穿注入；
// 组件内不再持有数据，默认参数仅作调用方未传时的兜底（口径=shared ROADMAP_MILESTONES_DEFAULT）。
import { CheckCircle2 } from "lucide-react";
import { ROADMAP_MILESTONES_DEFAULT, type RoadmapMilestone } from "@aidean/shared";
import { RevealOnScroll } from "../home/RevealOnScroll";

export type { RoadmapMilestone } from "@aidean/shared";

interface RoadmapTimelineProps {
  milestones?: RoadmapMilestone[];
}

export function RoadmapTimeline({ milestones = ROADMAP_MILESTONES_DEFAULT }: RoadmapTimelineProps) {
  return (
    <RevealOnScroll>
      <ol className="relative ml-3 space-y-10 border-l-2 border-slate-200 pl-8">
        {milestones.map(({ version, title, description, done }) => (
          <li key={version} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[43px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white shadow-sm ${
                done ? "border-primary" : "border-slate-200"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                {version}
              </code>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              {done && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                  已完成
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p>
          </li>
        ))}
      </ol>
    </RevealOnScroll>
  );
}
