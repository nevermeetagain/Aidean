"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface HelpCardProps {
  id: string;
  title: string;
  description: string;
  href: string;
  category?: string;
}

/**
 * 帮助中心卡片组件
 * 用于展示常见问题或帮助主题
 */
export function HelpCard({ id, title, description, href, category }: HelpCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {category && (
            <span className="mb-2 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              {category}
            </span>
          )}
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            {description}
          </p>
        </div>
        <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
      </div>
    </Link>
  );
}

interface HelpSectionProps {
  title: string;
  description?: string;
  cards: HelpCardProps[];
}

/**
 * 帮助分类区块组件
 */
export function HelpSection({ title, description, cards }: HelpSectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <HelpCard key={card.id} {...card} />
        ))}
      </div>
    </section>
  );
}
