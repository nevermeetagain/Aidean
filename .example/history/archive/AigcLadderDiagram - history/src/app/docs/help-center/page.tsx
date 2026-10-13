"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { HelpCard, HelpSection } from "@/components/docs/HelpCard";
import { ArrowLeft, Search, HelpCircle, User, CreditCard, Wrench, MessageCircle, FileQuestion } from "lucide-react";

// 帮助中心问题数据
const HELP_QUESTIONS = [
  // 常见问题
  {
    id: "q1",
    title: "什么是AI模型天梯图？",
    description: "AI模型天梯图是一个专业的AI大模型性能对比平台，帮助用户快速了解各模型的能力边界、适用场景和性价比。",
    category: "常见问题",
    href: "#what-is",
  },
  {
    id: "q2",
    title: "评分是如何计算的？",
    description: "综合评分基于四种评测维度：官方基准测试、实际使用评测、社区反馈和自主测试，各占25%权重。",
    category: "常见问题",
    href: "#how-score",
  },
  {
    id: "q3",
    title: "数据更新频率是多久？",
    description: "模型基础信息每日自动更新，评测数据每周更新一次，重大模型发布会在24小时内更新。",
    category: "常见问题",
    href: "#update-frequency",
  },
  {
    id: "q4",
    title: "天梯图数据是否免费？",
    description: "基础查看功能完全免费，高级功能如导出报告、API接入需要订阅专业版。",
    category: "常见问题",
    href: "#free-or-not",
  },
  // 账号相关
  {
    id: "q5",
    title: "如何注册账号？",
    description: "点击右上角登录/注册按钮，支持邮箱注册、手机号注册和微信扫码快速注册。",
    category: "账号相关",
    href: "#how-to-register",
  },
  {
    id: "q6",
    title: "忘记密码怎么办？",
    description: "在登录页面点击'忘记密码'，输入注册邮箱或手机号，按照提示重置密码。",
    category: "账号相关",
    href: "#forgot-password",
  },
  {
    id: "q7",
    title: "如何修改个人信息？",
    description: "登录后点击右上角头像进入个人中心，在'账户设置'中可以修改昵称、头像和密码。",
    category: "账号相关",
    href: "#edit-profile",
  },
  {
    id: "q8",
    title: "可以注销账号吗？",
    description: "可以，在个人中心的'账户安全'页面底部有注销账号选项，注销后数据将保留30天。",
    category: "账号相关",
    href: "#delete-account",
  },
  // 付费相关
  {
    id: "q9",
    title: "专业版有哪些功能？",
    description: "专业版包含：导出PDF报告、API数据接入、高级筛选、批量对比、无广告体验等特权。",
    category: "付费相关",
    href: "#pro-features",
  },
  {
    id: "q10",
    title: "如何升级到专业版？",
    description: "点击任意专业版功能按钮或访问定价页面，选择适合的套餐完成支付即可立即升级。",
    category: "付费相关",
    href: "#how-to-upgrade",
  },
  {
    id: "q11",
    title: "支持哪些支付方式？",
    description: "支持微信支付、支付宝、银联卡，企业用户还可以选择对公转账。",
    category: "付费相关",
    href: "#payment-methods",
  },
  {
    id: "q12",
    title: "如何申请发票？",
    description: "支付完成后在'订单中心'申请发票，支持电子发票和纸质发票，企业版支持增值税专用发票。",
    category: "付费相关",
    href: "#invoice",
  },
  // 技术问题
  {
    id: "q13",
    title: "页面加载慢怎么办？",
    description: "建议检查网络连接，清除浏览器缓存，或使用Chrome/Firefox等现代浏览器访问。",
    category: "技术问题",
    href: "#slow-loading",
  },
  {
    id: "q14",
    title: "数据显示异常怎么处理？",
    description: "请尝试刷新页面，如问题持续请截图并通过反馈入口提交，我们会尽快修复。",
    category: "技术问题",
    href: "#data-error",
  },
  {
    id: "q15",
    title: "支持哪些浏览器？",
    description: "完美支持Chrome 90+、Firefox 88+、Safari 14+、Edge 90+，建议使用最新版本。",
    category: "技术问题",
    href: "#browser-support",
  },
  // 功能咨询
  {
    id: "q16",
    title: "如何提交模型评测？",
    description: "在模型详情页点击'参与测评'按钮，按照指引提交测试数据，审核通过后会纳入评分计算。",
    category: "功能咨询",
    href: "#submit-eval",
  },
  {
    id: "q17",
    title: "可以接入API吗？",
    description: "专业版和企业版支持API接入，在文档的API部分查看详细接入文档和SDK下载。",
    category: "功能咨询",
    href: "#api-access",
  },
  {
    id: "q18",
    title: "如何成为内容贡献者？",
    description: "我们欢迎社区贡献，联系我们的运营团队，通过审核后可以参与模型信息维护和内容创作。",
    category: "功能咨询",
    href: "#contributor",
  },
];

