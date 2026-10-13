/**
 * Admin登录页独立layout
 * 不包裹AdminShell（侧边栏/头部），全屏居中登录表单
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

