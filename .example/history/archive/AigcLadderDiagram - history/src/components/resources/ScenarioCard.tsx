"use client";

import { Wrench, Plug, Bot, ArrowRight } from "lucide-react";
import Link from "next/link";

export interface ScenarioCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  includedItems: {
    skills: number;
    mcps: number;
    agents: number;
  };
  href?: string;
}

const difficultyConfig = {
  beginner: {
    label: "beginner",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  intermediate: {
    label: "intermediate",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  advanced: {
    label: "advanced",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
};

export function ScenarioCard({
  id,
  name,
  description,
  tags,
  icon,
  difficulty,
  includedItems,
  href,
}: ScenarioCardProps) {
  const diffConfig = difficultyConfig[difficulty];

  const cardContent = (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-2xl">
          {icon}
        </div>

        {/* Title & Difficulty */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${diffConfig.bgColor} ${diffConfig.color}`}>
              {diffConfig.label}
            </span>
          </div>
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
      </div>

      {/* Included Items */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Wrench className="h-4 w-4 text-blue-500" />
          <span>{includedItems.skills}</span>
        </div>
        <div className="flex items-center gap-1">
          <Plug className="h-4 w-4 text-green-500" />
          <span>{includedItems.mcps}</span>
        </div>
        <div className="flex items-center gap-1">
          <Bot className="h-4 w-4 text-purple-500" />
          <span>{includedItems.agents}</span>
        </div>
      </div>

      {/* View Details Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // TODO: implement view details logic
          alert(`view details: ${name}`);
        }}
        className="flex items-center justify-center gap-1 w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors group-hover:border-blue-200 group-hover:text-blue-600 group-hover:bg-blue-50"
      >
        <span>view details</span>
        <ArrowRight className="h-4 w-4" />
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
