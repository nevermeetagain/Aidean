export type DemoVendor =
  | "OpenAI"
  | "Anthropic"
  | "Google"
  | "xAI"
  | "字节跳动"
  | "百度"
  | "智谱"
  | "阿里"
  | "MiniMax"
  | "深度求索"
  | "月之暗面"
  | "零一万物"
  | "商汤"
  | "科大讯飞"
  | "微软"
  | "Meta"
  | "Mistral";

export type DemoModelType = "对话" | "推理" | "多模态" | "代码" | "视觉" | "语音";
export type DemoProtocol = "API" | "开源" | "闭源" | "混合";

export type DemoModel = {
  id: string;
  name: string;
  vendor: DemoVendor;
  type: DemoModelType;
  protocol: DemoProtocol;
  score: number;
  contextK: number;
  speed: number;
  price: number;
  openSource: boolean;
  tags: string[];
  summary: string;
  highlights: string[];
};

export const DEMO_VENDORS: DemoVendor[] = [
  "OpenAI", "Anthropic", "Google", "xAI", "字节跳动", "百度",
  "智谱", "阿里", "MiniMax", "深度求索", "月之暗面", "零一万物",
  "商汤", "科大讯飞", "微软", "Meta", "Mistral"
];

export const DEMO_TYPES: DemoModelType[] = ["对话", "推理", "多模态", "代码", "视觉", "语音"];
export const DEMO_PROTOCOLS: DemoProtocol[] = ["API", "开源", "闭源", "混合"];
export const DEMO_TAGS = [
  "多模态", "推理", "对话", "性价比", "长上下文", "开源", "中文",
  "代码生成", "Agent", "RAG", "视觉理解", "语音交互", "数学", "逻辑"
] as const;

