"use client";

/**
 * 调用测试台「最近调用」区块（WF-23 / AT-23.2，P7）。
 * 复用既有 GET /api/v1/user/usage 明细分页接口（usage_logs 已记录每次调用，无需新表）；
 * 展示最近 N 条（时间倒序），仅本人数据；日志不可变，不提供删除（铁律 4 同源口径）。
 * 三态：骨架 / 空态 / 错误重试（沿用 UsageLedger 模式）。
 */
import { useCallback, useEffect, useState } from "react";

import type { UsagePage } from "@aidean/shared";

interface Envelope {
  code?: number;
  message?: string;
  data?: UsagePage | null;
}

const PAGE_SIZE = 8;

/** 计费路径 → 中文徽标（与 UsageLedger 同口径的最小子集） */
const PATH_LABEL: Record<string, string> = {
  PLATFORM: "平台",
  UPSTREAM: "自有",
  PACKAGE: "套餐",
  FREE_PROXY: "免费代理",
  FREE_QUOTA: "免费额度",
};

export function UsageRecentList() {
  const [items, setItems] = useState<UsagePage["items"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/user/usage?page=1&pageSize=${PAGE_SIZE}`, {
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => null)) as Envelope | null;
      if (!res.ok || !body || body.code !== 0 || !body.data) {
        throw new Error(body?.message ?? "请求失败");
      }
      setItems(body.data.items);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6" data-testid="usage-recent-list">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">最近调用</h3>
        {error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            重试
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-slate-400 transition-colors hover:text-primary"
          >
            刷新
          </button>
        )}
      </div>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
        {items === null ? (
          <li className="px-4 py-4 text-sm text-slate-400">加载中…</li>
        ) : error ? (
          <li className="px-4 py-4 text-sm text-red-600">{error}</li>
        ) : items.length === 0 ? (
          <li className="px-4 py-4 text-sm text-slate-400">
            暂无调用记录；在上方发起一次真实调用后即可在此核对。
          </li>
        ) : (
          items.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate font-medium text-foreground">
                {u.model}
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {PATH_LABEL[u.billingPath] ?? u.billingPath}
                </span>
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                {u.promptTokens}+{u.completionTokens} tok · ¥{u.quotaYuan}
                {typeof u.latencyMs === "number" ? ` · ${u.latencyMs}ms` : ""}
                {typeof u.statusCode === "number" && u.statusCode !== 200 ? ` · HTTP ${u.statusCode}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>
      <p className="mt-1.5 text-xs text-slate-400">完整明细（含筛选与分页）见「余额与充值」页的用量明细。</p>
    </div>
  );
}
