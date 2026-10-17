/**
 * /evaluations/new — 创建对比测评（EVAL-01）。
 * RSC：服务端取模型清单 + 单价（读 pricing config，60s 缓存），全部取值来自后端；
 * 客户端表单复用 compareStore 作为选择源（与 Dock 共享），预计花费 = N × 单价（单价文本由后端格式化）。
 */
import { prisma } from "../../../../lib/db/prisma";
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

  const models = await prisma.aiModel.findMany({
    where: { deletedAt: null },
    select: { id: true, nameDisplay: true, slug: true },
    orderBy: { nameDisplay: "asc" },
  });
  const cfg = await readEvalPricing();
  const perModelLabel = formatEvalPrice(cfg.evalPerModel, cfg.currency);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 md:px-6">
      <h1 className="text-2xl font-bold text-slate-800">新建对比测评</h1>
      <p className="mt-2 text-sm text-slate-500">
        选择 2–6 个模型，输入提示词，多模型并排回答。付费用户能力（Pro/Max）。
      </p>
      <EvaluationCreateForm
        models={models}
        perModelYuan={cfg.evalPerModel}
        currency={cfg.currency}
        perModelLabel={perModelLabel}
      />
    </main>
  );
}
