"use client";

/**
 * useAdminList — admin 列表数据获取钩子（#35④ 打样）。
 *
 * 统一三件事（各 Manager 手抄模式的收口）：
 * 1. loading 通道：首帧即 true，杜绝 #68 类「空态闪现」（消费方 `busy={busy || loading}` 接入）；
 * 2. 晚到响应守卫：url 变更/手动 reload 时旧请求中止且回写作废（R-83 千级压测教训的通用化）；
 * 3. 信封解包 + 行提取：select 把差异留在消费方，信封/错误处理在底座。
 *
 * 推广判据（目录 §7.12 #35④）：OrdersManager 打样验证通过后再批量替换手抄模式。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "../components/admin/adminFetch";
import { createLoadGuard } from "../lib/admin/load-guard";

export interface AdminListResult<TRow> {
  rows: TRow[];
  total: number;
  loading: boolean;
  error: string | null;
  /** url 未变但需重新拉取（写操作后刷新等） */
  reload: () => void;
}

export function useAdminList<TData, TRow>(options: {
  /** 完整 URL（含查询串）；变更即重拉 */
  url: string;
  /** 从响应 data 提取行与总数（不同域字段名差异留在这里，由消费方声明） */
  select: (data: TData) => { rows: TRow[]; total?: number };
}): AdminListResult<TRow> {
  const { url, select } = options;
  const [rows, setRows] = useState<TRow[]>([]);
  const [total, setTotal] = useState(0);
  // 首帧 true：表格先呈「加载中…」而非空态（AdminDataTable busy 通道）
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const guardRef = useRef(createLoadGuard());
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const guard = guardRef.current;
    const ticket = guard.begin();
    setLoading(true);
    setError(null);
    void (async () => {
      const res = await adminFetch<TData>(url, { signal: ticket.signal });
      if (!ticket.isCurrent()) return; // 晚到/已中止：不回写 rows，也不动 loading
      if (res.ok && res.data) {
        const sel = selectRef.current(res.data);
        setRows(sel.rows);
        setTotal(sel.total ?? sel.rows.length);
      } else {
        setError(res.message ?? "加载失败");
        setRows([]);
        setTotal(0);
      }
      setLoading(false);
    })();
    return () => guard.abort();
  }, [url, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return { rows, total, loading, error, reload };
}
