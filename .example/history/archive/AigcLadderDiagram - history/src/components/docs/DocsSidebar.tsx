"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, BookOpen, HelpCircle, FileText, Zap, Bookmark, BarChart3 } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  items?: { id: string; label: string; href: string }[];
}

interface DocsSidebarProps {
  items: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
}

/**
 * 文档侧边栏组件
 * 支持展开/折叠的多级导航
 */
export function DocsSidebar({ items, activeId, onItemClick }: DocsSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>(["getting-started"]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 过滤搜索
  const filteredItems = searchQuery 
    ? items.map(item => ({
        ...item,
        items: item.items?.filter(subItem => 
          subItem.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(item => item.items && item.items.length > 0)
    : items;

  return (
    <div className="space-y-6">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜索文档..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 导航菜单 */}
      <nav className="space-y-1">
        {filteredItems.map((item) => (
          <div key={item.id}>
            {/* 一级菜单项 */}
            <button
              onClick={() => {
                toggleExpand(item.id);
                onItemClick?.(item.id);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeId === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.items && item.items.length > 0 && (
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedIds.includes(item.id) ? "rotate-90" : ""
                  }`} 
                />
              )}
            </button>

            {/* 二级菜单项 */}
            {item.items && expandedIds.includes(item.id) && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.id}
                    href={subItem.href}
                    onClick={() => onItemClick?.(subItem.id)}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      activeId === subItem.id
                        ? "text-blue-600 font-medium"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

/**
 * 预设的使用指南导航数据
 */
export const HELP_NAV_ITEMS: NavItem[] = [
  {
    id: "getting-started",
    label: "快速开始",
    icon: <Zap className="h-4 w-4" />,
    items: [
      { id: "intro", label: "平台介绍", href: "#intro" },
      { id: "first-use", label: "首次使用", href: "#first-use" },
    ]
  },
  {
    id: "ladder",
    label: "天梯图使用",
    icon: <BarChart3 className="h-4 w-4" />,
    items: [
      { id: "view", label: "查看天梯图", href: "#view" },
      { id: "filter", label: "筛选与排序", href: "#filter" },
      { id: "compare", label: "模型对比", href: "#compare" },
    ]
  },
  {
    id: "features",
    label: "功能特性",
    icon: <Bookmark className="h-4 w-4" />,
    items: [
      { id: "favorite", label: "收藏模型", href: "#favorite" },
      { id: "feedback", label: "纠错反馈", href: "#feedback" },
      { id: "evaluation", label: "参与测评", href: "#evaluation" },
    ]
  },
  {
    id: "advanced",
    label: "高级功能",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { id: "api", label: "API接入", href: "#api" },
      { id: "export", label: "导出报告", href: "#export" },
    ]
  },
];

/**
 * 预设的帮助中心导航数据
 */
export const HELP_CENTER_NAV_ITEMS: NavItem[] = [
  {
    id: "faq",
    label: "常见问题",
    icon: <HelpCircle className="h-4 w-4" />,
    items: [
      { id: "what-is", label: "什么是天梯图？", href: "#what-is" },
      { id: "how-score", label: "评分如何计算？", href: "#how-score" },
      { id: "update", label: "数据更新频率？", href: "#update" },
    ]
  },
  {
    id: "account",
    label: "账号相关",
    icon: <BookOpen className="h-4 w-4" />,
    items: [
      { id: "register", label: "如何注册？", href: "#register" },
      { id: "login", label: "登录问题", href: "#login" },
      { id: "reset", label: "密码重置", href: "#reset" },
    ]
  },
];
