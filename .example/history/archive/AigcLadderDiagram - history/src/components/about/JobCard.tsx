"use client";

import { MapPin, Briefcase, Clock, ChevronRight } from "lucide-react";

interface JobCardProps {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  onViewDetails?: () => void;
}

/**
 * 招聘职位卡片组件
 */
export function JobCard({
  id,
  title,
  department,
  location,
  type,
  description,
  requirements,
  onViewDetails,
}: JobCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          {/* 职位标题 */}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

          {/* 元信息 */}
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {department}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {type}
            </span>
          </div>

          {/* 描述 */}
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{description}</p>

          {/* 基本要求标签 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {requirements.slice(0, 3).map((req, index) => (
              <span
                key={index}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {req}
              </span>
            ))}
            {requirements.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                +{requirements.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* 查看详情按钮 */}
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0"
        >
          查看详情
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface JobFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * 职位分类筛选组件
 */
export function JobFilter({ categories, activeCategory, onCategoryChange }: JobFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === category
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

interface CompanyBenefitProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * 公司福利展示组件
 */
export function CompanyBenefit({ icon, title, description }: CompanyBenefitProps) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
    </div>
  );
}
