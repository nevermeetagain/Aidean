// S4「可见即可改」：/docs 文档中心由 SystemConfig（docs.articles）驱动。
// 拆分：本文件为 RSC（读配置，DB 不可用回退默认），交互（搜索/哈希导航）在 DocsReader 客户端组件。
import { getDocsArticles } from "../../../lib/features/docs/config";
import { DocsReader } from "../../../components/docs/DocsReader";

export const revalidate = 300;

export default async function DocsPage() {
  const articles = await getDocsArticles();
  return <DocsReader articles={articles} />;
}
