import { prisma } from "@/lib/db/prisma";

// 设置服务 - 实现真实查询
export async function getSystemSettings() {
  const configs = await prisma.systemConfig.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: 'asc' },
  });
  
  return configs.reduce((acc, config) => {
    acc[config.configKey] = config.configValue;
    return acc;
  }, {} as Record<string, string>);
}

export async function updateSystemSetting(key: string, value: string, description?: string) {
  const updated = await prisma.systemConfig.update({
    where: { configKey: key },
    data: { 
      configValue: value,
      ...(description && { description }),
    },
  });
  return { key: updated.configKey, value: updated.configValue };
}

export async function getFeatureToggles() {
  return prisma.featureFlag.findMany({
    orderBy: { priority: 'asc' },
    select: {
      id: true,
      flagCode: true,
      name: true,
      nameCn: true,
      isEnabled: true,
      category: true,
      priority: true,
      description: true,
    },
  });
}

export async function updateFeatureToggle(id: string, isEnabled: boolean) {
  const updated = await prisma.featureFlag.update({
    where: { id },
    data: { 
      isEnabled,
      lastToggleAt: new Date(),
      toggleCount: { increment: 1 },
    },
  });
  return { id: updated.id, isEnabled: updated.isEnabled };
}

export async function getDictTypes() {
  return prisma.dictType.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getDictItems(typeCode: string) {
  const dictType = await prisma.dictType.findUnique({
    where: { dictCode: typeCode },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  return dictType?.items || [];
}
