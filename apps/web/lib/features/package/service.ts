/**
 * package 套餐域 service：业务编排层。
 * 本域对外唯一入口，跨 feature 只能经它调用。
 * 代理 redemption 子目录的兑换码功能 + 顶层套餐 CRUD。
 */

import { packageRepository } from './repository';
import { redemptionService } from './redemption/service';
import type { BatchGenerateInput } from './redemption/service';
import type { PackageCreateInput, PackageUpdateInput, PackageDTO } from './types';

export const packageService = {
  // ── 套餐 CRUD ──

  /** 列表 */
  async list(opts?: { stationId?: string; page?: number; pageSize?: number }) {
    return packageRepository.list(opts);
  },

  /** 查单条 */
  async findById(id: string): Promise<PackageDTO | null> {
    return packageRepository.findById(id);
  },

  /** 创建套餐 */
  async create(input: PackageCreateInput): Promise<PackageDTO> {
    return packageRepository.create(input);
  },

  /** 更新套餐 */
  async update(id: string, input: PackageUpdateInput): Promise<PackageDTO> {
    return packageRepository.update(id, input);
  },

  /** 软删除套餐（同时停用） */
  async delete(id: string): Promise<void> {
    return packageRepository.softDelete(id);
  },

  // ── 兑换码（代理 redemption 子目录） ──

  /** 批次生成兑换码 */
  async generateRedemptionBatch(input: BatchGenerateInput) {
    return redemptionService.generateBatch(input);
  },
} as const;
