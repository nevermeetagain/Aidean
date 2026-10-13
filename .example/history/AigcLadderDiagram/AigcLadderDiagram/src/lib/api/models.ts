import { api } from "./client";

export async function fetchModels(params: {
  page?: number;
  limit?: number;
  keyword?: string;
  vendorId?: string;
  modelType?: string;
  isOpenSource?: boolean;
} = {}) {
  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/models", { params: params as Record<string, string | number | boolean> });
}

export async function fetchModelById(id: string) {
  return api.get<any>(`/models/${id}`);
}

export async function fetchEvaluations(params: { page?: number; limit?: number } = {}) {
  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/evaluations", { params: params as Record<string, number> });
}

export async function fetchLadder(params: { chartType?: string } = {}) {
  return api.get<{ items: any[]; total: number }>("/ladder", { params: params as Record<string, string> });
}
