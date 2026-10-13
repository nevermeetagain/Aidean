"use client";

import Link from "next/link";
import { Github, Mail, Twitter, Youtube } from "lucide-react";

import { useSiteLang } from "@/lib/config/siteLang";
import { useSiteTheme } from "@/lib/config/siteTheme";

export function SiteFooter() {
  const { resolvedMode } = useSiteTheme();
  const isDark = resolvedMode === "dark";

  const { lang } = useSiteLang();

  const TEXT = {
    zh: {
      brandSub: "AI 模型天梯图",
      desc: "Built for high-density model comparison.",
      sections: {
        product: "产品",
        company: "公司",
        resources: "资源",
        connect: "联系",
      },
      links: {
        ladder: "性能天梯图",
        value: "性价比排行",
        open: "开源模型榜",
        about: "关于我们",
        coop: "合作信息",
        contact: "联系我们",
        docs: "文档",
        changelog: "更新日志",
      },
      legal: { terms: "条款", privacy: "隐私", security: "安全" },
      qrcode: { official: "公众号二维码", group: "官方交流群二维码" },
    },
    en: {
      brandSub: "AI Ladder",
      desc: "Built for high-density model comparison.",
      sections: {
        product: "Product",
        company: "Company",
        resources: "Resources",
        connect: "Connect",
      },
      links: {
        ladder: "Model Ladder",
        value: "Value Ranking",
        open: "Open-Source Models",
        about: "About",
        coop: "Partnership",
        contact: "Contact",
        docs: "Docs",
        changelog: "Changelog",
      },
      legal: { terms: "Terms", privacy: "Privacy", security: "Security" },
      qrcode: { official: "WeChat Official", group: "WeChat Group" },
    },
    ja: {
      brandSub: "AI ラダー",
      desc: "Built for high-density model comparison.",
      sections: {
        product: "製品",
        company: "会社",
        resources: "リソース",
        connect: "連絡",
      },
      links: {
        ladder: "性能ラダー",
        value: "コスパランキング",
        open: "OSS モデル",
        about: "私たちについて",
        coop: "提携",
        contact: "お問い合わせ",
        docs: "ドキュメント",
        changelog: "更新履歴",
      },
      legal: { terms: "利用規約", privacy: "プライバシー", security: "セキュリティ" },
      qrcode: { official: "WeChat 公式", group: "WeChat グループ" },
    },
  } as const;

  const t = (TEXT as any)[lang] ?? TEXT.zh;
  const shellClass = isDark ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50";
  const headingClass = isDark ? "text-slate-100" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-300" : "text-slate-600";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const ringClass = isDark ? "ring-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100" : "ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700";
  const qrClass = isDark ? "bg-slate-900 ring-slate-700" : "bg-slate-50 ring-slate-200";

  return (
    <footer className={`border-t ${shellClass}`}>
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/images/icons/logo.svg" alt="Aidean" className="h-9 w-9" />
                <div className="min-w-0">
                  <div className={`text-lg font-bold leading-none ${headingClass}`}>Aidean</div>
                  <div className={`mt-0.5 text-[11px] leading-none ${mutedClass}`}>{t.brandSub}</div>
                </div>
              </Link>
              <div className={`mt-4 text-sm leading-6 ${bodyClass}`}>
                {t.desc}
              </div>
              <div className="mt-5 flex items-center gap-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${ringClass}`}
                  aria-label="Github"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${ringClass}`}
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${ringClass}`}
                  aria-label="Youtube"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <div className={`text-xs font-semibold tracking-wide ${headingClass}`}>{t.sections.product}</div>
                  <div className={`mt-3 space-y-2 text-sm ${bodyClass}`}>
                    <Link href="/aidean" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.ladder}</Link>
                    <Link href="/aidean/mobile" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.value}</Link>
                    <Link href="/aidean/image" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.open}</Link>
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold tracking-wide ${headingClass}`}>{t.sections.company}</div>
                  <div className={`mt-3 space-y-2 text-sm ${bodyClass}`}>
                    <Link href="/about" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.about}</Link>
                    <Link href="/about/cooperation" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.coop}</Link>
                    <Link href="/about/contact" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.contact}</Link>
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold tracking-wide ${headingClass}`}>{t.sections.resources}</div>
                  <div className={`mt-3 space-y-2 text-sm ${bodyClass}`}>
                    <Link href="/docs/help" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.docs}</Link>
                    <Link href="/docs/help-center" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>{t.links.changelog}</Link>
                    <Link href="/docs/api" className={`block ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>API</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className={`text-xs font-semibold tracking-wide ${headingClass}`}>{t.sections.connect}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className={`aspect-square overflow-hidden rounded-xl ring-1 ${qrClass}`}
                >
                  <img src="/images/qrcodes/wechat-official.jpg" alt={t.qrcode.official} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div
                  className={`aspect-square overflow-hidden rounded-xl ring-1 ${qrClass}`}
                >
                  <img src="/images/qrcodes/wechat-group.png" alt={t.qrcode.group} className="h-full w-full object-cover" loading="lazy" />
                </div>
              </div>
              <div className={`mt-4 space-y-2 text-sm ${bodyClass}`}>
                <a href="mailto:164093410@qq.com" className={`flex items-center gap-2 ${isDark ? "hover:text-slate-100" : "hover:text-slate-900"}`}>
                  <Mail className={`h-4 w-4 ${mutedClass}`} />
                  164093410@qq.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t py-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div className={`flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between ${mutedClass}`}>
            <div>© {new Date().getFullYear()} Aidean. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link href="/docs/help-center" className={isDark ? "hover:text-slate-100" : "hover:text-slate-900"}>{t.legal.terms}</Link>
              <Link href="/docs/help-center" className={isDark ? "hover:text-slate-100" : "hover:text-slate-900"}>{t.legal.privacy}</Link>
              <Link href="/docs/help-center" className={isDark ? "hover:text-slate-100" : "hover:text-slate-900"}>{t.legal.security}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
