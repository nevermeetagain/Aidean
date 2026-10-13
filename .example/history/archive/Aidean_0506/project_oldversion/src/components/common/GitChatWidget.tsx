"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Paperclip, Send, X } from "lucide-react";

type ChatRole = "user" | "bot";

type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  attachments: ChatAttachment[];
  createdAt: number;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function isPreviewableImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function GitChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GitChatFloatingButton open={open} onToggle={() => setOpen((v) => !v)} />
      <GitChatModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function GitChatFloatingButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "fixed bottom-6 right-4 z-[10040] inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg ring-1 ring-black/10 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      }
      aria-label={open ? "关闭 Git 聊天" : "打开 Git 聊天"}
    >
      {/* public/images/icons/3.gif */}
      <img src="/images/icons/3.gif" alt="Git" className="h-10 w-10 rounded-full object-cover" draggable={false} />
    </button>
  );
}

function GitChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: uid("msg"),
        role: "bot",
        text: "你好，我是回声机器人。你发什么，我就回什么。",
        attachments: [],
        createdAt: Date.now(),
      },
    ];
  });

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const objectUrlsRef = useRef<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    return text.trim().length > 0 || attachments.length > 0;
  }, [text, attachments.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // open 后滚到底部
    const id = window.setTimeout(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, messages.length]);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const send = () => {
    if (!canSend) return;

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      text: text.trim(),
      attachments,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setText("");
    setAttachments([]);

    window.setTimeout(() => {
      const botMsg: ChatMessage = {
        id: uid("msg"),
        role: "bot",
        text: userMsg.text,
        attachments: userMsg.attachments,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 450);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-end justify-end bg-black/30 p-4 sm:items-end"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Git 聊天"
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">Git Chat</div>
            <div className="truncate text-[11px] text-slate-500">本地回声机器人 · 未登录可用</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div ref={bodyRef} className="h-[52vh] max-h-[520px] min-h-[320px] overflow-y-auto bg-slate-50 px-3 py-4">
          <div className="space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-3 py-3">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <AttachmentChip
                  key={a.id}
                  attachment={a}
                  onRemove={() => {
                    setAttachments((prev) => {
                      const next = prev.filter((x) => x.id !== a.id);
                      if (a.previewUrl) {
                        URL.revokeObjectURL(a.previewUrl);
                        objectUrlsRef.current.delete(a.previewUrl);
                      }
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;

                const next: ChatAttachment[] = files.map((f) => {
                  const att: ChatAttachment = {
                    id: uid("att"),
                    name: f.name,
                    size: f.size,
                    type: f.type || "application/octet-stream",
                  };

                  if (isPreviewableImage(att.type)) {
                    const url = URL.createObjectURL(f);
                    objectUrlsRef.current.add(url);
                    att.previewUrl = url;
                  }

                  return att;
                });

                setAttachments((prev) => [...prev, ...next]);
                // 允许同文件重复选择
                e.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              aria-label="上传文件"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
            </button>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入消息…"
              rows={1}
              className="min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.shiftKey) return;
                e.preventDefault();
                send();
              }}
            />

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              aria-label="发送"
            >
              <Send className="h-4 w-4" aria-hidden />
              发送
            </button>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Enter 发送，Shift+Enter 换行。支持上传文件/图片/GIF。
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "flex max-w-[92%] flex-row-reverse items-end gap-2" : "flex max-w-[92%] items-end gap-2"}>
        <div
          className={
            isUser
              ? "flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white"
              : "flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200"
          }
          aria-hidden
        >
          {isUser ? "我" : "G"}
        </div>

        <div className={isUser ? "items-end" : "items-start"}>
          <div
            className={
              isUser
                ? "rounded-2xl rounded-br-md bg-slate-900 px-3 py-2 text-sm text-white shadow"
                : "rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-slate-900 shadow ring-1 ring-black/5"
            }
          >
            {msg.text && <div className="whitespace-pre-wrap break-words">{msg.text}</div>}

            {msg.attachments.length > 0 && (
              <div className={msg.text ? "mt-2" : ""}>
                <div className="space-y-2">
                  {msg.attachments.map((a) => (
                    <AttachmentPreview key={a.id} attachment={a} isUser={isUser} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={isUser ? "mt-1 text-right text-[10px] text-slate-400" : "mt-1 text-[10px] text-slate-400"}>
            {new Date(msg.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: ChatAttachment; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
      <div className="max-w-[240px] truncate text-xs text-slate-700">{attachment.name}</div>
      <div className="text-[11px] text-slate-400">{formatBytes(attachment.size)}</div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="移除附件"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function AttachmentPreview({ attachment, isUser }: { attachment: ChatAttachment; isUser: boolean }) {
  if (attachment.previewUrl) {
    return (
      <div>
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className={
            isUser
              ? "max-h-40 max-w-[220px] rounded-xl ring-1 ring-white/15"
              : "max-h-40 max-w-[220px] rounded-xl ring-1 ring-black/10"
          }
        />
        <div className={isUser ? "mt-1 text-[10px] text-white/70" : "mt-1 text-[10px] text-slate-500"}>
          {attachment.name} · {formatBytes(attachment.size)}
        </div>
      </div>
    );
  }

  return (
    <div className={isUser ? "rounded-xl bg-white/10 px-2 py-1" : "rounded-xl bg-slate-100 px-2 py-1"}>
      <div className={isUser ? "text-xs text-white" : "text-xs text-slate-700"}>{attachment.name}</div>
      <div className={isUser ? "text-[10px] text-white/70" : "text-[10px] text-slate-500"}>{formatBytes(attachment.size)}</div>
    </div>
  );
}
