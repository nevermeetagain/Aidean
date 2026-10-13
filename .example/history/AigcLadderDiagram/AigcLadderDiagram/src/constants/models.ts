/**
 * 模型相关常量
 */

// 模型类型
export const MODEL_TYPES = [
  { value: "llm", label: "大语言模型", icon: "MessageSquare" },
  { value: "multimodal", label: "多模态", icon: "Image" },
  { value: "embedding", label: "嵌入模型", icon: "Database" },
  { value: "asr", label: "语音识别", icon: "Mic" },
  { value: "tts", label: "语音合成", icon: "Volume2" },
  { value: "image", label: "图像生成", icon: "Palette" },
  { value: "video", label: "视频生成", icon: "Video" },
  { value: "code", label: "代码模型", icon: "Code" },
] as const;

// 模型能力标签
export const MODEL_CAPABILITIES = [
  "reasoning",
  "coding",
  "math",
  "knowledge",
  "multilingual",
  "long-context",
  "function-calling",
  "json-mode",
  "vision",
  "streaming",
] as const;

// 开源许可类型
export const LICENSE_TYPES = [
  { value: "apache-2.0", label: "Apache 2.0" },
  { value: "mit", label: "MIT" },
  { value: "gpl-3.0", label: "GPL 3.0" },
  { value: "llama-2", label: "Llama 2" },
  { value: "llama-3", label: "Llama 3" },
  { value: "qianwen", label: "通义千问" },
  { value: "commercial", label: "商业许可" },
  { value: "custom", label: "自定义" },
  { value: "closed", label: "闭源" },
] as const;

// API协议类型
export const API_PROTOCOLS = [
  { value: "openai", label: "OpenAI", color: "#10A37F" },
  { value: "anthropic", label: "Anthropic", color: "#D97757" },
  { value: "google", label: "Google", color: "#4285F4" },
  { value: "cohere", label: "Cohere", color: "#D2A679" },
  { value: "mistral", label: "Mistral", color: "#FF7000" },
  { value: "custom", label: "自定义", color: "#6B7280" },
] as const;

// 基准测试类型
export const BENCHMARK_TYPES = [
  { value: "mmlu", label: "MMLU", fullName: "Massive Multitask Language Understanding", description: "大规模多任务语言理解" },
  { value: "hellaswag", label: "HellaSwag", fullName: "Harder Endings, Longer Contexts, and Commonsense", description: "常识推理" },
  { value: "arc", label: "ARC", fullName: "AI2 Reasoning Challenge", description: "科学推理" },
  { value: "truthfulqa", label: "TruthfulQA", fullName: "Truthful Question Answering", description: "真实性问答" },
  { value: "humaneval", label: "HumanEval", fullName: "Human Evaluation for Code", description: "代码生成" },
  { value: "gsm8k", label: "GSM8K", fullName: "Grade School Math", description: "数学推理" },
  { value: "bbh", label: "BBH", fullName: "Big Bench Hard", description: "复杂任务" },
  { value: "gpqa", label: "GPQA", fullName: "Graduate-Level Google-Proof Q&A", description: "研究生级问答" },
] as const;

// 价格单位
export const PRICE_UNITS = [
  { value: "per_1k", label: "/1K Tokens" },
  { value: "per_1m", label: "/1M Tokens" },
  { value: "per_request", label: "/请求" },
] as const;

// 模型状态
export const MODEL_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEPRECATED: "deprecated",
  BETA: "beta",
  COMING_SOON: "coming_soon",
} as const;

// 上下文窗口大小选项
export const CONTEXT_WINDOW_OPTIONS = [
  "4K",
  "8K",
  "16K",
  "32K",
  "64K",
  "128K",
  "200K",
  "1M",
] as const;

// 参数规模选项
export const PARAMETER_SCALE_OPTIONS = [
  { value: "7B", label: "7B" },
  { value: "13B", label: "13B" },
  { value: "14B", label: "14B" },
  { value: "32B", label: "32B" },
  { value: "70B", label: "70B" },
  { value: "8x7B", label: "8x7B" },
  { value: "8x22B", label: "8x22B" },
  { value: "72B", label: "72B" },
  { value: "110B", label: "110B" },
  { value: "405B", label: "405B" },
  { value: "591B", label: "591B" },
] as const;
