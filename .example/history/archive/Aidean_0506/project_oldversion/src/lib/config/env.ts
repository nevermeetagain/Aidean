export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET || "secret",
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
};
