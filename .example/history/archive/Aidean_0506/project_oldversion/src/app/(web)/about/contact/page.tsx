import { BasicPage } from "@/components/common/BasicPage";

export default function ContactPage() {
  return (
    <BasicPage
      title="联系我们"
      description="如有任何问题或建议，请随时与我们联系。我们期待听到您的声音。"
      backHref="/about"
      backLabel="返回关于我们"
    />
  );
}
