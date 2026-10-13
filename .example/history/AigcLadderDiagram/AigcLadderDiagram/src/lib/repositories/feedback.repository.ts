import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { Feedback } from "@prisma/client";

export class FeedbackRepository extends BaseRepository<Feedback> {
  protected model = prisma.feedback;
}

