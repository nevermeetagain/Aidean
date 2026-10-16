# TASK-005 阻塞条件核查：注册是否需邮箱验证码

## 规格阻塞条件
TASK-005「依赖与阻塞」：注册需邮箱验证码且无测试旁路 → 停止，改用 seed 用户并在证据中注明。

## 实测结论：不触发（无需 seed 用户）
`apps/web/app/api/v1/auth/register/route.ts`（真实源码）：
- `POST /auth/register` 流程 = shared `RegisterSchema` 校验 → `authService.register(payload)`（users+wallets 事务同建）
  → `signTokenPair(profile)`（RS256）→ refresh 落库（首代）→ 种两枚 HttpOnly Cookie（`aidean_token` / `aidean_refresh`）。
- **无邮箱验证码 / 无 verify 前置步骤**：注册即时签发令牌并返回 `{code:0,data:{user},requestId}`，随即处于登录态。
  （邮箱验证码/邮件校验属另一独立流程，不在 register 主路径。）

## 影响
- 阻塞条件「需邮箱验证码」**不成立** → 主链路用例可直接以时间戳唯一邮箱 register，无需改用 seed 用户。
- 实跑佐证：`walking-skeleton.spec.ts` 主链路用例（register→login→…）在 :3000 真实服务 200 通过（见 playwright-positive.txt）。

## 结论
`已确认`：无阻塞；按规格主路径执行（register 即时登录态），未使用 seed 用户，符合验收前提。
