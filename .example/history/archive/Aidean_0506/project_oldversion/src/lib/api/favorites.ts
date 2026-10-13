import { api } from "./client";

export async function fetchFavorites(params: { refType?: string } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return { items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };

  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = stored ? JSON.parse(stored) : null;

  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/favorites", { params: { userId: user?.id, ...params } as Record<string, string> });
}

export async function addFavorite(refType: string, refId: string, note?: string) {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = stored ? JSON.parse(stored) : null;
  if (!user) throw new Error("请先登录");

  return api.post<any>("/favorites", { userId: user.id, refType, refId, note });
}

export async function removeFavorite(refType: string, refId: string) {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = stored ? JSON.parse(stored) : null;
  if (!user) throw new Error("请先登录");

  return api.delete("/favorites", { params: { userId: user.id, refType, refId } as Record<string, string> });
}
