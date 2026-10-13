import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

// Aliases for compatibility
export const verifyAccessToken = verifyToken;
export const verifyRefreshToken = verifyToken;
export const generateAccessToken = signToken;
export const generateRefreshToken = signToken;

// Cookie helpers (placeholders)
export function getAccessTokenFromCookie(): string | null {
  return null;
}

export function getRefreshTokenFromCookie(): string | null {
  return null;
}

export function setTokenCookies(accessToken: string, refreshToken: string): void {
  // Placeholder
}

export function clearTokenCookies(): void {
  // Placeholder
}

// Constants
export const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
export const REFRESH_TOKEN_EXPIRY = 604800; // 7 days
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// Types
export interface AccessTokenPayload {
  userId: string;
  email: string;
  roles?: string[];
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}
