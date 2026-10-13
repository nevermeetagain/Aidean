"use client";

import { BasicPage } from "@/components/common/BasicPage";
import {
  BarChart3,
  Bot,
  BookOpen,
  Zap,
  ArrowRight,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const PRODUCTS = [
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "模型天梯图",
    description: "全面的AI模型性能排行榜，支持多维度筛选和对比，帮助您快速找到最适合的模型。",
    features: [
      "实时更新排名数据",
      "多维度评测指标",
      "价格性能对比",
      "自定义筛选条件",
    ],
    href: "/models",
    color: "blue",
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "数字分身服务",
    description: "企业级AI解决方案，提供智能客服、数据分析、内容生成等多种数字分身服务。",
    features: [
      "智能客服机器人",
      "数据分析助手",
      "内容创作工具",
      "定制化开发",
    ],
    href: "/products/ai-employee",
    color: "purple",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "知识库解决方案",
    description: "企业知识管理与智能问答系统，让AI理解您的业务知识。",
    features: [
      "知识库搭建",
      "智能问答系统",
      "文档自动处理",
      "多渠道接入",
    ],
    href: "/products/knowledge-base",
    color: "green",
    external: true,
    externalUrl: "http://36.134.158.50:10001/",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "模型评测服务",
    description: "专业的AI模型评测服务，支持自定义测试用例和多模型并行对比。",
    features: [
      "自定义测试用例",
      "多模型并行测试",
      "详细评测报告",
      "API接口调用",
    ],
    href: "/evaluation",
    color: "orange",
  },
];

const SOLUTIONS = [
  {
    title: "金融行业",
    description: "智能风控、智能客服、合规审查",
    icon: "🏦",
  },
  {
    title: "电商零售",
    description: "智能推荐、客服机器人、内容生成",
    icon: "🛒",
  },
  {
    title: "教育培训",
    description: "智能答疑、作业批改、个性化学习",
    icon: "📚",
  },
  {
    title: "医疗健康",
    description: "智能问诊、病历分析、医学文献检索",
    icon: "🏥",
  },
  {
    title: "法律服务",
    description: "合同审查、法律咨询、案例分析",
    icon: "⚖️",
  },
  {
    title: "企业办公",
    description: "智能文档、会议助手、数据分析",
    icon: "🏢",
  },
];

const PRICING_TIERS = [
  {
    name: "免费版",
    price: "¥0",
    period: "永久免费",
    features: [
      "天梯图基础功能",
      "每日10次模型查询",
      "基础评测报告",
      "社区支持",
    ],
    cta: "立即使用",
    popular: false,
  },
  {
    name: "专业版",
    price: "¥99",
    period: "/月",
    features: [
      "天梯图全部功能",
      "无限模型查询",
      "高级评测报告",
      "API调用额度",
      "优先技术支持",
    ],
    cta: "开始试用",
    popular: true,
  },
  {
    name: "企业版",
    price: "定制",
    period: "",
    features: [
      "全部专业版功能",
      "私有化部署",
      "定制化开发",
      "专属技术支持",
      "SLA保障",
    ],
    cta: "联系我们",
    popular: false,
  },
];

export default function ProductsPage() {
  return (
    <BasicPage title="产品服务" description="">
      <div className="space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            核心产品
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {PRODUCTS.map((product, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                    product.color === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : product.color === "purple"
                      ? "bg-purple-100 text-purple-600"
                      : product.color === "green"
                      ? "bg-green-100 text-green-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {product.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                <ul className="space-y-2 mb-4">
                  {product.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {product.external ? (
                  <a
                    href={product.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    了解更多
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Link
                    href={product.href}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    了解更多
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            行业解决方案
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((solution, index) => (
              <Link
                key={index}
                href="/products/solutions"
                className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{solution.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                      {solution.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {solution.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            价格方案
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier, index) => (
              <div
                key={index}
                className={`rounded-xl border p-6 ${
                  tier.popular
                    ? "border-blue-600 ring-2 ring-blue-600"
                    : "border-gray-200"
                }`}
              >
                {tier.popular && (
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full mb-4">
                    最受欢迎
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {tier.name}
                </h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {tier.price}
                  </span>
                  <span className="text-gray-500">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.name === "企业版" ? "/about/contact" : "/docs/pricing"}
                  className={`block w-full py-2.5 text-center rounded-lg font-medium transition-colors ${
                    tier.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">需要定制化解决方案？</h3>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            我们提供企业级定制服务，根据您的业务需求量身打造AI解决方案。
          </p>
          <Link
            href="/about/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            联系我们
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </BasicPage>
  );
}
