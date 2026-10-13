// 未完成事项目录 #64：web 项目依赖的 `.auth/web-guest.json` 游客快照生成器。
// 此前该文件无任何生成来源 → e2e/web 套件 ENOENT 全红。游客态 = 未登录快照
// （仅访问首页建立上下文）；管理员态 `.auth/admin-auth.json` 仍由 admin-setup 项目登录生成。
// 失败语义：:3000 不可达时快速失败并给出明确提示（测试不得私拉服务，见配置文件头注记）。
import { request } from "@playwright/test";

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
  const ctx = await request.newContext({ baseURL });
  try {
    const res = await ctx.get("/");
    if (!res.ok()) {
      throw new Error(`globalSetup: 首页 ${baseURL} 返回 ${res.status()}——请先启动 :3000 dev server`);
    }
    await ctx.storageState({ path: ".auth/web-guest.json" });
  } finally {
    await ctx.dispose();
  }
}
