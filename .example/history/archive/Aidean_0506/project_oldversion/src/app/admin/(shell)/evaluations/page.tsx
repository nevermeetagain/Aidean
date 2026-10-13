"use client";

import { useState } from "react";

export default function EvaluationsPage() {
  const [data, setData] = useState([]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">模型评测</h1>
      </div>
      <p className="text-slate-500">模型评测管理页面</p>
    </div>
  );
}
