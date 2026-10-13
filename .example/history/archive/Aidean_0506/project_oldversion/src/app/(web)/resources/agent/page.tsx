"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";
import { useApi, publicApiKeys } from "@/hooks/useApi";

// API返回的Agent类型
interface Agent {
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

  // API 获取 Agent 数据
  const { data: apiData, isLoading, error } = useApi<{ items: Agent[]; pagination: { total: number } }>(
    publicApiKeys.agents()
  );

  const agentData = useMemo(() => {
    return apiData?.items || [];
  }, [apiData]);

  const filteredAndSortedAgents = useMemo(() => {
    let result = agentData;

    if (selectedCategory !== "all") {
      result = result.filter((agent: Agent) => agent.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (agent: Agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    switch (selectedSort) {
      case "popular":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case "rating":
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        break;
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
    }

    return result;
  }, [agentData, searchQuery, selectedCategory, selectedSort]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-8">
        <ResourceHeader
          title="Agent集合"
          description="探索社区开发的智能代理，一键添加到您的工具箱"
          backLabel="返回资源"
          searchPlaceholder="搜索Agent..."
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
              共找到 {filteredAndSortedAgents.length} 个Agent
            </div>
            {filteredAndSortedAgents.length > 0 ? (
              <ToolGrid columns={4}>
                {filteredAndSortedAgents.map((agent) => (
                  <ToolCard
                    key={agent.id}
                    id={agent.id}
                    name={agent.displayName || agent.name}
                    description={agent.description}
                    author={agent.author || "Unknown"}
                    category={agent.category || "general"}
                    tags={agent.tags}
                    rating={agent.rating || 0}
                    downloads={agent.downloads}
                    version={agent.version || "1.0.0"}
                    updatedAt={agent.updatedAt || new Date().toISOString()}
                    official={agent.isVerified || false}
                    type="agent"
                    href={`/resources/agent/${agent.id}`}
                  />
                ))}
              </ToolGrid>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">未找到匹配的Agent</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
