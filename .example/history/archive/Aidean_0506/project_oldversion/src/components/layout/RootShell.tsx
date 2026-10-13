"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SiteAuthModal } from "@/components/auth/SiteAuthModal";
import { GitChatWidget } from "@/components/common/GitChatWidget";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteLangProvider, useSiteLang } from "@/lib/config/siteLang";
import { SiteThemeProvider } from "@/lib/config/siteTheme";

export function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isDemoPage = pathname.startsWith("/demo/");
  const isHomePage = pathname === "/";
  const isModelLadderPage = pathname === "/models" || pathname.startsWith("/models/");

  if (isDemoPage)
    return (
      <>
        {children}
        <GitChatWidget />
      </>
    );

  return (
    <SiteThemeProvider>
      <SiteLangProvider>
        <RootShellInner isHomePage={isHomePage} isModelLadderPage={isModelLadderPage}>
          {children}
        </RootShellInner>
      </SiteLangProvider>
    </SiteThemeProvider>
  );
}

function RootShellInner({
  children,
  isHomePage,
  isModelLadderPage,
}: {
  children: ReactNode;
  isHomePage: boolean;
  isModelLadderPage: boolean;
}) {
  const { lang, setLang } = useSiteLang();
  const [authOpen, setAuthOpen] = useState(false);

  const homeTopBgClassName = "bg-[#DBDFF9]";

  return (
    <>
      <SiteHeader
        lang={lang}
        onLangChange={setLang}
        onAuthClick={() => setAuthOpen(true)}
        headerClassName={isHomePage ? `${homeTopBgClassName} border-transparent backdrop-blur-none` : undefined}
      />
      <main className="mx-auto w-full max-w-[1920px] min-h-screen">
        {children}
      </main>
      <SiteFooter />
      <GitChatWidget />
      <SiteAuthModal open={authOpen} initialMode="login" onClose={() => setAuthOpen(false)} />
    </>
  );
}

