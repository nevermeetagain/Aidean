"use client";

import { useState } from "react";

export default function LadderPage() {
  const [data, setData] = useState([]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">天梯管理</h1>
      </div>
      <p className="text-slate-500">天梯图管理页面</p>
    </div>
  );
}
