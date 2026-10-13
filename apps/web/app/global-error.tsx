"use client";
import Link from "next/link";

/**
 * global-error.tsx — root-level error boundary (R-45)。
 *
 * 捕获 root layout 级异常（error.tsx 无法覆盖的层级）。
 * 必须包含 <html> + <body> 骨架，因为 root layout 此时无法渲染。
 * 不依赖 @aidean/ui（组件库可能因 root 异常而不可用），使用内联样式。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#0f172a" }}>Aidean</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
              系统发生错误
            </h2>
            <p style={{ maxWidth: "400px", fontSize: "14px", color: "#64748b", margin: 0 }}>
              应用遇到了未预期的错误。请尝试刷新页面，或稍后再试。
            </p>
            {error.digest && (
              <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                错误编号：{error.digest}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "white",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              重试
            </button>
            <Link
              href="/"
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                border: "none",
                borderRadius: "6px",
                background: "#4f46e5",
                color: "white",
                textDecoration: "none",
              }}
            >
              返回首页
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
