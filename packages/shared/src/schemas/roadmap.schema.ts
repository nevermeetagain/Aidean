// 路线图里程碑契约（roadmap.milestones 配置键共用）：
// - schema：后台 PUT 归一化（admin-config.constants.ts valueRule kind="milestones"）与前台读取兜底共用；
// - 默认值：seed systemConfigsData 为值真源（须与 JSON.stringify(ROADMAP_MILESTONES_DEFAULT) 逐字符一致，
//   admin-config-seed-parity 守卫②校验），此处常量仅作库内缺行/解析失败时的前台兜底；
// - 文案口径（管理者 2026-09-30）：面向公众的功能点描述，初中生可读，不土不落伍。
//   时间线：2026-10-15 → 2027-02-28，12 个里程碑（v0.1 已完成 + 11 个新步骤）。
import { z } from "zod";

export const RoadmapMilestoneSchema = z.object({
  version: z.string().trim().min(1, "版本号不能为空").max(20, "版本号 ≤20 字"),
  title: z.string().trim().min(1, "标题不能为空").max(60, "标题 ≤60 字"),
  description: z.string().trim().min(1, "说明不能为空").max(300, "说明 ≤300 字"),
  done: z.boolean().default(false),
}).strict();
export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;
export const RoadmapMilestonesSchema = z.array(RoadmapMilestoneSchema).max(24, "里程碑最多 24 条");

/** 缺行/解析失败时的前台兜底默认（口语化文案，禁开发术语；后台可整体改写） */
export const ROADMAP_MILESTONES_DEFAULT: RoadmapMilestone[] = [
  {
    version: "v0.1",
    title: "搭好网站的地基",
    description: "网站的底层工程已经完成：代码分门别类放好，存放数据的表格建好，每次改动都会先通过自动检查再上线。",
    done: true,
  },
  {
    version: "v0.2",
    title: "天梯图自动刷新",
    description: "模型排行榜不再需要人工更新。新模型一发布，系统自动抓取跑分、更新排名，你看到的永远是最新战力榜。",
    done: false,
  },
  {
    version: "v0.3",
    title: "模型站导航上线",
    description: "不知道去哪家平台找模型？导航页把所有模型站整理在一起，标清价格、速度和擅长方向，一键跳转，像地图一样直观。",
    done: false,
  },
  {
    version: "v0.4",
    title: "模型对比测试",
    description: "选几个模型，输入同一道题，并排看回答。谁更准、谁更快、谁更便宜，一目了然，不再靠感觉选模型。",
    done: false,
  },
  {
    version: "v0.5",
    title: "AideanWiki 接入主站",
    description: "独立知识百科正式接入：你写的笔记、存的文献都能在一个地方搜到，知识不再散落在各个文件夹里。",
    done: false,
  },
  {
    version: "v0.6",
    title: "AideanBot 接入主站",
    description: "信源引擎机器人接入：公众号文章、网页内容自动采集整理，配合知识库使用，收集资料像打开水龙头一样简单。",
    done: false,
  },
  {
    version: "v0.7",
    title: "AideanThesis 接入主站",
    description: "论文审查助手接入：从选题到定稿，格式检查、查重预检、引用核验一站搞定，写论文不再是一个人的战斗。",
    done: false,
  },
  {
    version: "v0.8",
    title: "AideanFleet 本地控制台",
    description: "自动化舰队引擎升级为本地命令行工具：读剪贴板就能创建任务，融合多种 CLI 工具，初始化自动下载配置，在终端里指挥整个 AI 舰队。",
    done: false,
  },
  {
    version: "v0.9",
    title: "CLI 配置与自定义模型",
    description: "每个命令行工具都能单独配模型：推理任务配大模型，润色任务配快模型，按需分配，把算力花在刀刃上。",
    done: false,
  },
  {
    version: "v1.0",
    title: "AideanFleet 开源",
    description: "自动化舰队引擎正式开源：代码公开、文档齐全，开发者可以自行部署、贡献代码，让更多人用上 AI 自动化。",
    done: false,
  },
  {
    version: "v1.1",
    title: "统一账号与余额",
    description: "一个账号登录所有平台，一个钱包查看所有模型站余额。不再记十几个密码，不再挨个查余额，省心省力。",
    done: false,
  },
  {
    version: "v1.2",
    title: "规范化流程化",
    description: "从收集信息到存储、从知识库检索到论文编辑审查，整条链路打通并标准化。每一步有规范、有记录、可追溯，让 AI 辅助真正可靠。",
    done: false,
  },
];

/** 前台读取兜底：合法 JSON → 校验后的数组；任何异常 → 回默认（深拷贝防调用方篡改常量） */
export function parseRoadmapMilestones(value: string | undefined): RoadmapMilestone[] {
  try {
    return RoadmapMilestonesSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return ROADMAP_MILESTONES_DEFAULT.map((m) => ({ ...m }));
  }
}
