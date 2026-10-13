/**
 * 基础Repository
 * 提供通用的CRUD操作，所有Repository继承此类
 * 遵循DRY原则，避免每个repo重复编写基础查询
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export interface FindManyOptions {
  page?: number;
  limit?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
}

export interface FindManyResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T> {
  protected abstract model: any;

  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...(include ? { include } : {}),
    });
  }

  async findMany(options: FindManyOptions = {}): Promise<FindManyResult<T>> {
    const {
      page = 1,
      limit = 20,
      where = {},
      orderBy = { createdAt: 'desc' },
      include,
      select,
    } = options;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        ...(include ? { include } : {}),
        ...(select ? { select } : {}),
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(where: Record<string, unknown>): Promise<T | null> {
    return this.model.findFirst({ where });
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where });
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }
}

