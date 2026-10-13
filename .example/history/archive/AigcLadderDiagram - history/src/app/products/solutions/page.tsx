"use client";

import Link from "next/link";
import { ArrowLeft, Lightbulb, Building2, Factory, Stethoscope, GraduationCap, ShoppingCart, Plane, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/useTranslations";

export default function SolutionsPage() {
  const t = useTranslations();
  const p = t.productsPage.solutions;

  const INDUSTRY_SOLUTIONS = [
    {
      id: "finance",
      icon: <Building2 className="h-8 w-8" />,
      name: p.industries.finance.name,
      description: p.industries.finance.desc,
      features: p.industries.finance.features,
    },
    {
      id: "manufacturing",
      icon: <Factory className="h-8 w-8" />,
      name: p.industries.manufacturing.name,
      description: p.industries.manufacturing.desc,
      features: p.industries.manufacturing.features,
    },
    {
      id: "healthcare",
      icon: <Stethoscope className="h-8 w-8" />,
      name: p.industries.healthcare.name,
      description: p.industries.healthcare.desc,
      features: p.industries.healthcare.features,
    },
    {
      id: "education",
      icon: <GraduationCap className="h-8 w-8" />,
      name: p.industries.education.name,
      description: p.industries.education.desc,
      features: p.industries.education.features,
    },
    {
      id: "retail",
      icon: <ShoppingCart className="h-8 w-8" />,
      name: p.industries.retail.name,
      description: p.industries.retail.desc,
      features: p.industries.retail.features,
    },
    {
      id: "travel",
      icon: <Plane className="h-8 w-8" />,
      name: p.industries.travel.name,
      description: p.industries.travel.desc,
      features: p.industries.travel.features,
    },
  ];

  const IMPLEMENTATION_STEPS = [
    { step: 1, title: p.process.step1.title, desc: p.process.step1.desc },
    { step: 2, title: p.process.step2.title, desc: p.process.step2.desc },
    { step: 3, title: p.process.step3.title, desc: p.process.step3.desc },
    { step: 4, title: p.process.step4.title, desc: p.process.step4.desc },
    { step: 5, title: p.process.step5.title, desc: p.process.step5.desc },
  ];

  return (
    <div className="min-h-screen bg-[#DBDFF9] pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.backToProducts}
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 mb-4">
            <Lightbulb className="h-4 w-4" />
            {p.badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {p.subtitle}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {p.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {INDUSTRY_SOLUTIONS.map((solution) => (
            <div
              key={solution.id}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                {solution.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {solution.name}
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                {solution.description}
              </p>
              <ul className="space-y-2">
                {solution.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            实施流程
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {IMPLEMENTATION_STEPS.map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center text-center max-w-[150px]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
                {index < IMPLEMENTATION_STEPS.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 mx-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            技术优势
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "定制开发", desc: "根据业务需求量身定制" },
              { title: "企业级架构", desc: "高可用、高并发、可扩展" },
              { title: "数据安全", desc: "私有化部署，数据不出域" },
              { title: "持续支持", desc: "7x24技术支持与运维" },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-xl bg-white border border-gray-200 p-5"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gray-900 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">准备好获取行业解决方案了吗？</h2>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            联系我们的行业专家，获取定制化解决方案
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium hover:bg-green-700 transition-colors"
            >
              联系我们
            </Link>
            <Link
              href="/docs/help"
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
