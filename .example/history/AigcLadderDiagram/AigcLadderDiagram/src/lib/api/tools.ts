import { api } from "./client";

export async function fetchSkills(params: { page?: number; limit?: number; keyword?: string; category?: string } = {}) {
  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/tools/skills", { params: params as Record<string, string | number> });
}

export async function fetchMCPServers(params: { page?: number; limit?: number; keyword?: string; category?: string } = {}) {
  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/tools/mcp", { params: params as Record<string, string | number> });
}

export async function fetchAgents(params: { page?: number; limit?: number; keyword?: string; category?: string } = {}) {
  return api.get<{
    items: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/tools/agents", { params: params as Record<string, string | number> });
}
