import { SiteHeader } from "../../components/site/SiteHeader";
import { SiteFooter } from "../../components/site/SiteFooter";
import { CompareDock } from "../../components/site/CompareDock";

/**
 * (site) 组布局：前台页面（首页/模型/天梯/价格/登录注册/用户区等）统一挂载
 * 站点头尾。组名不参与 URL，拆分前后路由完全一致；/admin 位于 (admin) 组，
 * 不经本布局（管理端独立外壳，见 (admin)/layout.tsx）。
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <CompareDock />
    </>
  );
}
