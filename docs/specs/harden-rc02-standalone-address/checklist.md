# Checklist · 发布候选加固 RC-02 核验清单

> change-id: `harden-rc02-standalone-address` | 版本: v1.0

## 分组 A：SSO-02 代码修复与类型回归

- [ ] A1. `grep` 确认 `apps/web/app/oauth/authorize/route.ts`、`apps/web/app/oauth/consent/route.ts`、`apps/web/middleware.ts` 不再以 `url.origin`/`req.url` 构造重定向（仅保留 `new URL(..., AUTH_ISSUER)`）
  - 取证：`rg -n "url\.origin|req\.url" apps/web/app/oauth apps/web/middleware.ts`
- [ ] A2. `pnpm --filter web exec tsc --noEmit` EXIT=0
- [ ] A3. `pnpm --filter web test`（vitest）全绿

## 分组 B：QA-02 standalone 验收

- [ ] B1. `pnpm --filter web build` 成功，`.next/standalone` 自足（含 public/static）
- [ ] B2. 3000 污染实例（box-agent 相对路径 standalone）已停，新 standalone 实例由本会话可控启动
- [ ] B3. 未登录 authorize 302 Location 主机名 = `localhost:3000`，**不含 0.0.0.0**
  - 取证：`curl --noproxy '*' -s -D - -o /dev/null 'http://localhost:3000/oauth/authorize?...'`
- [ ] B4. middleware 307 Location 不含 0.0.0.0（访问 `/user/console` 或 `/admin/login` 取证）
- [ ] B5. `sso-3333.spec.ts` 去 0.0.0.0 兜底后 `3 passed`（standalone 形态）

## 分组 C：REL-02 构建与交付

- [ ] C1. `docker build -t aidean-web:rc02 .` 成功（含 NEXT_PUBLIC_SITE_URL build-arg 通道）
- [ ] C2. 镜像内 `apps/web/public` 存在（docker run --rm 检查）
- [ ] C3. `.dockerignore` 补全后构建上下文无污染目录报错
- [ ] C4. `docs/发布环境契约.md` 成文并登记 `docs/文档索引.md`
- [ ] C5. `docs/发布回滚与恢复验收.md` 成文并登记 `docs/文档索引.md`

## 分组 D：发布卫生

- [ ] D1. 工作区杂项分类清单产出，隔离移动完成（不删除），`git status` 对比确认

## 分组 E：文档同步（铁律 3 版本锚定）

- [ ] E1. 本 spec 三件套与 `docs/` 变更均带版本标记
- [ ] E2. `docs/plans/未完成事项目录.md` 相关条目状态更新（0.0.0.0 遗留关闭）
