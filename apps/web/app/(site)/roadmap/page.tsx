// /roadmap —— 路线图（一级导航第 6 项）。
// 与首页「产品路线图」区块共用 RoadmapTimeline 单一真源；页头统一走 PagePlaceholder。
// 数据（2026-09-28）：system_configs 键 roadmap.milestones（后台可配），ISR 300 + 后台保存即时失效。
import type { Metadata } from "next";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { RoadmapTimeline } from "../../../components/site/RoadmapTimeline";
import { getRoadmapMilestones } from "../../../lib/features/roadmap/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "路线图 · Aidean",
  description: "Aidean 产品路线图：版本里程碑与阶段性目标公开可查。",
};

export default async function RoadmapPage() {
  const milestones = await getRoadmapMilestones();
  return (
    <PagePlaceholder
      title="路线图"
      description="版本里程碑与阶段性目标汇总：已完成项标注进度，未完成项只陈述规划中的建设内容，不承诺具体上线时间。"
    >
      <RoadmapTimeline milestones={milestones} />
    </PagePlaceholder>
  );
}
