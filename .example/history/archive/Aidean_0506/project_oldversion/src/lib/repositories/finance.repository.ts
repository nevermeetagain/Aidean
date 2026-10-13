import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { Transaction } from "@prisma/client";

export class TransactionRepository extends BaseRepository<Transaction> {
  protected model = prisma.transaction;

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

