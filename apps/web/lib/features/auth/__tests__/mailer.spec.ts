/**
 * mailer.ts 单元测试（R-58：SMTP 发信封装验证）
 *
 * 覆盖：
 * 1. SMTP 未配置（缺环境变量）→ 返回 false，不抛错，不触发 nodemailer import
 * 2. SMTP 已配置 → mock nodemailer.createTransport，验证调用参数与 sendMail 参数
 * 3. sendMail 抛错 → sendCodeMail 抛出（调用方负责 catch）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock for nodemailer
const { mockTransport } = vi.hoisted(() => {
  const mockTransport = {
    sendMail: vi.fn(),
  };
  return { mockTransport };
});

// Mock nodemailer before importing mailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => mockTransport),
  },
}));

// Save original env
const originalEnv = { ...process.env };

describe("sendCodeMail", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
    mockTransport.sendMail.mockClear();
    mockTransport.sendMail.mockResolvedValue({ messageId: "test-id" });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("SMTP 未配置时返回 false 且不抛错", async () => {
    const { sendCodeMail } = await import("../mailer");
    const result = await sendCodeMail("user@example.com", "123456");
    expect(result).toBe(false);
    expect(mockTransport.sendMail).not.toHaveBeenCalled();
  });

  it("SMTP 已配置时调用 createTransport + sendMail", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_PORT = "465";

    const { sendCodeMail } = await import("../mailer");
    const result = await sendCodeMail("user@example.com", "123456");

    expect(result).toBe(true);
    expect(mockTransport.sendMail).toHaveBeenCalledTimes(1);

    const callArgs = mockTransport.sendMail.mock.calls[0][0];
    expect(callArgs.to).toBe("user@example.com");
    expect(callArgs.subject).toContain("验证码");
    expect(callArgs.text).toContain("123456");
  });

  it("SMTP_FROM 未设置时使用 SMTP_USER 作为发件人", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";

    const { sendCodeMail } = await import("../mailer");
    await sendCodeMail("user@example.com", "123456");

    const callArgs = mockTransport.sendMail.mock.calls[0][0];
    expect(callArgs.from).toBe("noreply@example.com");
  });

  it("SMTP_FROM 已设置时使用自定义发件人", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = '"Aidean" <noreply@example.com>';

    const { sendCodeMail } = await import("../mailer");
    await sendCodeMail("user@example.com", "123456");

    const callArgs = mockTransport.sendMail.mock.calls[0][0];
    expect(callArgs.from).toBe('"Aidean" <noreply@example.com>');
  });

  it("sendMail 抛错时 sendCodeMail 也抛错", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";
    mockTransport.sendMail.mockRejectedValue(new Error("SMTP connection refused"));

    const { sendCodeMail } = await import("../mailer");
    await expect(sendCodeMail("user@example.com", "123456")).rejects.toThrow(
      "SMTP connection refused"
    );
  });
});
