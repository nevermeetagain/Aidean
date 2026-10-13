import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { Newsync, Document } from "@prisma/client";

// 资讯Repository
export class NewsyncRepository extends BaseRepository<Newsync> {
  protected model = prisma.newsync;

  async findBySource(source: string) {
    return this.model.findMany({
      where: { source },
      orderBy: { createdAt: "desc" },
    });
  }
}

// 文档Repository
export class DocumentRepository extends BaseRepository<Document> {
  protected model = prisma.document;
}

