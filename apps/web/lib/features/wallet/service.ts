/**
 * wallet 钱包域 service：业务编排层。
 *
 * 域划分口径：账本全部读写能力在 features/billing（资金变动唯一编排入口）；
 * 本域聚合 billing 读视图 + 钱包记录管理（admin 余额调整/冻结）。
 * 余额调整写 audit log，实际金额变动委托 billing ledger 写入。
 */
import type { LedgerPage, WalletView } from "@aidean/shared";

import { billingService } from "../billing/service";
import { walletRepository } from "./repository";
import type { WalletDTO, WalletAdjustInput } from "./types";

export const walletService = {
  // ── 读侧（代理 billing） ──

  /** 钱包概览：balance/held/available（分转元字符串） */
  async getWalletView(userId: string): Promise<WalletView> {
    return billingService.getWalletView(userId);
  },

  /** 流水分页 + 日期分组视图（仅本人） */
  async getLedgerPage(
    userId: string,
    query: { page: number; pageSize: number; entryType?: "TOPUP" | "CONSUME" | "REFUND" | "REVERSAL" | "GRANT" | "EXPIRE" | "ADJUST" }
  ): Promise<LedgerPage> {
    return billingService.getLedgerPage(userId, query);
  },

  /** 我的充值订单列表（最近 limit 条） */
  async listRechargeOrders(userId: string, limit = 20) {
    return billingService.listRechargeOrders(userId, limit);
  },

  // ── 钱包记录管理（admin） ──

  /** 按 userId 查钱包记录 */
  async findByUserId(userId: string): Promise<WalletDTO | null> {
    return walletRepository.findByUserId(userId);
  },

  /** 钱包列表（admin 用） */
  async list(opts?: { page?: number; pageSize?: number; status?: string }) {
    return walletRepository.list(opts);
  },

  /** 管理员手动调整余额 */
  async adjustBalance(input: WalletAdjustInput): Promise<WalletDTO> {
    return walletRepository.adjustBalance(input);
  },

  /** 冻结/解冻钱包 */
  async setStatus(userId: string, status: 'ACTIVE' | 'FROZEN'): Promise<WalletDTO> {
    return walletRepository.setStatus(userId, status);
  },
};
