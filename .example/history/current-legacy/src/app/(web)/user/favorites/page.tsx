"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Trash2, ExternalLink } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";

interface Favorite {
  id: string;
  refType: string;
  refId: string;
  note?: string;
  createdAt: string;
  model?: {
    id: string;
    nameDisplay: string;
    vendor?: { name: string };
  };
}

export default function UserFavoritesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    api.get<{ user: { id: string } }>("/auth/me")
      .then((res) => setUserId(res.user.id))
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/auth/login");
      });
  }, [router]);

  const { data: favoritesData, mutate } = useApi<{ items: Favorite[]; total: number }>(
    userId ? "/favorites" : null
  );

  const favorites = favoritesData?.items || [];

  const handleRemove = async (refType: string, refId: string) => {
    if (!userId) return;
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/v1/favorites", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refType, refId }),
      });
      mutate();
    } catch (error) {
      console.error("移除收藏失败:", error);
    }
  };

  if (!userId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">我的收藏</h1>
        <p className="mt-1 text-sm text-slate-500">共 {favorites.length} 个收藏</p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">暂无收藏</p>
          <Link href="/models" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700">
            去天梯图逛逛
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Heart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {fav.model?.nameDisplay || fav.refId}
                  </div>
                  <div className="text-sm text-slate-500">
                    {fav.model?.vendor?.name || fav.refType}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fav.refType === "MODEL" && fav.model && (
                  <Link
                    href={`/models/${fav.model.id}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
                <button
                  onClick={() => handleRemove(fav.refType, fav.refId)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
