"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle, Eye, EyeOff, Box } from "lucide-react";
import { api, isSuccess } from "@/lib/api/client";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
    nickname?: string;
  };
  token: string;
}

interface ErrorState {
  show: boolean;
  code: string;
  title: string;
  message: string;
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState>({
    show: false,
    code: "",
    title: "",
    message: "",
  });
  const router = useRouter();

  // 显示错误弹窗
  const showError = (code: string, title: string, message: string) => {
    setError({ show: true, code, title, message });
  };

  // 关闭错误弹窗
  const closeError = () => {
    setError({ show: false, code: "", title: "", message: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError({ show: false, code: "", title: "", message: "" });

    try {
      const res = await api.post<LoginResponse | { error: { code: string; message: string } }>(
        "/auth/login",
        { email, password }
      );

      if (isSuccess<LoginResponse>(res)) {
        // 校验角色权限
        const userRole = res.data.user.role;
        if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
          showError(
            "A3AU-012",
            "权限不足",
            "此账号无管理员权限，请联系管理员开通"
          );
          setIsLoading(false);
          return;
        }

        // 保存Token
        localStorage.setItem("token", res.data.token);

        // 跳转管理后台
        router.push("/admin");
      } else if ((res as { error?: { code: string; message: string } }).error) {
        const errorData = (res as { error: { code: string; message: string } }).error;
        showError(
          errorData.code || "A3AU-001",
          "登录失败",
          errorData.message || "用户名或密码错误"
        );
      }
    } catch (err) {
      showError(
        "A3AU-010",
        "登录异常",
        "网络连接失败，请检查网络后重试"
      );
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-admin className="min-h-screen flex">
      {/* 左侧：品牌区域 - 晨光蓝渐变 */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
              <Box className="h-10 w-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Aidean Admin
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            智能化AI模型管理平台
          </p>

          {/* 特性展示 */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <Shield className="h-6 w-6 mb-2" />
              <p className="font-medium">安全可靠</p>
              <p className="text-sm text-blue-200">企业级权限管理</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <Shield className="h-6 w-6 mb-2" />
              <p className="font-medium">高效管理</p>
              <p className="text-sm text-blue-200">一站式模型运维</p>
            </div>
          </div>

          <p className="mt-12 text-sm text-blue-200">
            © 2026 Aidean. All rights reserved.
          </p>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[rgb(var(--admin-bg))]">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center shadow-lg mb-4">
              <Box className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
              Aidean Admin
            </h1>
          </div>

          {/* 登录卡片 */}
          <div className="bg-[rgb(var(--admin-bg-sidebar))] rounded-xl shadow-[var(--admin-shadow-lg)] p-8 border border-[rgb(var(--admin-border))]">
            <h2 className="text-2xl font-bold text-center text-[rgb(var(--admin-text-primary))] mb-2">
              管理员登录
            </h2>
            <p className="text-center text-sm text-[rgb(var(--admin-text-muted))] mb-6">
              请使用管理员账号登录
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--admin-text-secondary))] mb-1.5">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--admin-bg))] border border-[rgb(var(--admin-border))] text-[rgb(var(--admin-text-primary))] placeholder:text-[rgb(var(--admin-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))] focus:border-transparent transition-all duration-200"
                  placeholder="请输入邮箱"
                  required
                />
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--admin-text-secondary))] mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--admin-bg))] border border-[rgb(var(--admin-border))] text-[rgb(var(--admin-text-primary))] placeholder:text-[rgb(var(--admin-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))] focus:border-transparent transition-all duration-200 pr-10"
                    placeholder="请输入密码"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--admin-text-muted))] hover:text-[rgb(var(--admin-text-secondary))] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </button>
            </form>

            {/* 提示信息 */}
            <p className="mt-6 text-center text-sm text-[rgb(var(--admin-text-muted))]">
              请联系管理员开通账号
            </p>
          </div>
        </div>
      </div>

      {/* 错误弹窗 */}
      {error.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] p-6 shadow-2xl">
            {/* 图标 */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>

            {/* 标题 */}
            <h3 className="mb-2 text-center text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
              {error.title}
            </h3>

            {/* 提示 */}
            <p className="mb-4 text-center text-sm text-[rgb(var(--admin-text-muted))]">
              {error.message}
            </p>

            {/* 错误码 */}
            <div className="mb-6 flex justify-center">
              <span className="rounded-md bg-[rgb(var(--admin-bg-hover))] px-3 py-1 text-xs font-mono text-[rgb(var(--admin-text-secondary))]">
                错误码: {error.code}
              </span>
            </div>

            {/* 按钮 */}
            <button
              onClick={closeError}
              className="w-full py-2.5 rounded-lg bg-[rgb(var(--admin-primary))] text-white font-medium hover:bg-[rgb(var(--admin-primary-hover))] transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
