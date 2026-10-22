"use client";

/**
 * 排名维度权重编辑器（S7.5 接入断链）：折叠进 /admin/configs「不常用配置」。
 * 复用既有只读/整维度 PUT API（/api/v1/admin/ranking-weights，域 admin.configs.{read,write}）。
 * 行内改权重（0-100）与启用态，「保存」逐维度提交变更行；后端保存后 revalidate /models + /ladder。
 */
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Button, Input } from "@aidean/ui";

interface WeightRow {
  dimension: string;
  weight: number;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
}

const DIM_LABEL: Record<string, string> = {
  official: "官方数据",
  actual: "实测性能",
  review: "社区评价",
  selfTest: "自测得分",
  reasoning: "推理",
  coding: "编码",
  math: "数学",
  multilingual: "多语言",
  creativity: "创意",
  instruction: "指令遵循",
  safety: "安全",
  efficiency: "效率",
  value: "性价比",
};

export function RankingWeightsEditor({ canWrite = false }: { canWrite?: boolean }) {
  const [rows, setRows] = useState<WeightRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { weight: string; isActive: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<{ weights: WeightRow[] }>("/api/v1/admin/ranking-weights");
    setLoading(false);
    if (res.ok && res.data) {
      const list = res.data.weights;
      setRows(list);
      setDrafts(
        Object.fromEntries(list.map((w) => [w.dimension, { weight: String(w.weight), isActive: w.isActive }]))
      );
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  function setDraft(dimension: string, patch: Partial<{ weight: string; isActive: boolean }>) {
    setDrafts((prev) => ({ ...prev, [dimension]: { ...prev[dimension], ...patch } }));
  }

  async function saveAll() {
    const changed = rows
      .map((w) => {
        const d = drafts[w.dimension];
        const weight = Number(d.weight);
        if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
          setMessage(`维度 ${DIM_LABEL[w.dimension] ?? w.dimension} 权重须为 0-100 数值`);
          return null;
        }
        if (weight === w.weight && d.isActive === w.isActive) return null;
        return { dimension: w.dimension, weight, isActive: d.isActive };
      })
      .filter((x): x is { dimension: string; weight: number; isActive: boolean } => x !== null);

    if (changed.length === 0) {
      setMessage("无变更需要保存");
      return;
    }
    setBusy(true);
    for (const c of changed) {
      const res = await adminFetch("/api/v1/admin/ranking-weights", {
        method: "PUT",
        body: JSON.stringify(c),
      });
      if (!res.ok) {
        setBusy(false);
        setMessage(`保存失败：${res.message ?? c.dimension}`);
        await load();
        return;
      }
    }
    setBusy(false);
    setMessage(`已保存 ${changed.length} 项（前台天梯/模型排序即时生效）`);
    await load();
  }

  const columns: Column<WeightRow>[] = [
    {
      key: "dimension",
      header: "维度",
      className: "px-3 py-2",
      render: (w) => (
        <div>
          <div className="text-slate-800">{DIM_LABEL[w.dimension] ?? w.dimension}</div>
          <div className="text-xs text-slate-400">{w.dimension}</div>
        </div>
      ),
    },
    {
      key: "weight",
      header: "权重(0-100)",
      className: "px-3 py-2",
      render: (w) =>
        canWrite ? (
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={drafts[w.dimension]?.weight ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(w.dimension, { weight: e.target.value })}
            aria-label={`${DIM_LABEL[w.dimension] ?? w.dimension} 权重`}
            className="w-24"
          />
        ) : (
          <span className="tabular-nums text-slate-600">{w.weight}</span>
        ),
    },
    {
      key: "isActive",
      header: "启用",
      className: "px-3 py-2",
      render: (w) =>
        canWrite ? (
          <input
            type="checkbox"
            checked={drafts[w.dimension]?.isActive ?? w.isActive}
            onChange={(e) => setDraft(w.dimension, { isActive: e.target.checked })}
            aria-label={`${DIM_LABEL[w.dimension] ?? w.dimension} 启用`}
          />
        ) : (
          <span className={w.isActive ? "text-emerald-700" : "text-slate-400"}>{w.isActive ? "启用" : "停用"}</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      ) : null}
      {canWrite ? (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" disabled={busy || loading} onClick={() => void saveAll()}>保存权重</Button>
        </div>
      ) : null}
      <AdminDataTable columns={columns} rows={rows} rowKey={(w) => w.dimension} emptyText="暂无排名维度权重" busy={busy || loading} />
    </div>
  );
}
