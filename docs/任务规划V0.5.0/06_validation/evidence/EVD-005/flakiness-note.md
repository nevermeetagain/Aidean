# TASK-005 关键发现：Next 15 `--turbo` dev 冷编译竞态 → 首请求 404（须预热路由）

## 现象（真实日志留痕：playwright-coldcompile-404-race.txt）
在长时间运行、路由编译态被驱逐/降级的 dev 进程上，`walking-skeleton.spec.ts` 主链路首步
`POST /api/v1/auth/register` 偶发返回 **404**（dev 日志：`Compiled /_not-found ... POST /api/v1/auth/register 404 in 654ms`），
紧接着同一路由再请求即 200；其余两用例（匿名/就绪）不受影响。

## 定性
- **非本 spec 缺陷、非产品缺陷**：同一份代码在预热后连续两轮均 3 passed（见 playwright-positive-firstwarm.txt 5.0s / playwright-positive.txt 1.8s）。
- 属 Next.js 15.0.0 Turbopack dev **按需编译竞态**：某路由在本进程会话内未持有已编译产物时，首个命中可能先落 `/__not-found`（404），
  编译完成后后续命中才稳定 200。长驻 dev + 大量杂散 curl 探针易触发（本次 TASK-003/005 反复起停、探活所致）。

## 复现/规避（测试环境就绪步骤，不改代码）
起一个**干净** :3000 dev 后，先**预热**本 spec 触及的全部路由（GET 即可触发编译，POST-only 路由返回 405 但路由已注册）：
```
GET /api/v1/system/ready          → 200
GET /api/v1/auth/register         → 405（已编译）
GET /api/v1/auth/login            → 405（已编译）
GET /api/v1/user/api-keys         → 401（守卫）
GET /user/console?tab=platformKeys → 200（未登录经 middleware→/login）
```
预热后 `pnpm exec playwright test ...` 稳定 3 passed，二次复跑 1.8s 亦全绿 → 判定为确定性可用。

## 移交 TASK-006（CI e2e-skeleton job）—— 必须内置「服务预热」
CI 起 webServer 后、跑 e2e 前，须对骨架触及端点做 warmup（或直接以 `next build` 产物运行以消除按需编译），
否则 cold-compile 404 竞态会令骨架偶发红灯。建议在 e2e global-setup 或独立 warm 脚本中显式打点上述端点后再放行测试。

## 结论
`已确认（环境级）`：骨架 e2e 本身正确、可复现通过；发现的 dev 冷编译竞态为**测试环境就绪**问题，
已用「预热路由」稳妥规避，并把「CI 需预热/用构建产物」列为 TASK-006 的硬前置。
