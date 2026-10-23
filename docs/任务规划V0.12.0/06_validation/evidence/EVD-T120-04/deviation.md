T120-04 偏离说明（3 条）

1. 卡面「输入」与「验证命令」指向 `deploy/web/Dockerfile`，本仓不存在该文件：`deploy/**` 只有 7 个 `.gitkeep` 占位
   （deploy/base|caddy|pgbouncer|prometheus|scripts|synapse|web）。实际构建入口是仓库根的 `Dockerfile`（108 行多阶段
   deps/builder/runner，已含 RK-11-07 的 `scripts-dist` 拷贝与 nextjs 系统用户），故以它代跑并记录读数。
   本卡「允许修改」仅 EVD 目录、`deploy/**` 与 `apps/web/**` 在「禁止修改」→ 未新建 deploy/web/Dockerfile。
   请 Hark 裁决：改卡面路径为根 `Dockerfile`，还是 `deploy/web/Dockerfile` 属尚未合入 main 的拆分产物。

2. 卡面验证命令的 `--env-file .env.docker` 在本仓与本机均不存在（`.dockerignore` 亦排除 `.env*`，镜像内不可能有）。
   解锁后复跑 Step 3 时，改以 `docker run -e DATABASE_URL=… -e JWT_SECRET=… -e REDIS_URL=…` 显式注入宿主 shared-postgres/shared-redis，
   凭据不写入 EVD；因此「验证命令逐字可复现」这一点本卡未满足（已在 verify.txt 记代跑命令与取值理由）。

3. 与刚合入的 T120-05 的相互作用（登记，不改代码）：新增的启动期 zod 校验使容器 CMD `node apps/web/server.js` 在缺
   DATABASE_URL/JWT_SECRET 时 fail-fast 退出；本卡 Step 3 走 `node scripts-dist/run-due.js`，不经 Next 运行时，故不受影响。
   建议 Hark 在部署文档补「容器必须显式注入两个必需变量」一句（与 EVD-T120-05/deviation.md 7 的文档同步项同源，宜并入 T120-08 / T120-36）。
