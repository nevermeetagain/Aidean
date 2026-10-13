"use client";

/**
 * 控制台 · 平台 API Key 卡片（GW-KEY-01 P5-S5.2；控制台五问题修复 M1/M2）。
 *
 * 能力：创建（弹窗内选「用途 + 名称」→ 明文仅一次展示 + 一键复制）→ 脱敏列表 → 删除（二次确认，物理删除）。
 * 用途预设映射到后端既有能力（rateLimit / expiresAt），零后端改动：
 *   外部集成 60/min · 高频服务 600/min · 临时测试 24h 自动过期。
 * 样式：说明与元信息走 text-slate-600 字面色（与 console/page.tsx 同源），
 *   规避 CSS 变量 token 在旧构建产物下不解析而落近白色（问题2「白字看不清」的稳健修复）。
 * 自包含组件：数据经 /api/v1/user/api-* 端点（withApi 信封）。
 */
import { useCallback, useEffect, useState } from "react";

import { Button, Dialog, Input } from "@aidean/ui";

interface ApiKeyItem {
  id: string;
  keyId: string;
  name: string;
  permissions: string[];
  rateLimit: { requestsPerMinute: number } | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

/** 用途预设：映射到 permissions / rateLimit / expiresAt（均为后端已支持字段） */
type PurposeId = "external" | "highfreq" | "temp";
interface PurposePreset {
  id: PurposeId;
  label: string;
  hint: string;
  rateLimit?: { requestsPerMinute: number };
  /** 相对有效期（毫秒）；undefined 表示永不过期 */
  ttlMs?: number;
}

const PURPOSES: ReadonlyArray<PurposePreset> = [
  { id: "external", label: "外部集成", hint: "常规调用 · 限流 60/分钟", rateLimit: { requestsPerMinute: 60 } },
  { id: "highfreq", label: "高频服务", hint: "服务端批量 · 限流 600/分钟", rateLimit: { requestsPerMinute: 600 } },
  { id: "temp", label: "临时测试", hint: "24 小时后自动过期", ttlMs: 24 * 60 * 60 * 1000 },
];

export function ApiKeysPanel() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<PurposeId>("external");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/api-keys");
      const body = await res.json();
      if (res.ok) setItems((body.data?.items ?? []) as ApiKeyItem[]);
      else setError(body.message ?? "加载失败");
    } catch {
      setError("网络异常，请稍后重试");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setName("");
    setPurpose("external");
    setPlaintext(null);
    setCopied(false);
    setError(null);
    setDialogOpen(true);
  }

  async function createKey() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const preset = PURPOSES.find((p) => p.id === purpose) ?? PURPOSES[0];
    try {
      const res = await fetch("/api/v1/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          permissions: ["gateway:chat"],
          ...(preset.rateLimit ? { rateLimit: preset.rateLimit } : {}),
          ...(preset.ttlMs ? { expiresAt: new Date(Date.now() + preset.ttlMs).toISOString() } : {}),
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setPlaintext(String(body.data?.plaintext ?? ""));
        await load();
      } else {
        setError(body.message ?? "创建失败");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function copyPlaintext() {
    if (!plaintext) return;
    try {
      await navigator.clipboard?.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动选中复制");
    }
  }

  async function removeKey(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/user/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.message ?? "删除失败");
      }
      setConfirmId(null);
      await load();
    } catch {
      setError("网络异常，请稍后重试");
    }
  }

  return (
    <section aria-label="平台 API Key" className="mt-8 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">平台 API Key</h3>
        <Button
          onClick={openCreate}
          variant="dark"
          className="h-9 shrink-0 rounded-md border border-border px-4 font-medium"
        >
          创建 Key
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        这是平台发给你的<strong>钥匙</strong>。第三方程序拿它来调用平台里的 AI 模型，花的钱从你的平台余额里扣。
        钥匙只在创建时完整显示一次，请立即复制保存；删除后立即可用（历史消耗记录仍保留）。
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y divide-border">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {it.name}
                {!it.isActive && (
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">已停用</span>
                )}
              </p>
              <p className="truncate text-xs text-slate-600">
                {it.keyId} · {it.permissions.join(", ")} ·{" "}
                {it.rateLimit ? `${it.rateLimit.requestsPerMinute}/min` : "默认 60/min"}
                {it.expiresAt ? ` · 过期 ${new Date(it.expiresAt).toLocaleDateString()}` : ""}
              </p>
            </div>
            {it.isActive &&
              (confirmId === it.id ? (
                <span className="flex shrink-0 gap-1">
                  <Button
                    onClick={() => void removeKey(it.id)}
                    variant="danger"
                    size="sm"
                    className="h-7 rounded px-2 font-medium text-white"
                  >
                    确认删除
                  </Button>
                  <Button onClick={() => setConfirmId(null)} variant="ghost" size="sm" className="h-7 rounded border border-border px-2">
                    取消
                  </Button>
                </span>
              ) : (
                <Button
                  onClick={() => setConfirmId(it.id)}
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs text-red-600 underline-offset-2 hover:underline"
                >
                  删除
                </Button>
              ))}
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-sm text-slate-500">暂无 API Key，创建后即可经 SDK 直连网关。</li>}
      </ul>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={plaintext ? "复制你的 API Key" : "创建 API Key"}
        footer={
          plaintext ? (
            <>
              <Button
                onClick={() => void copyPlaintext()}
                variant="dark"
                className="h-10 flex-1 rounded-md border border-border px-4 text-base font-medium"
              >
                {copied ? "✓ 已复制到剪贴板" : "一键复制"}
              </Button>
              <Button onClick={() => setDialogOpen(false)} variant="ghost" className="h-10 rounded-md border border-border px-4">
                完成
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDialogOpen(false)} variant="ghost" className="h-9 rounded-md border border-border px-4">
                取消
              </Button>
              <Button
                disabled={busy || !name.trim()}
                onClick={() => void createKey()}
                variant="dark"
                className="h-9 rounded-md border border-border px-4 font-medium disabled:opacity-50"
              >
                {busy ? "创建中…" : "创建并查看明文"}
              </Button>
            </>
          )
        }
      >
        {plaintext ? (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-foreground">请立即复制保存——这是明文的唯一一次展示：</p>
            <code className="mt-2 block break-all rounded bg-slate-900 px-3 py-2 font-mono text-sm text-white">{plaintext}</code>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="apikey-name" className="block text-sm font-medium text-foreground">
                Key 名称
              </label>
              <Input
                id="apikey-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 ci-bot、prod-server"
                maxLength={64}
                className="mt-1"
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-foreground">用途</legend>
              <div className="mt-2 grid gap-2">
                {PURPOSES.map((p) => (
                  <label
                    key={p.id}
                    className={
                      purpose === p.id
                        ? "flex cursor-pointer items-center justify-between rounded-md border border-primary bg-primary/5 px-3 py-2"
                        : "flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-slate-50"
                    }
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="apikey-purpose"
                        value={p.id}
                        checked={purpose === p.id}
                        onChange={() => setPurpose(p.id)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="text-sm font-medium text-foreground">{p.label}</span>
                    </span>
                    <span className="text-xs text-slate-600">{p.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Dialog>
    </section>
  );
}
