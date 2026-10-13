"use client";

import Link from "next/link";
import { ArrowLeft, Cpu, Building2, Database, GraduationCap, ChevronRight, Mail, Phone, MapPin } from "lucide-react";

const COOPERATION_TYPES = [
  {
    id: "model",
    title: "模型接入合作",
    description: "将您的AI模型接入天梯图平台，获得专业评测和广泛曝光。我们提供公平、透明的评测体系。",
    icon: <Cpu className="h-8 w-8" />,
    benefits: ["专业评测报告", "平台流量曝光", "用户真实反馈", "技术支持服务"],
  },
  {
    id: "enterprise",
    title: "企业定制服务",
    description: "为企业提供私有化部署、定制评测维度、专属数据分析等一站式解决方案。",
    icon: <Building2 className="h-8 w-8" />,
    benefits: ["私有化部署", "定制评测方案", "数据安全保障", "专属客服支持"],
  },
  {
    id: "data",
    title: "数据服务合作",
    description: "共享行业数据，共建AI模型评测标准。我们欢迎数据集提供商、评测机构合作。",
    icon: <Database className="h-8 w-8" />,
    benefits: ["数据互联互通", "行业标准共建", "联合发布报告", "技术能力互补"],
  },
  {
    id: "education",
    title: "教育科研合作",
    description: "与高校、研究机构合作，提供学术评测支持、研究数据共享、联合课题申报。",
    icon: <GraduationCap className="h-8 w-8" />,
    benefits: ["学术研究支持", "数据免费使用", "联合发表论文", "实习基地共建"],
  },
];

const PROCESS_STEPS = [
  { step: 1, title: "提交意向", desc: "填写合作申请表，描述合作需求" },
  { step: 2, title: "需求沟通", desc: "我们的商务团队与您详细沟通" },
  { step: 3, title: "方案制定", desc: "根据需求制定专属合作方案" },
  { step: 4, title: "签约合作", desc: "签订合同，正式开启合作" },
];

export default function CooperationPage() {
  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回链接 */}
        <Link 
          href="/about" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回关于页面
        </Link>

        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">商务合作</h1>
          <p className="mt-3 text-lg text-gray-600">
            期待与您建立长期稳定的合作关系，共同推动AI行业发展
          </p>
        </div>

        {/* 合作类型卡片 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          {COOPERATION_TYPES.map((type) => (
            <div
              key={type.id}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-lg"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                {type.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {type.title}
              </h3>
              <p className="mb-4 text-sm text-gray-600 line-clamp-3">
                {type.description}
              </p>
              <ul className="space-y-1 text-sm text-gray-500">
                {type.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 合作流程 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            合作流程
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {PROCESS_STEPS.map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-2 font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 text-center max-w-[150px]">
                    {item.desc}
                  </p>
                </div>
                {index < PROCESS_STEPS.length - 1 && (
                  <ChevronRight className="mx-2 h-6 w-6 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 联系方式 */}
        <section className="rounded-2xl bg-gray-50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            联系我们
          </h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">商务邮箱</h3>
                <p className="text-sm text-gray-600">cooperation@aidean.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">联系电话</h3>
                <p className="text-sm text-gray-600">400-xxx-xxxx</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">公司地址</h3>
                <p className="text-sm text-gray-600">北京市xxx区xxx路xxx号</p>
              </div>
            </div>
          </div>
          
          {/* CTA 按钮 */}
          <div className="mt-8 text-center">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              提交合作意向
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

