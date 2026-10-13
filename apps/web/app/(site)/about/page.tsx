// /about —— 关于 Aidean：平台介绍 + 联系方式（#contact 锚点）。
// 关键信息后台可配置：about.contactEmail / about.wechatQrUrl（SystemConfig，GET 兜底默认值）。
// 二维码为空串时渲染显式「二维码待上传」占位 UI（不引用占位图片文件）；展示尺寸固定，不随上传素材变化。
// 页头统一走 PagePlaceholder（与其他一级页面同构）。
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { isSafeMediaUrl } from "@aidean/shared";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { SafeImage } from "../../../components/common/SafeImage";

export const metadata: Metadata = {
  title: "关于 · Aidean",
  description: "了解 Aidean：AI 模型与云服务天梯图平台，公开透明、按量计费、拒绝黑箱定价。",
};

/** 与 shared admin-config.constants 默认值保持一致（GET 兜底用）；qrUrl 空串=显示待上传占位 */
const DEFAULT_CONTACT_EMAIL = "591547726@qq.com";

async function loadAboutConfig(): Promise<{ email: string; qrUrl: string }> {
  try {
    const { prisma } = await import("../../../lib/db/prisma");
    const rows = await prisma.systemConfig.findMany({
      where: { configKey: { in: ["about.contactEmail", "about.wechatQrUrl"] } },
      select: { configKey: true, configValue: true },
    });
    const email = rows.find((r) => r.configKey === "about.contactEmail")?.configValue;
    const qrUrl = rows.find((r) => r.configKey === "about.wechatQrUrl")?.configValue;
    return {
      email: email && email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : DEFAULT_CONTACT_EMAIL,
      qrUrl: qrUrl && qrUrl.length > 0 && isSafeMediaUrl(qrUrl) ? qrUrl : "",
    };
  } catch {
    // DB 不可用时页面保持可出：邮箱回退默认，二维码显示待上传占位
    return { email: DEFAULT_CONTACT_EMAIL, qrUrl: "" };
  }
}

// 缓存策略（2026-09-23 性能改造）：原 force-dynamic 每次进入都完整 SSR 且无法被 Link 预取。
// 改为 ISR；about 两键的保存已补 revalidatePath("/about")（见 app/api/v1/admin/configs/route.ts）。
export const revalidate = 300;

export default async function AboutPage() {
  const { email, qrUrl } = await loadAboutConfig();
  return (
    <PagePlaceholder
      title="关于"
      description="公开透明的 AI 模型服务平台：以模型与云服务天梯图为起点，把「选模型、比价格、管调用」做成看得见的过程——排行可查、单价可见、用量可核，拒绝黑箱定价。"
    >
      <section aria-labelledby="about-what" className="mb-14 grid gap-6 md:grid-cols-3">
        {[
          { title: "透明", text: "性能排行、实测口径与展示规则公开；计费明细只呈现上游官方单价与实际 Token 数。" },
          { title: "实用", text: "从天梯图选型到控制台调用，一站式完成筛选、配置、验证与用量管理。" },
          { title: "克制", text: "只发布已确认的信息；不夸大宣传、不虚构成绩，产品资料随沟通持续完善。" },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="mt-2.5 text-sm leading-7 text-muted-foreground">{item.text}</p>
          </article>
        ))}
      </section>

      <section id="contact" aria-labelledby="about-contact" className="scroll-mt-24 rounded-2xl border border-border bg-card p-7 sm:p-9">
        <h2 id="about-contact" className="text-xl font-semibold tracking-tight">联系我们</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          合作洽谈、产品咨询或问题反馈，欢迎通过邮箱或微信联系；为便于定位问题，请在邮件中附上发生时间、相关页面与脱敏后的错误提示（勿附密码、密钥等敏感凭证）。
        </p>
        <div className="mt-7 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Mail size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">邮箱</p>
                <a href={`mailto:${email}`} className="mt-1 block break-all text-sm text-primary underline underline-offset-4">
                  {email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <MessageCircle size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">微信</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">扫描右侧二维码添加；二维码图片可在后台更换，展示尺寸固定不变。</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">使用与反馈</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  使用问题可先查阅 <Link href="/docs" className="text-primary underline underline-offset-4">文档中心</Link>；功能建议欢迎邮件说明场景与期望。
                </p>
              </div>
            </div>
          </div>
          <figure className="justify-self-start md:justify-self-end">
            {qrUrl ? (
              <SafeImage src={qrUrl} alt="Aidean 微信二维码" ratio="square" fit="contain" placeholder="二维码加载失败" />
            ) : (
              <div
                role="img"
                aria-label="微信二维码：待上传"
                className="flex aspect-square w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 text-center"
              >
                <MessageCircle size={28} className="text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">二维码待上传</p>
                <p className="text-xs leading-5 text-muted-foreground">在后台「站点配置 → 联系方式」上传后自动替换此占位</p>
              </div>
            )}
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">微信扫码联系 · 展示尺寸固定为 200px 方形</figcaption>
          </figure>
        </div>
      </section>
    </PagePlaceholder>
  );
}
