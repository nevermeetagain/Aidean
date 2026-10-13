import { BasicPage } from "@/components/common/BasicPage";

export default function HelpCenterPage() {
  return (
    <BasicPage
      title="帮助文档"
      description="查看所有帮助文档，获取详细的使用指南和操作说明。"
      backHref="/docs"
      backLabel="返回文档中心"
    />
  );
}
