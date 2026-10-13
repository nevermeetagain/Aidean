"use client";

import { Star, Download, Check, Wrench, Bot, Plug } from "lucide-react";
import Link from "next/link";

export interface ToolCardProps {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  version: string;
  updatedAt: string;
  official?: boolean;
  icon?: string;
  type: "agent" | "mcp" | "skill";
  href?: string;
}

const typeConfig = {
  agent: {
    icon: Bot,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    label: "Agent",
  },
  mcp: {
    icon: Plug,
    color: "text-green-500",
    bgColor: "bg-green-50",
    label: "MCP",
  },
  skill: {
    icon: Wrench,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    label: "Skill",
  },
};

export function ToolCard({
  id,
  name,
  description,
  author,
  tags,
  rating,
  downloads,
  version,
  updatedAt,
  official,
  type,
  href,
}: ToolCardProps) {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  const formatDownloads = (num: number) => {
    if (num >= 10000) return `${(num / 1000).toFixed(0)}k+`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const cardContent = (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <IconComponent className={`h-6 w-6 ${config.color}`} />
        </div>

        {/* Title & Author */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {name}
            </h3>
            {official && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                <Check className="h-3 w-3" />
                official
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{author}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">{description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
            +{tags.length - 3}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span>{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{formatDownloads(downloads)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          v{version}
        </div>
      </div>

      {/* Install Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // TODO: implement install logic
          alert(`install ${name}`);
        }}
        className="mt-3 w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        install
      </button>
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