const CATEGORIES = [
  { id: "all", label: "全部", icon: <HelpCircle className="h-4 w-4" /> },
  { id: "常见问题", label: "常见问题", icon: <FileQuestion className="h-4 w-4" /> },
  { id: "账号相关", label: "账号相关", icon: <User className="h-4 w-4" /> },
  { id: "付费相关", label: "付费相关", icon: <CreditCard className="h-4 w-4" /> },
  { id: "技术问题", label: "技术问题", icon: <Wrench className="h-4 w-4" /> },
  { id: "功能咨询", label: "功能咨询", icon: <MessageCircle className="h-4 w-4" /> },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // 根据搜索和分类过滤问题
  const filteredQuestions = useMemo(() => {
    let result = HELP_QUESTIONS;

    // 分类筛选
    if (activeCategory !== "all") {
      result = result.filter((q) => q.category === activeCategory);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, activeCategory]);

  // 按分类分组
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, typeof HELP_QUESTIONS> = {};
    
    if (activeCategory === "all" && !searchQuery) {
      // 显示所有分类
      CATEGORIES.slice(1).forEach((cat) => {
        const catQuestions = filteredQuestions.filter((q) => q.category === cat.label);
        if (catQuestions.length > 0) {
          groups[cat.label] = catQuestions;
        }
      });
    } else {
      // 搜索或特定分类时直接显示列表
      groups["搜索结果"] = filteredQuestions;
    }
    
    return groups;
  }, [filteredQuestions, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回链接 */}
        <Link 
          href="/docs" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文档首页
        </Link>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">帮助中心</h1>
          <p className="mt-2 text-gray-600">
            常见问题解答，快速找到您需要的帮助
          </p>
        </div>

        {/* 搜索框 */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索问题，如：如何注册账号？"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-4 text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* 问题列表 */}
        <div className="space-y-8">
          {Object.entries(groupedQuestions).map(([category, questions]) => (
            <section key={category}>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {questions.map((q) => (
                  <HelpCard
                    key={q.id}
                    id={q.id}
                    title={q.title}
                    description={q.description}
                    href={q.href}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 没有找到结果 */}
        {filteredQuestions.length === 0 && (
          <div className="py-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              没有找到相关问题
            </h3>
            <p className="mt-2 text-gray-600">
              请尝试其他关键词，或联系我们的客服获取帮助
            </p>
            <Link
              href="/about/contact"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              联系我们
            </Link>
          </div>
        )}

        {/* 底部CTA */}
        <div className="mt-12 rounded-2xl bg-blue-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            还有其他问题？
          </h3>
          <p className="mt-2 text-gray-600">
            如果在这里没有找到答案，欢迎联系我们的客服团队
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              联系客服
            </Link>
            <Link
              href="/docs/help"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
            >
              查看使用指南
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
