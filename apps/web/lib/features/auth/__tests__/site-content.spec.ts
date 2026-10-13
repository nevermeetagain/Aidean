import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSafeMediaUrl, PARTNER_DEFAULTS, PARTNER_CONFIG_KEYS, parsePartnerContent, PartnerContentSchema } from "@aidean/shared";
const db = vi.hoisted(() => ({ systemConfig: { findMany: vi.fn(), upsert: vi.fn() } }));
const auth = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
vi.mock("../../../db/prisma", () => ({ prisma: db }));
vi.mock("../session", () => auth);
vi.mock("../../../../app/api/v1/_lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import PartnersPage from "../../../../app/(site)/partners/page";
import AboutPage from "../../../../app/(site)/about/page";
import { SafeImage } from "../../../../components/common/SafeImage";
import { SiteContentEditor } from "../../../../components/admin/SiteContentEditor";
import { PUT } from "../../../../app/api/v1/admin/configs/route";

beforeEach(() => { vi.resetAllMocks(); auth.requireAdminApi.mockResolvedValue({ userId: "admin" }); });
describe("partner media contract", () => {
  it.each(["javascript:alert(1)", "data:image/png;base64,a", "//evil.test/a.png", "/images/../a.png", "/images/%2e%2e/a.png", "/images/a.svg", "/api/private.png", "https://u:p@example.com/a.png", "https://a.test/a.html", "https://a.test/" + "x".repeat(500) + ".png"])("rejects %s", (url) => expect(isSafeMediaUrl(url)).toBe(false));
  it.each(["/images/a.png", "/media/demo.webp", "https://cdn.example/a.jpg?v=1", "http://cdn.example/a.avif"])("accepts %s", (url) => expect(isSafeMediaUrl(url)).toBe(true));
  it("bounds arrays and accepts only direct video formats", () => {
    expect(PartnerContentSchema.safeParse({ ...PARTNER_DEFAULTS[0], images: Array(7).fill('/images/a.png') }).success).toBe(false);
    expect(isSafeMediaUrl("https://example.com/a.mp4", "video")).toBe(true);
    expect(isSafeMediaUrl("https://example.com/embed", "video")).toBe(false);
    expect(parsePartnerContent('{"bad":true}', 1).title).toBe("论文辅导");
  });
});
describe("partner read, write and UI", () => {
  it("writes validated JSON via existing authenticated upsert", async () => {
    db.systemConfig.upsert.mockResolvedValue({});
    const value = { ...PARTNER_DEFAULTS[0], title: "新的标题", coverUrl: "/images/a.png", images: ["/media/b.webp"], videoUrl: "/media/demo.mp4" };
    const response = await PUT(new Request("http://localhost/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: PARTNER_CONFIG_KEYS[0], configValue: JSON.stringify(value) }) }));
    expect(response.status).toBe(200);
    expect(auth.requireAdminApi).toHaveBeenCalledOnce();
    expect(db.systemConfig.upsert.mock.calls[0]![0].update.configValue).toBe(JSON.stringify(value));
  });
  it("rejects unsafe media before persistence", async () => {
    const response = await PUT(new Request("http://localhost/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: PARTNER_CONFIG_KEYS[0], configValue: JSON.stringify({ ...PARTNER_DEFAULTS[0], coverUrl: "javascript:alert(1)" }) }) }));
    expect(response.status).toBe(400); expect(db.systemConfig.upsert).not.toHaveBeenCalled();
  });
  it("renders defaults on unavailable DB and no fabricated media", async () => {
    db.systemConfig.findMany.mockRejectedValue(new Error("offline"));
    const html = renderToStaticMarkup(await PartnersPage());
    for (const p of PARTNER_DEFAULTS) expect(html).toContain(p.title);
    // DB 不可用时 parsePartnerContent 回退到 PARTNER_DEFAULTS，其 coverUrl 已有具体封面（非空），
    // 故渲染具体封面而非 default-cover.webp；同时验证无「图片待补充」文字占位和 <video>。
    for (const p of PARTNER_DEFAULTS) expect(html).toContain(p.coverUrl);
    expect(html).not.toContain("图片待补充"); expect(html).not.toContain("<video");
  });
  it("renders saved content, bounded media, and honors disabled records", async () => {
    db.systemConfig.findMany.mockResolvedValue(PARTNER_CONFIG_KEYS.map((key, i) => ({ configKey: key, configValue: JSON.stringify({ ...PARTNER_DEFAULTS[i], enabled: i === 0, title: "已保存内容", videoUrl: "/media/demo.mp4", images: ["/images/a.png"] }) })));
    const html = renderToStaticMarkup(await PartnersPage());
    expect(html).toContain("已保存内容"); expect(html).not.toContain("论文辅导"); expect(html).toContain('preload="none"'); expect(html).toContain('max-height:432px'); expect(html).not.toContain('autoplay');
  });
  it("safe image rejects unsafe URLs and fixes ratio", () => {
    const html = renderToStaticMarkup(React.createElement(SafeImage, { src: "javascript:bad", alt: "封面", ratio: "square" }));
    expect(html).not.toContain("<img"); expect(html).toContain("max-width:200px"); expect(html).toContain("aspect-ratio:1 / 1");
  });
  it("admin exposes descriptive structured labels instead of raw JSON", () => {
    const html = renderToStaticMarkup(React.createElement(SiteContentEditor));
    for (const label of ["产品标题", "小标题", "产品描述", "封面图片 URL", "多张展示图片", "补充说明", "介绍视频 URL"]) expect(html).toContain(label);
  });
  it("about contact shows admin-editable email, placeholder UI instead of SVG, and no visible typos", async () => {
    db.systemConfig.findMany.mockRejectedValue(new Error("offline"));
    const html = renderToStaticMarkup(await AboutPage());
    expect(html).toContain("591547726@qq.com");
    expect(html).toContain("功能建议欢迎邮件");
    expect(html).not.toContain("\uFFFD");
    expect(html).not.toContain("wechat-qr-placeholder");
    expect(html).toContain("二维码待上传");
  });
});
