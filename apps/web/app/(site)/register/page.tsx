// /register —— 邮箱密码注册页（Task A.3.2）。面包屑 + H1 与 (web) 一级路由壳同风格。
import { AuthForm } from "../../../components/auth/AuthForm";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";

export default function RegisterPage() {
  return (
    <PagePlaceholder title="注册" description="创建新的 Aidean 账号，昵称用于社区展示。">
      <AuthForm mode="register" />
    </PagePlaceholder>
  );
}
