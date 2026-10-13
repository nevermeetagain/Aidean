"use client";

import Link from "next/link";
import { Github, Mail, Twitter, Youtube } from "lucide-react";

import { useSiteLang } from "@/lib/config/siteLang";
import { useSiteTheme } from "@/lib/config/siteTheme";

export function SiteFooter() {
  const { resolvedMode } = useSiteTheme();

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

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/images/icons/logo.svg" alt="Aidean" className="h-9 w-9" />
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-none text-slate-900">Aidean</div>
                  <div className="mt-0.5 text-[11px] leading-none text-slate-400">{t.brandSub}</div>
                </div>
              </Link>
              <div className="mt-4 text-sm leading-6 text-slate-600">
                {t.desc}
              </div>
              <div className="mt-5 flex items-center gap-2">
                <a
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Github"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Youtube"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold tracking-wide text-slate-900">{t.sections.product}</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <a href="#" className="block hover:text-slate-900">{t.links.ladder}</a>
                    <a href="#" className="block hover:text-slate-900">{t.links.value}</a>
                    <a href="#" className="block hover:text-slate-900">{t.links.open}</a>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wide text-slate-900">{t.sections.company}</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <a href="#" className="block hover:text-slate-900">{t.links.about}</a>
                    <a href="#" className="block hover:text-slate-900">{t.links.coop}</a>
                    <a href="#" className="block hover:text-slate-900">{t.links.contact}</a>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wide text-slate-900">{t.sections.resources}</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <a href="#" className="block hover:text-slate-900">{t.links.docs}</a>
                    <a href="#" className="block hover:text-slate-900">{t.links.changelog}</a>
                    <a href="#" className="block hover:text-slate-900">API</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="text-xs font-semibold tracking-wide text-slate-900">{t.sections.connect}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className="aspect-square overflow-hidden rounded-xl ring-1 bg-slate-50 ring-slate-200"
                >
                  <img src="/images/qrcodes/wechat-official.jpg" alt={t.qrcode.official} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div
                  className="aspect-square overflow-hidden rounded-xl ring-1 bg-slate-50 ring-slate-200"
                >
                  <img src="/images/qrcodes/wechat-group.png" alt={t.qrcode.group} className="h-full w-full object-cover" loading="lazy" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <a href="mailto:164093410@qq.com" className="flex items-center gap-2 hover:text-slate-900">
                  <Mail className="h-4 w-4 text-slate-400" />
                  164093410@qq.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t py-4 border-slate-200">
          <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between text-slate-500">
            <div>© {new Date().getFullYear()} Aidean. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-900">{t.legal.terms}</a>
              <a href="#" className="hover:text-slate-900">{t.legal.privacy}</a>
              <a href="#" className="hover:text-slate-900">{t.legal.security}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
