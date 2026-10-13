"use client";

import Link from "next/link";
import { PricingCard, PricingFeatureComparison } from "@/components/about/PricingCard";
import { ArrowLeft, Check, Sparkles, Building2 } from "lucide-react";

const PRICING_PLANS = [
  {
    name: "免费版",
    price: "¥0",
    period: "月",
    description: "适合个人用户初步了解 AI 模型",
    features: [
      "查看基础天梯图",
      "模型详情页浏览",
      "收藏最多10个模型",
      "社区评测参与",
      "基础筛选功能",
    ],
    cta: "免费开始",
  },
  {
    name: "专业版",
    price: "¥99",
    period: "月",
    description: "适合专业人士和中小团队",
    features: [
      "所有免费版功能",
      "导出 PDF/Excel 报告",
      "API 数据接入",
      "高级筛选与排序",
      "批量模型对比",
      "无广告体验",
      "优先客服支持",
      "收藏无上限",
    ],
    cta: "立即订阅",
    recommended: true,
  },
  {
    name: "企业版",
    price: "定制",
    period: "",
    description: "适合大型企业和机构",
    features: [
      "所有专业版功能",
      "私有化部署选项",
      "自定义评测维度",
      "专属客户经理",
      "SLA 服务保障",
      "团队权限管理",
      "数据安全合规",
      "7×24小时支持",
    ],
    cta: "联系销售",
  },
];

const COMPARISON_FEATURES = [
  { name: "查看天梯图", free: true, pro: true, enterprise: true },
  { name: "模型详情页", free: true, pro: true, enterprise: true },
  { name: "收藏模型", free: true, pro: true, enterprise: true },
  { name: "基础筛选", free: true, pro: true, enterprise: true },
  { name: "社区评测", free: true, pro: true, enterprise: true },
  { name: "导出报告", free: false, pro: true, enterprise: true },
  { name: "API 接入", free: false, pro: true, enterprise: true },
  { name: "高级筛选", free: false, pro: true, enterprise: true },
  { name: "批量对比", free: false, pro: true, enterprise: true },
  { name: "无广告", free: false, pro: true, enterprise: true },
  { name: "私有化部署", free: false, pro: false, enterprise: true },
  { name: "自定义评测", free: false, pro: false, enterprise: true },
  { name: "专属客户经理", free: false, pro: false, enterprise: true },
  { name: "SLA 保障", free: false, pro: false, enterprise: true },
];

const FAQ_ITEMS = [
  {
    q: "可以随时升级或降级吗？",
    a: "是的，您可以随时升级或降级您的套餐。升级立即生效，降级在下一个计费周期生效。",
  },
  {
    q: "支持退款吗？",
    a: "专业版提供7天无理由退款。企业版根据合同约定执行。",
  },
  {
    q: "企业版如何定价？",
    a: "企业版根据团队规模、功能需求和部署方式定制报价，请联系我们的销售团队。",
  },
  {
    q: "有年度优惠吗？",
    a: "专业版年付可享受8折优惠，相当于买10个月送2个月。",
  },
];

export default function PricingPage() {
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
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">定价方案</h1>
          <p className="mt-3 text-lg text-gray-600">
            选择适合您的方案，随时升级或降级
          </p>
        </div>

        {/* 定价卡片 */}
        <div className="grid gap-6 lg:grid-cols-3 mb-16">
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* 功能对比表 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            功能对比
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <PricingFeatureComparison features={COMPARISON_FEATURES} />
          </div>
        </section>

        {/* 常见问题 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            常见问题
          </h2>
          <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-sm text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 企业定制 CTA */}
        <section className="rounded-2xl bg-gray-900 p-8 text-center text-white">
          <Building2 className="mx-auto h-12 w-12 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold mb-3">需要企业定制方案？</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            我们提供私有化部署、定制化开发、专属支持等企业级服务。
            联系我们的销售团队获取定制方案。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700 transition-colors"
            >
              联系销售
            </Link>
            <Link
              href="/about/cooperation"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-medium hover:bg-white/20 transition-colors"
            >
              了解更多
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
