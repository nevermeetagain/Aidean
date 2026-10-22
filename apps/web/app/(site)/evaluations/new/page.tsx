/**
 * /evaluations/new — 创建对比测评（EVAL-01）。
 * RSC：服务端只取单价（读 pricing config，60s 缓存）；模型清单不再在服务端一次性 findMany 全量
 * （UX-08：原无上限查询铺 ~1000 个 chips），改由表单内可搜索 Combobox 按关键字分页取
 * GET /api/v1/models（每次 ≤50 条，仅上架模型）。
 * 客户端表单复用 compareStore 作为选择源（与 Dock 共享），预计花费 = N × 单价（单价文本由后端格式化）。
 */
import { getFeatureFlags } from "../../../../lib/features/flags/service";
import { readEvalPricing } from "../../../../lib/features/evaluation/service";
import { formatEvalPrice } from "@aidean/shared";
import { EvaluationCreateForm } from "../../../../components/evaluations/EvaluationCreateForm";
import { FeatureDisabled } from "../../../../components/common/FeatureDisabled";

export const dynamic = "force-dynamic";

export default async function NewEvaluationPage() {
  // 受控面首行守卫（TASK-018 / FEATURE_GATES["evaluation.enabled"]）：关闭时呈 feature-disabled 态。
  // 页面级严格 403 受 next@15.0.0 无 forbidden() 限制（见 EVD-018）；受控 API POST /api/v1/evaluations 抛 50011→403。
  const flags = await getFeatureFlags();
  if (!flags["evaluation.enabled"]) return <FeatureDisabled />;

  const cfg = await readEvalPricing();
  const perModelLabel = formatEvalPrice(cfg.evalPerModel, cfg.currency);

  return (
    // UX-14：正文容器全宽（M-WIDE），表单区块自身 max-w-3xl 约束行宽
    <main className="w-full px-4 py-14 md:px-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-800">新建对比测评</h1>
        <p className="mt-2 text-sm text-slate-500">
          选择 2–6 个模型，输入提示词，多模型并排回答。付费用户能力（Pro/Max）。
        </p>
        <EvaluationCreateForm
          perModelYuan={cfg.evalPerModel}
          currency={cfg.currency}
          perModelLabel={perModelLabel}
        />
      </div>
    </main>
  );
}
