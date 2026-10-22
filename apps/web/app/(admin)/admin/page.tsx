// /admin —— 管理端概览（SubTask 1.4.1）。守卫由 (admin)/layout.tsx 统一承担，
// 本页只做实时统计（prisma count）与常用入口，不再重复角色复核。
// 视觉（UI 重构）：浅色冷色卡片 + 主色图标位 + hover 抬升；数据口径不变。
import Link from "next/link";

import { ReportsBoard } from "../../../components/admin/ReportsBoard";
import { prisma } from "../../../lib/db/prisma";
import { getSession } from "../../../lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "../../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [userCount, modelCount, vendorCount, redemptionCount] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.aiModel.count(),
    prisma.vendor.count(),
    prisma.redemption.count(),
  ]);

  // S9（B2）：报表含充值收入金额，概览紧凑看板与“完整运营报表”入口按 admin.reports.read 条件渲染（无此码角色隐藏，与端点/侧栏同口径）。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canViewReports = !!perms && hasPermission(perms, "admin.reports.read");

  const stats = [
    { label: "有效用户", value: userCount, href: "/admin/users", hint: "注册账号（未软删）" },
    { label: "模型总数", value: modelCount, href: "/admin/models", hint: "含上架与下架" },
    { label: "厂商总数", value: vendorCount, href: "/admin/vendors", hint: "厂商管理" },
    { label: "兑换码累计", value: redemptionCount, href: "/admin/redemptions", hint: "历史生成总数" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">概览</h1>
        <p className="mt-1 text-sm text-slate-500">平台核心数据的实时快照。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
          >
            <p className="text-xs font-medium text-slate-400">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-1 text-[11px] text-slate-400">{s.hint}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              前往管理
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-none stroke-current stroke-[1.6]" aria-hidden="true">
                <path d="M4 2.5L7.5 6 4 9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-slate-800">快捷入口</h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link
            href="/admin/configs"
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            站点配置（天梯参数 / 厂商优先级）
          </Link>
          <Link
            href="/admin/redemptions"
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            兑换码批次 / 卡商密钥
          </Link>
          {canViewReports && (
            <Link
              href="/admin/reports"
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              完整运营报表
            </Link>
          )}
          <Link
            href="/"
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            查看主站
          </Link>
        </div>
      </div>

      {/* S2r（B1 裁决）：概览仅留紧凑版报表（KPI 卡 + 趋势图）；S9（B2）：仅 admin.reports.read 持有者可见 */}
      {canViewReports && <ReportsBoard variant="compact" />}
    </div>
  );
}
