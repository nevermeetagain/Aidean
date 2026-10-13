import { prisma } from '@/lib/db/prisma';
import { BaseRepository } from './base.repository';
import type { Evaluation } from '@prisma/client';

export class EvaluationRepository extends BaseRepository<Evaluation> {
  protected model = prisma.evaluation;
}

export const evaluationRepo = new EvaluationRepository();

