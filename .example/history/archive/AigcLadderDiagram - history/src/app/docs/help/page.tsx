"use client";

import { useState } from "react";
import Link from "next/link";
import { DocsLayout, MobileSidebar } from "@/components/docs/DocsLayout";
import { DocsSidebar, HELP_NAV_ITEMS } from "@/components/docs/DocsSidebar";
import { ArrowLeft, Menu, BookOpen, Search, Filter, BarChart3, Bookmark, MessageSquare } from "lucide-react";

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState("intro");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">使用指南</h1>
          <p className="mt-2 text-gray-600">
            了解如何使用 AI 模型天梯图平台，快速上手各项功能
          </p>
        </div>

        <div className="flex gap-8">
          {/* 移动端侧边栏开关 */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
            目录
          </button>

          {/* 侧边栏 */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <DocsSidebar 
                items={HELP_NAV_ITEMS} 
                activeId={activeSection}
                onItemClick={setActiveSection}
              />
            </div>
          </aside>

          {/* 移动端侧边栏 */}
          <MobileSidebar 
            isOpen={mobileSidebarOpen} 
            onClose={() => setMobileSidebarOpen(false)}
          >
            <DocsSidebar 
              items={HELP_NAV_ITEMS} 
              activeId={activeSection}
              onItemClick={(id) => {
                setActiveSection(id);
                setMobileSidebarOpen(false);
              }}
            />
          </MobileSidebar>

          {/* 主内容 */}
          <main className="flex-1 min-w-0">
            <div className="prose prose-blue max-w-none">
              {/* 快速开始 */}
              <section id="intro" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  平台介绍
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  AI 模型天梯图是一个专业的 AI 模型性能对比平台，帮助用户快速了解各模型的能力边界、适用场景和性价比。我们整合了多个维度的评测数据，包括官方基准测试、实际使用评测、社区反馈和自主测试。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">核心功能</h4>
                  <ul className="space-y-1 text-blue-800">
                    <li>• 多维度模型性能天梯图展示</li>
                    <li>• 智能筛选与排序功能</li>
                    <li>• 模型间多维度对比</li>
                    <li>• 收藏与纠错反馈</li>
                    <li>• API 接入与导出报告</li>
                  </ul>
                </div>
              </section>

              {/* 天梯图使用 */}
              <section id="view" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  查看天梯图
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  访问首页即可查看完整的 AI 模型性能天梯图。图表按综合评分从高到低排列，您可以通过不同颜色直观区分模型类别。
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">图表元素说明</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>• <strong>模型名称</strong>：点击可查看详情页</li>
                    <li>• <strong>评分</strong>：满分100分的综合评分</li>
                    <li>• <strong>趋势箭头</strong>：近期排名变化趋势</li>
                    <li>• <strong>标签</strong>：开源/闭源、免费/付费等标识</li>
                  </ul>
                </div>
              </section>

              {/* 筛选与排序 */}
              <section id="filter" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Search className="h-6 w-6 text-blue-600" />
                  筛选与排序
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  使用顶部筛选栏可以快速缩小模型范围，找到符合您需求的模型。
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">筛选维度</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• 模型类型（对话/多模态/嵌入等）</li>
                      <li>• 开源协议（开源/闭源）</li>
                      <li>• 价格区间（免费/低价/高价）</li>
                      <li>• 上下文长度</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">排序方式</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• 综合评分（默认）</li>
                      <li>• 性价比排序</li>
                      <li>• 发布时间</li>
                      <li>• 下载/使用量</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 模型对比 */}
              <section id="compare" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Filter className="h-6 w-6 text-blue-600" />
                  模型对比
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  选择多个模型进行横向对比，直观了解它们在各个维度的差异。
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">操作步骤</h4>
                  <ol className="space-y-1 text-yellow-800">
                    <li>1. 在天梯图中点击模型旁的 &ldquo;+&rdquo; 按钮添加到对比列表</li>
                    <li>2. 点击右下角的对比图标进入对比界面</li>
                    <li>3. 查看各维度的详细对比数据</li>
                    <li>4. 导出对比报告（专业版功能）</li>
                  </ol>
                </div>
              </section>

              {/* 收藏与纠错 */}
              <section id="favorite" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Bookmark className="h-6 w-6 text-blue-600" />
                  收藏与纠错
                </h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">收藏模型</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      点击模型卡片上的收藏图标，将常用模型加入收藏列表。登录后可在个人中心查看和管理收藏的模型。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">纠错反馈</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      发现模型信息有误？点击&ldquo;纠错&rdquo;按钮提交反馈，我们会在24小时内核实并更新数据。
                    </p>
                  </div>
                </div>
              </section>

              {/* 联系支持 */}
              <section id="support" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  需要帮助？
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  如果您在使用过程中遇到任何问题，可以通过以下方式联系我们：
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    href="/docs/help-center" 
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100"
                  >
                    访问帮助中心
                  </Link>
                  <Link 
                    href="/about/contact" 
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                  >
                    联系我们
                  </Link>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
