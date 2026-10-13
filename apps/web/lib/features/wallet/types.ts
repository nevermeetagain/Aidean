/**
 * wallet 钱包域 types：领域类型定义。
 */

/** 钱包状态 */
export type WalletStatusCode = 'ACTIVE' | 'FROZEN' | 'CLOSED';

/** 钱包 DTO（对外，BigInt → string 序列化） */
export interface WalletDTO {
  id: string;
  userId: string;
  currency: string;
  balanceMinor: string;
  heldMinor: string;
  postedDebitsMinor: string;
  postedCreditsMinor: string;
  status: WalletStatusCode;
  lockVersion: number;
}

/** 钱包余额调整输入 */
export interface WalletAdjustInput {
  userId: string;
  amountMinor: number; // 正数=加余额，负数=扣余额
  reason: string;
  operatorId: string;
}
