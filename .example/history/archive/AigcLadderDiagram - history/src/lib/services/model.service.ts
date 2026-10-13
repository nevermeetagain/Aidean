/**
 * 模型Service
 * AI模型业务逻辑层
 */

import { modelRepo, vendorRepo } from '@/lib/repositories';
import { Errors } from '@/lib/api/errors';
import type { ModelType } from '@prisma/client';

class ModelService {
  /**
   * 获取模型详情
   */
  async getModelById(modelId: string) {
    const model = await modelRepo.findWithDetails(modelId);
    if (!model) throw Errors.notFound('模型');
    return model;
  }

  /**
   * 按Slug获取模型
   */
  async getModelBySlug(slug: string) {
    const model = await modelRepo.findBySlug(slug);
    if (!model) throw Errors.notFound('模型');
    return model;
  }

  /**
   * 获取模型列表（支持筛选）
   */
  async listModels(options: {
    page?: number;
    limit?: number;
    vendorId?: string;
    modelType?: ModelType;
    keyword?: string;
    featured?: boolean;
  } = {}) {
    const { keyword, featured, ...rest } = options;

    if (keyword) {
      return modelRepo.search(keyword, rest);
    }
    if (featured) {
      return modelRepo.findFeatured(rest);
    }
    if (rest.vendorId) {
      return modelRepo.findByVendor(rest.vendorId, rest);
    }
    if (rest.modelType) {
      return modelRepo.findByType(rest.modelType, rest);
    }
    return modelRepo.findMany(rest);
  }

  /**
   * 获取厂商列表
   */
  async listVendors(options: { featured?: boolean; tierLevel?: number } = {}) {
    if (options.featured) {
      return vendorRepo.findFeatured();
    }
    if (options.tierLevel) {
      return vendorRepo.findByTier(options.tierLevel);
    }
    return vendorRepo.findWithModelCount();
  }

  /**
   * 获取厂商详情
   */
  async getVendorByCode(code: string) {
    const vendor = await vendorRepo.findByCode(code);
    if (!vendor) throw Errors.notFound('厂商');
    return vendor;
  }

  /**
   * 创建模型
   */
  async createModel(data: Record<string, unknown>) {
    const existing = await modelRepo.findByCode(data.modelCode as string);
    if (existing) throw Errors.conflict('模型代码已存在');
    return modelRepo.create(data);
  }

  /**
   * 更新模型
   */
  async updateModel(modelId: string, data: Record<string, unknown>) {
    const model = await modelRepo.findById(modelId);
    if (!model) throw Errors.notFound('模型');
    return modelRepo.update(modelId, data);
  }

  /**
   * 删除模型（软删除）
   */
  async deleteModel(modelId: string) {
    const model = await modelRepo.findById(modelId);
    if (!model) throw Errors.notFound('模型');
    return modelRepo.softDelete(modelId);
  }
}

export const modelService = new ModelService();
