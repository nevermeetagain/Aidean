/**
 * Aidean API Client
 * 前端统一fetch封装层
 *
 * - 自动携带认证Token
 * - 统一错误处理
 * - 请求/响应类型安全
 * - 自动Token刷新
 */

// ============================================
// 类型定义
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
    timestamp?: string;
    request_id?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    type: string;
    details?: Record<string, unknown>;
    request_id?: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
}

// ============================================
// 配置
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const TOKEN_KEY = "aidean.token";

// ============================================
// Token管理
// ============================================

let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)aidean\.token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function setToken(token: string | null) {
  memoryToken = token;
  if (typeof document !== "undefined" && token) {
    document.cookie = `aidean.token=${encodeURIComponent(token)}; path=/; max-age=900; samesite=lax`;
  }
}

export function clearToken() {
  memoryToken = null;
  if (typeof document !== "undefined") {
    document.cookie = "aidean.token=; path=/; max-age=0";
  }
}

// ============================================
// Token刷新
// ============================================

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data?.accessToken) {
        setToken(json.data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================
// 核心请求函数
// ============================================

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, body, auth = true, raw, headers: customHeaders, ...rest } = options;

  // 构建URL
  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // 构建请求头
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // 携带Token
  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // 构建请求
  const fetchOptions: RequestInit = {
    ...rest,
    headers,
    credentials: "include",
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.method = fetchOptions.method || "POST";
  }

  // 发送请求
  let response = await fetch(url, fetchOptions);

  // 401自动刷新Token重试
  if (response.status === 401 && auth && !path.includes("/auth/")) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }
  }

  // raw模式直接返回
  if (raw) {
    return response as unknown as ApiResponse<T>;
  }

  // 解析JSON
  const text = await response.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      success: false,
      error: {
        code: "A5CL-001",
        message: "响应解析失败",
        type: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 401且刷新失败，清除Token
  if (response.status === 401 && auth) {
    clearToken();
  }

  return json;
}

// ============================================
// 便捷方法
// ============================================

export const api = {
  get: <T>(path: string, params?: RequestOptions["params"], options?: Omit<RequestOptions, "params" | "body" | "method">) =>
    apiClient<T>(path, { ...options, method: "GET", params }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">) =>
    apiClient<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">) =>
    apiClient<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">) =>
    apiClient<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "body" | "method">) =>
    apiClient<T>(path, { ...options, method: "DELETE" }),
};

// ============================================
// 业务API封装
// ============================================

export const systemApi = {
  health: () => api.get<{ status: string; uptime: number }>("/api/v1/system/health"),
  stats: () => api.get<{
    users: { total: number; active: number; newThisMonth: number };
    models: { total: number; active: number };
    vendors: { total: number };
  }>("/api/v1/system/stats"),
  announcements: (limit = 5) =>
    api.get<any[]>("/api/v1/system/announcements", { limit }),
  config: (group?: string) =>
    api.get<Record<string, { value: string; valueEn?: string; type: string; description?: string }>>(
      "/api/v1/system/config",
      group ? { group } : undefined
    ),
};

export const modelsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; vendor?: string; isOpenSource?: boolean; search?: string }) =>
    api.get<any[]>("/api/v1/models", params),
};

export const ladderApi = {
  list: (params?: { type?: string; category?: string; page?: number; limit?: number }) =>
    api.get<any[]>("/api/v1/ladder", params),
};

export const toolsApi = {
  skills: (params?: { page?: number; limit?: number; category?: string; keyword?: string }) =>
    api.get<any[]>("/api/v1/tools/skills", params),
  mcp: (params?: { page?: number; limit?: number; category?: string; keyword?: string }) =>
    api.get<any[]>("/api/v1/tools/mcp", params),
  agents: (params?: { page?: number; limit?: number; category?: string; keyword?: string }) =>
    api.get<any[]>("/api/v1/tools/agents", params),
  apiStations: (params?: { page?: number; limit?: number; category?: string; keyword?: string }) =>
    api.get<any[]>("/api/v1/tools/api-stations", params),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; tokens: { access_token: string; refresh_token: string; expires_in: number } }>(
      "/api/v1/auth/login",
      { email, password }
    ),

  register: (email: string, password: string, nickname?: string) =>
    api.post<{ user: any; tokens: { access_token: string; refresh_token: string; expires_in: number } }>(
      "/api/v1/auth/register",
      { email, password, nickname }
    ),

  me: () => api.get<{ id: string; email: string; nickname: string; role: string }>("/api/v1/auth/me"),

  logout: () => api.post<null>("/api/v1/auth/logout"),

  refresh: () => api.post<{ accessToken: string; expiresIn: number }>("/api/v1/auth/refresh"),
};

export const favoritesApi = {
  list: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get<any[]>("/api/v1/favorites", params),

  add: (refType: string, refId: string, note?: string) =>
    api.post<any>("/api/v1/favorites", { refType, refId, note }),

  remove: (refType: string, refId: string) =>
    api.delete(`/api/v1/favorites?type=${refType}&refId=${refId}`),
};

export const financeApi = {
  balance: () => api.get<any>("/api/v1/finance/balance"),
  transactions: (params?: { page?: number; limit?: number }) =>
    api.get<any[]>("/api/v1/finance/transactions", params),
};

export const evaluationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<any[]>("/api/v1/evaluations", params),
  create: (data: { name: string; prompt: string; modelIds: string[] }) =>
    api.post<any>("/api/v1/evaluations", data),
};

// ============================================
// 工具函数
// ============================================

export function isSuccess<T>(res: ApiResponse<T>): res is ApiSuccessResponse<T> {
  return res.success === true;
}

export function isError<T>(res: ApiResponse<T>): res is ApiErrorResponse {
  return res.success === false;
}

export function getErrorMessage<T>(res: ApiResponse<T>): string {
  if (isError(res)) return res.error.message;
  return "";
}
