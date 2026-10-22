// /admin/configs —— 站点配置页（SubTask 1.4.2 → S4「站点可见即可改」全量）。
// 守卫由 (admin)/layout.tsx 承担。面板为浅色冷色卡片，与管理端外壳同令牌体系。
// 2026-09-28 增 RoadmapEditor：路线图里程碑后台编辑（roadmap.milestones 键）。
// S4 增 SiteBrandingEditor/HomeContentEditor/DocsEditor：站名/SEO/首页文案/帮助文档全部后台可改。
// UX-26 裁定 7（2026-10-22）：页内分 Tab（?tab= 可深链 / 刷新保持），每次只渲染当前 Tab 的编辑器，
// 取代原「一页铺开 10 个编辑器（404 个交互元素）」；低频的天梯呈现参数与排名权重归入独立 Tab。
import { AdminConfigPanel } from "../../../../components/admin/AdminConfigPanel";
import { AdminPageTabs, resolveAdminTab } from "../../../../components/admin/AdminPageTabs";
import { AboutContactEditor, SiteContentEditor } from "../../../../components/admin/SiteContentEditor";
import { RoadmapEditor } from "../../../../components/admin/RoadmapEditor";
import { SiteBrandingEditor } from "../../../../components/admin/SiteBrandingEditor";
import { HomeContentEditor } from "../../../../components/admin/HomeContentEditor";
import { DocsEditor } from "../../../../components/admin/DocsEditor";
import { AboutBodyEditor, PartnerMarqueeEditor } from "../../../../components/admin/HomeSectionsEditor";
import { RankingWeightsEditor } from "../../../../components/admin/RankingWeightsEditor";
import { getSession } from "../../../../lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "../../../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "brand", label: "品牌与 SEO" },
  { key: "home", label: "首页内容" },
  { key: "docs", label: "帮助文档" },
  { key: "pages", label: "产品 · 路线图 · 关于" },
  { key: "ladder", label: "天梯与排名（低频）" },
] as const;

const INTRO: Record<string, string> = {
  brand: "站点名称、标题、描述、关键词与图标，改动即时反映到浏览器标题与分享卡片。",
  home: "首页首屏、价值点、模型入口卡片与合作方跑马灯。",
  docs: "文档中心 /docs 的文章与小节。",
  pages: "合作产品展示、路线图里程碑、「关于」页正文与联系方式。",
  ladder: "性能轴颗粒度、厂商展示优先级与排名维度权重，面向数据展示调优，一般无需改动。",
};

export default async function AdminConfigsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const tab = resolveAdminTab(sp.tab, TABS);
  // S7.5：排名维度权重编辑器复用配置域写权限（后端 ranking-weights PUT 强制 admin.configs.write）。
  let canWriteConfigs = false;
  if (tab === "ladder") {
    const session = await getSession();
    const perms = session ? await getAdminPermissions(session.userId) : null;
    canWriteConfigs = !!perms && hasPermission(perms, "admin.configs.write");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">站点配置</h1>
        <p className="mt-1 text-sm text-slate-500">站点可见即可改：品牌与 SEO、首页文案、帮助文档、合作产品、路线图与联系方式。</p>
      </div>

      <AdminPageTabs basePath="/admin/configs" tabs={TABS} current={tab} label="站点配置分类" testId="admin-configs-tabs" />
      <p className="text-xs text-slate-500">{INTRO[tab]}</p>

      <section className="max-w-4xl space-y-12" data-testid={`admin-configs-tab-${tab}`}>
        {tab === "brand" && <SiteBrandingEditor />}
        {tab === "home" && (
          <>
            <HomeContentEditor />
            <PartnerMarqueeEditor />
          </>
        )}
        {tab === "docs" && <DocsEditor />}
        {tab === "pages" && (
          <>
            <SiteContentEditor />
            <RoadmapEditor />
            <AboutBodyEditor />
            <AboutContactEditor />
          </>
        )}
        {tab === "ladder" && (
          <>
            <AdminConfigPanel />
            <div className="border-t border-slate-200 pt-5">
              <h2 className="text-sm font-semibold text-slate-700">排名维度权重</h2>
              <p className="mt-1 text-xs text-slate-500">天梯综合分的各维度权重（0–100）与启用态，影响前台模型库与天梯图排序。</p>
              <div className="mt-4">
                <RankingWeightsEditor canWrite={canWriteConfigs} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
