/**
 * product-fallback — 产品矩阵 DB 不可用时的统一底稿（#71 收口三份拷贝）。
 *
 * 同步契约：与 prisma/seed.ts §6 productsSeed 保持一致（5 产品）。
 * 消费方按自身 interface 从此投影，不再各写一份。
 */

export interface ProductFallbackRow {
  slug: string;
  name: string;
  displayName: string | null;
  category: string | null;
  sortOrder: number;
  badge: string;
  tagline: string;
  description: string;
  benefits: string[];
}

export const PRODUCT_FALLBACK: readonly ProductFallbackRow[] = [
  {
    slug: "aideanwiki",
    name: "AideanWiki",
    displayName: "独立知识百科",
    category: "PARTNER",
    sortOrder: 10,
    badge: "已上线",
    tagline: "知识库个人版免费可用",
    description:
      "Aidean 知识库产品：个人版免费可用，多源文档一键入库与检索问答；团队版权益与定价明细整理中，详见价格页产品权益分区。",
    benefits: ["个人版免费可用", "多源知识库检索", "团队版协作（规划中）"],
  },
  {
    slug: "wechatrag",
    name: "AideanBot",
    displayName: "信源引擎机器人",
    category: "OFFERING",
    sortOrder: 20,
    badge: "内测中",
    tagline: "信息源 → 知识库 → 机器人闭环（生态内亦称 WeChatRag）",
    description:
      "以微信公众号为核心的知识库机器人平台：向机器人发送公众号链接即构建知识库并自动更新、即时生效。",
    benefits: ["公众号链接即传即建知识库", "订阅策略自动更新、即时生效", "机器人多端问答、引用可溯源", "主平台账号统一登录"],
  },
  {
    slug: "aideanfleet",
    name: "AideanFleet",
    displayName: "自动化舰队引擎",
    category: "OPEN_SOURCE",
    sortOrder: 30,
    badge: "迭代中",
    tagline: "薄控制面 + 可插拔执行体的自动化执行器",
    description:
      "本地优先的自动化任务编排工具：控制面只做编排、调度、治理与可靠性守望，能力全部下沉到主流代码执行 CLI。",
    benefits: ["多角色协作与 DAG 任务调度", "可插拔执行体、模型池自动切换", "审批、预算与用量治理", "网页控制台与可靠性守望"],
  },
  {
    slug: "aideanthesis",
    name: "AideanThesis",
    displayName: "论文审查助手",
    category: "PARTNER",
    sortOrder: 40,
    badge: "开发中",
    tagline: "论文检测 / 质量控制 + AI 协作工作台",
    description:
      "面向高校与科研团队的一体化论文工作台：覆盖格式统一、语义检查、标注、查重、目录与文献流程。",
    benefits: ["查重与质量控制流程一体化", "知识库沉淀与引用管理", "AI 辅助审阅与修订建议", "多任务并行与审计留痕"],
  },
  {
    slug: "skillscloud",
    name: "SkillsCloud",
    displayName: "技能云",
    category: null,
    sortOrder: 50,
    badge: "规划中",
    tagline: "技能市场与云执行",
    description: "Agent 技能市场与云端执行沙箱：技能一键安装、云端沙箱运行、用量计费透明。",
    benefits: ["技能一键安装", "云端沙箱执行", "用量计费透明"],
  },
];
