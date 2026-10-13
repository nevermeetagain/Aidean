// 控制台核心信息卡（Server Component）：
// FlowGradient 特效背景层（z-0）+ 前景内容包于 relative z-10 容器，保证文字可读性。
// WF-19（P6/P2）改造：
// - 新增 compact 紧凑模式：页头右侧竖排三卡使用（label/value 缩小、省略 hint）；
// - 进度条槽位化：无进度时渲染等高空槽，保证同排卡片高度一致（不向业务方强传 progress={0}）；
// - article 恒定 h-full：使外层 Link/grid 拉伸链路贯通（P2 主因修复）。
import type { ReactNode } from "react";

import { FlowGradient } from "./FlowGradient";

type Tone = "primary" | "accent";

const TONE_ICON: Record<Tone, string> = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  accent: "border-accent/20 bg-accent/10 text-accent",
};

interface CoreInfoCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  /** 0-100；传入时在卡片底部渲染 primary→accent 渐变细进度条 */
  progress?: number;
  /** 紧凑模式（页头右置竖排）：小字号 + 无 hint 槽位 */
  compact?: boolean;
  /** Optional semantic icon rendered in the label row (tone-driven badge). */
  icon?: ReactNode;
}

export function CoreInfoCard({
  label,
  value,
  hint,
  tone = "primary",
  progress,
  compact = false,
  icon,
}: CoreInfoCardProps) {
  const clamped =
    typeof progress === "number"
      ? Math.min(100, Math.max(0, progress))
      : undefined;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card ${
        compact ? "p-3.5" : "p-5"
      }`}
    >
      {/* 特效背景层：z-0 */}
      <FlowGradient tone={tone} seed={tone === "accent" ? 11 : 7} />

      {/* 前景内容：relative z-10 叠于特效之上 */}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>{label}</p>
          {icon ? (
            <span
              aria-hidden="true"
              className={`inline-flex shrink-0 items-center justify-center rounded-md border ${
                compact ? "h-6 w-6" : "h-8 w-8"
              } ${TONE_ICON[tone]}`}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <p
          className={
            compact
              ? "mt-1 text-lg font-bold tabular-nums tracking-tight text-foreground"
              : "mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground md:text-3xl"
          }
        >
          {value}
        </p>
        {hint && !compact ? (
          <p className="mt-auto min-h-[2rem] pt-3 text-xs leading-5 text-slate-500">{hint}</p>
        ) : null}
      </div>

      {/* 进度条槽位（等高占位）：无进度时空槽占位，保证有/无进度卡片同排等高 */}
      <div className="relative z-10 mt-3 w-full">
        {typeof clamped === "number" ? (
          <div
            role="progressbar"
            aria-label={`${label}进度`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clamped}
            className="w-full"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${clamped}%` }}
              />
            </div>
          </div>
        ) : (
          <div aria-hidden="true" className="h-1.5" />
        )}
      </div>
    </article>
  );
}
