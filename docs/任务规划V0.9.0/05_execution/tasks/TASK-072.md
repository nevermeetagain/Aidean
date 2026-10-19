# TASK-072：Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M2（Artificial Analysis key 与条款）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-056 移出卡集；条件卡，待 U-M2 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/015
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
artificial-analysis.ts 改为调用 https://artificialanalysis.ai/api/v2/language/models/free（x-api-key），移除已 404 的 /api/leaderboard 主路径；每日请求 ≤ 免费额度 100/24h；产出数据带 attribution='Artificial Analysis' + sourceUrl

## 输入
- 文档：`docs/任务规划V0.4.0/19_外部来源核验证据.md（AA 文档：Free 100 次/24h、需署名、再分发需联系）`
- 契约：`无新增（沿用 RawModelData + attribution 字段）`
- 前置任务：无
- 前置状态：U-M2 已裁决（申请 key 并接受条款）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/adapters/artificial-analysis.ts`
  - `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-072/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 分页 page=1..total_pages，遵守 X-RateLimit-Remaining
2. [ ] 缺 key 时回落到既有 OpenRouter benchmarks 代理路径并标注 source='openrouter-proxy'
3. [ ] 单测 fixture 取自官方文档示例
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] `grep -n 'api/leaderboard' apps/web/lib/sync/adapters/artificial-analysis.ts` 无输出
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/__tests__/artificial-analysis-v2.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-072/`

## 允许修改
- `apps/web/lib/sync/adapters/artificial-analysis.ts`
- `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-072/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M2 未裁决 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：单适配器重写，文档已核验

## 升级条件
条款不允许展示 → 停止回报；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
