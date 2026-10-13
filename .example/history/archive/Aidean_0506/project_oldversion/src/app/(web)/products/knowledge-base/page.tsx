"use client";

import Link from "next/link";
import {
  ArrowRight, Shield, Database, FileText, Search, Brain, Settings2,
  Users, Lock, HardDrive, Globe, Layers, Zap, BookOpen, MessageCircle,
  Bot, Wrench, Scale, ChevronRight, ExternalLink, CheckCircle2,
  ArrowLeft, Sparkles,
} from "lucide-react";

const KB_LINK = "http://36.134.158.50:10001/";

const FEATURES = [
  { icon: <Database className="h-6 w-6" />, title: "知识库管理", desc: "存放各类资料，系统自动消化解析，构建AI学习的基础。", color: "from-blue-500 to-cyan-500" },
  { icon: <MessageCircle className="h-6 w-6" />, title: "智能对话", desc: "像聊天一样提问，AI从知识库中精准检索并组织回答。", color: "from-purple-500 to-pink-500" },
  { icon: <Bot className="h-6 w-6" />, title: "智能体 Agent", desc: "创建专属AI助手，自动执行多步骤复杂任务。", color: "from-amber-500 to-orange-500" },
  { icon: <Settings2 className="h-6 w-6" />, title: "模型配置", desc: "自由接入GPT、DeepSeek等主流大模型，参数灵活可调。", color: "from-emerald-500 to-teal-500" },
];

const ADVANTAGES = [
  {
    icon: <Lock className="h-7 w-7" />,
    title: "数据安全存储",
    highlight: "专属设备 · 本地部署 · 团队可控",
    points: ["为每个客户配备专属物理硬件（8核CPU+32G内存）", "支持完全离网独立运行，数据不出内网", "多级权限设置，精确控制成员访问范围"],
    color: "border-blue-500/30",
    badge: "bg-blue-500",
  },
  {
    icon: <HardDrive className="h-7 w-7" />,
    title: "知识库无限制",
    highlight: "单文件无上限 · 知识库容量无上限",
    points: ["800页PDF完整解析，10万行Excel无压力", "知识库容量仅取决于硬盘物理空间", "硬盘有多大，知识库就有多大"],
    color: "border-purple-500/30",
    badge: "bg-purple-500",
  },
  {
    icon: <FileText className="h-7 w-7" />,
    title: "全格式解析 + 11种专业模板",
    highlight: "Word · Excel · PDF · PPT · Markdown · TXT",
    points: ["11种专业解析模板：简历、表格、论文、法规、手册等", "不同文件用不同阅读方式，精准理解内容", "直接上传原始文件，无需格式转换"],
    color: "border-amber-500/30",
    badge: "bg-amber-500",
  },
  {
    icon: <Search className="h-7 w-7" />,
    title: "高精度检索",
    highlight: "知识图谱 · RAPTOR策略 · 跨语言",
    points: ["自动提取人物、概念、事件关系，构建知识图谱", "RAPTOR分层总结策略，既深入细节又把握全局", "中文提问可从英文资料中定位答案并翻译"],
    color: "border-emerald-500/30",
    badge: "bg-emerald-500",
  },
  {
    icon: <Wrench className="h-7 w-7" />,
    title: "自由定义全模组",
    highlight: "模型自由选 · 参数自由调 · 工具可扩展",
    points: ["接入GPT、DeepSeek等主流大模型，一键切换", "创建专属智能体，配置工作流程自动执行", "MCP工具接入，赋予AI联网搜索能力"],
    color: "border-pink-500/30",
    badge: "bg-pink-500",
  },
  {
    icon: <Scale className="h-7 w-7" />,
    title: "权重控制体系",
    highlight: "多库联合检索 · 优先级可配置",
    points: ["单次提问同时检索多个异构知识库", "为不同库配置权重系数，高权重优先被引用", "官方资料优先，避免非官方信息干扰"],
    color: "border-cyan-500/30",
    badge: "bg-cyan-500",
  },
];

