"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";
import { useApi, publicApiKeys } from "@/hooks/useApi";

// API返回的Skill类型
interface Skill {
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
  { label: "Web开发", value: "web dev" },
  { label: "移动端", value: "mobile" },
  { label: "数据库", value: "database" },
  { label: "DevOps", value: "devops" },
  { label: "测试", value: "testing" },
  { label: "后端", value: "backend" },
  { label: "AI/ML", value: "ai/ml" },
];

const SORT_OPTIONS = [
  { label: "评分", value: "rating" },
  { label: "下载量", value: "downloads" },
  { label: "最新", value: "newest" },
  { label: "热门", value: "popular" },
];

const FILTER_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "官方", value: "official" },
  { label: "社区", value: "community" },
];

export default function SkillsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("rating");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // API 获取 Skills 数据
  const { data: apiData, isLoading, error } = useApi<{ items: Skill[]; pagination: { total: number } }>(
    publicApiKeys.skills()
  );

  const skillsData = useMemo(() => {
    return apiData?.items || [];
  }, [apiData]);

  const filteredAndSortedSkills = useMemo(() => {
    let result = skillsData;

    if (selectedCategory !== "all") {
      result = result.filter((skill) => skill.category === selectedCategory);
    }

    if (selectedFilter === "official") {
      result = result.filter((skill: Skill) => skill.isVerified);
    } else if (selectedFilter === "community") {
      result = result.filter((skill: Skill) => !skill.isVerified);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (skill: Skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    switch (selectedSort) {
      case "rating":
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        break;
      case "popular":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
    }

    return result;
  }, [skillsData, searchQuery, selectedCategory, selectedSort, selectedFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-8">
        <ResourceHeader
          title="Skill技能"
          description="AI编程技能库，让您的IDE更智能"
          backLabel="返回资源"
          searchPlaceholder="搜索技能..."
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
              共找到 {filteredAndSortedSkills.length} 个技能
            </div>
            {filteredAndSortedSkills.length > 0 ? (
              <ToolGrid columns={4}>
                {filteredAndSortedSkills.map((skill) => (
                  <ToolCard
                    key={skill.id}
                    id={skill.id}
                    name={skill.displayName || skill.name}
                    description={skill.description}
                    author={skill.author || "Unknown"}
                    category={skill.category || "general"}
                    tags={skill.tags}
                    rating={skill.rating || 0}
                    downloads={skill.downloads}
                    version={skill.version || "1.0.0"}
                    updatedAt={skill.updatedAt || new Date().toISOString()}
                    official={skill.isVerified || false}
                    type="skill"
                    href={`/resources/skills/${skill.id}`}
                  />
                ))}
              </ToolGrid>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">未找到匹配的技能</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
