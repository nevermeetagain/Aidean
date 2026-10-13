"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, CheckCircle, ArrowLeft, Mail, MessageSquare, Clock } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    type: "feedback",
    content: "",
    contact: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 匿名提交，无需登录
    console.log("工单提交:", formData);
    setSubmitted(true);
  };

  if (submitted) {
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

          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                工单已提交
              </h2>
              <p className="mt-2 text-gray-600">
                感谢您的反馈，我们会尽快处理并回复您。
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-8 rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
              >
                继续提交新工单
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">联系我们</h1>
          <p className="mt-3 text-lg text-gray-600">
            匿名提交工单，无需登录。您的反馈对我们很重要。
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* 左侧联系信息 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">邮箱</h3>
              </div>
              <p className="text-sm text-gray-600">164093410@qq.com</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">微信</h3>
              </div>
              <p className="text-sm text-gray-600">扫描底部二维码关注公众号</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">工作时间</h3>
              </div>
              <p className="text-sm text-gray-600">周一至周五 9:00-18:00</p>
            </div>
          </div>

          {/* 右侧表单 */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    工单类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="feedback">产品反馈</option>
                    <option value="bug">Bug 报告</option>
                    <option value="feature">功能建议</option>
                    <option value="cooperation">商务合作</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    详细描述
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="请详细描述您的问题或建议..."
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    联系方式（选填）
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="邮箱 / 微信 / 手机号，方便我们回复您"
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  提交工单
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
