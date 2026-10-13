"use client";

import { useTheme } from "../theme/ThemeProvider";
import type { ThemeName } from "../../stores/uiStore";

const THEME_DOTS: ReadonlyArray<{ name: ThemeName; color: string; label: string }> = [
  { name: "teal", color: "#0f766e", label: "青碧" },
  { name: "indigo", color: "#4f46e5", label: "靛蓝" },
  { name: "orange", color: "#c2410c", label: "橙焰" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2" role="group" aria-label="切换主题色">
      {THEME_DOTS.map((dot) => {
        const selected = theme === dot.name;
        return (
          <button
            key={dot.name}
            type="button"
            title={`主题：${dot.label}`}
            aria-label={`切换到${dot.label}主题`}
            aria-pressed={selected}
            onClick={() => setTheme(dot.name)}
            className="h-4 w-4 rounded-full transition-opacity hover:opacity-80"
            style={{
              backgroundColor: dot.color,
              outline: selected ? `2px solid ${dot.color}` : "none",
              outlineOffset: 2,
            }}
          />
        );
      })}
    </div>
  );
}
