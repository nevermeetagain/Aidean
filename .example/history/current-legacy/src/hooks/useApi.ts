"use client";

import useSWR, { SWRConfiguration, mutate as swrMutate } from "swr";
import { api } from "@/lib/api/client";
import {
  parseListResponse,
  parseEntityResponse,
  extractError,
  ApiResponse,
  PaginatedData,
} from "@/lib/api/response";

// ==================== 基础 Fetcher ====================

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await api.get<ApiResponse<T> | T>(url);
  // 兼容两种响应格式:
  // 1. 标准格式: { success: true, data: T, message?: string }
  // 2. 直接格式: T (如 { items: [...], pagination: {...} })
  if (res && typeof res === "object" && "success" in res && "data" in res) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
};

// ==================== 错误类型 ====================

export interface ApiError {
  code: string;
  message: string;
}

// ==================== 列表数据 Hook ====================

export interface UseListOptions<T> extends SWRConfiguration {
  params?: Record<string, string | number | boolean>;
  parse?: (response: unknown) => { items: T[]; pagination?: PaginatedData<T>["pagination"] };
}

export function useList<T>(
  key: string | null,
  options: UseListOptions<T> = {}
) {
  const { params, parse = parseListResponse, ...swrOptions } = options;

  // 构建带参数的 URL
  const url = key
    ? params
      ? `${key}?${new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ).toString()}`
      : key
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    url,
    async (u: string) => {
      const res = await api.get<ApiResponse<unknown>>(u);
      return parse(res);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  return {
    items: data?.items || [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error: error ? (extractError(error) as ApiError) : null,
    mutate,
    refresh: () => mutate(),
  };
}

// ==================== 单个实体 Hook ====================

export interface UseEntityOptions<T> extends SWRConfiguration {
  parse?: (response: unknown) => T;
}

export function useEntity<T>(
  key: string | null,
  options: UseEntityOptions<T> = {}
) {
  const { parse = parseEntityResponse, ...swrOptions } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    async (u: string) => {
      const res = await api.get<ApiResponse<unknown>>(u);
      return parse(res);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  return {
    data,
    isLoading,
    isValidating,
    error: error ? (extractError(error) as ApiError) : null,
    mutate,
    refresh: () => mutate(),
  };
}

// ==================== 通用 GET Hook ====================

export function useApi<T>(
  key: string | null,
  options: SWRConfiguration = {}
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher<T>,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...options,
    }
  );

  return {
    data,
    isLoading,
    isValidating,
    error: error ? (extractError(error) as ApiError) : null,
    mutate,
    refresh: () => mutate(),
  };
}

// ==================== 操作 Hook ====================

interface UseMutationOptions<T, R> {
  onSuccess?: (data: R, variables: T) => void;
  onError?: (error: { code: string; message: string }, variables: T) => void;
  invalidateKeys?: string[];
}

export function useMutation<T, R = unknown>(
  mutationFn: (data: T) => Promise<ApiResponse<R>>,
  options: UseMutationOptions<T, R> = {}
) {
  const { onSuccess, onError, invalidateKeys } = options;
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (variables: T): Promise<R | null> => {
    setIsLoading(true);
    try {
      const response = await mutationFn(variables);

      if (!response.success) {
        const error = extractError(response);
        onError?.(error, variables);
        throw new Error(error.message);
      }

      // 刷新相关缓存
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => swrMutate(key));
      }

      onSuccess?.(response.data, variables);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : "操作失败";
      onError?.({ code: "MUTATION_ERROR", message: error }, variables);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

// ==================== 快捷操作 Hook ====================

import { useState } from "react";

interface CreateOptions<T, R> extends UseMutationOptions<T, R> {}

export function useCreate<T, R = unknown>(
  endpoint: string,
  options: CreateOptions<T, R> = {}
) {
  return useMutation<T, R>(
    (data) => api.post<ApiResponse<R>>(endpoint, data),
    options
  );
}

interface UpdateOptions<T, R> extends UseMutationOptions<{ id: string; data: T }, R> {}

export function useUpdate<T, R = unknown>(
  endpoint: string,
  options: UpdateOptions<T, R> = {}
) {
  return useMutation<{ id: string; data: T }, R>(
    ({ id, data }) => api.put<ApiResponse<R>>(`${endpoint}/${id}`, data),
    options
  );
}

interface DeleteOptions extends UseMutationOptions<string, unknown> {}

export function useDelete(
  endpoint: string,
  options: DeleteOptions = {}
) {
  return useMutation<string, unknown>(
    (id) => api.delete<ApiResponse<unknown>>(`${endpoint}/${id}`),
    options
  );
}

// ==================== 预定义 Key 生成器 ====================

const buildUrl = (base: string, params?: Record<string, unknown>): string => {
  if (!params) return base;
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return query ? `${base}?${query}` : base;
};

export const apiKeys = {
  // 模型
  models: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models", params),
  model: (id: string): string => `/admin/models/${id}`,
  vendors: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models/vendors", params),
  benchmarks: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models/benchmarks", params),
  comparisons: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models/comparisons", params),
  syncBatches: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models/sync-batches", params),
  versions: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/models/versions", params),

  // 工具
  skills: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/tools", { type: "skill", ...params }),
  mcps: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/tools", { type: "mcp", ...params }),
  agents: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/tools", { type: "agent", ...params }),
  apiStations: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/tools", { type: "api-station", ...params }),
  tool: (id: string, type: string): string => `/admin/tools/${id}?type=${type}`,

  // 用户
  users: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/users", params),
  user: (id: string): string => `/admin/users/${id}`,
  upgradeRequests: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/users/upgrade", params),

  // 天梯
  ladder: (params?: Record<string, unknown>): string =>
    buildUrl("/admin/ladder", params),

  // 系统
  stats: (): string => "/system/stats",
  health: (): string => "/system/health",
};

// ==================== 公开页面 Key 生成器 ====================

export const publicApiKeys = {
  // 模型
  models: (params?: Record<string, unknown>): string =>
    buildUrl("/models", params),
  ladder: (params?: Record<string, unknown>): string =>
    buildUrl("/models/ladder", params),

  // 工具
  skills: (params?: Record<string, unknown>): string =>
    buildUrl("/tools/skills", params),
  mcps: (params?: Record<string, unknown>): string =>
    buildUrl("/tools/mcp", params),
  agents: (params?: Record<string, unknown>): string =>
    buildUrl("/tools/agents", params),
  apiStations: (params?: Record<string, unknown>): string =>
    buildUrl("/tools/api-stations", params),

  // 认证
  authMe: (): string => "/auth/me",
  balance: (): string => "/finance/balance",

  // 系统
  stats: (): string => "/system/stats",
  config: (): string => "/system/config",
};
