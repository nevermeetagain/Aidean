"use client";

import { BasicPage } from "@/components/common/BasicPage";
import { Target, Users, Lightbulb, Award, ArrowRight } from "lucide-react";
import Link from "next/link";

const COMPANY_VALUES = [
  {
    icon: <Target className="h-6 w-6" />,
    title: "精准评估",
    description: "基于多维度基准测试，提供客观、准确的AI模型性能评估。",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "用户至上",
    description: "以用户需求为核心，打造简单易用的AI模型对比平台。",
  },
  {
    icon: <Lightbulb className="h-6 w-6" />,
    title: "持续创新",
    description: "紧跟AI技术前沿，不断优化评测方法和平台功能。",
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "专业权威",
    description: "汇聚行业专家，建立科学、公正的评测标准体系。",
  },
];

const TEAM_MEMBERS = [
  {
    name: "张明",
    role: "创始人 & CEO",
    description: "前阿里AI实验室技术负责人，10年AI行业经验。",
  },
  {
    name: "李华",
    role: "技术总监",
    description: "前腾讯AI平台架构师，专注于大规模AI系统设计。",
  },
  {
    name: "王芳",
    role: "产品总监",
    description: "前字节跳动AI产品负责人，深耕AI应用场景。",
  },
  {
    name: "陈强",
    role: "算法负责人",
    description: "清华大学博士，NLP领域专家，多篇顶会论文作者。",
  },
];

const MILESTONES = [
  { year: "2024", event: "Aidean项目启动，开始搭建AI模型评测平台" },
  { year: "2025", event: "平台正式上线，收录100+主流AI模型" },
  { year: "2026", event: "用户突破10万，推出多模型对比评测功能" },
];

export default function AboutPage() {
  return (
    <BasicPage title="关于我们" description="">
      <div className="space-y-16">
        <section className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            让AI选型更简单
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Aidean（艾迪安）是一家专注于AI模型评测与对比的技术公司。我们致力于为开发者、企业和AI爱好者提供客观、全面的AI模型性能评估服务，帮助用户快速找到最适合自己需求的AI解决方案。
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            核心价值观
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {COMPANY_VALUES.map((value, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
                  {value.icon}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  {value.title}
                </h4>
                <p className="text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            核心团队
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TEAM_MEMBERS.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                  {member.name[0]}
                </div>
                <h4 className="font-semibold text-gray-900">{member.name}</h4>
                <p className="text-sm text-blue-600 mb-2">{member.role}</p>
                <p className="text-xs text-gray-500">{member.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            发展历程
          </h3>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200" />
              {MILESTONES.map((milestone, index) => (
                <div key={index} className="relative pl-12 pb-8 last:pb-0">
                  <div className="absolute left-2 w-5 h-5 rounded-full bg-blue-600 border-4 border-white" />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <span className="text-sm font-bold text-blue-600">
                      {milestone.year}
                    </span>
                    <p className="text-gray-700 mt-1">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">加入我们</h3>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            我们正在寻找志同道合的伙伴，一起打造更好的AI评测平台。
          </p>
          <Link
            href="/about/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            查看职位
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Link
            href="/about/contact"
            className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
              联系我们
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              商务合作、技术咨询欢迎联系
            </p>
          </Link>
          <Link
            href="/about/cooperation"
            className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
              合作伙伴
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              与行业领先企业共建生态
            </p>
          </Link>
          <Link
            href="/docs/help"
            className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
              帮助中心
            </h4>
            <p className="text-sm text-gray-500 mt-1">常见问题与使用指南</p>
          </Link>
        </section>
      </div>
    </BasicPage>
  );
}
