import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { ToastProvider } from "@/components/admin/shared/AdminToast";

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
