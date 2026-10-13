import { BasicPage } from "@/components/common/BasicPage";

export default function ApiDocsPage() {
  return (
    <BasicPage
      title="API 文档"
      description="查看 Aidean API 文档，了解如何集成我们的服务到您的应用中。"
      backHref="/docs"
      backLabel="返回文档中心"
    />
  );
}
