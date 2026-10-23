T120-01 偏离说明（2 条）

1. `test:int` 未在脚本内设置 RUN_DB_TESTS=1。
   原因：仓库无 cross-env 依赖，pnpm 在 Windows 经 cmd 执行脚本，`RUN_DB_TESTS=1 vitest run` 前缀语法不可用；
   而在 package.json 引入新依赖会连带改 pnpm-lock.yaml（超出卡面「允许修改」）。
   现状：RUN_DB_TESTS 与 DATABASE_URL 由调用方注入 —— 卡面「验证命令」本身即
   `RUN_DB_TESTS=1 DATABASE_URL=… pnpm -C apps/web test:int`，Linux/CI 侧亦可直接照抄。

2. 卡面 Step 2 的 `-t int`（testNamePattern）实测不按文件过滤，会跑入 lib 下全部用例；
   先红改用文件位置参数 `int.spec`，该子串多纳 `middleware-session-hint.spec.ts`（故先红读数为 10 tests）。
   正式脚本取 `.int.spec`（带前置点），精确命中 2 个 int 文件 / 5 用例，已在复跑读数中验证。
