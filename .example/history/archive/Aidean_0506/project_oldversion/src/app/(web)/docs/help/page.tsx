import { BasicPage } from "@/components/common/BasicPage";

export default function HelpPage() {
  return (
    <BasicPage
      title="帮助中心"
      description="查看帮助文档，快速了解如何使用 Aidean 平台的各项功能。"
      backHref="/docs"
      backLabel="返回文档中心"
    />
  );
}
