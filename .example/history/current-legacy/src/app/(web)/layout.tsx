"use client";

import { SiteThemeProvider } from "@/lib/config/siteTheme";
import { SiteLangProvider } from "@/lib/config/siteLang";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteAuthModal } from "@/components/auth/SiteAuthModal";
import { GitChatWidget } from "@/components/common/GitChatWidget";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isHomePage = pathname === "/";
  const [authOpen, setAuthOpen] = useState(false);
  const homeTopBgClassName = "bg-[#DBDFF9]";

  return (
    <SiteThemeProvider>
      <SiteLangProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeader
            onAuthClick={() => setAuthOpen(true)}
            headerClassName={isHomePage ? `${homeTopBgClassName} border-transparent backdrop-blur-none` : undefined}
          />
          <main className="mx-auto w-full max-w-[1920px] min-h-screen flex-1 pt-16">{children}</main>
          <SiteFooter />
          <GitChatWidget />
          <SiteAuthModal open={authOpen} initialMode="login" onClose={() => setAuthOpen(false)} />
        </div>
      </SiteLangProvider>
    </SiteThemeProvider>
  );
}
