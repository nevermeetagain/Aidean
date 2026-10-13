import { expect, test } from "@playwright/test";

// 冒烟：SiteHeader 八项导航契约顺序（2026-09-17 改版：一级「资讯」替代「模型」）+ Logo 回首页
// #71 产品下拉七子项：模型天梯图 / 模型服务提供商（主站服务，不进分类组、绑定不变）+
// 四个产品统一模板介绍页，按二级分类分组：特供（AideanBot）/ 开源（AideanFleet）/
// 合作（AideanWiki、AideanThesis）/ 其它（SkillsCloud）。
// #73 契约：下拉 label 用纯中文名（下拉空间紧凑），介绍页/列表页才用双语；
// 分类组头为 role="presentation" 的非链接节点，不进入 Tab 链路。
test.describe("header-links", () => {
  test("八项导航顺序契约（含二级子项），Logo 点击回首页", async ({ page }) => {
    await page.goto("/");

    const links = page.locator('header nav[aria-label="主导航"] a');
    const hrefs: Array<string | null> = [];
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      hrefs.push(await links.nth(i).getAttribute("href"));
    }
    expect(hrefs).toEqual([
      "/",
      "/news",
      "/products",
      // 主站服务入口（天梯图 / 服务提供商），非产品、不进分类组
      "/models",
      "/providers",
      // 产品按二级分类分组：特供 → 开源 → 合作 → 其它
      "/products/wechatrag",
      "/products/aideanfleet",
      "/products/aideanwiki",
      "/products/aideanthesis",
      "/products/skillscloud",
      "/pricing",
      "/docs",
      "/roadmap",
      "/partners",
      "/about",
    ]);

    // #71/#73 下拉 label 为纯中文名；英文名只出现在介绍页/列表页的双语标题里
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push((await links.nth(i).textContent())?.trim() ?? "");
    }
    for (const cn of [
      "模型天梯图",
      "模型服务提供商",
      "信源引擎机器人",
      "自动化舰队引擎",
      "独立知识百科",
      "论文审查助手",
      "技能云",
    ]) {
      expect(labels, `导航 label 缺中文名 ${cn}`).toContain(cn);
    }
    for (const en of ["AideanBot", "AideanFleet", "AideanWiki", "AideanThesis", "SkillsCloud"]) {
      expect(labels.some((l) => l.includes(en)), `导航 label 不应含英文名 ${en}`).toBe(false);
    }

    // #71 二级分类组头：特供→开源→合作→其它（非链接节点，role=presentation）
    const groups = page.locator('header nav[aria-label="主导航"] div[role="presentation"]');
    await expect(groups).toHaveText(["特供", "开源", "合作", "其它"]);

    // Logo：href="/" 图片 logo（水墨手写体），alt/aria-label 语义为 Aidean
    // （定位符用 aria-label 而非 href——首位「首页」导航项同为 href="/"，href 会命中两元素触发 strict mode）
    const logo = page.locator('header a[aria-label="Aidean 首页"]');
    await expect(logo).toHaveAttribute("aria-label", "Aidean 首页");
    await expect(logo.locator("img")).toHaveAttribute("alt", "Aidean");
    await logo.click();
    await page.waitForURL("**/");
    expect(page.url()).toMatch(/\/$/);
  });
});