export const DEMO_MODELS: DemoModel[] = [
  // === OpenAI ===
  { id: "gpt-4o", name: "GPT-4o", vendor: "OpenAI", type: "多模态", protocol: "API", score: 92.4, contextK: 128, speed: 78, price: 25, openSource: false, tags: ["多模态", "对话"], summary: "偏全能的多模态对话模型，适合通用助手与内容生成。", highlights: ["多模态理解", "对话稳定", "生态成熟"] },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", vendor: "OpenAI", type: "推理", protocol: "API", score: 90.8, contextK: 128, speed: 55, price: 35, openSource: false, tags: ["对话", "推理"], summary: "GPT-4 增强版，推理与代码能力更强。", highlights: ["推理", "代码", "多模态"] },
  { id: "gpt-4", name: "GPT-4", vendor: "OpenAI", type: "推理", protocol: "API", score: 89.5, contextK: 32, speed: 45, price: 60, openSource: false, tags: ["推理", "对话"], summary: "OpenAI 旗舰推理模型。", highlights: ["推理强", "代码", "安全"] },
  { id: "gpt-35-turbo", name: "GPT-3.5 Turbo", vendor: "OpenAI", type: "对话", protocol: "API", score: 82.1, contextK: 16, speed: 90, price: 5, openSource: false, tags: ["对话", "性价比"], summary: "经济实惠的对话模型。", highlights: ["快速", "便宜", "稳定"] },
  { id: "o1-preview", name: "o1 Preview", vendor: "OpenAI", type: "推理", protocol: "API", score: 93.1, contextK: 128, speed: 30, price: 50, openSource: false, tags: ["推理", "数学", "逻辑"], summary: "OpenAI 推理旗舰，擅长复杂推理。", highlights: ["深度推理", "数学", "代码"] },
  { id: "o1-mini", name: "o1 Mini", vendor: "OpenAI", type: "推理", protocol: "API", score: 88.7, contextK: 128, speed: 60, price: 15, openSource: false, tags: ["推理", "性价比"], summary: "o1 轻量版，推理性价比之选。", highlights: ["推理", "性价比", "快速"] },

  // === Anthropic ===
  { id: "claude-opus", name: "Claude 3 Opus", vendor: "Anthropic", type: "推理", protocol: "API", score: 91.1, contextK: 200, speed: 61, price: 30, openSource: false, tags: ["对话", "推理"], summary: "强调推理与长文本质量，适合复杂写作、分析与代码协作。", highlights: ["推理", "长文", "写作质量"] },
  { id: "claude-sonnet", name: "Claude 3.5 Sonnet", vendor: "Anthropic", type: "对话", protocol: "API", score: 90.2, contextK: 200, speed: 72, price: 15, openSource: false, tags: ["对话", "推理", "性价比"], summary: "Claude 系列性价比之选，速度与质量均衡。", highlights: ["性价比", "代码", "推理"] },
  { id: "claude-haiku", name: "Claude 3 Haiku", vendor: "Anthropic", type: "对话", protocol: "API", score: 83.5, contextK: 200, speed: 95, price: 3, openSource: false, tags: ["对话", "性价比"], summary: "极速对话模型，适合高频调用。", highlights: ["快速", "便宜", "对话"] },
  { id: "claude-35-sonnet", name: "Claude 3.5 Sonnet v2", vendor: "Anthropic", type: "推理", protocol: "API", score: 91.8, contextK: 200, speed: 68, price: 15, openSource: false, tags: ["推理", "代码", "对话"], summary: "Claude 3.5 Sonnet 升级版，代码能力显著提升。", highlights: ["代码", "推理", "多模态"] },

  // === Google ===
  { id: "gemini-15", name: "Gemini 1.5 Pro", vendor: "Google", type: "多模态", protocol: "API", score: 89.3, contextK: 1000, speed: 52, price: 18, openSource: false, tags: ["长上下文", "多模态"], summary: "以超长上下文见长，适合资料型问答、长文档检索与摘要。", highlights: ["超长上下文", "多模态", "工具链"] },
  { id: "gemini-15-flash", name: "Gemini 1.5 Flash", vendor: "Google", type: "多模态", protocol: "API", score: 85.6, contextK: 1000, speed: 85, price: 7, openSource: false, tags: ["多模态", "性价比"], summary: "Gemini 轻量版，快速多模态处理。", highlights: ["快速", "多模态", "便宜"] },
  { id: "gemini-20", name: "Gemini 2.0 Flash", vendor: "Google", type: "多模态", protocol: "API", score: 91.5, contextK: 1000, speed: 80, price: 10, openSource: false, tags: ["多模态", "推理"], summary: "Google 最新多模态旗舰。", highlights: ["多模态", "推理", "快速"] },
  { id: "gemma-7b", name: "Gemma 7B", vendor: "Google", type: "对话", protocol: "开源", score: 78.2, contextK: 8, speed: 70, price: 0, openSource: true, tags: ["开源", "对话"], summary: "Google 开源轻量对话模型。", highlights: ["开源", "轻量", "免费"] },

  // === xAI ===
  { id: "grok-2", name: "Grok 2", vendor: "xAI", type: "对话", protocol: "API", score: 88.9, contextK: 128, speed: 65, price: 20, openSource: false, tags: ["对话", "推理"], summary: "xAI 旗舰对话模型。", highlights: ["对话", "幽默", "实时"] },
  { id: "grok-2-mini", name: "Grok 2 Mini", vendor: "xAI", type: "对话", protocol: "API", score: 84.2, contextK: 128, speed: 80, price: 8, openSource: false, tags: ["对话", "性价比"], summary: "Grok 轻量版。", highlights: ["快速", "对话", "便宜"] },

  // === 字节跳动 ===
  { id: "doubao-4", name: "豆包 4.0", vendor: "字节跳动", type: "对话", protocol: "API", score: 88.2, contextK: 128, speed: 73, price: 9, openSource: false, tags: ["性价比", "对话"], summary: "更适合高频调用与大规模应用场景的成本敏感型选择。", highlights: ["性价比", "吞吐", "工程化"] },
  { id: "doubao-pro", name: "豆包 Pro", vendor: "字节跳动", type: "推理", protocol: "API", score: 86.5, contextK: 128, speed: 60, price: 15, openSource: false, tags: ["推理", "对话"], summary: "豆包推理增强版。", highlights: ["推理", "中文", "性价比"] },
  { id: "doubao-lite", name: "豆包 Lite", vendor: "字节跳动", type: "对话", protocol: "API", score: 80.1, contextK: 32, speed: 90, price: 3, openSource: false, tags: ["对话", "性价比"], summary: "豆包轻量版，适合快速对话。", highlights: ["快速", "便宜", "对话"] },

  // === 百度 ===
  { id: "ernie-4", name: "文心一言 4.0", vendor: "百度", type: "对话", protocol: "API", score: 86.7, contextK: 128, speed: 55, price: 12, openSource: false, tags: ["中文", "对话"], summary: "中文任务表现稳健，适合中文内容、办公与知识问答。", highlights: ["中文", "对话", "知识问答"] },
  { id: "ernie-35", name: "文心一言 3.5", vendor: "百度", type: "对话", protocol: "API", score: 82.3, contextK: 128, speed: 65, price: 6, openSource: false, tags: ["中文", "性价比"], summary: "文心性价比之选。", highlights: ["中文", "便宜", "稳定"] },

  // === 智谱 ===
  { id: "glm-4", name: "GLM-4", vendor: "智谱", type: "推理", protocol: "API", score: 85.9, contextK: 128, speed: 60, price: 8, openSource: false, tags: ["中文", "推理"], summary: "智谱自研大模型，中文理解与生成能力优秀。", highlights: ["中文理解", "推理", "性价比"] },
  { id: "glm-4-plus", name: "GLM-4 Plus", vendor: "智谱", type: "推理", protocol: "API", score: 87.8, contextK: 128, speed: 55, price: 12, openSource: false, tags: ["中文", "推理"], summary: "GLM-4 增强版。", highlights: ["推理", "中文", "代码"] },
  { id: "glm-4-air", name: "GLM-4 Air", vendor: "智谱", type: "对话", protocol: "API", score: 81.5, contextK: 128, speed: 80, price: 4, openSource: false, tags: ["对话", "性价比"], summary: "GLM 轻量快速版。", highlights: ["快速", "便宜", "对话"] },
  { id: "chatglm3", name: "ChatGLM3-6B", vendor: "智谱", type: "对话", protocol: "开源", score: 76.8, contextK: 8, speed: 65, price: 0, openSource: true, tags: ["开源", "中文", "对话"], summary: "智谱开源对话模型。", highlights: ["开源", "中文", "免费"] },

  // === 阿里 ===
  { id: "qwen-max", name: "Qwen-Max", vendor: "阿里", type: "对话", protocol: "API", score: 87.5, contextK: 32, speed: 68, price: 10, openSource: false, tags: ["对话", "性价比"], summary: "阿里通义千问旗舰模型，综合能力均衡。", highlights: ["综合能力", "代码生成", "多语言"] },
  { id: "qwen-plus", name: "Qwen-Plus", vendor: "阿里", type: "对话", protocol: "API", score: 85.2, contextK: 32, speed: 75, price: 6, openSource: false, tags: ["对话", "性价比"], summary: "Qwen 均衡版。", highlights: ["均衡", "性价比", "中文"] },
  { id: "qwen-turbo", name: "Qwen-Turbo", vendor: "阿里", type: "对话", protocol: "API", score: 80.8, contextK: 8, speed: 92, price: 2, openSource: false, tags: ["对话", "性价比"], summary: "Qwen 极速版。", highlights: ["快速", "便宜", "对话"] },
  { id: "qwen25-72b", name: "Qwen2.5-72B", vendor: "阿里", type: "推理", protocol: "开源", score: 89.1, contextK: 128, speed: 40, price: 0, openSource: true, tags: ["开源", "推理", "中文"], summary: "阿里最强开源推理模型。", highlights: ["开源", "推理", "免费"] },

  // === MiniMax ===
  { id: "minimax-abab", name: "MiniMax Abab 6", vendor: "MiniMax", type: "对话", protocol: "API", score: 84.3, contextK: 245, speed: 45, price: 6, openSource: false, tags: ["长上下文", "对话"], summary: "超长上下文处理能力强，适合长文本分析场景。", highlights: ["长上下文", "对话", "性价比"] },
  { id: "minimax-abab55", name: "MiniMax Abab 5.5", vendor: "MiniMax", type: "对话", protocol: "API", score: 81.7, contextK: 128, speed: 55, price: 4, openSource: false, tags: ["对话", "性价比"], summary: "MiniMax 上一代模型。", highlights: ["对话", "便宜", "中文"] },

  // === 深度求索 ===
  { id: "deepseek-v3", name: "DeepSeek V3", vendor: "深度求索", type: "推理", protocol: "API", score: 90.5, contextK: 128, speed: 62, price: 8, openSource: false, tags: ["推理", "代码", "性价比"], summary: "深度求索最新旗舰，代码能力突出。", highlights: ["代码", "推理", "性价比"] },
  { id: "deepseek-r1", name: "DeepSeek R1", vendor: "深度求索", type: "推理", protocol: "开源", score: 91.3, contextK: 128, speed: 35, price: 0, openSource: true, tags: ["开源", "推理", "数学"], summary: "深度求索开源推理旗舰。", highlights: ["开源", "推理", "数学"] },
  { id: "deepseek-coder", name: "DeepSeek Coder V2", vendor: "深度求索", type: "代码", protocol: "开源", score: 88.4, contextK: 128, speed: 50, price: 0, openSource: true, tags: ["开源", "代码"], summary: "专注代码生成的开源模型。", highlights: ["代码", "开源", "免费"] },

  // === 月之暗面 ===
  { id: "kimi-k2", name: "Kimi K2", vendor: "月之暗面", type: "对话", protocol: "API", score: 86.1, contextK: 2000, speed: 48, price: 10, openSource: false, tags: ["长上下文", "对话"], summary: "月之暗面旗舰，超长上下文处理。", highlights: ["超长上下文", "对话", "中文"] },
  { id: "kimi-moonshot", name: "Moonshot V1", vendor: "月之暗面", type: "对话", protocol: "API", score: 83.7, contextK: 1000, speed: 55, price: 7, openSource: false, tags: ["长上下文", "中文"], summary: "月之暗面基础模型。", highlights: ["长上下文", "中文", "性价比"] },

  // === 零一万物 ===
  { id: "yi-large", name: "Yi-Large", vendor: "零一万物", type: "推理", protocol: "API", score: 87.2, contextK: 128, speed: 58, price: 12, openSource: false, tags: ["推理", "中文"], summary: "零一万物旗舰推理模型。", highlights: ["推理", "中文", "代码"] },
  { id: "yi-medium", name: "Yi-Medium", vendor: "零一万物", type: "对话", protocol: "API", score: 83.9, contextK: 128, speed: 70, price: 6, openSource: false, tags: ["对话", "性价比"], summary: "Yi 均衡版。", highlights: ["均衡", "性价比", "中文"] },
  { id: "yi-vision", name: "Yi-Vision", vendor: "零一万物", type: "视觉", protocol: "API", score: 85.4, contextK: 32, speed: 50, price: 15, openSource: false, tags: ["视觉", "多模态"], summary: "Yi 视觉理解模型。", highlights: ["视觉", "多模态", "识别"] },

  // === 商汤 ===
  { id: "sensechat-5", name: "SenseChat 5.0", vendor: "商汤", type: "对话", protocol: "API", score: 84.6, contextK: 128, speed: 60, price: 10, openSource: false, tags: ["对话", "中文"], summary: "商汤最新对话模型。", highlights: ["中文", "对话", "视觉"] },
  { id: "sensechat-4", name: "SenseChat 4.0", vendor: "商汤", type: "对话", protocol: "API", score: 81.2, contextK: 32, speed: 70, price: 6, openSource: false, tags: ["对话", "性价比"], summary: "商汤上一代模型。", highlights: ["对话", "便宜", "中文"] },

  // === 科大讯飞 ===
  { id: "spark-max", name: "Spark Max", vendor: "科大讯飞", type: "对话", protocol: "API", score: 85.8, contextK: 128, speed: 62, price: 10, openSource: false, tags: ["对话", "中文", "语音"], summary: "科大讯飞旗舰对话模型，语音交互能力强。", highlights: ["语音", "中文", "对话"] },
  { id: "spark-pro", name: "Spark Pro", vendor: "科大讯飞", type: "对话", protocol: "API", score: 82.5, contextK: 32, speed: 72, price: 5, openSource: false, tags: ["对话", "性价比"], summary: "科大讯飞性价比之选。", highlights: ["性价比", "中文", "语音"] },

  // === 微软 ===
  { id: "phi-4", name: "Phi-4", vendor: "微软", type: "推理", protocol: "开源", score: 83.1, contextK: 16, speed: 85, price: 0, openSource: true, tags: ["开源", "推理", "代码"], summary: "微软小型推理模型，效率极高。", highlights: ["开源", "轻量", "推理"] },
  { id: "phi-35", name: "Phi-3.5", vendor: "微软", type: "对话", protocol: "开源", score: 79.5, contextK: 16, speed: 90, price: 0, openSource: true, tags: ["开源", "对话"], summary: "微软轻量对话模型。", highlights: ["开源", "快速", "免费"] },

  // === Meta ===
  { id: "llama31-405b", name: "Llama 3.1 405B", vendor: "Meta", type: "推理", protocol: "开源", score: 89.7, contextK: 128, speed: 30, price: 0, openSource: true, tags: ["开源", "推理"], summary: "Meta 最强开源模型。", highlights: ["开源", "推理", "免费"] },
  { id: "llama31-70b", name: "Llama 3.1 70B", vendor: "Meta", type: "推理", protocol: "开源", score: 86.3, contextK: 128, speed: 50, price: 0, openSource: true, tags: ["开源", "推理"], summary: "Meta 中型开源推理模型。", highlights: ["开源", "推理", "均衡"] },
  { id: "llama31-8b", name: "Llama 3.1 8B", vendor: "Meta", type: "对话", protocol: "开源", score: 77.8, contextK: 8, speed: 88, price: 0, openSource: true, tags: ["开源", "对话"], summary: "Meta 轻量开源模型。", highlights: ["开源", "快速", "免费"] },

  // === Mistral ===
  { id: "mistral-large", name: "Mistral Large 2", vendor: "Mistral", type: "推理", protocol: "API", score: 87.9, contextK: 128, speed: 55, price: 15, openSource: false, tags: ["推理", "多语言"], summary: "Mistral 旗舰推理模型。", highlights: ["推理", "多语言", "代码"] },
  { id: "mistral-medium", name: "Mistral Medium", vendor: "Mistral", type: "对话", protocol: "API", score: 83.4, contextK: 128, speed: 68, price: 8, openSource: false, tags: ["对话", "性价比"], summary: "Mistral 均衡版。", highlights: ["均衡", "性价比", "多语言"] },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", vendor: "Mistral", type: "推理", protocol: "开源", score: 85.1, contextK: 64, speed: 55, price: 0, openSource: true, tags: ["开源", "推理"], summary: "Mistral 开源 MoE 模型。", highlights: ["开源", "MoE", "推理"] },
];

