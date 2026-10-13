"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Command,
  LayoutDashboard,
  LineChart,
  Search,
  Sparkles,
  X
} from "lucide-react";

import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Notice = {
  id: string;
  title: string;
  time: string;
  level: "info" | "success" | "warning";
};

const SAMPLE_NOTICES: Notice[] = [
  { id: "n1", title: "平台公告：新一期榜单数据已更新", time: "刚刚", level: "info" },
  { id: "n2", title: "对比功能升级：支持自定义排序公式（预留）", time: "1 小时前", level: "success" },
  { id: "n3", title: "服务维护窗口：本周日 02:00-03:00", time: "昨天", level: "warning" }
];

export function HeaderV2({ mode }: { mode: "demo3" | "demo4" }) {
  const pathname = usePathname() ?? "";
  const [openNotice, setOpenNotice] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const accent = mode === "demo3" ? "emerald" : "sky";

  const isActive = useMemo(() => {
    return {
      demo3: pathname.startsWith("/demo/demo3"),
      demo4: pathname.startsWith("/demo/demo4")
    };
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-black/10 bg-white/75 backdrop-blur"
      )}
    >
      <div className="mx-auto flex h-16 w-[96vw] max-w-[1680px] items-center gap-3 px-4 sm:px-6">
        <Link href={mode === "demo3" ? "/demo/demo3" : "/demo/demo4"} className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="AigcLadder"
            className="h-9 w-9 rounded-xl ring-1 ring-black/10"
            width={36}
            height={36}
          />
          <div className="leading-tight">
            <div
              className={cn(
                "text-sm font-semibold tracking-wide text-black"
              )}
            >
              AigcLadder
            </div>
            <div
              className={cn(
                "text-[11px] text-black/50"
              )}
            >
              Demo V2
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-black sm:flex">
          <NavLink
            href="/demo/demo3"
            active={isActive.demo3}
            mode={mode}
            icon={<LayoutDashboard className="h-4 w-4" aria-hidden />}
          >
            清爽版
          </NavLink>
          <NavLink
            href="/demo/demo4"
            active={isActive.demo4}
            mode={mode}
            icon={<LineChart className="h-4 w-4" aria-hidden />}
          >
            大气版
          </NavLink>
          <div className="mx-2 hidden h-6 w-px bg-black/10 sm:block" aria-hidden />
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
              "text-black/70 hover:bg-black/5"
            )}
          >
            能力
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
              "text-black/70 hover:bg-black/5"
            )}
          >
            资源
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden w-[340px] sm:block">
            <Input
              id={mode === "demo3" ? "v2-search-3" : "v2-search-4"}
              name="q"
              aria-label="搜索"
              placeholder="搜索模型 / 厂商 / 标签"
              className="pr-10"
            />
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center",
                "text-black/45"
              )}
            >
              <Search className="h-4 w-4" aria-hidden />
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="平台通知"
              onClick={() => setOpenNotice((v) => !v)}
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 transition-colors",
                "bg-white ring-black/10 hover:bg-black/[0.03]"
              )}
            >
              <Bell className="h-4 w-4 text-black/70" aria-hidden />
              <span
                className={cn(
                  "absolute right-2 top-2 h-2 w-2 rounded-full",
                  accent === "emerald" ? "bg-emerald-500" : "bg-sky-400"
                )}
                aria-hidden
              />
            </button>

            {openNotice ? (
              <div
                role="dialog"
                aria-label="平台通知"
                className={cn(
                  "absolute right-0 top-[calc(100%+10px)] w-[360px] overflow-hidden rounded-2xl ring-1 shadow-sm",
                  "bg-white ring-black/10"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between border-b px-4 py-3",
                    "border-black/10"
                  )}
                >
                  <div className="text-sm font-semibold text-black">
                    平台通知
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenNotice(false)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      "hover:bg-black/5"
                    )}
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4 text-black/60" aria-hidden />
                  </button>
                </div>

                <div className="max-h-[320px] overflow-auto">
                  {SAMPLE_NOTICES.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex gap-3 border-b px-4 py-3",
                        "border-black/10"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-2.5 w-2.5 rounded-full",
                          n.level === "info" && (accent === "emerald" ? "bg-emerald-500" : "bg-sky-400"),
                          n.level === "success" && "bg-emerald-400",
                          n.level === "warning" && "bg-amber-400"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-sm font-medium",
                            "text-black"
                          )}
                        >
                          {n.title}
                        </div>
                        <div className="mt-1 text-xs text-black/50">
                          {n.time}
                        </div>
                      </div>
                      <Sparkles
                        className="h-4 w-4 text-black/25"
                        aria-hidden
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-[rgb(var(--bg))] px-4 py-3">
                  <div className="text-xs text-black/60">
                    通知中心、未读管理、跳转链接等为后续功能预留。
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <Link href="/auth/login" className="hidden sm:inline-flex">
            <Button
              variant="subtle"
            >
              登录/注册
            </Button>
          </Link>

          <button
            type="button"
            aria-label="移动端菜单"
            onClick={() => setOpenMobile((v) => !v)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 sm:hidden",
              "ring-black/10"
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold",
                "text-black/70"
              )}
            >
              MENU
            </span>
          </button>
        </div>
      </div>

      {openMobile ? (
        <div
          className={cn(
            "border-t px-4 py-3 sm:hidden",
            "border-black/10 bg-white/80"
          )}
        >
          <div className="flex flex-col gap-2">
            <Link
              href="/demo/demo3"
              onClick={() => setOpenMobile(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                isActive.demo3 ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
              )}
            >
              清爽版
            </Link>
            <Link
              href="/demo/demo4"
              onClick={() => setOpenMobile(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                isActive.demo4 ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
              )}
            >
              大气版
            </Link>

            <div className="mt-2">
              <Input
                id={mode === "demo3" ? "v2-search-3-mobile" : "v2-search-4-mobile"}
                name="q"
                aria-label="搜索"
                placeholder="搜索模型 / 厂商 / 标签"
              />
            </div>

            <Link href="/auth/login" onClick={() => setOpenMobile(false)}>
              <Button
                variant="subtle"
                className="w-full"
              >
                登录/注册
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  href,
  active,
  mode,
  icon,
  children
}: {
  href: string;
  active: boolean;
  mode: "demo3" | "demo4";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 transition-colors",
        active ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
