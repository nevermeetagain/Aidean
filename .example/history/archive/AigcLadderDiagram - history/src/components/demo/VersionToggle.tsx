"use client";

export function VersionToggle({
  version,
  onChange,
  variant = "light"
}: {
  version: "pro" | "app";
  onChange: (v: "pro" | "app") => void;
  variant?: "light" | "dark";
}) {
  const isLight = variant === "light";

  return (
    <div className={`inline-flex rounded-lg p-0.5 ${isLight ? "bg-gray-100" : "bg-slate-700"}`}>
      <button
        type="button"
        onClick={() => onChange("pro")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          version === "pro"
            ? isLight
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-emerald-500 text-white shadow-sm"
            : isLight
              ? "text-gray-500 hover:text-gray-700"
              : "text-slate-400 hover:text-slate-200"
        }`}
      >
        专业版
      </button>
      <button
        type="button"
        onClick={() => onChange("app")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          version === "app"
            ? isLight
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-emerald-500 text-white shadow-sm"
            : isLight
              ? "text-gray-500 hover:text-gray-700"
              : "text-slate-400 hover:text-slate-200"
        }`}
      >
        应用版
      </button>
    </div>
  );
}
