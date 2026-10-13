// 关于：项目简介（Server Component）。
// S8 CMS 化：正文由首页 RSC 从 about.body 配置读入后以 props 下传（缺省回退 shared 默认正文）；
// 纯文本按换行切段渲染为多个 <p>，不注入 HTML（避免 XSS）。
import { ABOUT_BODY_DEFAULT, splitAboutParagraphs } from "@aidean/shared";
import { RevealOnScroll } from "./RevealOnScroll";
import { Badge } from "@aidean/ui";

export function AboutSection({ body = ABOUT_BODY_DEFAULT }: { body?: string }) {
  const paragraphs = splitAboutParagraphs(body);
  return (
    <RevealOnScroll>
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-sm)] md:p-9">
        <Badge variant="secondary" className="mb-3">关于平台</Badge>
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-3xl text-sm leading-loose text-slate-600 md:text-[15px]">
            {p}
          </p>
        ))}
      </div>
    </RevealOnScroll>
  );
}
