"use client";

import { useState, useMemo } from "react";
import { ResourceHeader, FilterBar, ToolCard, ToolGrid } from "@/components/resources";

// Mock data for Skills
const SKILLS_DATA = [
  {
    id: "1",
    name: "React Component Generator",
    description: "Auto-generate React components with TypeScript, hooks, and styling. Supports functional components, HOCs, and custom hooks.",
    author: "Aidean Official",
    category: "web dev",
    tags: ["React", "TypeScript", "Components"],
    rating: 4.9,
    downloads: 18200,
    version: "3.2.0",
    updatedAt: "2026-04-08",
    official: true,
    type: "skill" as const,
  },
  {
    id: "2",
    name: "API Endpoint Builder",
    description: "Generate RESTful and GraphQL API endpoints with validation, documentation, and error handling. Supports Express, FastAPI, and NestJS.",
    author: "APIBuilder",
    category: "backend",
    tags: ["API", "REST", "GraphQL"],
    rating: 4.8,
    downloads: 14500,
    version: "2.1.0",
    updatedAt: "2026-04-07",
    type: "skill" as const,
  },
  {
    id: "3",
    name: "Database Schema Designer",
    description: "Design and generate database schemas with migrations, models, and seed data. Supports PostgreSQL, MySQL, and MongoDB.",
    author: "DBTools",
    category: "database",
    tags: ["Schema", "Migration", "ORM"],
    rating: 4.7,
    downloads: 11800,
    version: "1.8.0",
    updatedAt: "2026-04-06",
    type: "skill" as const,
  },
  {
    id: "4",
    name: "Test Suite Generator",
    description: "Auto-generate unit, integration, and E2E tests with coverage reports. Supports Jest, Vitest, and Playwright frameworks.",
    author: "Aidean Official",
    category: "testing",
    tags: ["Testing", "Jest", "Coverage"],
    rating: 4.8,
    downloads: 9600,
    version: "2.0.0",
    updatedAt: "2026-04-05",
    official: true,
    type: "skill" as const,
  },
  {
    id: "5",
    name: "Docker Config Generator",
    description: "Generate Dockerfile, docker-compose, and Kubernetes manifests with best practices. Includes multi-stage builds and optimization.",
    author: "DevOpsTools",
    category: "devops",
    tags: ["Docker", "K8s", "Container"],
    rating: 4.6,
    downloads: 8200,
    version: "1.5.0",
    updatedAt: "2026-04-04",
    type: "skill" as const,
  },
  {
    id: "6",
    name: "Mobile UI Builder",
    description: "Generate React Native and Flutter UI components with responsive layouts. Supports iOS and Android platform conventions.",
    author: "MobileUI",
    category: "mobile",
    tags: ["React Native", "Flutter", "UI"],
    rating: 4.5,
    downloads: 6900,
    version: "1.3.0",
    updatedAt: "2026-04-03",
    type: "skill" as const,
  },
  {
    id: "7",
    name: "ML Pipeline Template",
    description: "Generate machine learning pipelines with data preprocessing, training, and evaluation. Supports TensorFlow and PyTorch.",
    author: "Aidean Official",
    category: "ai/ml",
    tags: ["ML", "TensorFlow", "PyTorch"],
    rating: 4.9,
    downloads: 12800,
    version: "3.0.0",
    updatedAt: "2026-04-02",
    official: true,
    type: "skill" as const,
  },
  {
    id: "8",
    name: "Authentication System",
    description: "Generate complete authentication systems with JWT, OAuth, and session management. Includes password reset and 2FA support.",
    author: "AuthTools",
    category: "backend",
    tags: ["Auth", "JWT", "OAuth"],
    rating: 4.7,
    downloads: 10500,
    version: "2.2.0",
    updatedAt: "2026-04-01",
    type: "skill" as const,
  },
  {
    id: "9",
    name: "CSS Animation Library",
    description: "Generate CSS animations and transitions with keyframes and timing functions. Includes hover effects and scroll animations.",
    author: "StyleTools",
    category: "web dev",
    tags: ["CSS", "Animation", "Effects"],
    rating: 4.4,
    downloads: 5400,
    version: "1.1.0",
    updatedAt: "2026-03-31",
    type: "skill" as const,
  },
  {
    id: "10",
    name: "GraphQL Schema Builder",
    description: "Generate GraphQL schemas with resolvers, mutations, and subscriptions. Includes Apollo Server integration and type generation.",
    author: "GraphQLTools",
    category: "backend",
    tags: ["GraphQL", "Apollo", "Schema"],
    rating: 4.6,
    downloads: 7100,
    version: "1.6.0",
    updatedAt: "2026-03-30",
    type: "skill" as const,
  },
  {
    id: "11",
    name: "CI/CD Pipeline Config",
    description: "Generate CI/CD pipeline configurations for GitHub Actions, GitLab CI, and Jenkins. Includes deployment strategies.",
    author: "Aidean Official",
    category: "devops",
    tags: ["CI/CD", "GitHub", "Jenkins"],
    rating: 4.8,
    downloads: 8900,
    version: "2.1.0",
    updatedAt: "2026-03-29",
    official: true,
    type: "skill" as const,
  },
  {
    id: "12",
    name: "Form Validation Generator",
    description: "Generate form validation schemas with Yup, Zod, and Joi. Includes error messages and custom validation rules.",
    author: "FormTools",
    category: "web dev",
    tags: ["Form", "Validation", "Schema"],
    rating: 4.5,
    downloads: 6200,
    version: "1.4.0",
    updatedAt: "2026-03-28",
    type: "skill" as const,
  },
];

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

  const filteredAndSortedSkills = useMemo(() => {
    let result = SKILLS_DATA;

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((skill) => skill.category === selectedCategory);
    }

    // Filter by official/community
    if (selectedFilter === "official") {
      result = result.filter((skill) => skill.official);
    } else if (selectedFilter === "community") {
      result = result.filter((skill) => !skill.official);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (selectedSort) {
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "downloads":
        result = [...result].sort((a, b) => b.downloads - a.downloads);
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
          title="Skill技能"
          description="AI编程技能库，让您的IDE更智能"
          backLabel="返回资源"
          searchPlaceholder="搜索技能..."
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
          共找到 {filteredAndSortedSkills.length} 个技能
        </div>

        {/* Skills Grid */}
        {filteredAndSortedSkills.length > 0 ? (
          <ToolGrid columns={4}>
            {filteredAndSortedSkills.map((skill) => (
              <ToolCard
                key={skill.id}
                {...skill}
                href={`/resources/skills/${skill.id}`}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到匹配的技能</p>
          </div>
        )}
      </div>
    </div>
  );
}
