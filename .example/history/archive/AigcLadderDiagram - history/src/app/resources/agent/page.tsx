"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";

// Mock data for agents
const AGENTS_DATA = [
  {
    id: "1",
    name: "Code Assistant Pro",
    description: "Intelligent code completion and refactoring agent with multi-language support. Integrates with popular IDEs for seamless development experience.",
    author: "Aidean Official",
    category: "code dev",
    tags: ["Code", "Refactoring", "IDE"],
    rating: 4.9,
    downloads: 12500,
    version: "2.1.0",
    updatedAt: "2026-04-08",
    official: true,
    type: "agent" as const,
  },
  {
    id: "2",
    name: "Data Analyst Bot",
    description: "Automated data analysis agent with visualization capabilities. Supports CSV, Excel, and database connections for comprehensive data insights.",
    author: "DataMinds",
    category: "data",
    tags: ["Analytics", "Visualization", "Database"],
    rating: 4.8,
    downloads: 8900,
    version: "1.5.2",
    updatedAt: "2026-04-07",
    type: "agent" as const,
  },
  {
    id: "3",
    name: "Content Creator",
    description: "AI-powered content generation agent for blogs, social media, and marketing materials. Includes SEO optimization and multi-language support.",
    author: "ContentAI",
    category: "content",
    tags: ["Writing", "SEO", "Marketing"],
    rating: 4.7,
    downloads: 6700,
    version: "3.0.1",
    updatedAt: "2026-04-06",
    type: "agent" as const,
  },
  {
    id: "4",
    name: "Test Automation Agent",
    description: "Comprehensive testing agent for unit, integration, and E2E tests. Auto-generates test cases and provides detailed coverage reports.",
    author: "Aidean Official",
    category: "testing",
    tags: ["Testing", "QA", "Automation"],
    rating: 4.6,
    downloads: 4500,
    version: "1.8.0",
    updatedAt: "2026-04-05",
    official: true,
    type: "agent" as const,
  },
  {
    id: "5",
    name: "DevOps Commander",
    description: "Infrastructure management agent with CI/CD pipeline automation. Supports Docker, Kubernetes, and cloud platform integrations.",
    author: "CloudOps",
    category: "devops",
    tags: ["Docker", "K8s", "CI/CD"],
    rating: 4.5,
    downloads: 3200,
    version: "2.0.0",
    updatedAt: "2026-04-04",
    type: "agent" as const,
  },
  {
    id: "6",
    name: "API Designer",
    description: "RESTful and GraphQL API design agent with automatic documentation generation. Includes schema validation and mock server capabilities.",
    author: "APIFirst",
    category: "backend",
    tags: ["API", "GraphQL", "REST"],
    rating: 4.4,
    downloads: 2800,
    version: "1.2.0",
    updatedAt: "2026-04-03",
    type: "agent" as const,
  },
  {
    id: "7",
    name: "Security Scanner",
    description: "Automated security vulnerability detection agent with real-time monitoring. Supports OWASP top 10 checks and compliance reporting.",
    author: "SecureAI",
    category: "security",
    tags: ["Security", "Scanning", "Compliance"],
    rating: 4.8,
    downloads: 5100,
    version: "2.3.0",
    updatedAt: "2026-04-02",
    type: "agent" as const,
  },
  {
    id: "8",
    name: "Mobile Dev Assistant",
    description: "Cross-platform mobile development agent with React Native and Flutter support. Includes device simulation and app store deployment.",
    author: "MobileMakers",
    category: "mobile",
    tags: ["React Native", "Flutter", "Mobile"],
    rating: 4.3,
    downloads: 2400,
    version: "1.0.5",
    updatedAt: "2026-04-01",
    type: "agent" as const,
  },
  {
    id: "9",
    name: "ML Pipeline Builder",
    description: "Machine learning pipeline automation agent with experiment tracking. Supports TensorFlow, PyTorch, and scikit-learn frameworks.",
    author: "Aidean Official",
    category: "ai/ml",
    tags: ["ML", "TensorFlow", "PyTorch"],
    rating: 4.9,
    downloads: 9800,
    version: "3.1.0",
    updatedAt: "2026-03-31",
    official: true,
    type: "agent" as const,
  },
  {
    id: "10",
    name: "Documentation Writer",
    description: "Automated documentation generation agent with API docs, README, and user guide creation. Supports multiple output formats.",
    author: "DocGen",
    category: "content",
    tags: ["Docs", "API", "Markdown"],
    rating: 4.2,
    downloads: 1900,
    version: "1.1.0",
    updatedAt: "2026-03-30",
    type: "agent" as const,
  },
  {
    id: "11",
    name: "Code Review Bot",
    description: "Intelligent code review agent with best practices enforcement and security checks. Integrates with GitHub, GitLab, and Bitbucket.",
    author: "ReviewPro",
    category: "code dev",
    tags: ["Review", "GitHub", "Quality"],
    rating: 4.6,
    downloads: 7200,
    version: "2.0.1",
    updatedAt: "2026-03-29",
    type: "agent" as const,
  },
  {
    id: "12",
    name: "Performance Optimizer",
    description: "Application performance analysis and optimization agent with bottleneck detection. Provides actionable recommendations for improvements.",
    author: "PerfLab",
    category: "devops",
    tags: ["Performance", "Optimization", "Profiling"],
    rating: 4.5,
    downloads: 3100,
    version: "1.4.0",
    updatedAt: "2026-03-28",
    type: "agent" as const,
  },
];

const CATEGORIES = [
  { label: "全部", value: "all" },
  { label: "办公助手", value: "office" },
  { label: "代码开发", value: "code dev" },
  { label: "内容创作", value: "content" },
  { label: "数据处理", value: "data" },
  { label: "测试", value: "testing" },
  { label: "DevOps", value: "devops" },
  { label: "AI/ML", value: "ai/ml" },
  { label: "移动端", value: "mobile" },
  { label: "后端", value: "backend" },
  { label: "安全", value: "security" },
];

const SORT_OPTIONS = [
  { label: "热门", value: "popular" },
  { label: "评分", value: "rating" },
  { label: "最新", value: "newest" },
  { label: "下载量", value: "downloads" },
];

export default function AgentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("popular");

  const filteredAndSortedAgents = useMemo(() => {
    let result = AGENTS_DATA;

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((agent) => agent.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (selectedSort) {
      case "popular":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, selectedSort]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ResourceHeader
          title="Agent集合"
          description="探索社区开发的智能代理，一键添加到您的工具箱"
          backLabel="返回资源"
          searchPlaceholder="搜索Agent..."
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />

        {/* Filter Bar */}
        <FilterBar
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortOptions={SORT_OPTIONS}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
        />

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          共找到 {filteredAndSortedAgents.length} 个Agent
        </div>

        {/* Agents Grid */}
        {filteredAndSortedAgents.length > 0 ? (
          <ToolGrid columns={4}>
            {filteredAndSortedAgents.map((agent) => (
              <ToolCard
                key={agent.id}
                {...agent}
                href={`/resources/agent/${agent.id}`}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到匹配的Agent</p>
          </div>
        )}
      </div>
    </div>
  );
}
