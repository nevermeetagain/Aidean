"use client";

import { useState, useCallback } from "react";
import { Menu, GripVertical, Eye, EyeOff, Plus } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
  createdAt: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "1", name: "首页", path: "/", icon: "Home", parentId: null, sortOrder: 1, isVisible: true, isActive: true, createdAt: "2024-01-01" },
  { id: "2", name: "模型天梯", path: "/models", icon: "Layers", parentId: null, sortOrder: 2, isVisible: true, isActive: true, createdAt: "2024-01-01" },
  { id: "3", name: "资源中心", path: "/resources", icon: "BookOpen", parentId: null, sortOrder: 3, isVisible: true, isActive: true, createdAt: "2024-01-01" },
  { id: "4", name: "产品服务", path: "/products", icon: "Package", parentId: null, sortOrder: 4, isVisible: true, isActive: true, createdAt: "2024-01-01" },
  { id: "5", name: "帮助文档", path: "/docs", icon: "HelpCircle", parentId: null, sortOrder: 5, isVisible: true, isActive: true, createdAt: "2024-01-01" },
  { id: "6", name: "关于我们", path: "/about", icon: "Info", parentId: null, sortOrder: 6, isVisible: false, isActive: true, createdAt: "2024-01-01" },
];

export default function MenusPage() {
  const [menus, setMenus] = useState(MENU_ITEMS);
  const [searchKeyword, setSearchKeyword] = useState("");

  const toggleVisibility = useCallback((id: string) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, isVisible: !m.isVisible } : m)));
  }, []);

  const toggleActive = useCallback((id: string) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)));
  }, []);

  const filteredMenus = menus.filter((m) => m.name.toLowerCase().includes(searchKeyword.toLowerCase()));
  const visibleCount = menus.filter((m) => m.isVisible).length;

  const columns: TableColumn<MenuItem>[] = [
    {
      key: "sortOrder",
      title: "",
      width: "40px",
      align: "center",
      render: () => <GripVertical className="h-4 w-4 text-[rgb(var(--admin-text-tertiary))] cursor-move" />,
    },
    {
      key: "name",
      title: "菜单名称",
      width: "200px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
          {!row.isVisible && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">隐藏</span>}
        </div>
      ),
    },
    { key: "path", title: "路径", width: "200px", render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-1 rounded">{row.path}</code> },
    { key: "icon", title: "图标", width: "80px", align: "center" },
    {
      key: "sortOrder",
      title: "排序",
      width: "60px",
      align: "center",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.sortOrder}</span>,
    },
    {
      key: "isVisible",
      title: "显示",
      width: "60px",
      align: "center",
      render: (row) => (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={row.isVisible}
            onChange={() => toggleVisibility(row.id)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      ),
    },
    {
      key: "isActive",
      title: "状态",
      width: "60px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.isActive ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]">删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Menu className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">菜单管理</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Menu className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{menus.length}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">总菜单数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{visibleCount}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">显示中</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
            <EyeOff className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{menus.length - visibleCount}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">已隐藏</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<MenuItem>
        title=""
        subtitle="管理系统导航菜单，配置显示顺序和可见性"
        columns={columns}
        data={filteredMenus}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建菜单"
        emptyText="暂无菜单"
      />
    </div>
  );
}
