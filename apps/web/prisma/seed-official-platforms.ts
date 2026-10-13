/**
 * 官方平台目录种子（控制台 MVP 丁：N3）。
 *
 * 目的：让「官方平台 Key（自有账号）」面板开箱即选六大主流平台，且网关在用户录入自有 Key 后
 * 能命中该站（billingMode=UPSTREAM）直调官方、不扣平台余额。
 *
 * 幂等策略：按 baseUrl 幂等 upsert（同一官方地址只建一站）；每站配套 StationBillingRule
 * billingMode=UPSTREAM（用户自有 Key 时网关直调官方，不扣平台余额）。
 *
 * 模型口径：models 数组存 AiModel.nameDisplay / 官方对外模型标识；与网关 listCallableStations
 * 的 models.has(nameDisplay) 匹配规则一致，保证网关路由链可闭环命中。
 *
 * 安全：baseUrl 恒为官方 HTTPS 地址；调用侧仍受 SSRF 治理（S1–S5）约束。
 */
import { PrismaClient } from "@prisma/client";

import { OFFICIAL_PLATFORM_CATALOG } from "../lib/features/upstream/official-catalog";

/** 幂等播种六大官方平台（可重复执行；返回本次新建/更新的平台数） */
export async function seedOfficialPlatforms(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const p of OFFICIAL_PLATFORM_CATALOG) {
    const existing = await prisma.aPIStation.findFirst({
      where: { baseUrl: p.baseUrl, deletedAt: null },
    });
    if (existing) {
      // 已有同名官方平台：补齐 icon / models / displayName，避免重复建站
      await prisma.aPIStation.update({
        where: { id: existing.id },
        data: {
          displayName: p.nameCn || p.name,
          icon: p.icon,
          models: p.models,
        },
      });
      await upsertUpstreamRule(prisma, existing.id);
      count++;
      continue;
    }
    const station = await prisma.aPIStation.create({
      data: {
        name: p.name,
        nameCn: p.nameCn,
        displayName: p.nameCn || p.name,
        description: p.description,
        provider: p.name,
        website: p.website,
        baseUrl: p.baseUrl,
        models: p.models,
        icon: p.icon,
        protocols: [p.format === "anthropic" ? "ANTHROPIC" : "OPENAI"],
        isVerified: true,
      } as never,
    });
    await upsertUpstreamRule(prisma, station.id);
    count++;
  }
  return count;
}

/** 配套计费规则：billingMode=UPSTREAM（用户自有 Key 直调官方，不扣平台余额） */
async function upsertUpstreamRule(prisma: PrismaClient, stationId: string) {
  await prisma.stationBillingRule.upsert({
    where: { stationId },
    create: { stationId, billingMode: "UPSTREAM" },
    update: { billingMode: "UPSTREAM" },
  } as never);
}