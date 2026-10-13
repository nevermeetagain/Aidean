// 占位简化版:纯展示卡片分区
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Div = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...rest }: Div) {
  return <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm", className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: Div) {
  return <div className={cn("flex flex-col gap-1 p-4", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: Div) {
  return <h3 className={cn("text-base font-semibold leading-none", className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: Div) {
  return <p className={cn("text-sm text-slate-500", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: Div) {
  return <div className={cn("p-4 pt-0", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: Div) {
  return <div className={cn("flex items-center gap-2 p-4 pt-0", className)} {...rest} />;
}