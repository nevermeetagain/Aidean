"use client";

import { useCallback, useState } from "react";
import useSWR, { SWRConfiguration, mutate as swrMutate } from "swr";
import { api } from "@/lib/api/client";
import {
  parseListResponse,
  parseEntityResponse,
  ApiResponse,
  PaginatedData,
} from "@/lib/api/response";

// ==================== 类型定义 ====================

export interface EntityConfig<T> {
  baseUrl: string;
  listKey: string;
  entityKey?: string;
  parseList?: (response: unknown) => { items: T[]; pagination?: PaginatedData<T>["pagination"] };
  parseEntity?: (response: unknown) => T;
}

export interface UseEntityListOptions extends SWRConfiguration {
  params?: Record<string, string | number | boolean | undefined>;
  parseList?: (response: unknown) => { items: unknown[]; pagination?: PaginatedData<unknown>["pagination"] };
}

export interface UseEntityListResult<T> {
  items: T[];
  pagination?: PaginatedData<T>["pagination"];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export interface UseEntityDetailResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export interface UseEntityMutateResult<T> {
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ==================== 构建 URL ====================

function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return baseUrl;
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (filtered.length === 0) return baseUrl;
  const query = new URLSearchParams(
    filtered.map(([k, v]) => [k, String(v)])
  ).toString();
  return `${baseUrl}?${query}`;
}

// ==================== 列表 Hook ====================

export function useEntityList<T>(
  config: EntityConfig<T>,
  options: UseEntityListOptions = {}
): UseEntityListResult<T> {
  const { params, parseList = parseListResponse, ...swrOptions } = options;

  const url = buildUrl(config.baseUrl, params);

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (u: string) => {
      const res = await api.get<ApiResponse<unknown>>(u);
      return parseList(res);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  const refresh = useCallback(() => {
    mutate();
    // 同时刷新列表缓存
    swrMutate(config.listKey);
  }, [mutate, config.listKey]);

  return {
    items: (data?.items || []) as T[],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh,
  };
}

// ==================== 详情 Hook ====================

export function useEntityDetail<T>(
  config: EntityConfig<T>,
  id: string | null,
  options: SWRConfiguration & { parseEntity?: (response: unknown) => T } = {}
): UseEntityDetailResult<T> {
  const { parseEntity = config.parseEntity || parseEntityResponse, ...swrOptions } = options;

  const url = id ? `${config.baseUrl}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (u: string) => {
      const res = await api.get<ApiResponse<unknown>>(u);
      return parseEntity(res);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    data: data || null,
    isLoading,
    error,
    refresh,
  };
}

// ==================== 变更 Hook ====================

export function useEntityMutate<T>(
  config: EntityConfig<T>
): UseEntityMutateResult<T> {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const create = useCallback(
    async (data: Partial<T>): Promise<T> => {
      setIsCreating(true);
      try {
        const res = await api.post<ApiResponse<T>>(config.baseUrl, data);
        // 刷新列表
        swrMutate(config.listKey);
        return res.data;
      } finally {
        setIsCreating(false);
      }
    },
    [config.baseUrl, config.listKey]
  );

  const update = useCallback(
    async (id: string, data: Partial<T>): Promise<T> => {
      setIsUpdating(true);
      try {
        const res = await api.patch<ApiResponse<T>>(
          `${config.baseUrl}/${id}`,
          data
        );
        // 刷新详情和列表
        swrMutate(`${config.baseUrl}/${id}`);
        swrMutate(config.listKey);
        return res.data;
      } finally {
        setIsUpdating(false);
      }
    },
    [config.baseUrl, config.listKey]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setIsDeleting(true);
      try {
        await api.delete<ApiResponse<void>>(`${config.baseUrl}/${id}`);
        // 刷新列表
        swrMutate(config.listKey);
      } finally {
        setIsDeleting(false);
      }
    },
    [config.baseUrl, config.listKey]
  );

  return {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

// ==================== 组合 Hook（一站式）====================

export interface UseEntityResult<T> {
  // 列表
  list: UseEntityListResult<T>;
  // 变更
  mutate: UseEntityMutateResult<T>;
  // 实体配置
  config: EntityConfig<T>;
}

export function useEntity<T>(
  config: EntityConfig<T>,
  listOptions?: UseEntityListOptions
): UseEntityResult<T> {
  const list = useEntityList(config, listOptions);
  const mutate = useEntityMutate(config);

  return {
    list,
    mutate,
    config,
  };
}

// ==================== 预定义实体配置 ====================

export const entityConfigs = {
  // 模型
  models: {
    baseUrl: "/admin/models",
    listKey: "/admin/models",
  },
  vendors: {
    baseUrl: "/admin/models/vendors",
    listKey: "/admin/models/vendors",
  },
  benchmarks: {
    baseUrl: "/admin/benchmarks",
    listKey: "/admin/benchmarks",
  },
  evaluations: {
    baseUrl: "/admin/evaluations",
    listKey: "/admin/evaluations",
  },
  syncBatches: {
    baseUrl: "/admin/models/sync-batches",
    listKey: "/admin/models/sync-batches",
  },
  versions: {
    baseUrl: "/admin/models/versions",
    listKey: "/admin/models/versions",
  },

  // 工具
  skills: {
    baseUrl: "/admin/tools",
    listKey: "/admin/tools/skills",
  },
  mcps: {
    baseUrl: "/admin/tools",
    listKey: "/admin/tools/mcps",
  },
  agents: {
    baseUrl: "/admin/tools",
    listKey: "/admin/tools/agents",
  },
  combinations: {
    baseUrl: "/admin/tools/combinations",
    listKey: "/admin/tools/combinations",
  },

  // 用户
  users: {
    baseUrl: "/admin/users",
    listKey: "/admin/users",
  },
  upgradeRequests: {
    baseUrl: "/admin/users/upgrade",
    listKey: "/admin/users/upgrade",
  },

  // 财务
  transactions: {
    baseUrl: "/admin/finance/transactions",
    listKey: "/admin/finance/transactions",
  },
  plans: {
    baseUrl: "/admin/finance/plans",
    listKey: "/admin/finance/plans",
  },

  // 内容
  news: {
    baseUrl: "/admin/content/news",
    listKey: "/admin/content/news",
  },
  documents: {
    baseUrl: "/admin/content/documents",
    listKey: "/admin/content/documents",
  },

  // 权限
  roles: {
    baseUrl: "/admin/rbac/roles",
    listKey: "/admin/rbac/roles",
  },
  departments: {
    baseUrl: "/admin/org/departments",
    listKey: "/admin/org/departments",
  },
  teams: {
    baseUrl: "/admin/org/teams",
    listKey: "/admin/org/teams",
  },

  // 脚本
  scripts: {
    baseUrl: "/admin/scripts",
    listKey: "/admin/scripts",
  },
  tasks: {
    baseUrl: "/admin/scripts/tasks",
    listKey: "/admin/scripts/tasks",
  },
  backups: {
    baseUrl: "/admin/scripts/backups",
    listKey: "/admin/scripts/backups",
  },
};

// ==================== 快捷 Hook ====================

export function useModels(listOptions?: UseEntityListOptions) {
  return useEntity(entityConfigs.models, listOptions);
}

export function useVendors(listOptions?: UseEntityListOptions) {
  return useEntity(entityConfigs.vendors, listOptions);
}

export function useUsers(listOptions?: UseEntityListOptions) {
  return useEntity(entityConfigs.users, listOptions);
}

export function useSkills(listOptions?: UseEntityListOptions) {
  return useEntity(entityConfigs.skills, listOptions);
}

export function useTransactions(listOptions?: UseEntityListOptions) {
  return useEntity(entityConfigs.transactions, listOptions);
}
