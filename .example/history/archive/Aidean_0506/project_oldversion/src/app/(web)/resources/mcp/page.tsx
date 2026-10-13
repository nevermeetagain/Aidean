"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";
import { useApi, publicApiKeys } from "@/hooks/useApi";

// API返回的MCP类型
interface MCPServer {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  author?: string;
  category?: string;
  tags: string[];
  rating?: number;
  downloads: number;
  version?: string;
  updatedAt?: string;
  isVerified?: boolean;
}

// API数据类型定义
// 注：所有数据从API获取，无本地硬编码降级数据

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

  // API 获取 MCP 数据
  const { data: apiData, isLoading, error } = useApi<{ items: MCPServer[]; pagination: { total: number } }>(
    publicApiKeys.mcps()
  );

  const mcpData = useMemo(() => {
    return apiData?.items || [];
  }, [apiData]);

  const filteredAndSortedMCPs = useMemo(() => {
    let result = mcpData;

    if (selectedCategory !== "all") {
      result = result.filter((mcp: MCPServer) => mcp.category === selectedCategory);
    }

    if (selectedFilter === "official") {
      result = result.filter((mcp: MCPServer) => mcp.isVerified);
    } else if (selectedFilter === "community") {
      result = result.filter((mcp: MCPServer) => !mcp.isVerified);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (mcp: MCPServer) =>
          mcp.name.toLowerCase().includes(query) ||
          mcp.description.toLowerCase().includes(query) ||
          mcp.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    switch (selectedSort) {
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case "rating":
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        break;
      case "popular":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
    }

    return result;
  }, [mcpData, searchQuery, selectedCategory, selectedSort, selectedFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-8">
        <ResourceHeader
          title="MCP工具"
          description="模型上下文协议工具市场，扩展AI能力边界"
          backLabel="返回资源"
          searchPlaceholder="搜索MCP工具..."
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />

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

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">加载失败，使用本地数据</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-500">
              共找到 {filteredAndSortedMCPs.length} 个MCP工具
            </div>
            {filteredAndSortedMCPs.length > 0 ? (
              <ToolGrid columns={4}>
                {filteredAndSortedMCPs.map((mcp) => (
                  <ToolCard
                    key={mcp.id}
                    id={mcp.id}
                    name={mcp.displayName || mcp.name}
                    description={mcp.description}
                    author={mcp.author || "Unknown"}
                    category={mcp.category || "general"}
                    tags={mcp.tags}
                    rating={mcp.rating || 0}
                    downloads={mcp.downloads}
                    version={mcp.version || "1.0.0"}
                    updatedAt={mcp.updatedAt || new Date().toISOString()}
                    official={mcp.isVerified || false}
                    type="mcp"
                    href={`/resources/mcp/${mcp.id}`}
                  />
                ))}
              </ToolGrid>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">未找到匹配的MCP工具</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
