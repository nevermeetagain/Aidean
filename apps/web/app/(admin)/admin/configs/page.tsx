// /admin/configs —— 站点配置页（SubTask 1.4.2 → S4「站点可见即可改」全量）。
// 守卫由 (admin)/layout.tsx 承担。面板为浅色冷色卡片，与管理端外壳同令牌体系。
// 2026-09-28 增 RoadmapEditor：路线图里程碑后台编辑（roadmap.milestones 键）。
// S4 增 SiteBrandingEditor/HomeContentEditor/DocsEditor：站名/SEO/首页文案/帮助文档全部后台可改，
// 并按「常用（运营高频）/ 不常用（低频技术项）」分堆——天梯图呈现参数默认折叠。
import { AdminConfigPanel } from "../../../../components/admin/AdminConfigPanel";
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

export default async function AdminConfigsPage() {
  // S7.5：排名维度权重编辑器复用配置域写权限（后端 ranking-weights PUT 强制 admin.configs.write）。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canWriteConfigs = !!perms && hasPermission(perms, "admin.configs.write");
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">站点配置</h1>
        <p className="mt-1 text-sm text-slate-500">站点可见即可改：品牌与 SEO、首页文案、帮助文档、合作产品、路线图与联系方式。</p>
      </div>

      <section className="space-y-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">常用配置</h2>
        <div className="max-w-4xl space-y-12">
          <SiteBrandingEditor />
          <HomeContentEditor />
          <DocsEditor />
          <SiteContentEditor />
          <RoadmapEditor />
          <PartnerMarqueeEditor />
          <AboutBodyEditor />
          <AboutContactEditor />
        </div>
      </section>

      <section className="space-y-3">
        <details className="group rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
            不常用配置（天梯图呈现参数 · 低频）
            <span className="ml-2 text-xs font-normal text-slate-400 group-open:hidden">展开</span>
            <span className="ml-2 hidden text-xs font-normal text-slate-400 group-open:inline">收起</span>
          </summary>
          <p className="mt-2 text-xs text-slate-500">性能轴颗粒度、加载窗口与厂商展示优先级，面向数据展示调优，一般无需改动。</p>
          <div className="mt-5">
            <AdminConfigPanel />
          </div>
          <div className="mt-8 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-700">排名维度权重</h3>
            <p className="mt-1 text-xs text-slate-500">天梯综合分的各维度权重（0-100）与启用态，影响 /models 与 /ladder 排序；低频调优项。</p>
            <div className="mt-4">
              <RankingWeightsEditor canWrite={canWriteConfigs} />
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
