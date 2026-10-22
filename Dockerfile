# =============================================================================
# Aidean Monorepo 多阶段构建（SubTask 0.5.1 校正版）
#
# 构建上下文必须为仓库根目录（含 pnpm-workspace.yaml）：
#   docker build -t aidean-web .
#
# 【国内镜像源说明】
# 依赖下载默认走 npm 官方 registry；网络受限时建议二选一：
#   1) 在仓库根目录 .npmrc 中写入：
#        registry=https://registry.npmmirror.com
#      并把 .npmrc 加入 deps 阶段 COPY 清单（REL-FIX-05 注释修正：此前注释称
#      "deps 阶段会 COPY .npmrc"与实现不符，当前 COPY 清单未含 .npmrc，以实现为准）
#   2) 或在构建宿主机上执行：
#        pnpm config set registry https://registry.npmmirror.com
#   另：corepack 下载 pnpm 本身不受 .npmrc 影响，
#   可在 FROM deps 之上追加 ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
# 本文件不硬编码 registry，保持 CI 与本地环境各自可控。
# =============================================================================

# ---------- 阶段 1: deps —— 安装整个 workspace 的依赖 ----------
FROM node:20-alpine AS deps
WORKDIR /app
# REL-FIX-05（P0 修复）：安装 openssl CLI，使 Prisma 在构建期正确探测 OpenSSL 3.x，
# 选用 linux-musl-openssl-3.0.x 引擎（链接 libssl.so.3，alpine 3.23 基座自带）。
# 根因：基座无 openssl CLI → Prisma 探测失败回退 openssl-1.1.x 引擎 → 该引擎链接
# libssl.so.1.1（基座无此库）→ 容器内 PrismaClientInitializationError → authorize/登录/token 全 500。
# builder 决定生成哪个引擎，runner 决定运行时查找哪个引擎：Prisma 在两侧各探测一次
# OpenSSL，任一侧缺 CLI 即回退 1.1.x 命名，造成生成/查找引擎文件名不匹配（或 so 缺失）
# → 查库路径 500。故 deps(builder 继承) 与 runner 两侧均需安装 openssl CLI
# （见 runner 阶段同名 RUN；动态库 libssl.so.3 两侧基座均自带）。
# REL-CLOSE-06 注释收口：原"runner 无需改动"表述已过时（runner 侧已补 CLI）。
RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
# shared 的 manifest 必须随拷：否则 pnpm install 不装 shared 依赖（zod），
# shared src 在容器内 Module not found / 类型推断退化（CI docker-build 抓出）。
COPY packages/shared/package.json packages/shared/
# packages/ui 的 manifest 必须随拷：否则 pnpm install 不装 ui 依赖（react），
# next build 类型检查 packages/ui 源码时 Cannot find module 'react'。
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# ---------- 阶段 2: builder —— turbo prune 思路简化版 ----------
# 不做真正的 prune：直接把 apps/web 与 packages 全量拷入镜像后构建。
# .dockerignore 已排除 node_modules/.next/.env*，
# 因此构建期需要 DATABASE_URL 占位串供 Prisma 解析 schema。
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public"
# ── AUTH_ISSUER 构建期契约（RC-02/AUTH-01/REL-ENG-02）──
# NEXT_PUBLIC_* 为构建期内联变量：必须经 --build-arg 在 next build 之前注入。
# .dockerignore 已排除 .env*，且 standalone 不携带 .env——漏注入 = 构建失败（fail-closed）。
# 故意不给 ARG 默认值：漏 --build-arg → 空值 → 下方 strict 契约校验拦截，
# 杜绝「静默回落 localhost」的生产不可达事故（.docs/REL-ENG-02 §2.1）。
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# 根 tsconfig.base.json 必须随拷：apps/web/tsconfig.json extends 它，
# 缺失时 next build 报 TS5083（CI docker-build 首跑抓出）。
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages ./packages
# RK-11-07：可调度脚本源（scripts/crawl|ranking）+ 预编译器；产物 apps/web/scripts-dist 随 runner 拷出，
# 使容器内 script-executor 以 `node <name>.mjs` 执行（runner 无 .ts 源、无 tsx）。
COPY scripts/crawl ./scripts/crawl
COPY scripts/ranking ./scripts/ranking
COPY scripts/build ./scripts/build
# 构建期契约校验（strict：缺失/非法/localhost 基址一律 fail-closed）。
# --env-path 指向镜像内必然不存在的文件：仅进程环境（ARG 注入的 ENV）生效，
# 杜绝 .env 残留干扰。见 apps/web/scripts/check-runtime-contract.mjs 与 .docs/REL-ENG-02 §2.1。
RUN pnpm --filter web exec node scripts/check-runtime-contract.mjs --mode build --strict --env-path /no-env-file-in-image \
    && pnpm --filter web exec prisma generate \
    && pnpm --filter web exec next build \
    && pnpm --filter web exec node scripts/postbuild-standalone.mjs \
    && node scripts/build/bundle-scripts.mjs \
    && node scripts/build/bundle-scripts.mjs --check

# ---------- 阶段 3: runner —— standalone 运行时 ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
# REL-FIX-05：runner 同样安装 openssl CLI——Prisma Client 在运行时会再次探测 OpenSSL 版本，
# runner 无 CLI 时探测失败将按 "linux-musl"（1.1.x 命名）查找引擎，与 builder 生成的
# 3.0.x 引擎文件名不匹配（错误：generated for "linux-musl-openssl-3.0.x",
# deployment required "linux-musl"）。基座已自带 /usr/lib/libssl.so.3 动态库。
RUN apk add --no-cache openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# pnpm monorepo 下 standalone 产物位于 apps/web/.next/standalone，
# 解包后的入口为 ./apps/web/server.js。
# postbuild-standalone.mjs 已将 .next/static 与 public 复制进 standalone；
# 下方 COPY 仍显式覆盖一次，保证任一环节缺失时运行期静态资源/图片不 404。
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
# RK-11-07：预编译调度脚本（@prisma/client 经 standalone 的 apps/web/node_modules 解析）
COPY --from=builder /app/apps/web/scripts-dist ./apps/web/scripts-dist
# 运行期契约（SSO-02）：Next standalone 不拷贝 .env，以下变量必须由容器编排显式注入：
#   DATABASE_URL / REDIS_URL（缺失 → 登录/授权码路径 500）、JWT_SECRET（缺失 → 签名失败）。
# 部署前执行：node apps/web/scripts/check-runtime-contract.mjs --mode runtime --strict
USER nextjs
CMD ["node", "apps/web/server.js"]
