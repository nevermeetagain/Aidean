/**
 * 站内回跳参数安全校验（AUTH-01 / RC-02 重定向 origin 一致性体系）。
 *
 * Contract：登录回跳参数（redirect）只允许站内相对路径——
 *   1. 必须以单个 "/" 开头（相对当前 origin 解析，永不逃逸到外部）；
 *   2. 拒绝 "//" 协议相对形态（//evil.com 会被浏览器解析为外部 origin）；
 *   3. 拒绝 "/\" 形态（WHATWG URL 对 special scheme 将反斜杠归一为斜杠，
 *      防御性拒绝，避免解析器差异导致逃逸）；
 *   4. 其余任意 scheme（http:/javascript: 等）因不以 "/" 开头天然被拒。
 *
 * 消费端（AuthForm / AdminLoginForm）统一走本函数，禁止再内联 startsWith 判断，
 * 保证校验语义单一来源、可测试、Edge/Node 行为一致（纯字符串判断，无运行时依赖）。
 */
export function isSafeInternalRedirect(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  return true;
}
