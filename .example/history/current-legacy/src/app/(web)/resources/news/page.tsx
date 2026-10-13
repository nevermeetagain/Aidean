"use client";

import { BasicPage } from "@/components/common/BasicPage";
import { Calendar, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";

const NEWS_CATEGORIES = [
  { id: "all", name: "全部" },
  { id: "industry", name: "行业动态" },
  { id: "technology", name: "技术前沿" },
  { id: "product", name: "产品更新" },
  { id: "tutorial", name: "教程指南" },
];

const NEWS_LIST = [
  {
    id: "1",
    title: "GPT-4o发布：多模态能力全面升级",
    summary: "OpenAI发布GPT-4o，支持实时语音、图像和视频处理，响应速度提升2倍。",
    category: "industry",
    date: "2026-04-18",
    tags: ["GPT-4o", "OpenAI", "多模态"],
    image: "/images/news/gpt4o.jpg",
  },
  {
    id: "2",
    title: "Claude 3.5 Sonnet性能评测报告",
    summary: "深度评测Claude 3.5 Sonnet在代码生成、推理能力和长文本处理方面的表现。",
    category: "technology",
    date: "2026-04-15",
    tags: ["Claude", "Anthropic", "评测"],
    image: "/images/news/claude.jpg",
  },
  {
    id: "3",
    title: "Aidean平台V2.0版本更新公告",
    summary: "新增多模型对比评测功能，支持最多10个模型并行测试，优化天梯图展示。",
    category: "product",
    date: "2026-04-10",
    tags: ["更新", "功能"],
    image: "/images/news/update.jpg",
  },
  {
    id: "4",
    title: "如何选择适合业务场景的AI模型",
    summary: "从成本、性能、延迟等多维度分析，帮助企业选择最优的AI解决方案。",
    category: "tutorial",
    date: "2026-04-08",
    tags: ["教程", "选型"],
    image: "/images/news/tutorial.jpg",
  },
  {
    id: "5",
    title: "DeepSeek V3开源模型性能分析",
    summary: "国产开源大模型DeepSeek V3在多项基准测试中表现优异，成本优势明显。",
    category: "technology",
    date: "2026-04-05",
    tags: ["DeepSeek", "开源", "国产"],
    image: "/images/news/deepseek.jpg",
  },
  {
    id: "6",
    title: "2026年Q1 AI行业融资报告",
    summary: "一季度AI领域融资总额突破500亿美元，大模型和Agent赛道最受关注。",
    category: "industry",
    date: "2026-04-01",
    tags: ["融资", "行业报告"],
    image: "/images/news/finance.jpg",
  },
];

export default function NewsPage() {
  return (
    <BasicPage
      title="资讯中心"
      description="AI行业最新资讯、技术动态与趋势分析。"
      backHref="/resources"
      backLabel="返回资源中心"
    >
      <div className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cat.id === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {NEWS_LIST.map((news) => (
            <article
              key={news.id}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <span className="text-sm">新闻图片</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Calendar className="h-3 w-3" />
                  <span>{news.date}</span>
                  <span className="text-blue-600 font-medium">
                    {NEWS_CATEGORIES.find((c) => c.id === news.category)?.name}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {news.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {news.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500"
                      >
                        <Tag className="h-2 w-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/resources/news/${news.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    阅读
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex justify-center">
          <button className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            加载更多
          </button>
        </div>
      </div>
    </BasicPage>
  );
}
