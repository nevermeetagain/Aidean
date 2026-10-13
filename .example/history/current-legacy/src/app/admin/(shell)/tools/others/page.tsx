"use client";

import { MoreHorizontal } from "lucide-react";

export default function OtherToolsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MoreHorizontal className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">其他工具</h1>
      </div>
      <p className="text-slate-600">管理其他生态资源，包括数据集、提示词模板等资源。</p>
      
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">其他工具管理功能开发中...</p>
        <p className="text-sm text-slate-400 mt-2">支持数据集、Prompt模板等管理</p>
      </div>
    </div>
  );
}
