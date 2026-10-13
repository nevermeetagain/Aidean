// /admin/login —— 管理端独立登录页（rebuild-admin-console-and-harden-auth Phase 1）。
// 位于 (admin-login) 组：不套 (admin)/layout 管理外壳（侧边栏/守卫），
// URL 仍为 /admin/login（组名不参与路由）。middleware 对本路径显式放行。
// 视觉（UI 重构）：浅色冷色底 + 左右分栏式品牌区（窄屏退化为单卡），robots noindex。
import { AdminLoginForm } from "../../../../components/admin/AdminLoginForm";

export const metadata = {
  title: "管理登录 · Aidean",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      {/* 冷色氛围底（纯装饰） */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
          }}
        />
      </div>
      <div className="relative w-full max-w-md">
        <AdminLoginForm />
      </div>
    </main>
  );
}
