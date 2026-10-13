"use client";

import { Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface NewsCardProps {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  source: string;
  imageUrl?: string;
  href?: string;
}

const categoryColors: Record<string, string> = {
  "tech breakthrough": "bg-green-50 text-green-600",
  "product release": "bg-blue-50 text-blue-600",
  "industry news": "bg-purple-50 text-purple-600",
  "policy": "bg-orange-50 text-orange-600",
};

export function NewsCard({
  id,
  title,
  summary,
  category,
  publishedAt,
  source,
  imageUrl,
  href,
}: NewsCardProps) {
  const categoryColor = categoryColors[category] || "bg-gray-50 text-gray-600";

  const cardContent = (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer h-full flex flex-col">
      {/* Image */}
      {imageUrl && (
        <div className="relative h-40 bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Category */}
        <span className={`inline-block self-start px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${categoryColor}`}>
          {category}
        </span>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">{summary}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{publishedAt}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{source}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
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

