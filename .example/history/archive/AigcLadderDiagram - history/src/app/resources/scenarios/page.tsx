"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ScenarioCard, ToolGrid } from "@/components/resources";

// Mock data for scenarios
const SCENARIOS_DATA = [
  {
    id: "1",
    name: "React Full-Stack Dev",
    description: "Complete React development environment with TypeScript, Next.js, and modern tooling. Includes code generation, testing, and deployment automation.",
    category: "web dev",
    tags: ["React", "TypeScript", "Next.js"],
    icon: " react",
    difficulty: "intermediate" as const,
    includedItems: { skills: 5, mcps: 3, agents: 2 },
  },
  {
    id: "2",
    name: "Data Analysis Pipeline",
    description: "End-to-end data analysis environment with Python, Jupyter, and visualization tools. Supports large datasets and automated reporting.",
    category: "data",
    tags: ["Python", "Pandas", "Jupyter"],
    icon: " data",
    difficulty: "beginner" as const,
    includedItems: { skills: 3, mcps: 5, agents: 1 },
  },
  {
    id: "3",
    name: "AI Customer Service",
    description: "Intelligent customer service solution with multi-language support, sentiment analysis, and automated response generation.",
    category: "ai/ml",
    tags: ["NLP", "Chatbot", "Sentiment"],
    icon: " ai",
    difficulty: "advanced" as const,
    includedItems: { skills: 2, mcps: 4, agents: 3 },
  },
  {
    id: "4",
    name: "DevOps Automation",
    description: "CI/CD pipeline automation with Docker, Kubernetes, and monitoring. Includes infrastructure as code and automated testing.",
    category: "devops",
    tags: ["Docker", "K8s", "CI/CD"],
    icon: " devops",
    difficulty: "advanced" as const,
    includedItems: { skills: 4, mcps: 2, agents: 1 },
  },
  {
    id: "5",
    name: "Mobile App Dev",
    description: "Cross-platform mobile development with React Native and Expo. Includes hot reload, debugging, and app store deployment.",
    category: "mobile",
    tags: ["React Native", "Expo", "iOS"],
    icon: " mobile",
    difficulty: "intermediate" as const,
    includedItems: { skills: 6, mcps: 2, agents: 2 },
  },
  {
    id: "6",
    name: "API Development",
    description: "RESTful and GraphQL API development environment with documentation generation, testing, and monitoring tools.",
    category: "backend",
    tags: ["API", "GraphQL", "REST"],
    icon: " api",
    difficulty: "intermediate" as const,
    includedItems: { skills: 4, mcps: 3, agents: 1 },
  },
  {
    id: "7",
    name: "ML Model Training",
    description: "Machine learning model training pipeline with experiment tracking, hyperparameter tuning, and model deployment.",
    category: "ai/ml",
    tags: ["ML", "Training", "MLOps"],
    icon: " ml",
    difficulty: "advanced" as const,
    includedItems: { skills: 3, mcps: 6, agents: 2 },
  },
  {
    id: "8",
    name: "Content Writing",
    description: "AI-assisted content creation environment with SEO optimization, multi-language support, and publishing automation.",
    category: "content",
    tags: ["Writing", "SEO", "Publishing"],
    icon: " content",
    difficulty: "beginner" as const,
    includedItems: { skills: 5, mcps: 1, agents: 3 },
  },
];

const CATEGORIES = [
  { label: "全部", value: "all" },
  { label: "Web开发", value: "web dev" },
  { label: "移动端", value: "mobile" },
  { label: "数据", value: "data" },
  { label: "AI/ML", value: "ai/ml" },
  { label: "DevOps", value: "devops" },
  { label: "后端", value: "backend" },
  { label: "内容", value: "content" },
];

export default function ScenariosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredScenarios = useMemo(() => {
    let result = SCENARIOS_DATA;

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((scenario) => scenario.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (scenario) =>
          scenario.name.toLowerCase().includes(query) ||
          scenario.description.toLowerCase().includes(query) ||
          scenario.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ResourceHeader
          title="场景方案"
          description="预配置的任务环境组合，一键应用提升开发效率"
          backLabel="返回资源"
          searchPlaceholder="搜索场景方案..."
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
          共找到 {filteredScenarios.length} 个场景方案
        </div>

        {/* Scenarios Grid */}
        {filteredScenarios.length > 0 ? (
          <ToolGrid columns={4}>
            {filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                {...scenario}
                href={`/resources/scenarios/${scenario.id}`}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到匹配的场景方案</p>
          </div>
        )}
      </div>
    </div>
  );
}
