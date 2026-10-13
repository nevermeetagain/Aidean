// S4 首页图标解析：将配置存储的受限枚举名映射为 lucide 组件（未知名回退 Sparkles，杜绝任意字符串）。
// 新增可选图标须同步 @aidean/shared HOME_ICON_NAMES 与此映射表。
import {
  BarChart3, Wallet, LayoutGrid, Trophy, Cloud, Scale, BookOpen,
  Sparkles, Zap, Shield, Users, Rocket, Globe, Cpu, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HomeIconName } from "@aidean/shared";

const MAP: Record<HomeIconName, LucideIcon> = {
  BarChart3, Wallet, LayoutGrid, Trophy, Cloud, Scale, BookOpen,
  Sparkles, Zap, Shield, Users, Rocket, Globe, Cpu, MessageSquare,
};

export function HomeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name as HomeIconName] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
