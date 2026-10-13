"use client";

import { useState } from "react";

export default function ApiStationsPage() {
  const [data, setData] = useState([]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">API站点管理</h1>
      </div>
      <p className="text-slate-500">API站点配置管理页面</p>
    </div>
  );
}
