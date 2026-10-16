> 版本: v0.5 | 更新: 2026-10-15 | 变更: TASK-009 S0 文档同步取证（§4 全 25 码单表 + §5.7 /system/ready + 双档互引锚 + 计数 bump + 门禁全绿）

# EVD-009 · TASK-009 S0 文档同步（含计数 bump）

## 目标
API接口文档 §4 列全 25 码（含 HTTP 与前端展示）并登记 `/system/ready`；API架构设计方案对应节互引锚；`check-docs-rule`/`check-docs-facts` 全 PASS。

## 交付内容
1. **计数 bump**（`scripts/check-docs-facts.mjs`，均归因 S0）：
   - lib-features-count 18→**19**（TASK-003 新增 `lib/features/system/` 目录）
   - route-count 148→**149**（TASK-003 新增 `app/api/v1/system/ready/route.ts`）
   - spec-count 156→**160**（TASK-003×2 unit + TASK-077×1 unit + TASK-005×1 e2e；实测 e2e 40 + unit 120 = 160）
   - 见 `attribution.txt`（`git log --diff-filter=A` 逐文件归因）
2. **§4 全量 25 码单表**（`docs/architecture/API接口文档.md` L44–L70）：
   - 由「网关段(3xxxx)/财务段(4xxxx)」两张分节登记表合并为单表，列 `码位|标识|HTTP|语义|前端展示`
   - 删除「与 `app/api/v1/_lib/errors.ts` 双源对齐」措辞 → 改指唯一源 `packages/shared/src/errors.ts`
   - 登记 TASK-001 新增 3 码 20003/50010/50011
   - 逐码 HTTP 与展示与 `errors.ts` 对齐（`code-alignment.txt`，25/25 ✓）
3. **§5.7 系统** 新增 `GET /api/v1/system/ready` 行（措辞基于真实实现：DB `prisma.user.count({take:1})` + Redis 独立短连 PING、**顺序短路**非并行、各 1s 有界超时、PUBLIC·force-dynamic、200 `SystemReadySchema` / 503·50010）
4. **双档互引锚**（铁律 2 双向）：架构 §二/§三 新增 anchor `unified-response-error-architecture` + 唯一源说明 + 回引 §4；接口文档 §4 表前加「架构约束互引」回锚
5. **版本头升版**：API接口文档 v1.50→**v1.51**、API架构设计方案 v1.13→**v1.14**、文档索引 v1.80→**v1.81**（并刷新 §二 表中两篇登记版本 + 描述）

## 验收标准逐条
- [x] `node scripts/check-docs-rule.mjs` exit 0 → **RULE_EXIT=0**（`rule-after.txt`）
- [x] `node scripts/check-docs-facts.mjs` 全 PASS → **FACTS_EXIT=0，All 14 assertions passed**（`facts-before.txt` 红 2 项 route/spec → `facts-after.txt` 全绿）
- [x] §4 表行数 = 25 → 实测 L46–L70 = 25 数据行（`code-alignment.txt`）
- [x] diff 仅落在允许范围 → `git diff --name-only` = 4 文件（3 docs + 1 script），无 `apps/**`/`packages/**`（`diff-scope.txt`）

## 边界与前提
- `docs/任务规划V0.5.0/**`（含 EVD-009）为**禁止修改**区（除本 EVD 目录）；规划树整体入主干归 push 阶段处理，本卡提交仅含 4 个允许文件。
- check-docs-facts `spec-count` 语义不含 `packages/shared/**`，故 TASK-001/004 shared specs 不计入——本卡未触及该口径。
- `文档索引.md` 硬编两篇 API 文档版本号，故本次一并 bump（属允许修改文件）。

## 结论
`已确认` — TASK-009 四条验收全部满足，证据链完整可复现。待 CodeReview 子智能体审查通过后逐卡 path-scoped 提交。
