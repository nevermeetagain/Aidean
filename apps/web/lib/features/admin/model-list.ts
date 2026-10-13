/**
 * 后台「模型列表」的单一取数真源。
 *
 * 抽出动机：/admin/models 页首屏服务端预取（消除「空壳到手→客户端再发一次列表 API」的第二段往返）
 * 与 /api/v1/admin/models 分页端点需要**完全一致**的 where / orderBy / select / 行映射。若两处各写一份，
 * 字段或排序极易漂移。故收敛到此函数，路由与页面共同消费（单一事实来源）。
 */
import { prisma } from "../../db/prisma";

export interface AdminModelRow {
  id: string;
  modelCode: string;
  nameDisplay: string;
  vendorName: string;
  visibility: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface AdminModelListResult {
  models: AdminModelRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAdminModels(params: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<AdminModelListResult> {
  const { page, pageSize, q } = params;
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { modelCode: { contains: q, mode: "insensitive" as const } },
            { nameDisplay: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.aiModel.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { modelCode: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        modelCode: true,
        nameDisplay: true,
        vendor: { select: { name: true, nameCn: true } },
        visibility: true,
        isActive: true,
        isFeatured: true,
        sortOrder: true,
      },
    }),
    prisma.aiModel.count({ where }),
  ]);

  return {
    models: rows.map((m) => ({
      id: m.id,
      modelCode: m.modelCode,
      nameDisplay: m.nameDisplay,
      vendorName: m.vendor.nameCn || m.vendor.name,
      visibility: m.visibility as string,
      isActive: m.isActive,
      isFeatured: m.isFeatured,
      sortOrder: m.sortOrder,
    })),
    total,
    page,
    pageSize,
  };
}
