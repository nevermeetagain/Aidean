import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || "aidean-dev-secret-key-2026";
const ACCESS_TOKEN_TTL: number = 60 * 60 * 2;
const REFRESH_TOKEN_TTL: number = 60 * 60 * 24 * 7;

// Constants
export const ACCESS_TOKEN_EXPIRY = 60 * 60 * 2;
export const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7;
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const LEGACY_TOKEN_COOKIE = "token";

export function signToken(
  payload: object,
  expiresIn: jwt.SignOptions["expiresIn"] = ACCESS_TOKEN_TTL
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken<T = jwt.JwtPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

export function generateAccessToken(payload: AccessTokenPayload) {
  return signToken({ ...payload, tokenType: "access" }, ACCESS_TOKEN_TTL);
}

export function generateRefreshToken(payload: RefreshTokenPayload) {
  return signToken({ ...payload, tokenType: "refresh" }, REFRESH_TOKEN_TTL);
}

export function verifyAccessToken(token: string) {
  return verifyToken<AccessTokenPayload & { tokenType?: string }>(token);
}

export function verifyRefreshToken(token: string) {
  return verifyToken<RefreshTokenPayload & { tokenType?: string }>(token);
}

export function getAccessTokenFromCookie(request?: NextRequest | Request | null): string | null {
  if (!request) return null;
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((item) => {
      const [key, ...rest] = item.trim().split("=");
      return [key, rest.join("=")];
    })
  );
  return cookies[ACCESS_TOKEN_COOKIE] || cookies[LEGACY_TOKEN_COOKIE] || null;
}

export function getRefreshTokenFromCookie(request?: NextRequest | Request | null): string | null {
  if (!request) return null;
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((item) => {
      const [key, ...rest] = item.trim().split("=");
      return [key, rest.join("=")];
    })
  );
  return cookies[REFRESH_TOKEN_COOKIE] || null;
}

export function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  const secure = process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...common,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...common,
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
  response.cookies.set(LEGACY_TOKEN_COOKIE, accessToken, {
    ...common,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });
}

export function clearTokenCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(LEGACY_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
}

// Types
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  roles?: string[];
  tokenType?: "access";
}

export interface RefreshTokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenId: string;
  tokenType?: "refresh";
}