export function getDemoModelById(id: string) {
  return DEMO_MODELS.find((m) => m.id === id) ?? null;
}

export function getVendorColor(vendor: DemoVendor): string {
  const colors: Record<DemoVendor, string> = {
    "OpenAI": "#000000", "Anthropic": "#1C1F23", "Google": "#4285F4",
    "xAI": "#FF4444", "字节跳动": "#3859FF", "百度": "#2932DF",
    "智谱": "#6366F1", "阿里": "#FF6A00", "MiniMax": "#10B981",
    "深度求索": "#8B5CF6", "月之暗面": "#EC4899", "零一万物": "#F59E0B",
    "商汤": "#EF4444", "科大讯飞": "#06B6D4", "微软": "#00A4EF",
    "Meta": "#0668E1", "Mistral": "#FF6B35"
  };
  return colors[vendor] || "#6B7280";
}

export function getVendorBg(vendor: DemoVendor): string {
  const colors: Record<DemoVendor, string> = {
    "OpenAI": "bg-gray-900", "Anthropic": "bg-stone-800", "Google": "bg-blue-500",
    "xAI": "bg-red-500", "字节跳动": "bg-indigo-600", "百度": "bg-blue-700",
    "智谱": "bg-indigo-500", "阿里": "bg-orange-500", "MiniMax": "bg-emerald-500",
    "深度求索": "bg-violet-500", "月之暗面": "bg-pink-500", "零一万物": "bg-amber-500",
    "商汤": "bg-red-500", "科大讯飞": "bg-cyan-500", "微软": "bg-sky-500",
    "Meta": "bg-blue-600", "Mistral": "bg-orange-500"
  };
  return colors[vendor] || "bg-gray-500";
}
