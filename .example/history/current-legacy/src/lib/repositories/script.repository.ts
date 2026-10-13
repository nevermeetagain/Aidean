import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { ScheduledScript, ScriptExecution } from "@prisma/client";

// 定时脚本Repository
export class ScheduledScriptRepository extends BaseRepository<ScheduledScript> {
  protected model = prisma.scheduledScript;

  async findByStatus(status: number) {
    return this.model.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  }

  async findWithExecutions(id: string) {
    return this.model.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });
  }
}

// 脚本执行记录Repository
export class ScriptExecutionRepository extends BaseRepository<ScriptExecution> {
  protected model = prisma.scriptExecution;

  async findByScriptId(scriptId: string) {
    return this.model.findMany({
      where: { scriptId },
      orderBy: { startedAt: "desc" },
    });
  }
}

