/**
 * wallet 钱包域 repository：Prisma 数据访问层。
 * 仅被本域 service 调用，禁止跨域直连。
 *
 * 注意：账本写入（余额变动）仍在 billing 域；
 * 本 repository 仅负责钱包记录的直接查询与管理操作。
 */

import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { WalletDTO, WalletAdjustInput } from './types';

function toDTO(row: {
  id: string;
  userId: string;
  currency: string;
  balanceMinor: bigint;
  heldMinor: bigint;
  postedDebitsMinor: bigint;
  postedCreditsMinor: bigint;
  status: string;
  lockVersion: number;
}): WalletDTO {
  return {
    ...row,
    balanceMinor: row.balanceMinor.toString(),
    heldMinor: row.heldMinor.toString(),
    postedDebitsMinor: row.postedDebitsMinor.toString(),
    postedCreditsMinor: row.postedCreditsMinor.toString(),
    status: row.status as WalletDTO['status'],
  };
}

export const walletRepository = {
  /** 按 userId 查钱包 */
  async findByUserId(userId: string): Promise<WalletDTO | null> {
    const row = await prisma.wallet.findUnique({
      where: { userId },
    });
    return row ? toDTO(row) : null;
  },

  /** 列出所有钱包（admin 用，分页） */
  async list(opts: { page?: number; pageSize?: number; status?: string } = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where: Prisma.WalletWhereInput = {};
    if (opts.status) where.status = opts.status as never;

    const [items, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      items: items.map(toDTO),
      total,
      page,
      pageSize,
    };
  },

  /** 管理员手动调整余额（写 audit log 由 service 层负责） */
  async adjustBalance(input: WalletAdjustInput): Promise<WalletDTO> {
    // 乐观锁 + 原子增减
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: input.userId },
    });

    const newBalance = wallet.balanceMinor + BigInt(input.amountMinor);
    if (newBalance < 0) {
      throw new Error('余额不足，无法扣减');
    }

    const updated = await prisma.wallet.update({
      where: { id: wallet.id, lockVersion: wallet.lockVersion },
      data: {
        balanceMinor: newBalance,
        lockVersion: { increment: 1 },
      },
    });

    return toDTO(updated);
  },

  /** 冻结/解冻钱包 */
  async setStatus(userId: string, status: 'ACTIVE' | 'FROZEN'): Promise<WalletDTO> {
    const updated = await prisma.wallet.update({
      where: { userId },
      data: { status: status as never },
    });
    return toDTO(updated);
  },
};
