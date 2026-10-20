# EVD-008 · OIDC 种子 wechat-rag 回调白名单——按 P-1/P-2 裁决执行方案 B

- 裁决原文（26_用户裁决记录.md 第 12 条，2026-10-20 11:09 CST）：P-1/P-2 端口 **A：维持，BotHot 3200，Aidean 3000**。
- 映射到本卡：AideanBot 已由 BotHot 取代，3333 不再使用 → 卡面「方案B」：保持 `wechat-rag.redirectUris = [https://wechat-rag.aidean.local/auth/aidean/callback, http://localhost:3200/auth/aidean/callback]`，**seed.ts 不改**。
- 验收：`git diff origin/main -- apps/web/prisma/seed.ts` 为空；`port-consistency` 对 seed 回调 3200/3000 均 PASS（failures=0）。见 verify.txt。
- sso-3333 e2e 的去留不在本卡范围（Agent-Guard 所有），未改。
