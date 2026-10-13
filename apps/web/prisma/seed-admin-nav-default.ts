/**
 * S2.1.1 出厂默认三级导航树落库（7 板块 → 分组 → 叶，scope=ADMIN）。
 * - 不改旧 prisma/seed-navigation-menu.ts；叶复用其 menuCode（只重层级/归属，URL 不变，只增不减）。
 * - 落库逻辑复用 lib/admin/apply-default-nav.ts（与面板「应用推荐分组」按钮同一实现）。
 * - 末尾用 buildAdminNav 断言「7 板块 / 31 叶 / 31 入口 href 零缺失」，任一不满足则 FAIL 退出。
 * 运行：pnpm --filter web exec tsx prisma/seed-admin-nav-default.ts
 */
import { PrismaClient, NavScope } from "@prisma/client";
import { buildAdminNav, type NavRow } from "../lib/admin-navigation-core";
import { SECTIONS, EXPECTED_HREFS } from "../lib/admin-nav-default-tree";
import { applyDefaultAdminNav } from "../lib/admin/apply-default-nav";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const res = await applyDefaultAdminNav(prisma.navigationMenu);
  console.log(`[seed-admin-nav-default] upsert=${res.upserted} 停用旧遗留=${res.deactivated}`);

  // 读回有效 ADMIN 行，喂 buildAdminNav 断言三级结构
  const rows = (await prisma.navigationMenu.findMany({
    where: { scope: NavScope.ADMIN, isVisible: true, isActive: true },
    select: { menuCode: true, name: true, level: true, path: true, icon: true, parentCode: true, isDropdown: true, sortOrder: true, requiredPermissions: true },
    orderBy: { sortOrder: "asc" },
  })) as NavRow[];

  const nav = buildAdminNav(rows);
  const sectionCount = nav.groups.length;
  const leafCount = nav.groups.reduce(
    (n, g) => n + g.leaves.length + (g.sections ?? []).reduce((m, s) => m + (s.children?.length ?? 0), 0),
    0,
  );

  const gotHrefs = rows.filter((r) => r.path).map((r) => r.path as string);
  const missing = EXPECTED_HREFS.filter((h) => !gotHrefs.includes(h));
  const uniqueHrefs = new Set(gotHrefs).size === gotHrefs.length;

  console.log(`[seed-admin-nav-default] 板块=${sectionCount}（期望 ${SECTIONS.length}）叶=${leafCount}（期望 ${EXPECTED_HREFS.length - 1}）覆盖 ${EXPECTED_HREFS.length - missing.length}/${EXPECTED_HREFS.length}`);

  const problems: string[] = [];
  if (sectionCount !== SECTIONS.length) problems.push(`板块数 ${sectionCount} ≠ ${SECTIONS.length}`);
  if (leafCount !== EXPECTED_HREFS.length - 1) problems.push(`叶数 ${leafCount} ≠ ${EXPECTED_HREFS.length - 1}`);
  if (missing.length > 0) problems.push(`缺失 href：${missing.join(", ")}`);
  if (!uniqueHrefs) problems.push("叶 href 存在重复");

  if (problems.length > 0) {
    throw new Error(`[seed-admin-nav-default] FAIL ${problems.join(" | ")}`);
  }
  console.log(`[seed-admin-nav-default] OK：${SECTIONS.length} 板块 / ${EXPECTED_HREFS.length} 入口零缺失`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
