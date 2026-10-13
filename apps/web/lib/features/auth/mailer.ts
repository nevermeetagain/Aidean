/**
 * SMTP 发信封装（登录方案实施手册 M4 E-S1）：通道无关——凭据全部走环境变量，
 * 163 SMTP（测试期）/ 腾讯云 SES SMTP（正式）均可，切换只改配置不改代码。
 *
 * 环境变量：SMTP_HOST / SMTP_PORT（默认 465）/ SMTP_USER / SMTP_PASS / SMTP_FROM。
 *
 * nodemailer 按需动态加载：未配置 SMTP 时不触发模块解析（依赖已声明于 package.json ^10.0.10）；
 * 启用真实发信只需设置 SMTP 环境变量即可，无需额外安装。
 * 未配置 SMTP 时验证码仅打服务端日志（dev/测试兜底），绝不通过 HTTP 响应返回。
 */

export async function sendCodeMail(to: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.info(`[email-code] SMTP 未配置，验证码（仅服务端日志可见）：${to} -> ${code}`);
    return false;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? user,
    to,
    subject: "Aidean 登录验证码",
    text: `你的验证码是 ${code}，5 分钟内有效。若非本人操作请忽略本邮件。`,
  });
  return true;
}
