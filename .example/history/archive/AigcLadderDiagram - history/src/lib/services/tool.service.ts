/**
 * 工具生态Service
 * Skills / MCP / Agent / API Station 统一业务逻辑层
 */

import { prisma } from '@/lib/db/prisma';
import { Errors } from '@/lib/api/errors';

type ToolType = 'skill' | 'mcp' | 'agent' | 'api_station';

const MODEL_MAP: Record<ToolType, string> = {
  skill: 'skill',
  mcp: 'mCPServer',
  agent: 'agent',
  api_station: 'aPIStation',
};

class ToolService {
  private getModel(type: ToolType) {
    const modelName = MODEL_MAP[type];
    return (prisma as any)[modelName];
  }

  /**
   * 获取工具列表
   */
  async listTools(type: ToolType, options: {
    page?: number;
    limit?: number;
    category?: string;
    keyword?: string;
    featured?: boolean;
  } = {}) {
    const model = this.getModel(type);
    const { page = 1, limit = 20, category, keyword, featured } = options;

    const where: any = {};
    if (category) where.category = category;
    if (featured) where.isFeatured = true;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { nameCn: { contains: keyword, mode: 'insensitive' } },
        { displayName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Agent模型没有stars字段，使用activeUsers排序
    const ORDER_MAP: Record<ToolType, string> = {
      skill: 'stars',
      mcp: 'stars',
      agent: 'activeUsers',
      api_station: 'stars',
    };
    const orderField = ORDER_MAP[type];

    const [data, total] = await Promise.all([
      model.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { [orderField]: 'desc' } }),
      model.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 获取工具详情
   */
  async getTool(type: ToolType, id: string) {
    const model = this.getModel(type);
    const tool = await model.findUnique({ where: { id } });
    if (!tool) throw Errors.notFound('工具');
    return tool;
  }

  /**
   * 创建工具
   */
  async createTool(type: ToolType, data: Record<string, unknown>) {
    const model = this.getModel(type);
    return model.create({ data });
  }

  /**
   * 更新工具
   */
  async updateTool(type: ToolType, id: string, data: Record<string, unknown>) {
    const model = this.getModel(type);
    const tool = await model.findUnique({ where: { id } });
    if (!tool) throw Errors.notFound('工具');
    return model.update({ where: { id }, data });
  }

  /**
   * 删除工具
   */
  async deleteTool(type: ToolType, id: string) {
    const model = this.getModel(type);
    const tool = await model.findUnique({ where: { id } });
    if (!tool) throw Errors.notFound('工具');
    return model.delete({ where: { id } });
  }

  /**
   * 增加下载量
   */
  async incrementDownloads(type: ToolType, id: string) {
    const model = this.getModel(type);
    return model.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }
}

export const toolService = new ToolService();
