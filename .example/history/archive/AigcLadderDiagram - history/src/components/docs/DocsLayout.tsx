"use client";

import type { ReactNode } from "react";

interface DocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  title?: string;
  description?: string;
}

/**
 * 文档页面统一布局组件
 * 包含左侧边栏和右侧内容区
 * 最大宽度1600px，浅色主题
 */
export function DocsLayout({ children, sidebar, title, description }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题区 */}
        {(title || description) && (
          <div className="mb-8 border-b border-gray-200 pb-6">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            )}
            {description && (
              <p className="mt-2 text-gray-600">{description}</p>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div className="flex gap-8">
          {/* 侧边栏 */}
          {sidebar && (
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
                {sidebar}
              </div>
            </aside>
          )}

          {/* 主内容 */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * 移动端侧边栏抽屉组件
 */
export function MobileSidebar({ children, isOpen, onClose }: { 
  children: ReactNode; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩 */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white p-4 shadow-xl lg:hidden">
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
          <span className="font-semibold text-gray-900">目录</span>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-5rem)]">
          {children}
        </div>
      </div>
    </>
  );
}
