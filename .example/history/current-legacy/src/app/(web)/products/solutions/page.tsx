import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  FileSearch,
  GitBranch,
  Layers,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  Zap,
} from "lucide-react";

const SOLUTION_PILLARS = [
  { icon: <Database className="h-6 w-6" />, title: "数据与知识底座", desc: "统一沉淀文档、业务数据、历史案例与专家经验，让 AI 回答可溯源、可审计。", color: "from-blue-500 to-cyan-500" },
  { icon: <BrainCircuit className="h-6 w-6" />, title: "AI 能力编排", desc: "组合大模型、RAG、Agent、MCP 工具和流程自动化，把模型能力变成业务能力。", color: "from-purple-500 to-pink-500" },
  { icon: <Workflow className="h-6 w-6" />, title: "业务流程重塑", desc: "从单点助手升级为端到端流程协同，明确触发、审核、执行和回流机制。", color: "from-amber-500 to-orange-500" },
  { icon: <ShieldCheck className="h-6 w-6" />, title: "安全运营闭环", desc: "以权限、日志、人工接管和质量评估控制风险，支撑企业长期稳定运营。", color: "from-emerald-500 to-teal-500" },
];

const INDUSTRIES = [
  { title: "金融与专业服务", desc: "面向投研、合规、审计、尽调等场景，构建可追溯的知识问答和报告生成流程。", tags: ["合规审查", "投研报告", "客户尽调"] },
  { title: "制造与能源", desc: "接入设备手册、巡检记录和安全规范，让一线人员通过自然语言获得操作建议。", tags: ["设备知识库", "巡检助手", "安全培训"] },
  { title: "教育与培训", desc: "把课程资料、题库和教学经验转化为个性化学习助手与教师备课助手。", tags: ["智能答疑", "课程生成", "学习诊断"] },
  { title: "电商与零售", desc: "以商品、用户、客服和运营数据为基础，提升客服响应、选品分析和内容生产效率。", tags: ["智能客服", "选品分析", "营销文案"] },
  { title: "政企与园区", desc: "围绕政策解读、材料审核、招商服务和内部知识管理建设高可信 AI 助手。", tags: ["政策问答", "材料预审", "招商服务"] },
  { title: "医疗与健康", desc: "在权限和合规边界内辅助医学资料检索、患者教育和机构内部知识管理。", tags: ["文献检索", "患者教育", "内部培训"] },
];

const UPGRADE_STEPS = [
  { step: "01", title: "诊断业务场景", desc: "梳理高频问题、重复流程、关键岗位和数据资产，确定最小可落地场景。" },
  { step: "02", title: "搭建知识与数据层", desc: "清洗资料、建立知识库、配置权限与引用规则，确保输出基于可信来源。" },
  { step: "03", title: "构建 AI 工作流", desc: "将问答、生成、分析、审批和工具调用串联为可运行的业务流程。" },
  { step: "04", title: "上线运营与迭代", desc: "通过工单、评价、日志和人工复核持续优化模型效果与流程边界。" },
];

const DELIVERABLES = [
  "企业 AI 场景诊断与路线图",
  "知识库与数据接入方案",
  "数字分身与 Agent 原型",
  "业务流程自动化设计",
  "权限、审计与风险控制策略",
  "上线培训与持续运营机制",
];

export default function SolutionsPage() {
  return (
    <div className="flex flex-col bg-slate-900 text-white">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-4 text-center sm:px-6">
          <Link href="/products" className="mb-8 inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />返回产品服务
          </Link>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-emerald-500/20 px-5 py-2 text-sm font-medium text-blue-300 ring-1 ring-blue-500/30">
            <Sparkles className="h-4 w-4" />Aidean Solutions · AI 驱动数字化升级
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              从模型选型到业务增长
            </span>
            <br />构建企业 AI 落地闭环
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-400">
            Aidean 解决方案围绕模型评测、知识库、数字分身、Agent 工作流与工单反馈体系，
            帮助企业把 AI 从“试用工具”升级为可运营、可度量、可持续迭代的数字化能力。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/products/consulting" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40">
              让顾问评估场景<ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#industries" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/10">
              查看行业方案<ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30"><Layers className="h-3.5 w-3.5" />解决方案框架</div>
            <h2 className="mt-4 text-3xl font-black">四层架构支撑企业 AI 化升级</h2>
            <p className="mt-3 text-lg text-slate-400">先建可信底座，再做能力编排，最后进入流程和运营闭环。</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SOLUTION_PILLARS.map((item) => (
              <div key={item.title} className="group relative rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700 transition-all hover:-translate-y-2 hover:bg-slate-800">
                <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${item.color}`} />
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>{item.icon}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="industries" className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30"><Building2 className="h-3.5 w-3.5" />行业落地</div>
            <h2 className="mt-4 text-3xl font-black">按行业场景拆解 AI 价值链</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {INDUSTRIES.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700 transition-all hover:bg-slate-800">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 p-8 ring-1 ring-blue-500/20">
            <Target className="mb-5 h-10 w-10 text-blue-300" />
            <h2 className="text-3xl font-black">不是“买一个 AI 工具”，而是完成一次业务升级</h2>
            <p className="mt-4 leading-relaxed text-slate-400">
              我们从业务目标出发，明确输入数据、目标岗位、流程节点、人工边界和衡量指标，
              让 AI 项目从试点开始就具备可验证的投入产出路径。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center">
              {[
                ["30天", "形成可演示原型"],
                ["4层", "安全运营体系"],
                ["6类", "核心交付物"],
                ["闭环", "持续优化机制"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="mt-1 text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/30"><GitBranch className="h-3.5 w-3.5" />升级路径</div>
            <div className="space-y-4">
              {UPGRADE_STEPS.map((item) => (
                <div key={item.step} className="rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-blue-300 to-emerald-300 bg-clip-text text-3xl font-black text-transparent">{item.step}</div>
                    <div>
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 ring-1 ring-purple-500/30"><FileSearch className="h-3.5 w-3.5" />交付清单</div>
            <h2 className="mt-4 text-3xl font-black">每个方案都可落地、可交付、可验收</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DELIVERABLES.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-800/50 p-5 ring-1 ring-slate-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="font-semibold text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-emerald-500/10 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
          <Cpu className="mx-auto mb-5 h-10 w-10 text-blue-300" />
          <h2 className="text-3xl font-black sm:text-4xl">让 AI 真正进入你的业务系统</h2>
          <p className="mt-4 text-lg text-slate-400">从一个明确业务问题开始，逐步建设企业级 AI 能力中台。</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/products/consulting" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40">
              预约方案评估<ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/products/ai-employee" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/10">
              了解数字分身
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
