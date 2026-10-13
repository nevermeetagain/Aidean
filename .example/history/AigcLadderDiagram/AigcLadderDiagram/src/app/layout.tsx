import type { Metadata } from "next";
import "./globals.css";
import { getSiteConfig } from "@/lib/services/system.service";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Aidean";
  let siteDesc = "AI模型天梯图平台";
  let faviconUrl = "/images/icons/logo.svg";
  let siteTitle = "";

  try {
    const config = await getSiteConfig();
    siteName = config.siteName;
    siteDesc = config.siteDesc;
    faviconUrl = config.faviconUrl;
    siteTitle = config.siteTitle;
  } catch {
    // 数据库未就绪时使用默认值
  }

  const title = siteTitle || siteName;

  return {
    title,
    description: siteDesc,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
