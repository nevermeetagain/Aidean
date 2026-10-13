import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "aidean_token";

type AuthTokenPayload = {
  userId: string;
  email: string;
};

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-jwt-secret";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3) return false;
  const [alg, salt, hex] = parts;
  if (alg !== "scrypt" || !salt || !hex) return false;

  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hex, "hex");
  if (a.length !== b.length) return false;

  // Ensure ArrayBufferView type compatibility across TS/Node typings.
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || typeof decoded !== "object") return null;
    const userId = (decoded as any).userId;
    const email = (decoded as any).email;
    if (typeof userId !== "string" || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}

