/**
 * package 套餐域 repository：Prisma 数据访问层。
 * 仅被本域 service 调用，禁止跨域直连。
 */

import { prisma } from '../../db/prisma';
import type { PackageCreateInput, PackageUpdateInput, PackageDTO } from './types';
import { Prisma } from '@prisma/client';

function toDTO(row: {
  id: string;
  stationId: string | null;
  title: string;
  description: string | null;
  priceMinor: bigint;
  durationHours: number | null;
  benefits: unknown;
  status: string;
  sortOrder: number;
}): PackageDTO {
  return {
    ...row,
    priceMinor: row.priceMinor.toString(), // BigInt → string
    status: row.status as PackageDTO['status'],
  };
}

export const packageRepository = {
  /** 列表（分页 + stationId 过滤） */
  async list(opts: { stationId?: string; page?: number; pageSize?: number } = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where: Prisma.PackageWhereInput = {};
    if (opts.stationId) where.stationId = opts.stationId;
    where.deletedAt = null;

    const [items, total] = await Promise.all([
      prisma.package.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.package.count({ where }),
    ]);

    return {
      items: items.map(toDTO),
      total,
      page,
      pageSize,
    };
  },

  /** 查单条 */
  async findById(id: string): Promise<PackageDTO | null> {
    const row = await prisma.package.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toDTO(row) : null;
  },

  /** 创建 */
  async create(input: PackageCreateInput): Promise<PackageDTO> {
    const row = await prisma.package.create({
      data: {
        stationId: input.stationId ?? null,
        title: input.title,
        description: input.description ?? null,
        priceMinor: BigInt(input.priceMinor),
        durationHours: input.durationHours ?? null,
        benefits: input.benefits ? input.benefits as Prisma.InputJsonValue : Prisma.JsonNull,
        status: (input.status ?? 'ACTIVE') as never,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return toDTO(row);
  },

  /** 更新 */
  async update(id: string, input: PackageUpdateInput): Promise<PackageDTO> {
    const data: Prisma.PackageUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priceMinor !== undefined) data.priceMinor = BigInt(input.priceMinor);
    if (input.durationHours !== undefined) data.durationHours = input.durationHours;
    if (input.benefits !== undefined) data.benefits = input.benefits as Prisma.InputJsonValue;
    if (input.status !== undefined) data.status = input.status as never;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    const row = await prisma.package.update({ where: { id }, data });
    return toDTO(row);
  },

  /** 软删除 */
  async softDelete(id: string): Promise<void> {
    await prisma.package.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DISABLED' as never },
    });
  },
};
