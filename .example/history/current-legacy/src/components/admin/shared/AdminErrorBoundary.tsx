"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * AdminErrorBoundary - 管理端全局错误边界
 * 捕获子组件未处理异常，以弹窗形式展示错误（含错误码）
 */
export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    // 可在此添加错误上报逻辑
    console.error("Admin Error Boundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/admin";
  };

  private getErrorCode(): string {
    const { error } = this.state;
    if (!error) return "A4CM-001";

    // 根据错误类型映射错误码
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      return "A4CM-002"; // 网络错误
    }
    if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
      return "A4CM-003"; // 认证错误
    }
    if (error.message?.includes("403") || error.message?.includes("forbidden")) {
      return "A4CM-004"; // 权限错误
    }
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return "A4CM-005"; // 资源不存在
    }
    if (error.message?.includes("500") || error.message?.includes("server")) {
      return "A4CM-006"; // 服务端错误
    }

    return "A4CM-001"; // 通用错误
  }

  private getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      "A4CM-001": "系统异常",
      "A4CM-002": "网络连接失败",
      "A4CM-003": "登录状态已过期",
      "A4CM-004": "权限不足",
      "A4CM-005": "页面不存在",
      "A4CM-006": "服务器繁忙",
    };
    return titles[code] || "系统异常";
  }

  private getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      "A4CM-001": "操作出现异常，请稍后重试",
      "A4CM-002": "网络连接不稳定，请检查网络后重试",
      "A4CM-003": "登录状态已过期，请重新登录",
      "A4CM-004": "您没有权限执行此操作",
      "A4CM-005": "请求的页面不存在",
      "A4CM-006": "服务器暂时无法响应，请稍后重试",
    };
    return messages[code] || "操作出现异常，请稍后重试";
  }

  render() {
    if (this.state.hasError) {
      const errorCode = this.getErrorCode();
      const errorTitle = this.getErrorTitle(errorCode);
      const errorMessage = this.getErrorMessage(errorCode);

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* 图标 */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>

            {/* 标题 */}
            <h2 className="mb-2 text-center text-lg font-semibold text-slate-900">
              {errorTitle}
            </h2>

            {/* 友好提示 */}
            <p className="mb-4 text-center text-sm text-slate-500">
              {errorMessage}
            </p>

            {/* 错误码 */}
            <div className="mb-6 flex justify-center">
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
                错误码: {errorCode}
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Home className="h-4 w-4" />
                返回首页
              </button>
              <button
                onClick={this.handleRetry}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                <RotateCcw className="h-4 w-4" />
                重试
              </button>
            </div>

            {/* 详情展开（可选） */}
            {this.state.error && (
              <details className="mt-4 border-t border-slate-100 pt-4">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-500">
                  查看错误详情
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
