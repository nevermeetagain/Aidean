"use client";

import { Puzzle } from "lucide-react";

export default function ToolCombinationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Puzzle className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">组合方案</h1>
      </div>
      <p className="text-slate-600">管理工具组合方案，将Skill、MCP、Agent组合成完整解决方案。</p>
      
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">组合方案管理功能开发中...</p>
        <p className="text-sm text-slate-400 mt-2">支持多工具组合与方案配置</p>
      </div>
    </div>
  );
}
