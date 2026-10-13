import { prisma } from '@/lib/db/prisma'

export interface WeightConfig {
  official: number
  actual: number
  review: number
  self: number
}

export async function getWeights(): Promise<WeightConfig> {
  const weights = await prisma.rankingWeight.findMany({
    where: { isActive: true },
  })

  const config: WeightConfig = { official: 25, actual: 25, review: 25, self: 25 }
  for (const w of weights) {
    if (w.dimension in config) {
      config[w.dimension as keyof WeightConfig] = w.weight
    }
  }
  return config
}

export async function updateWeights(weights: Partial<WeightConfig>): Promise<void> {
  for (const [dimension, weight] of Object.entries(weights)) {
    await prisma.rankingWeight.upsert({
      where: { dimension },
      update: { weight },
      create: { dimension, weight, isActive: true },
    })
  }
}

export function calculateScore(scores: Record<string, number>, weights: WeightConfig): number {
  const totalWeight = weights.official + weights.actual + weights.review + weights.self
  if (totalWeight === 0) return 0

  const score =
    (scores.official ?? 0) * (weights.official / totalWeight) +
    (scores.actual ?? 0) * (weights.actual / totalWeight) +
    (scores.review ?? 0) * (weights.review / totalWeight) +
    (scores.self ?? 0) * (weights.self / totalWeight)

  return Math.round(score * 100) / 100
}
