"use client";

import Link from "next/link";
import { useState } from "react";

interface DemoHeaderV5Props {
  title?: string;
  showViewToggle?: boolean;
}

export function DemoHeaderV5({ title = "Aidean", showViewToggle = false }: DemoHeaderV5Props) {
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">("horizontal");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          {title}
        </Link>
        <nav className="flex items-center gap-4">
          {showViewToggle && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("horizontal")}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === "horizontal" ? "bg-blue-100 text-blue-700" : ""
                }`}
              >
                横排
              </button>
              <button
                onClick={() => setViewMode("vertical")}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === "vertical" ? "bg-blue-100 text-blue-700" : ""
                }`}
              >
                竖排
              </button>
            </div>
          )}
          <Link href="/admin/login" className="text-sm text-gray-600 hover:text-gray-900">
            登录
          </Link>
        </nav>
      </div>
    </header>
  );
}
