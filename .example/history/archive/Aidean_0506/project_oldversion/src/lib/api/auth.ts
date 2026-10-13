import { api } from "./client";

export async function login(email: string, password: string) {
  return api.post<{ user: any; token: string }>("/auth/login", { email, password });
}

export async function register(email: string, password: string, nickname?: string) {
  return api.post<{ user: any; token: string }>("/auth/register", { email, password, nickname });
}

export async function getMe() {
  return api.get<{ user: any }>("/auth/me");
}

export async function refreshToken() {
  return api.post<{ user: any; token: string }>("/auth/refresh");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
