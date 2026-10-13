/**
 * Aidean API Client
 * Frontend unified fetch wrapper
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// API 错误类型
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

// 错误拦截器类型
type ErrorHandler = (error: ApiError) => void | boolean;

interface ApiOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private errorHandlers: ErrorHandler[] = [];
  private onAuthError?: () => void;

  // 注册错误拦截器
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }

  // 设置认证错误处理（如 401 自动跳转登录）
  setAuthErrorHandler(handler: () => void): void {
    this.onAuthError = handler;
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    options: ApiOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let queryString = "";
    if (options.params) {
      const params = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      queryString = params.toString() ? `?${params.toString()}` : "";
    }

    const fullUrl = `${API_BASE_URL}${url}${queryString}`;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      // 处理 HTTP 错误
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiError: ApiError = {
          code: errorData.code || `HTTP_${response.status}`,
          message: errorData.message || `API Error: ${response.status}`,
          status: response.status,
          details: errorData.details,
        };

        // 特殊处理 401 未授权
        if (response.status === 401) {
          this.onAuthError?.();
        }

        // 执行错误拦截器
        let handled = false;
        for (const handler of this.errorHandlers) {
          const result = handler(apiError);
          if (result === false) {
            handled = true;
            break;
          }
        }

        if (!handled) {
          throw apiError;
        }

        // 如果拦截器返回 false（表示已处理），返回空对象
        return {} as T;
      }

      return response.json();
    } catch (error) {
      // 网络错误或其他异常
      if (!(error as ApiError).status) {
        const networkError: ApiError = {
          code: "NETWORK_ERROR",
          message: "网络连接失败，请检查网络后重试",
          status: 0,
        };

        let handled = false;
        for (const handler of this.errorHandlers) {
          const result = handler(networkError);
          if (result === false) {
            handled = true;
            break;
          }
        }

        if (!handled) {
          throw networkError;
        }

        return {} as T;
      }

      throw error;
    }
  }

  get<T>(url: string, options?: ApiOptions): Promise<T> {
    return this.request("GET", url, undefined, options);
  }

  post<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request("POST", url, data, options);
  }

  put<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request("PUT", url, data, options);
  }

  patch<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request("PATCH", url, data, options);
  }

  delete<T>(url: string, options?: ApiOptions): Promise<T> {
    return this.request("DELETE", url, undefined, options);
  }
}

export const api = new ApiClient();

// 类型守卫：判断API响应是否成功
export function isSuccess<T>(res: unknown): res is { success: true; data: T; meta?: unknown } {
  return typeof res === 'object' && res !== null && (res as { success?: boolean }).success === true;
}

// 系统API命名空间
export const systemApi = {
  stats: () => api.get("/system/stats"),
  health: () => api.get("/system/health"),
  config: () => api.get("/system/config"),
};
