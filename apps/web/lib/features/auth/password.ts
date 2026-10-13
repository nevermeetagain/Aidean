/**
 * 密码哈希单源封装（性能轮 2026-10-04）：纯 JS `bcryptjs` → 原生 `@node-rs/bcrypt`（napi 预编译）。
 *
 * 背景（实测，4 核弱机）：bcryptjs cost-12 compareSync 单次 885~952ms，是登录 API
 * TTFB ~1.3s 的主项；原生实现同 cost ~500ms。哈希格式标准 `$2a$/$2b$`——原生可验证
 * bcryptjs 存量哈希（已实测 true），切换为一次性全量替换（运行时不再引用 bcryptjs），
 * 存量数据零迁移。注意反向不兼容：bcryptjs 验不了原生新哈希，故不允许任何回退引用。
 *
 * async 版走线程池不阻塞事件循环（登录/注册热路径一律用 async）；
 * sync 版仅供无法 async 的调用方（如 OAuth client secret 恒时比对）。
 */
import { hash, hashSync, verify, verifySync } from "@node-rs/bcrypt";

/** bcrypt 计算成本：安全基线 cost>=10，取中上值（原 service.ts 常量迁入单源） */
export const SALT_ROUNDS = 12;

export function hashPassword(password: string, rounds: number = SALT_ROUNDS): Promise<string> {
  return hash(password, rounds);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verify(password, hash);
}

export function hashPasswordSync(password: string, rounds: number = SALT_ROUNDS): string {
  return hashSync(password, rounds);
}

export function verifyPasswordSync(password: string, hash: string): boolean {
  return verifySync(password, hash);
}
