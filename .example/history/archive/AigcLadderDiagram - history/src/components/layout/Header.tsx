"use client";

import Link from "next/link";
import { Search, User2 } from "lucide-react";

import { Dropdown } from "@/components/common/Dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[rgb(var(--bg))]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="AigcLadderDiagram"
            className="h-8 w-8"
            width={32}
            height={32}
          />
          <div className="text-sm font-semibold tracking-wide">AigcLadderDiagram</div>
        </Link>

        <nav className="hidden items-center gap-3 text-sm sm:flex">
          <Link className="rounded px-2 py-1 hover:bg-black/5" href="/">
            首页
          </Link>

          <Dropdown
            label="模型"
            items={[
              { label: "天梯图", href: "/models", description: "完整筛选视图" },
              { label: "测评", href: "/evaluation", description: "测评车与案例" },
              { label: "对比", href: "/compare", description: "横向参数对比" }
            ]}
          />

          <Dropdown
            label="资源"
            items={[
              { label: "资讯", href: "/resources/news", description: "AI快讯列表" },
              { label: "Agent", href: "/resources/agent", description: "智能体集合" },
              { label: "MCP", href: "/resources/mcp", description: "MCP工具/服务" },
              { label: "Skills", href: "/resources/skills", description: "技能集合" }
            ]}
          />

          <Dropdown
            label="产品"
            items={[
              {
                label: "知识库",
                href: "/products/knowledge-base",
                description: "RAGFlow 二次开发"
              },
              { label: "解决方案", href: "/products/solutions", description: "行业定制" },
              { label: "业务咨询", href: "/products/consulting", description: "AI培训/咨询" }
            ]}
          />

          <Dropdown
            label="文档"
            items={[
              { label: "帮助", href: "/docs/help", description: "使用指南/FAQ" },
              { label: "价格", href: "/docs/pricing", description: "定价方案" },
              { label: "API", href: "/docs/api", description: "开发者接口" }
            ]}
          />

          <Dropdown
            label="关于"
            items={[
              { label: "合作", href: "/about/cooperation", description: "合作信息" },
              { label: "招聘", href: "/about/jobs", description: "加入我们" }
            ]}
          />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden w-[320px] sm:block">
            <Input
              id="global-search"
              name="q"
              aria-label="搜索"
              placeholder="搜索模型、厂商、标签"
              className="pr-10"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-black/50">
              <Search className="h-4 w-4" aria-hidden />
            </div>
          </div>

          <Link href="/auth/login" className="hidden sm:inline-flex">
            <Button variant="subtle" className="w-full">
              <User2 className="h-4 w-4" aria-hidden />
              登录/注册
            </Button>
          </Link>

          <Button variant="ghost" className="sm:hidden" aria-label="搜索">
            <Search className="h-5 w-5" aria-hidden />
          </Button>
          <Link href="/auth/login" className="sm:hidden" aria-label="登录/注册">
            <Button variant="ghost" aria-label="登录/注册">
              <User2 className="h-5 w-5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
