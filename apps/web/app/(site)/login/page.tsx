// /login —— 邮箱密码登录页（Task A.3.2）。面包屑 + H1 与 (web) 一级路由壳同风格。
import { AuthForm } from "../../../components/auth/AuthForm";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";

export default function LoginPage() {
  return (
    <PagePlaceholder title="登录" description="使用邮箱与密码登录 Aidean 账号。">
      <AuthForm mode="login" />
    </PagePlaceholder>
  );
}
