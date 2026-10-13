/**
 * Dedup utility — skip UPSERT when checksum matches.
 * Reduces unnecessary writes and model_change_logs entries.
 */

import { prisma } from '../../db/prisma';

/**
 * Check if a model's sync-owned fields have changed since last sync.
 * @param modelCode The model code to check
 * @param newChecksum The new checksum from the mapper
 * @returns true if the model should be skipped (checksum matches)
 */
export async function shouldSkip(
  modelCode: string,
  newChecksum: string
): Promise<boolean> {
  const lastLog = await prisma.modelChangeLog.findFirst({
    where: {
      model: { modelCode, deletedAt: null },
      changeType: 'SYNC',
    },
    orderBy: { createdAt: 'desc' },
    select: { checksum: true, afterData: true },
  });

  if (!lastLog) return false;

  // Prefer checksum field match
  if (lastLog.checksum) {
    return lastLog.checksum === newChecksum;
  }

  // Fallback: parse afterData for checksum
  try {
    const parsed = lastLog.afterData as unknown as { checksum?: string };
    return parsed.checksum === newChecksum;
  } catch {
    return false;
  }
}
