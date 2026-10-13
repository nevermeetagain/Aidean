import { z } from "zod";

/** Browser-only media: no proxy/optimizer/server fetch. Local files must live under /images or /media. */
export function isSafeMediaUrl(value: string, kind: "image" | "video" = "image"): boolean {
  if (!value || value.length > 500 || /[\s\\\u0000-\u001f\u007f]/.test(value) || /%2e|%2f|%5c/i.test(value)) return false;
  let path: string;
  if (value.startsWith("/")) {
    if (!/^\/(images|media)\/[a-zA-Z0-9_./-]+$/.test(value) || value.split("/").some((p) => p === "." || p === "..")) return false;
    path = value;
  } else {
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname) return false;
      path = url.pathname;
    } catch { return false; }
  }
  return (kind === "image" ? /\.(png|jpe?g|webp|gif|avif)$/i : /\.(mp4|webm)$/i).test(path);
}
const media = (kind: "image" | "video") => z.string().trim().max(500).refine((v) => v === "" || isSafeMediaUrl(v, kind), "媒体须为 http(s) 或 /images/、/media/ 安全路径；图片 PNG/JPEG/WebP/GIF/AVIF，视频 MP4/WebM（URL ≤500 字）");
export const PartnerContentSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  coverUrl: media("image"),
  images: z.array(media("image").refine(Boolean, "图片 URL 不能为空")).max(6),
  notes: z.string().trim().max(1000),
  videoUrl: media("video"),
}).strict();
export type PartnerContent = z.infer<typeof PartnerContentSchema>;
export const PARTNER_CONFIG_KEYS = ["partners.education", "partners.paper", "partners.research"] as const;
export const PARTNER_DEFAULTS: PartnerContent[] = [
  {
    enabled: true,
    title: "学历助手",
    subtitle: "AI 驱动的学历提升助手",
    description: "从选课规划到考前复习，结合个人学习进度智能推荐路径。支持多模型切换，用最适合的 AI 模型解答不同学科的问题，让学习效率翻倍。",
    coverUrl: "/images/partners/education-cover.webp",
    images: [],
    notes: "支持文科、理科、工科等多学科场景；具体服务范围与使用条款以实际沟通确认为准。",
    videoUrl: "",
  },
  {
    enabled: true,
    title: "论文辅导",
    subtitle: "学术写作与论文审查",
    description: "从选题到定稿全流程辅助：文献检索、大纲生成、段落润色、格式规范、查重预检。多模型协同工作，推理模型搭框架，快速模型做润色。",
    coverUrl: "/images/partners/paper-cover.webp",
    images: [],
    notes: "适用于本科毕业论文至期刊投稿；具体服务范围与使用条款以实际沟通确认为准。",
    videoUrl: "",
  },
  {
    enabled: true,
    title: "科研知识库",
    subtitle: "团队科研知识管理",
    description: "把零散的论文、笔记、数据统一存到一个可搜索的知识库里。支持引用溯源、多源交叉验证，让团队的研究成果不再散落各处。",
    coverUrl: "/images/partners/research-cover.webp",
    images: [],
    notes: "兼容 RagFlow 知识引擎；具体服务范围与使用条款以实际沟通确认为准。",
    videoUrl: "",
  },
];
export function parsePartnerContent(value: string | undefined, index: number): PartnerContent {
  try { return PartnerContentSchema.parse(JSON.parse(value ?? "")); }
  catch { return PARTNER_DEFAULTS[index] ?? PARTNER_DEFAULTS[0]!; }
}
