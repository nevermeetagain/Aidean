"use client";

import Link from "next/link";
import { Search, Globe, Moon, Sun, ChevronDown, User, BarChart3 } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "首页", href: "/" },
  { label: "模型", href: "/demo/demo4", children: ["性能天梯图", "性价比排行", "开源模型榜", "中文模型榜"] },
  { label: "资源", href: "#", children: ["AI快讯", "Agent集合", "MCP工具", "Skill技能"] },
  { label: "产品", href: "#", children: ["知识库产品", "解决方案", "业务咨询"] },
  { label: "文档", href: "#", children: ["使用指南", "定价方案", "API文档"] },
  { label: "关于", href: "#", children: ["合作信息", "关于我们", "联系我们"] },
];

export function DemoHeaderV4({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  const cycleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));
  };

  const themeIcon = theme === "light" ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.svg" alt="Aidean" className="h-8 w-8" />
          <div>
            <div className="text-base font-bold text-gray-900 leading-none">Aidean</div>
            <div className="text-[10px] text-gray-400 leading-none mt-0.5">AI模型天梯图</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center lg:flex" style={{ gap: "20px" }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenNav(item.label)}
              onMouseLeave={() => setOpenNav(null)}
            >
              <button
                type="button"
                className={`relative flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  item.label === "模型"
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3 w-3 text-gray-400" />}
                {item.label === "模型" && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-blue-600" />
                )}
              </button>
              {item.children && openNav === item.label && (
                <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-white border border-gray-100 shadow-lg py-1 z-50">
                  {item.children.map((child) => (
                    <button
                      key={child}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Search */}
        <div className="relative ml-auto flex-1 max-w-sm">
          <input
            id="demo4-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索模型..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            aria-label="搜索"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400">
            <Search className="h-4 w-4" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-500" aria-label="语言">
            <Globe className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
            aria-label={`主题: ${theme}`}
            onClick={cycleTheme}
          >
            {themeIcon}
          </button>
          <Link
            href="/auth/login"
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            <User className="h-3.5 w-3.5" />
            登录/注册
          </Link>
        </div>
      </div>
    </header>
  );
}
