// 产品路线图：首页区块包装（Server Component，异步取配置）。
// 里程碑数据与渲染抽到 components/site/RoadmapTimeline.tsx，
// 与 /roadmap 页面共用同一真源；数据自 system_configs（后台 /admin/configs 可改，
// 保存时 revalidatePath("/") 即时生效），读取失败回退默认文案。
import { RoadmapTimeline } from "../site/RoadmapTimeline";
import { getRoadmapMilestones } from "../../lib/features/roadmap/config";
import { Badge } from "@aidean/ui";

export async function RoadmapSection() {
  const milestones = await getRoadmapMilestones();
  return (
    <div>
      <Badge variant="secondary" className="mb-3">产品路线图</Badge>
      <RoadmapTimeline milestones={milestones} />
    </div>
  );
}
