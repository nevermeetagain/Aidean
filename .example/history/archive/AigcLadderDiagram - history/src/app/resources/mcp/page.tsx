"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";

// Mock data for MCP tools
const MCP_DATA = [
  {
    id: "1",
    name: "Filesystem MCP",
    description: "Secure file system operations with read, write, and search capabilities. Supports multiple storage backends and permission controls.",
    author: "Aidean Official",
    category: "filesystem",
    tags: ["File", "Storage", "Security"],
    rating: 4.9,
    downloads: 15800,
    version: "2.1.0",
    updatedAt: "2026-04-08",
    official: true,
    type: "mcp" as const,
  },
  {
    id: "2",
    name: "PostgreSQL MCP",
    description: "PostgreSQL database integration with query execution, schema inspection, and migration support. Includes connection pooling and transaction management.",
    author: "DatabaseTools",
    category: "database",
    tags: ["PostgreSQL", "SQL", "Database"],
    rating: 4.8,
    downloads: 12200,
    version: "1.8.0",
    updatedAt: "2026-04-07",
    type: "mcp" as const,
  },
  {
    id: "3",
    name: "GitHub MCP",
    description: "GitHub API integration for repository management, issue tracking, and pull request operations. Supports authentication and webhook handling.",
    author: "Aidean Official",
    category: "api integration",
    tags: ["GitHub", "Git", "API"],
    rating: 4.9,
    downloads: 18500,
    version: "3.0.0",
    updatedAt: "2026-04-06",
    official: true,
    type: "mcp" as const,
  },
  {
    id: "4",
    name: "Web Search MCP",
    description: "Multi-engine web search integration with result ranking and content extraction. Supports Google, Bing, and DuckDuckGo.",
    author: "SearchTools",
    category: "search",
    tags: ["Search", "Web", "Google"],
    rating: 4.7,
    downloads: 9800,
    version: "1.5.2",
    updatedAt: "2026-04-05",
    type: "mcp" as const,
  },
  {
    id: "5",
    name: "Puppeteer MCP",
    description: "Browser automation with Puppeteer for web scraping, testing, and screenshot capture. Supports headless mode and proxy configuration.",
    author: "BrowserTools",
    category: "browser",
    tags: ["Puppeteer", "Browser", "Scraping"],
    rating: 4.6,
    downloads: 7600,
    version: "2.0.1",
    updatedAt: "2026-04-04",
    type: "mcp" as const,
  },
  {
    id: "6",
    name: "Redis MCP",
    description: "Redis cache and message broker integration with cluster support. Includes pub/sub, streams, and Lua scripting.",
    author: "CacheTools",
    category: "database",
    tags: ["Redis", "Cache", "Pub/Sub"],
    rating: 4.5,
    downloads: 5400,
    version: "1.3.0",
    updatedAt: "2026-04-03",
    type: "mcp" as const,
  },
  {
    id: "7",
    name: "Slack MCP",
    description: "Slack workspace integration for messaging, channel management, and user interactions. Supports bot commands and event handling.",
    author: "Aidean Official",
    category: "api integration",
    tags: ["Slack", "Messaging", "Bot"],
    rating: 4.7,
    downloads: 8900,
    version: "1.6.0",
    updatedAt: "2026-04-02",
    official: true,
    type: "mcp" as const,
  },
  {
    id: "8",
    name: "AWS S3 MCP",
    description: "Amazon S3 storage integration with bucket management, file operations, and presigned URL generation. Supports multipart uploads.",
    author: "CloudTools",
    category: "filesystem",
    tags: ["AWS", "S3", "Cloud"],
    rating: 4.6,
    downloads: 6700,
    version: "1.4.0",
    updatedAt: "2026-04-01",
    type: "mcp" as const,
  },
  {
    id: "9",
    name: "Docker MCP",
    description: "Docker container management with image building, container orchestration, and log monitoring. Supports Docker Compose integration.",
    author: "DevOpsTools",
    category: "devops",
    tags: ["Docker", "Container", "DevOps"],
    rating: 4.8,
    downloads: 11200,
    version: "2.2.0",
    updatedAt: "2026-03-31",
    type: "mcp" as const,
  },
  {
    id: "10",
    name: "MongoDB MCP",
    description: "MongoDB database integration with document operations, aggregation pipelines, and index management. Supports replica sets.",
    author: "DatabaseTools",
    category: "database",
    tags: ["MongoDB", "NoSQL", "Document"],
    rating: 4.5,
    downloads: 4800,
    version: "1.2.0",
    updatedAt: "2026-03-30",
    type: "mcp" as const,
  },
  {
    id: "11",
    name: "Jira MCP",
    description: "Jira project management integration for issue tracking, sprint planning, and reporting. Supports custom fields and workflows.",
    author: "ProjectTools",
    category: "api integration",
    tags: ["Jira", "Project", "Issues"],
    rating: 4.4,
    downloads: 3200,
    version: "1.1.0",
    updatedAt: "2026-03-29",
    type: "mcp" as const,
  },
  {
    id: "12",
    name: "Kubernetes MCP",
    description: "Kubernetes cluster management with deployment, service, and pod operations. Includes Helm chart support and monitoring.",
    author: "CloudTools",
    category: "devops",
    tags: ["K8s", "Kubernetes", "Helm"],
    rating: 4.7,
    downloads: 9100,
    version: "3.1.0",
    updatedAt: "2026-03-28",
    type: "mcp" as const,
  },
];

const CATEGORIES = [
  { label: "全部", value: "all" },
  { label: "文件系统", value: "filesystem" },
  { label: "数据库", value: "database" },
  { label: "API集成", value: "api integration" },
  { label: "搜索", value: "search" },
  { label: "浏览器", value: "browser" },
  { label: "DevOps", value: "devops" },
];

const SORT_OPTIONS = [
  { label: "下载量", value: "downloads" },
  { label: "评分", value: "rating" },
  { label: "最新", value: "newest" },
  { label: "热门", value: "popular" },
];

const FILTER_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "官方", value: "official" },
  { label: "社区", value: "community" },
];

export default function MCPPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("downloads");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filteredAndSortedMCPs = useMemo(() => {
    let result = MCP_DATA;

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((mcp) => mcp.category === selectedCategory);
    }

    // Filter by official/community
    if (selectedFilter === "official") {
      result = result.filter((mcp) => mcp.official);
    } else if (selectedFilter === "community") {
      result = result.filter((mcp) => !mcp.official);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (mcp) =>
          mcp.name.toLowerCase().includes(query) ||
          mcp.description.toLowerCase().includes(query) ||
          mcp.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (selectedSort) {
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "popular":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, selectedSort, selectedFilter]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ResourceHeader
          title="MCP工具"
          description="模型上下文协议工具市场，扩展AI能力边界"
          backLabel="返回资源"
          searchPlaceholder="搜索MCP工具..."
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
          additionalFilters={FILTER_OPTIONS}
          selectedAdditional={selectedFilter}
          onAdditionalChange={setSelectedFilter}
          additionalLabel="filter"
        />

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          共找到 {filteredAndSortedMCPs.length} 个MCP工具
        </div>

        {/* MCPs Grid */}
        {filteredAndSortedMCPs.length > 0 ? (
          <ToolGrid columns={4}>
            {filteredAndSortedMCPs.map((mcp) => (
              <ToolCard
                key={mcp.id}
                {...mcp}
                href={`/resources/mcp/${mcp.id}`}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到匹配的MCP工具</p>
          </div>
        )}
      </div>
    </div>
  );
}
