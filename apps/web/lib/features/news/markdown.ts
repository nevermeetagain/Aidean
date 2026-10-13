/**
 * 资讯 Markdown → HTML 渲染管道（news-admin-cms）。
 *
 * 库内只存 Markdown；本模块负责【归一化（normalize.ts，浏览器安全，供后台预览共用）
 * → marked 解析 → sanitize-html 白名单净化】。输出永不含可执行脚本/事件属性。
 * sanitize-html 为 node-only，本文件仅服务端引用。
 */
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

import { isSafeMediaUrl } from "@aidean/shared";

import { normalizeNewsMarkdown } from "./normalize";

export { normalizeNewsMarkdown, summarizeMarkdown, isBalancedParens } from "./normalize";

const marked = new Marked({ gfm: true, breaks: true });

const ALLOWED_TAGS = [
  "p", "br", "hr", "h2", "h3", "h4", "h5",
  "strong", "b", "em", "i", "del", "s",
  "blockquote", "ul", "ol", "li", "code", "pre",
  "a", "img", "table", "thead", "tbody", "tr", "th", "td",
];

export const NEWS_MARKDOWN_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // a 的 target/rel 由 transformTags 注入，必须在白名单内否则会被 sanitize-html 二次剥除。
  allowedAttributes: { a: ["href", "title", "target", "rel"], img: ["src", "alt", "title"] },
  allowedSchemes: ["http", "https", "mailto"],
  selfClosing: ["br", "hr", "img"],
  transformTags: {
    a: (_tag, attribs) => {
      const href = (attribs.href ?? "").replace(/\s+/g, "");
      if (/^(javascript|data|vbscript|file):/i.test(href)) return { tagName: "span", attribs: {} };
      const external = /^https?:/i.test(href);
      return {
        tagName: "a",
        attribs: {
          href,
          ...(attribs.title ? { title: attribs.title } : {}),
          ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
        },
      };
    },
    // 非白名单媒体域（对齐 SafeImage 口径）的图片整体丢弃（无子节点，文本不残留）。
    img: (_tag, attribs) => {
      const src = attribs.src ?? "";
      return isSafeMediaUrl(src, "image")
        ? { tagName: "img", attribs: { src, ...(attribs.alt ? { alt: attribs.alt } : {}), ...(attribs.title ? { title: attribs.title } : {}) } }
        : { tagName: "span", attribs: {} };
    },
  },
};

/** Markdown → 净化后的 HTML 字符串（服务端 SSR 用；sanitize-html 为 node-only，勿入客户端 bundle）。 */
export function renderNewsMarkdown(raw: string): string {
  const html = marked.parse(normalizeNewsMarkdown(raw), { async: false }) as string;
  return sanitizeHtml(html, NEWS_MARKDOWN_SANITIZE_OPTIONS);
}
