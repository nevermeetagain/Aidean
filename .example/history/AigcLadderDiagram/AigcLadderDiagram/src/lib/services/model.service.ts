import { prisma } from "@/lib/db/prisma";

export type ModelListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  vendorId?: string;
  modelType?: string;
  isOpenSource?: boolean;
};

export async function getModels(params: ModelListParams = {}) {
  const { page = 1, limit = 20, keyword, vendorId, modelType, isOpenSource } = params;
  
  const where: any = { isActive: true };
  
  if (keyword) {
    where.OR = [
      { modelCode: { contains: keyword, mode: "insensitive" } },
      { nameDisplay: { contains: keyword, mode: "insensitive" } },
      { nameCn: { contains: keyword, mode: "insensitive" } },
    ];
  }
  
  if (vendorId) {
    where.vendorId = vendorId;
  }
  
  if (modelType) {
    where.modelType = modelType;
  }
  
  if (isOpenSource !== undefined) {
    where.isOpenSource = isOpenSource;
  }
  
  const [items, total] = await Promise.all([
    prisma.aiModel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: {
          select: { id: true, name: true, nameCn: true, logoUrl: true },
        },
        prices: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        _count: {
          select: { benchmarks: true, evaluations: true },
        },
      },
    }),
    prisma.aiModel.count({ where }),
  ]);
  
  return {
    items: items.map((model) => ({
      ...model,
      benchmarkCount: model._count.benchmarks,
      evaluationCount: model._count.evaluations,
      currentPrice: model.prices[0] || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getModelById(id: string) {
  return prisma.aiModel.findUnique({
    where: { id },
    include: {
      vendor: true,
      prices: {
        orderBy: { effectiveFrom: "desc" },
      },
      benchmarks: {
        orderBy: { createdAt: "desc" },
      },
      scores: true,
      _count: {
        select: { benchmarks: true, evaluations: true, rankings: true },
      },
    },
  });
}

export async function getModelVersions(modelId: string) {
  return prisma.modelVersion.findMany({
    where: { modelId },
    orderBy: { versionSequence: "desc" },
  });
}

export async function getComparisons(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  
  const [items, total] = await Promise.all([
    prisma.evaluation.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
        evaluationModels: {
          include: {
            model: {
              select: { id: true, modelCode: true, nameDisplay: true },
            },
          },
        },
        _count: {
          select: { evaluationModels: true },
        },
      },
    }),
    prisma.evaluation.count(),
  ]);
  
  return {
    items: items.map((evalItem) => ({
      ...evalItem,
      modelCount: evalItem._count.evaluationModels,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
