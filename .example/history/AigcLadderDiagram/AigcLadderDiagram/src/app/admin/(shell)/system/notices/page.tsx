"use client";

import { useState } from "react";

export default function NoticesPage() {
  const [data, setData] = useState([]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">系统公告</h1>
      </div>
      <p className="text-slate-500">系统公告管理页面</p>
    </div>
  );
}
