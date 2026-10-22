"use client";

/**
 * 兑换码兑换入口（SubTask 3.4.2）：余额页兑换卡。
 * 成功后 router.refresh() 重取 RSC 数据（余额/流水即时更新）。
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@aidean/ui";

export function RedeemCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) {
      setOk(false);
      setMessage("请输入兑换码");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/redemption/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as {
        code?: number;
        message?: string;
        data?: { result?: { kind?: string; balanceYuan?: string; packageTitle?: string } };
      } | null;
      if (res.ok && body?.code === 0 && body.data?.result) {
        const r = body.data.result;
        setOk(true);
        setMessage(
          r.kind === "balance" ? `兑换成功，余额 +¥${r.balanceYuan}` : `兑换成功，已开通套餐「${r.packageTitle}」`
        );
        setCode("");
        router.refresh();
      } else {
        setOk(false);
        setMessage(body?.message ?? "兑换失败，请稍后再试");
      }
    } catch {
      setOk(false);
      setMessage("网络异常，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <label className="flex-1 text-sm text-slate-500">
        <span className="sr-only">兑换码</span>
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) void submit();
          }}
          placeholder="输入 12 位兑换码"
          maxLength={64}
          aria-label="兑换码"
          className="rounded-md px-3 py-2 font-mono text-foreground uppercase focus:border-primary"
        />
      </label>
      <Button
        type="button"
        disabled={busy}
        variant="primary"
        onClick={() => void submit()}
        className="px-5 py-2"
      >
        {busy ? "兑换中…" : "立即兑换"}
      </Button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm sm:basis-full ${ok ? "text-emerald-700" : "text-rose-700"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