const TEMPLATES = [
  { name: "General", desc: "通用模式，万金油" },
  { name: "Table", desc: "表格数据提取" },
  { name: "Paper", desc: "学术论文解析" },
  { name: "Laws", desc: "法律法规条款" },
  { name: "Resume", desc: "简历信息提取" },
  { name: "Q&A", desc: "一问一答格式" },
  { name: "Book", desc: "整本书解析" },
  { name: "Manual", desc: "操作手册指南" },
  { name: "Presentation", desc: "PPT演示文稿" },
  { name: "One", desc: "短文档整体处理" },
  { name: "Tag", desc: "关键词标签提取" },
];

const COMPETITORS = [
  { name: "能力维度", aidean: "", mita: "", ima: "", feishu: "" },
  { name: "本地私有化部署", aidean: "✅", mita: "❌", ima: "❌", feishu: "❌" },
  { name: "单文件无大小限制", aidean: "✅", mita: "⚠️", ima: "⚠️", feishu: "⚠️" },
  { name: "11种解析模板", aidean: "✅", mita: "❌", ima: "❌", feishu: "❌" },
  { name: "知识图谱", aidean: "✅", mita: "❌", ima: "❌", feishu: "⚠️" },
  { name: "多知识库权重控制", aidean: "✅", mita: "❌", ima: "❌", feishu: "❌" },
  { name: "智能体+MCP扩展", aidean: "✅", mita: "❌", ima: "❌", feishu: "⚠️" },
  { name: "团队权限管理", aidean: "✅", mita: "❌", ima: "⚠️", feishu: "✅" },
];

const STEPS = [
  { step: "01", title: "登录系统", desc: "打开浏览器，输入系统网址，注册/登录账号即可开始。" },
  { step: "02", title: "创建知识库", desc: "点击知识库 - 新建，选择解析模板（推荐General通用模式）。" },
  { step: "03", title: "上传文档", desc: "选择本地文件上传，系统自动解析，普通PDF约1-3分钟。" },
  { step: "04", title: "开始对话", desc: "进入聊天关联知识库，即可用自然语言向AI提问。" },
];

