"use client";

import Link from "next/link";
import { ArrowLeft, Bot, MessageSquare, FileText, Code, Sparkles, Zap, Shield, Clock, CheckCircle } from "lucide-react";
import { useTranslations } from "@/i18n/useTranslations";

export default function AIEmployeePage() {
  const t = useTranslations();
  const p = t.productsPage.aiEmployee;

  const AI_EMPLOYEES = [
    {
      id: "customer-service",
      name: p.employees.customerService.name,
      icon: <MessageSquare className="h-8 w-8" />,
      description: p.employees.customerService.desc,
      capabilities: p.employees.customerService.capabilities,
      scenarios: p.employees.customerService.scenarios,
    },
    {
      id: "content-writer",
      name: p.employees.contentWriter.name,
      icon: <FileText className="h-8 w-8" />,
      description: p.employees.contentWriter.desc,
      capabilities: p.employees.contentWriter.capabilities,
      scenarios: p.employees.contentWriter.scenarios,
    },
    {
      id: "code-assistant",
      name: p.employees.codeAssistant.name,
      icon: <Code className="h-8 w-8" />,
      description: p.employees.codeAssistant.desc,
      capabilities: p.employees.codeAssistant.capabilities,
      scenarios: p.employees.codeAssistant.scenarios,
    },
    {
      id: "data-analyst",
      name: p.employees.dataAnalyst.name,
      icon: <Sparkles className="h-8 w-8" />,
      description: p.employees.dataAnalyst.desc,
      capabilities: p.employees.dataAnalyst.capabilities,
      scenarios: p.employees.dataAnalyst.scenarios,
    },
  ];

  const FEATURES = [
    { icon: <Zap className="h-6 w-6" />, title: p.features.fastDeploy.title, desc: p.features.fastDeploy.desc },
    { icon: <Shield className="h-6 w-6" />, title: p.features.enterpriseSecurity.title, desc: p.features.enterpriseSecurity.desc },
    { icon: <Clock className="h-6 w-6" />, title: p.features.service24_7.title, desc: p.features.service24_7.desc },
    { icon: <CheckCircle className="h-6 w-6" />, title: p.features.continuousLearning.title, desc: p.features.continuousLearning.desc },
  ];

  const STEPS = [
    { step: 1, title: p.steps.step1.title, desc: p.steps.step1.desc },
    { step: 2, title: p.steps.step2.title, desc: p.steps.step2.desc },
    { step: 3, title: p.steps.step3.title, desc: p.steps.step3.desc },
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
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 mb-4">
            <Bot className="h-4 w-4" />
            {p.badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {p.subtitle}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {p.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {AI_EMPLOYEES.map((employee) => (
            <div
              key={employee.id}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                {employee.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {employee.name}
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                {employee.description}
              </p>
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">{p.labels.capabilities}</div>
                <div className="flex flex-wrap gap-1">
                  {employee.capabilities.map((cap: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">{p.labels.scenarios}</div>
                <div className="flex flex-wrap gap-1">
                  {employee.scenarios.map((scene: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600"
                    >
                      {scene}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {p.steps.title}
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            {STEPS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center max-w-[200px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gray-900 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">{p.cta.title}</h2>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            {p.cta.desc}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700 transition-colors"
            >
              {t.common.startTrial}
            </Link>
            <Link
              href="/docs/help"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-medium hover:bg-white/20 transition-colors"
            >
              {t.common.learnMore}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
