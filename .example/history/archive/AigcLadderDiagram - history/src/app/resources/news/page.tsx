"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, NewsCard, ToolGrid } from "@/components/resources";
import { useTranslations } from "@/i18n/useTranslations";

// Mock data for AI news
const NEWS_DATA = [
  {
    id: "1",
    title: "OpenAI releases GPT-5: significant leap in reasoning capabilities",
    summary: "OpenAI officially released GPT-5 today, demonstrating unprecedented reasoning capabilities in complex tasks. The new model shows significant improvement in mathematical reasoning, code generation, and long-context understanding.",
    category: "tech breakthrough",
    publishedAt: "2026-04-08",
    source: "OpenAI Blog",
    imageUrl: "/images/banners/reference1.webp",
  },
  {
    id: "2",
    title: "Anthropic launches Claude 4: safer and more controllable",
    summary: "Anthropic released Claude 4, focusing on safety and controllability. The new version introduces advanced interpretability features, allowing developers to better understand model decision-making processes.",
    category: "product release",
    publishedAt: "2026-04-07",
    source: "Anthropic",
    imageUrl: "/images/banners/reference2.webp",
  },
  {
    id: "3",
    title: "Google DeepMind achieves breakthrough in protein structure prediction",
    summary: "Google DeepMind's AlphaFold 3 can now predict protein complex structures with near-experimental accuracy, expected to accelerate drug discovery and biological research.",
    category: "tech breakthrough",
    publishedAt: "2026-04-06",
    source: "Nature",
  },
  {
    id: "4",
    title: "China releases new AI regulatory policy: promoting healthy industry development",
    summary: "The Cyberspace Administration of China released new AI regulatory guidelines, emphasizing security reviews for AI-generated content and algorithm transparency, while encouraging innovation.",
    category: "policy",
    publishedAt: "2026-04-05",
    source: "Xinhua News",
  },
  {
    id: "5",
    title: "Microsoft integrates Copilot deeply into Windows 12",
    summary: "Microsoft announced deep integration of AI assistant Copilot in Windows 12, supporting natural language control of system features, file management, and application interactions.",
    category: "product release",
    publishedAt: "2026-04-04",
    source: "Microsoft Blog",
    imageUrl: "/images/banners/reference3.webp",
  },
  {
    id: "6",
    title: "AI chip market size exceeds $100 billion",
    summary: "According to latest market research reports, the global AI chip market size has exceeded $100 billion, with NVIDIA, AMD, and Intel leading the market. China's domestic AI chip industry is also growing rapidly.",
    category: "industry news",
    publishedAt: "2026-04-03",
    source: "Gartner",
  },
  {
    id: "7",
    title: "Meta open-sources Llama 4: community welcomes",
    summary: "Meta open-sourced Llama 4, featuring 400B parameters with performance close to GPT-4. The open-source community welcomes this, with multiple projects already starting integration.",
    category: "tech breakthrough",
    publishedAt: "2026-04-02",
    source: "Meta AI",
    imageUrl: "/images/banners/reference4.webp",
  },
  {
    id: "8",
    title: "AI programming assistant market competition intensifies",
    summary: "AI programming assistants like GitHub Copilot, Cursor, and Claude Code are fiercely competing. New players continue to enter the market, driving rapid feature iteration.",
    category: "industry news",
    publishedAt: "2026-04-01",
    source: "TechCrunch",
  },
  {
    id: "9",
    title: "EU AI Act officially takes effect: global impact",
    summary: "The EU AI Act officially takes effect, establishing strict regulatory requirements for high-risk AI applications. Global tech companies are adjusting products to comply with new regulations.",
    category: "policy",
    publishedAt: "2026-03-31",
    source: "EU Commission",
  },
  {
    id: "10",
    title: "Baidu releases Wenxin Yiyan 4.0: Chinese capability leads",
    summary: "Baidu released Wenxin Yiyan 4.0, achieving leading performance in Chinese understanding and generation. The new version adds multimodal capabilities, supporting image understanding and generation.",
    category: "product release",
    publishedAt: "2026-03-30",
    source: "Baidu AI",
  },
  {
    id: "11",
    title: "AI-generated content copyright dispute: courts make first ruling",
    summary: "A US court ruled for the first time on AI-generated content copyright, determining that purely AI-generated works cannot receive copyright protection, but human-AI collaborative works can.",
    category: "policy",
    publishedAt: "2026-03-29",
    source: "Reuters",
  },
  {
    id: "12",
    title: "Robotics large models make breakthrough: general-purpose robots become possible",
    summary: "Multiple research teams report breakthroughs in robotics large models, enabling robots to learn and adapt to new tasks through natural language instructions, bringing general-purpose robots closer to reality.",
    category: "tech breakthrough",
    publishedAt: "2026-03-28",
    source: "MIT Tech Review",
  },
];

export default function NewsPage() {
  const t = useTranslations();
  const r = t.resourcesPage.newsPage;

  const CATEGORIES = [
    { label: r.categories.all, value: "all" },
    { label: r.categories.tech, value: "tech breakthrough" },
    { label: r.categories.product, value: "product release" },
    { label: r.categories.industry, value: "industry news" },
    { label: r.categories.policy, value: "policy" },
  ];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredNews = useMemo(() => {
    let result = NEWS_DATA;

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((news) => news.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (news) =>
          news.title.toLowerCase().includes(query) ||
          news.summary.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ResourceHeader
          title={r.title}
          description={r.description}
          backLabel={t.common.backToResources}
          searchPlaceholder={r.searchPlaceholder}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />

        {/* Filter Bar */}
        <FilterBar
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          {r.stats.replace("{count}", String(filteredNews.length))}
        </div>

        {/* News Grid */}
        {filteredNews.length > 0 ? (
          <ToolGrid columns={3}>
            {filteredNews.map((news) => (
              <NewsCard
                key={news.id}
                {...news}
                href={`/resources/news/${news.id}`}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">{r.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}
