// 一次性种子：Product 矩阵（5 行）+ dev PartnerKey。
// 同步契约（add-subplatform-showcase-pages）：productsSeed 与 prisma/seed.ts §6 完全一致；
// wechatrag slug ↔ 显示名 AideanBot 映射登记于 docs/specs/add-subplatform-showcase-pages/spec.md。
import { PrismaClient, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const productsSeed = [
  { slug: "aideanwiki", name: "AideanWiki", displayName: "独立知识百科", category: "PARTNER", tagline: "知识库个人版免费可用", badge: "已上线", sortOrder: 10,
    description: "Aidean 知识库产品：个人版免费可用，多源文档一键入库与检索问答；团队版权益与定价明细整理中，详见价格页产品权益分区。",
    benefits: ["个人版免费可用", "多源知识库检索", "团队版协作（规划中）"],
    // enrich-subplatform-intro-pages：仅注入有事实源的区块；产品入口链接待正式域名后由运营配置（#65）
    intro: {
      version: 2,
      audience: "需要把多来源、多格式资料沉淀为可检索可问答的库的个人与团队",
      problems: [
        { problem: "文档散在多种格式与来源里，想找时搜不到", solution: "多源文档一键入库同一个库，统一检索与问答" },
        { problem: "个人工具怕收费，用不久", solution: "个人版免费可用；团队版按权益计（明细整理中）" },
      ],
    } },
  { slug: "wechatrag", name: "AideanBot", displayName: "信源引擎机器人", category: "OFFERING", tagline: "信息源 → 知识库 → 机器人闭环（生态内亦称 WeChatRag）", badge: "内测中", sortOrder: 20,
    description: "以微信公众号为核心的知识库机器人平台：向机器人发送公众号链接即构建知识库并自动更新、即时生效；纳入范围由订阅策略决定（账号全部文章 / 单篇文章），机器人支持后台主动推送，后续将扩展更多图文与视频内容源。",
    benefits: ["公众号链接即传即建知识库", "订阅策略自动更新、即时生效", "机器人多端问答、引用可溯源", "主平台账号统一登录"],
    // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §2；仓库实测 404，链接按管理者默认规则指组织页
    intro: {
      version: 2,
      links: [{ label: "GitHub 组织", url: "https://github.com/aideanew", kind: "repo" }],
      audience: "需要长期沉淀微信公众号内容、并能随手检索复用的人和团队",
      problems: [
        { problem: "公众号文章散在收藏夹与聊天记录里，用时搜不到", solution: "链接发给机器人即入库，随问随答" },
        { problem: "账号在不断更新，人工存档的副本很快就过期", solution: "订阅账号全部文章，增量自动同步、回答即时生效" },
        { problem: "回答引文对不上原文，原图又因防盗链打不开", solution: "回答附原文卡片溯源，防盗链图片在库内可直接查看" },
        { problem: "每换一个端都要重新注册登录、门槛高", solution: "与 Aidean 主平台账号统一登录，网页与机器人多端共用" },
      ],
      workflow: {
        title: "一条链接到可用的知识库",
        steps: [
          "把公众号文章或账号链接发给机器人",
          "按订阅策略选择入库范围：账号全部文章，或单篇独立入库",
          "系统自动解析入库，原图经防盗链处理后可直接查看",
          "随时向机器人提问，回答附原文引用与溯源卡片",
          "账号后续更新自动同步进库，无需人工维护",
        ],
      },
      promises: [
        "全栈私有部署，知识库数据留在自有环境",
        "敏感凭据加密落库（AES-256-GCM）",
      ],
      ecosystem: [
        "与 Aidean 主平台账号统一登录（SSO 已接入）",
        "已接入主平台统一计费网关",
        "内容源扩展规划：抖音、B 站、小红书等图文与视频账号",
      ],
      facts: [
        { group: "交付", items: [{ label: "交付形态", value: "Docker Compose 全栈部署" }, { label: "账号体系", value: "主平台统一登录" }] },
      ],
    } },
  { slug: "aideanfleet", name: "AideanFleet", displayName: "自动化舰队引擎", category: "OPEN_SOURCE", tagline: "薄控制面 + 可插拔执行体的自动化执行器", badge: "迭代中", sortOrder: 30,
    description: "本地优先的自动化任务编排工具：控制面只做编排、调度、治理与可靠性守望，能力全部下沉到主流代码执行 CLI；内置网页控制台、审批与预算治理、多模型池优先级容错，零外部服务依赖。",
    benefits: ["多角色协作与 DAG 任务调度", "可插拔执行体、模型池自动切换", "审批、预算与用量治理", "网页控制台与可靠性守望"],
    // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §3；Fleet 仓库公开，保留直链
    intro: {
      version: 2,
      links: [{ label: "GitHub 仓库", url: "https://github.com/aideanew/AideanFleet", kind: "repo" }],
      audience: "希望把多个 AI 编码智能体组织起来、可靠交付长任务的工程团队",
      problems: [
        { problem: "长任务无人值守几小时，AI 中途跑偏没人知道", solution: "十状态状态机逐步推进，任务卡住自动监测、挂起等待人工决策" },
        { problem: "AI 产出门禁质量不一，不敢直接合并", solution: "机器门禁与独立评审角色自动验收，不合格打回返工" },
        { problem: "权限与预算失控，成本容易爆炸", solution: "内置审批、预算与用量治理，每笔消耗可见可追责" },
        { problem: "换个模型供应商就得重搭工作流", solution: "多模型池按优先级尝试，额度耗尽或故障即时切换" },
      ],
      workflow: {
        title: "从一条需求到有监督的交付",
        steps: [
          "把需求整理成任务包（TaskPack 契约），注册项目开工",
          "Manager 自动拆解派工，前端 / 后端 / 数据等角色并行执行",
          "机器门禁与评审角色自动判定通过或返工，结果归档",
          "网页控制台全程监督事件、进度与消耗，断点可恢复守望",
        ],
      },
      promises: [
        "项目根白名单沙箱，智能体无法写到任意路径",
        "密钥永不入仓，运行期才注入环境",
        "追加式事件日志，全程操作可审计回溯",
      ],
      ecosystem: [
        "开源仓库，GitHub 直接查看与取用代码",
        "主流编码 CLI 执行体即插即用，多适配器可扩展",
        "零外部服务依赖，单机即可完整运转",
      ],
      facts: [
        { group: "交付", items: [{ label: "交付形态", value: "本地单机控制台工具" }, { label: "数据存储", value: "本地文件库，无需云服务" }] },
      ],
    } },
  { slug: "aideanthesis", name: "AideanThesis", displayName: "论文审查助手", category: "PARTNER", tagline: "论文检测 / 质量控制 + AI 协作工作台", badge: "开发中", sortOrder: 40,
    description: "面向高校与科研团队的一体化论文工作台：覆盖格式统一、语义检查、标注、查重、目录与文献流程，论文资产沉淀于知识库，支持 AI 辅助审阅与修订、多任务并行。",
    benefits: ["查重与质量控制流程一体化", "知识库沉淀与引用管理", "AI 辅助审阅与修订建议", "多任务并行与审计留痕"],
    // v2 三层内容事实源：docs/product/modules/子平台规范说明.md §4 与既有产品口径；仓库实测 404，按默认规则改指组织页
    intro: {
      version: 2,
      links: [{ label: "GitHub 组织", url: "https://github.com/aideanew", kind: "repo" }],
      audience: "高校师生与科研团队——覆盖论文从成稿到定稿的全过程",
      problems: [
        { problem: "各校格式规范不同，排版总要到截止前重排一遍", solution: "格式检查与统一按学校规范自适应" },
        { problem: "查重工具与降重平台来回换，改后文字生硬走样", solution: "查重与降重改写同工作台完成，改写保持语义并留修改建议" },
        { problem: "AI 评审只有笼统印象，不知从何改起", solution: "章节级结构化批注与修订建议，逐条可操作" },
        { problem: "论文与资料散在网盘邮箱，版本失控", solution: "沉淀进知识库，引用互链、全程留痕可追溯" },
      ],
      workflow: {
        title: "从初稿到符合规范的定稿",
        steps: [
          "上传论文，选择学校与学位类型",
          "查重与格式检查一次跑完，报告定位到问题句",
          "AI 给审阅与修订建议，人来逐条决定采纳",
          "师生共批注、目录与文献互链，导出定稿",
        ],
      },
      promises: [
        "AI 只做辅助：每一处修改保留人工最终确认",
        "全流程操作日志留痕，审阅过程可审计",
        "私有部署：论文数据放在自己的环境里",
      ],
      ecosystem: [
        "账号体系规划与 Aidean 主平台统一打通",
        "论文资产沉淀知识库，可生态内持续复用",
      ],
      facts: [
        { group: "交付", items: [{ label: "交付形态", value: "Docker Compose 全栈" }, { label: "账号体系", value: "规划接入主平台统一登录" }] },
      ],
    } },
  { slug: "skillscloud", name: "SkillsCloud", displayName: "技能云", category: null, tagline: "技能市场与云执行", badge: "规划中", sortOrder: 50,
    description: "Agent 技能市场与云端执行沙箱：技能一键安装、云端沙箱运行、用量计费透明。",
    benefits: ["技能一键安装", "云端沙箱执行", "用量计费透明"],
    intro: null },
];
for (const p of productsSeed) {
  await prisma.product.upsert({
    where: { slug: p.slug },
    update: { name: p.name, displayName: p.displayName, category: p.category, tagline: p.tagline, badge: p.badge, description: p.description, benefits: p.benefits, intro: p.intro ?? Prisma.DbNull, sortOrder: p.sortOrder },
    create: { ...p },
  });
}
console.log("products:", await prisma.product.count(), "(expect 5)");

const partnerPlain = "ak_dev_aidean_local_0123456789abcdef";
const partnerHash = createHash("sha256").update(partnerPlain).digest("hex");
await prisma.partnerKey.upsert({
  where: { keyHash: partnerHash },
  update: { isActive: true },
  create: { name: "dev-local", keyHash: partnerHash, prefix: partnerPlain.slice(0, 8), isActive: true },
});
const seededKey = await prisma.partnerKey.findUnique({ where: { keyHash: partnerHash } });
console.log(`PartnerKey prefix=${seededKey?.prefix} plain=${partnerPlain} hashOk=${seededKey?.keyHash === partnerHash}`);
console.log("partner_keys:", await prisma.partnerKey.count());
await prisma.$disconnect();
