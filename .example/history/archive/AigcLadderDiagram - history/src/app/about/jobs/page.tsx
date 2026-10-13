"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { JobCard, JobFilter, CompanyBenefit } from "@/components/about/JobCard";
import { ArrowLeft, Heart, Coffee, Zap, BookOpen, Dumbbell, Plane, DollarSign, Monitor } from "lucide-react";

const JOB_LISTINGS = [
  {
    id: "1",
    title: "高级前端工程师",
    department: "技术部",
    location: "北京",
    type: "全职",
    description: "负责天梯图平台前端架构设计与开发，优化用户体验和性能。",
    requirements: ["3年以上React经验", "熟悉TypeScript", "有大型项目经验", "了解性能优化"],
  },
  {
    id: "2",
    title: "后端开发工程师",
    department: "技术部",
    location: "北京/远程",
    type: "全职",
    description: "负责API服务开发和数据处理管道建设，保障系统稳定性。",
    requirements: ["精通Python/Node.js", "熟悉PostgreSQL", "有Redis经验", "了解Docker"],
  },
  {
    id: "3",
    title: "AI产品经理",
    department: "产品部",
    location: "北京",
    type: "全职",
    description: "负责AI模型评测产品规划和设计，推动产品迭代优化。",
    requirements: ["2年以上AI产品经验", "了解大模型生态", "数据分析能力", "跨团队沟通"],
  },
  {
    id: "4",
    title: "UI/UX设计师",
    department: "设计部",
    location: "北京",
    type: "全职",
    description: "负责产品界面设计和用户体验优化，建立设计规范。",
    requirements: ["精通Figma", "有B端产品经验", "了解前端实现", "作品集优秀"],
  },
  {
    id: "5",
    title: "数据分析师",
    department: "数据部",
    location: "北京/上海",
    type: "全职",
    description: "负责模型评测数据分析，建立评测体系和评分算法。",
    requirements: ["统计学/数学背景", "熟练使用Python/R", "机器学习基础", "数据可视化"],
  },
  {
    id: "6",
    title: "内容运营",
    department: "运营部",
    location: "北京",
    type: "全职",
    description: "负责AI行业内容策划和运营，提升社区活跃度。",
    requirements: ["AI行业了解", "优秀写作能力", "社区运营经验", "数据分析意识"],
  },
  {
    id: "7",
    title: "商务拓展经理",
    department: "市场部",
    location: "北京/上海/深圳",
    type: "全职",
    description: "负责企业客户拓展和合作伙伴关系维护。",
    requirements: ["2年以上B2B销售经验", "AI行业资源", "商务谈判能力", "目标导向"],
  },
  {
    id: "8",
    title: "实习生 - 前端开发",
    department: "技术部",
    location: "北京",
    type: "实习",
    description: "参与前端功能开发，在导师指导下成长。",
    requirements: ["计算机相关专业", "熟悉React", "学习能力强", "实习3个月以上"],
  },
];

const CATEGORIES = ["全部", "技术", "产品", "设计", "数据", "运营", "市场", "实习"];

const COMPANY_BENEFITS = [
  { icon: <DollarSign className="h-6 w-6" />, title: "有竞争力的薪酬", description: "年终奖 + 项目奖金 + 期权激励" },
  { icon: <Heart className="h-6 w-6" />, title: "完善的健康保障", description: "六险一金 + 年度体检 + 心理咨询" },
  { icon: <Coffee className="h-6 w-6" />, title: "舒适的办公环境", description: "零食饮料 + 下午茶 + 弹性工作" },
  { icon: <Zap className="h-6 w-6" />, title: "快速成长机会", description: "导师制 + 培训基金 + 技术分享" },
  { icon: <BookOpen className="h-6 w-6" />, title: "学习成长支持", description: "购书补贴 + 课程报销 + 技术大会" },
  { icon: <Plane className="h-6 w-6" />, title: "充足的假期", description: "年假10天起 + 带薪病假 + 节日福利" },
  { icon: <Dumbbell className="h-6 w-6" />, title: "健康生活方式", description: "健身房补贴 + 运动俱乐部 + 团建活动" },
  { icon: <Monitor className="h-6 w-6" />, title: "顶级工作设备", description: "MacBook Pro + 4K显示器 + 人体工学椅" },
];

export default function JobsPage() {
  const [activeCategory, setActiveCategory] = useState("全部");

  // 过滤职位
  const filteredJobs = useMemo(() => {
    if (activeCategory === "全部") return JOB_LISTINGS;
    
    const categoryMap: Record<string, string[]> = {
      "技术": ["技术部"],
      "产品": ["产品部"],
      "设计": ["设计部"],
      "数据": ["数据部"],
      "运营": ["运营部"],
      "市场": ["市场部"],
      "实习": ["实习"],
    };
    
    const departments = categoryMap[activeCategory];
    if (!departments) return JOB_LISTINGS;
    
    return JOB_LISTINGS.filter((job) => 
      departments.some((dept) => 
        job.department.includes(dept) || job.type === dept
      )
    );
  }, [activeCategory]);

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
          <h1 className="text-3xl font-bold text-gray-900">加入我们</h1>
          <p className="mt-3 text-lg text-gray-600">
            与优秀的人一起，做有挑战的事，推动AI行业发展
          </p>
        </div>

        {/* 职位筛选 */}
        <div className="mb-8">
          <JobFilter
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* 职位数量 */}
        <div className="mb-6 text-sm text-gray-600">
          共 {filteredJobs.length} 个开放职位
        </div>

        {/* 职位列表 */}
        <div className="grid gap-4 mb-16">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              onViewDetails={() => console.log("查看职位详情:", job.id)}
            />
          ))}
        </div>

        {/* 没有找到职位 */}
        {filteredJobs.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-600">该分类暂无开放职位</p>
            <p className="mt-2 text-sm text-gray-500">
              您可以查看其他分类，或将简历发送至 hr@aidean.com 储备
            </p>
          </div>
        )}

        {/* 公司福利 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            为什么选择我们
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMPANY_BENEFITS.map((benefit, index) => (
              <CompanyBenefit key={index} {...benefit} />
            ))}
          </div>
        </section>

        {/* 底部CTA */}
        <section className="rounded-2xl bg-blue-50 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            没有合适的职位？
          </h2>
          <p className="text-gray-600 mb-6">
            我们始终欢迎优秀的人才加入。请将简历发送至我们的招聘邮箱，我们会尽快与您联系。
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:hr@aidean.com"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              投递简历
            </a>
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              咨询招聘
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
