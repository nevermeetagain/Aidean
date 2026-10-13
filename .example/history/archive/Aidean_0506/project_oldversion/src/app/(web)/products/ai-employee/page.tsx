import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Database,
  Layers,
  Lock,
  MessageCircle,
  Settings2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const CAPABILITIES = [
  { icon: <Brain className="h-6 w-6" />, title: "理解你的业务语境", desc: "学习岗位 SOP、历史资料、知识库和沟通风格，形成可持续迭代的专属工作画像。", color: "from-blue-500 to-cyan-500" },
  { icon: <MessageCircle className="h-6 w-6" />, title: "自然语言协同", desc: "用对话发起任务、追问细节、补充材料，让数字分身像同事一样参与工作流。", color: "from-purple-500 to-pink-500" },
  { icon: <Settings2 className="h-6 w-6" />, title: "自动执行多步骤任务", desc: "结合 Agent、工具调用和流程编排，完成检索、分析、生成、归档等连续动作。", color: "from-amber-500 to-orange-500" },
  { icon: <Lock className="h-6 w-6" />, title: "权限与安全边界", desc: "按角色限定资料、工具和输出范围，支持企业私有化部署与审计追踪。", color: "from-emerald-500 to-teal-500" },
];

const SCENARIOS = [
  { title: "客服与售前分身", desc: "基于产品资料和历史问答自动接待客户，识别高价值线索并转人工跟进。", points: ["FAQ 自动回答", "需求初筛", "线索摘要"] },
  { title: "研究与内容分身", desc: "读取资料、生成提纲、产出报告初稿，让个人经验沉淀为可复制能力。", points: ["资料检索", "报告生成", "多版本润色"] },
  { title: "运营与数据分身", desc: "把日报、表格、指标解释和异常定位交给分身处理，减少重复分析。", points: ["指标解读", "异常提醒", "自动周报"] },
  { title: "知识传承分身", desc: "把专家经验、项目复盘、流程规范转化为新人随时可问的陪练系统。", points: ["新人培训", "经验复用", "标准化答疑"] },
];

const PIPELINE = [
  { step: "01", title: "资料接入", desc: "接入文档、知识库、业务系统和历史对话，建立可追溯的数据基础。" },
  { step: "02", title: "人格建模", desc: "抽取角色职责、表达偏好、决策规则和工具权限，形成数字分身画像。" },
  { step: "03", title: "任务编排", desc: "配置常见流程、触发条件和人工确认点，让分身安全执行复杂任务。" },
  { step: "04", title: "持续学习", desc: "通过反馈、工单、评价和业务结果持续校正，让能力随组织成长。" },
];

export default function AIEmployeePage() {
  return (
    <div className="flex flex-col bg-slate-900 text-white">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-4 text-center sm:px-6">
          <Link href="/products" className="mb-8 inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />返回产品服务
          </Link>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-5 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-500/30">
            <Sparkles className="h-4 w-4" />Aidean Digital Twin · 企业数字分身
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              把关键岗位能力
            </span>
            <br />复制成可协同的 AI 分身
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-400">
            数字分身不是简单聊天机器人，而是围绕角色知识、业务流程、工具权限和反馈闭环构建的智能工作伙伴。
            它理解组织语境，能与员工协作，也能在明确边界内自动完成任务。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/products/consulting" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/40">
              咨询部署方案<ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#capabilities" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/10">
              查看能力矩阵<ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/30"><Layers className="h-3.5 w-3.5" />核心能力</div>
            <h2 className="mt-4 text-3xl font-black">从“会回答”升级为“能协同”</h2>
            <p className="mt-3 text-lg text-slate-400">数字分身以企业知识为底座，以可控流程为边界，以反馈学习为增长机制。</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item) => (
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

      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 ring-1 ring-purple-500/30"><Bot className="h-3.5 w-3.5" />应用场景</div>
            <h2 className="mt-4 text-3xl font-black">让每个关键岗位拥有可复制助手</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {SCENARIOS.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-800/50 p-7 ring-1 ring-slate-700 transition-all hover:bg-slate-800">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-400">{item.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.points.map((point) => (
                    <span key={point} className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">{point}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30"><Zap className="h-3.5 w-3.5" />落地路径</div>
            <h2 className="mt-4 text-3xl font-black">四步完成企业数字分身建设</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((item) => (
              <div key={item.step} className="rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700">
                <div className="mb-3 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-4xl font-black text-transparent">{item.step}</div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-8 ring-1 ring-cyan-500/20">
            <Database className="mb-4 h-9 w-9 text-cyan-300" />
            <h2 className="text-3xl font-black">与知识库、Agent、工单系统形成闭环</h2>
            <p className="mt-4 leading-relaxed text-slate-400">
              分身学习来自企业知识库，执行依赖可控 Agent 工具，反馈沉淀到工单和评价系统，最终持续优化回答质量、任务成功率和人工接管策略。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {["私有知识接入", "权限分层控制", "人工确认节点", "质量反馈学习"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-800/50 p-5 ring-1 ring-slate-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="font-semibold text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
          <Users className="mx-auto mb-5 h-10 w-10 text-cyan-300" />
          <h2 className="text-3xl font-black sm:text-4xl">让专家经验不再只存在于个人脑海里</h2>
          <p className="mt-4 text-lg text-slate-400">从一个高频岗位开始，用数字分身把经验、流程和服务能力沉淀成组织资产。</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/products/consulting" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/40">
              预约业务咨询<ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/products/solutions" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/10">
              查看解决方案
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
