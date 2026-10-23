# DESIGN-002-改密找回与会话版本

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）

- 关联：ADR-0012；T120-18/19/20/21

## 设计要点
改密：bcrypt 校验旧密 → 事务 {hash, token_version+1, refresh 全吊销} → 签新令牌对；重置：email-code purpose=reset（10 分钟、6 位、错 5 次作废、一次性），响应恒定防枚举，成功后不自动登录；日志带 reason 字段区分失败原因（对外错误码统一 10003）；审计 password.change / password.reset；开关 auth.password_reset fail-closed。
