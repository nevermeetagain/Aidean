> 版本: v1.0 | 更新: 2026-10-15 | 变更: 归档 P-2 裁决的用户回复原文（条件卡 TASK-008 门）

# P-2 裁决记录（原文归档）

## 通道与方式
- 通道：会话内交互式征询（Qoder AskUserQuestion）
- 时间：2026-10-15
- 对象：项目所有者（Aidean）

## 征询问题（原文）
> TASK-008 是「条件卡」，取决于 P-2 裁决：AideanBot 的 3333 端口 OIDC 回调是否仍需保留在 seed.ts 的 wechat-rag 白名单中？（当前 seed 仅含 localhost:3200；守卫端口表未登记 aideanBot 3300-3400）

## 候选项（原文）
- **方案A：补录 3333 回调** —— P-2=AideanBot 仍在用。seed.ts wechat-rag 追加 `http://localhost:3333/auth/aidean/callback`（不删 3200）。为使 port-consistency 守卫不 FAIL，需同时在 scripts/guard/port-ranges.json 登记 aideanBot[3300,3400]（TASK-007 产物、越出本卡允许范围，作为必要伴随改动执行并登记）。
- **方案B：保持现状（推荐）** —— P-2=AideanBot 已由 BotHot 取代。不改 seed.ts（保持 `[wechat-rag.aidean.local, localhost:3200]`），证据登记裁决口径；守卫全绿。sso-3333 e2e 去留由 Agent-Guard 另立卡。与当前 port-ranges.json/V0.5.0 现状一致。
- **暂不裁决：标记 blocked** —— 严格按条件卡阻塞：TASK-008 不执行、不改 seed.ts，EVD-008 记录「待 P-2 裁决」上报，跳过本卡继续后续（execlog/push）。

## 用户选择（原文）
**方案B：保持现状（推荐）**

## 裁决要旨
- P-2 = 方案B：**AideanBot 已由 BotHot 取代**，不在 seed.ts wechat-rag 白名单补录 3333 回调。
- 该裁决改写 2026-09-29 §7.20「BotHot 不影响 aideanbot」旧产品口径中可能被读作「AideanBot 仍在用」的部分（就「3333 OIDC 回调保留」这一子问题而言）。
- 后续（非本卡）：sso-3333 e2e 套件与文档前置的 3333 依赖漂移 → 移交 Agent-Guard 另立卡处置（详见 summary §5）。

## 执行结果
- `apps/web/prisma/seed.ts` 未改动（`git diff --stat` 空）；端口守卫 `port-consistency.mjs` EXITCODE=0。
- 本卡无代码提交；证据 `EVD-008/**`（含本文件）随 V0.5.0 规划树入库。
