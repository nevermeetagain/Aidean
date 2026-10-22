// /admin/protocols —— 旧路由保留（UX-26 裁定 8）：协议矩阵已并入「兼容矩阵」，重定向到对应 Tab。
// 页面文件保留（admin page.tsx 数量 34 不变），旧书签/深链继续可用。
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminProtocolsPage(): never {
  redirect("/admin/capabilities?tab=protocol");
}
