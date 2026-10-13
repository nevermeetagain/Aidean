"use client";

import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminErrorBoundary } from "../shared/AdminErrorBoundary";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-admin
      className="flex h-screen bg-[rgb(var(--admin-bg))] text-[rgb(var(--admin-text-primary))]"
    >
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-8">
          <AdminErrorBoundary>{children}</AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}

