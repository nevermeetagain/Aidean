import { prisma } from '@/lib/db/prisma';

export type VendorListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  tier?: string;
};

export async function getVendors(params: VendorListParams = {}) {
  const { page = 1, limit = 20, keyword, tier } = params;
  
  const where: any = { isActive: true };
  
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { nameCn: { contains: keyword, mode: 'insensitive' } },
      { code: { contains: keyword, mode: 'insensitive' } },
    ];
  }
  
  if (tier) {
    where.tierLevel = parseInt(tier);
  }
  
  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tierLevel: 'asc' },
      include: {
        _count: { select: { models: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);
  
  return {
    items: items.map(v => ({
      ...v,
      modelCount: v._count.models,
    })),
    pagination: { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getVendorById(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      models: {
        where: { isActive: true },
        select: {
          id: true,
          modelCode: true,
          nameDisplay: true,
          nameCn: true,
          isOpenSource: true,
          _count: { select: { benchmarks: true } },
        },
      },
      _count: { select: { models: true } },
    },
  });
}

export async function getVendorRelations(params: { page?: number; limit?: number; type?: string } = {}) {
  const { page = 1, limit = 20, type } = params;
  
  const where: any = {};
  if (type) {
    where.relationType = type;
  }
  
  const [items, total] = await Promise.all([
    prisma.vendorRelation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorRelation.count({ where }),
  ]);
  
  return {
    items,
    pagination: { 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total / limit),
    },
  };
}