export default function KnowledgeBasePage() {
  return (
    <div className="flex flex-col bg-slate-900 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-purple-500/8 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 text-center">
          <Link href="/products/ai-employee" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />返回产品列表
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-5 py-2 text-sm font-medium text-blue-300 ring-1 ring-blue-500/30 mb-6">
            <Sparkles className="h-4 w-4" />Aidean Rag · 企业级知识库
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              读懂你所有资料的
            </span>
            <br />AI 研究助手
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            基于 RAG 技术，将企业文档转化为可检索的智能知识库。<br />
            答案精准、可溯源，完全基于你的专属资料。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href={KB_LINK} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5">
              立即体验<ExternalLink className="h-4 w-4" />
            </a>
            <a href="#features" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/10">
              了解更多<ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 痛点对比 */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">传统方式 vs Aidean Rag</h2>
            <p className="mt-3 text-lg text-slate-400">从&ldquo;裸考&rdquo;到&ldquo;开卷考试&rdquo;的跨越</p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-red-500/5 p-6 ring-1 ring-red-500/20">
              <div className="text-red-400 text-sm font-bold mb-3">❌ 传统搜索</div>
              <p className="text-slate-400 text-sm leading-relaxed">关键词匹配，搜&ldquo;合同&rdquo;返回500条结果，无法理解真实意图。像在没有目录的图书馆一本本翻书。</p>
            </div>
            <div className="rounded-2xl bg-amber-500/5 p-6 ring-1 ring-amber-500/20">
              <div className="text-amber-400 text-sm font-bold mb-3">⚠️ 通用AI</div>
              <p className="text-slate-400 text-sm leading-relaxed">不了解你的专属资料，回答基于通用知识。容易产生&ldquo;幻觉&rdquo;——一本正经地胡说八道。</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/5 p-6 ring-1 ring-emerald-500/20">
              <div className="text-emerald-400 text-sm font-bold mb-3">✅ Aidean Rag</div>
              <p className="text-slate-400 text-sm leading-relaxed">先从你的资料库精准检索，再基于原文生成回答。每条答案可溯源，完全基于你的数据。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 四大核心功能 */}
      <section id="features" className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30"><Layers className="h-3.5 w-3.5" />核心功能</div>
            <h2 className="mt-4 text-3xl font-black">四大核心模块</h2>
            <p className="mt-3 text-lg text-slate-400">从存资料到用资料的完整闭环</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group relative rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700 transition-all hover:-translate-y-2 hover:bg-slate-800">
                <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${f.color}`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-lg mb-4`}>{f.icon}</div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 六大优势 */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 ring-1 ring-purple-500/30"><Zap className="h-3.5 w-3.5" />核心优势</div>
            <h2 className="mt-4 text-3xl font-black">六大核心优势</h2>
            <p className="mt-3 text-lg text-slate-400">企业级知识管理的全面解决方案</p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className={`rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700 border-l-4 ${a.color}`}>
                <div className="flex items-start gap-4">
                  <div className="text-slate-300 mt-1">{a.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{a.title}</h3>
                    <div className={`mt-1 inline-flex items-center rounded-full ${a.badge} px-3 py-0.5 text-xs font-medium text-white`}>{a.highlight}</div>
                    <ul className="mt-3 space-y-2">
                      {a.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-slate-400">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 解析模板 */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 ring-1 ring-amber-500/30"><FileText className="h-3.5 w-3.5" />解析模板</div>
            <h2 className="mt-4 text-3xl font-black">11种专业解析模板</h2>
            <p className="mt-3 text-lg text-slate-400">什么文件都能&ldquo;吃&rdquo;，用专业视角深度理解内容</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="rounded-xl bg-slate-800/50 p-4 text-center ring-1 ring-slate-700 transition-all hover:bg-slate-800 hover:-translate-y-1">
                <div className="text-base font-bold text-white">{t.name}</div>
                <div className="mt-1 text-xs text-slate-400">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 竞品对比 */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/30"><Scale className="h-3.5 w-3.5" />竞品对比</div>
            <h2 className="mt-4 text-3xl font-black">不怕货比货</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">能力维度</th>
                  <th className="px-4 py-3 font-bold text-blue-400">Aidean Rag</th>
                  <th className="px-4 py-3 font-semibold text-slate-400">秘塔AI</th>
                  <th className="px-4 py-3 font-semibold text-slate-400">腾讯ima</th>
                  <th className="px-4 py-3 font-semibold text-slate-400">飞书知识库</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.slice(1).map((r) => (
                  <tr key={r.name} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-center text-lg">{r.aidean}</td>
                    <td className="px-4 py-3 text-center text-lg">{r.mita}</td>
                    <td className="px-4 py-3 text-center text-lg">{r.ima}</td>
                    <td className="px-4 py-3 text-center text-lg">{r.feishu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 快速上手 */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30"><BookOpen className="h-3.5 w-3.5" />快速上手</div>
            <h2 className="mt-4 text-3xl font-black">3分钟开始使用</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="relative rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700">
                <div className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">{s.step}</div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用场景 */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">拓展场景</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 ring-1 ring-blue-500/20">
              <Brain className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold">深度研究报告创作</h3>
              <p className="mt-3 text-slate-400 leading-relaxed">下达一句指令，AI自动检索知识库、提取数据、整合生成研究报告初稿。从数天缩短到30分钟。</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 ring-1 ring-purple-500/20">
              <Users className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold">AI工作分身</h3>
              <p className="mt-3 text-slate-400 leading-relaxed">将工作习惯、经验笔记喂给AI，训练出能像你一样思考的数字分身。新人培训、知识传承不再依赖个人。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">让每一份资料都不被浪费</h2>
          <p className="mt-4 text-lg text-slate-400">让 AI 真正读懂你的知识</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href={KB_LINK} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5">
              立即体验<ExternalLink className="h-5 w-5" />
            </a>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-white/10">
              返回首页
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
