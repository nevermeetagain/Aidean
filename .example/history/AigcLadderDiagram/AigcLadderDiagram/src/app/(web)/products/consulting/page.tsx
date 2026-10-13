"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SupportComment = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  content: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  comments: SupportComment[];
};

const serviceCards = [
  { title: "免费对话", text: "先由智能客服快速梳理诉求，适合模型选型、产品能力、接入路径等开放式咨询。" },
  { title: "工单沉淀", text: "复杂需求自动形成服务记录，便于后续顾问跟踪、补充资料和持续回复。" },
  { title: "人工升级", text: "后台可基于同一反馈记录继续处理，支持业务顾问或技术专家介入。" },
];

const quickPrompts = [
  "我想建设企业知识库，应该如何规划数据、权限和上线节奏？",
  "我们希望为销售/客服团队配置数字分身，请给出落地方案。",
  "请帮我做一次模型选型建议，重点关注成本、效果和私有化部署。",
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function ConsultingPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState("");
  const [subject, setSubject] = useState("业务咨询");
  const [content, setContent] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId) || tickets[0], [activeId, tickets]);

  async function loadTickets() {
    const token = getToken();
    if (!token) {
      setAuthRequired(true);
      return;
    }
    const res = await fetch("/api/v1/support", { headers: { authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => null);
    if (res.status === 401) {
      setAuthRequired(true);
      return;
    }
    if (!res.ok || !data?.success) {
      setError(data?.message || "咨询记录加载失败");
      return;
    }
    setTickets(data.data || []);
    setActiveId(data.data?.[0]?.id || "");
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setAuthRequired(true);
      return;
    }
    if (!content.trim() || loading) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/support", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, content, priority: "normal" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || "提交失败");
        return;
      }
      setTickets((current) => [data.data, ...current]);
      setActiveId(data.data.id);
      setContent("");
    } finally {
      setLoading(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !activeTicket || !reply.trim() || loading) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/support/${activeTicket.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || "回复失败");
        return;
      }
      setTickets((current) => current.map((ticket) => (ticket.id === data.data.id ? data.data : ticket)));
      setReply("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <section className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.2),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              AI + 人工顾问协同服务台
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              业务咨询，从一句话开始形成可跟进工单
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              面向企业 AI 转型、模型选型、知识库建设、数字分身落地与私有化集成，Aidean 提供智能预响应与人工顾问接力的一体化客服界面。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {serviceCards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-blue-950/20">
                  <div className="text-base font-semibold text-cyan-100">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{card.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-950/80 p-5 ring-1 ring-white/10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">Aidean Support</div>
                  <div className="text-xl font-semibold">智能客服工作台</div>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">在线</div>
              </div>

              {authRequired ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
                  <div className="text-lg font-semibold">请先登录后发起业务咨询</div>
                  <p className="mt-2 text-sm leading-6 text-amber-100/80">登录后可保存咨询记录，并支持后续人工顾问在同一工单中继续回复。</p>
                  <Link href="/auth/login" className="mt-5 inline-flex rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950">
                    去登录
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                  <form onSubmit={submitTicket} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm outline-none ring-cyan-300/30 focus:ring-2"
                      placeholder="咨询主题"
                    />
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 outline-none ring-cyan-300/30 focus:ring-2"
                      placeholder="描述你的业务目标、当前系统、期望效果或需要 Aidean 协助的事项..."
                    />
                    <div className="space-y-2">
                      {quickPrompts.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => setContent(prompt)} className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-slate-300 hover:border-cyan-300/40">
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <button disabled={loading || !content.trim()} className="h-11 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                      {loading ? "提交中..." : "发起免费咨询"}
                    </button>
                    {error && <div className="text-sm text-red-300">{error}</div>}
                  </form>

                  <div className="min-h-[420px] rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="font-semibold">咨询对话</div>
                      <div className="text-xs text-slate-500">{tickets.length} 个记录</div>
                    </div>
                    {activeTicket ? (
                      <div className="flex h-full flex-col">
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                          {tickets.map((ticket) => (
                            <button key={ticket.id} onClick={() => setActiveId(ticket.id)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${activeTicket.id === ticket.id ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-300"}`}>
                              {ticket.subject}
                            </button>
                          ))}
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                          <div className="mr-10 rounded-2xl bg-cyan-300 px-4 py-3 text-sm leading-6 text-slate-950">{activeTicket.content}</div>
                          {activeTicket.comments.map((comment) => (
                            <div key={comment.id} className="ml-10 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-slate-200">
                              {comment.content}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={submitReply} className="mt-4 flex gap-2">
                          <input value={reply} onChange={(e) => setReply(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm outline-none ring-cyan-300/30 focus:ring-2" placeholder="继续补充你的需求..." />
                          <button disabled={loading || !reply.trim()} className="rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">
                            发送
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm leading-6 text-slate-400">
                        暂无咨询记录。提交左侧表单后，系统会自动生成服务工单和智能客服回复。
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
