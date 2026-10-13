import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { getSiteBranding, buildDocumentTitle } from "../lib/site-config";

/**
 * 根布局（rebuild-admin-console-and-harden-auth Phase 1 拆分后）：
 * 仅承载全局基座（html/body/ThemeProvider/globals.css）。
 * SiteHeader/SiteFooter 已下放至 (site) 组布局——前台与管理端 (admin) 信息架构
 * 隔离，管理端不再被强制注入前台头尾（需求 3/10/11）。
 * metadataBase（Phase 5 收口）：显式锚定站点 origin，消除构建期
 * 「metadata.metadataBase is not set」告警并保证 og/绝对链接稳定（与 AUTH_ISSUER 同约定）。
 *
 * S4「站点可见即可改」：metadata 由静态常量升级为 `generateMetadata`，消费 system_configs
 * site.*（站名/浏览器标题/描述/SEO 关键词/Logo→OG 图/Favicon）。DB 不可用时 getSiteBranding
 * 回退默认（构建期无库连接亦不报错），满足「改站名即时前台生效 + 库挂不白屏」。
 */
export async function generateMetadata(): Promise<Metadata> {
  const b = await getSiteBranding();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: buildDocumentTitle(b),
    description: b.description,
    keywords: b.keywords || undefined,
    icons: { icon: b.faviconUrl || "/aidean-logo.png" },
    openGraph: {
      title: buildDocumentTitle(b),
      description: b.description,
      images: b.logoUrl ? [{ url: b.logoUrl }] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
