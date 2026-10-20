# TASK-070：密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing）

> **2026-10-20 变更（27_核心与非核心重划分）**：改写——不使用 API Key，改为采集 SiliconFlow / DeepSeek 等公开定价页与文档页（遵守条款与 robots，不抓需登录页）；执行者改为助手 A

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M1（keyed 源 API Key 提供与保管）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-M1 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 中等难度适配器，外包

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/010/016
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-010、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/keyed/ 实现 S1/S2/A 级 keyed collector（首批按 U-M1 清单），凭证仅从环境变量读取（MONITOR_KEY_<SOURCE>），日志与快照中不得出现凭证；缺凭证返回 MONITOR_SOURCE_CREDENTIAL_MISSING 而非异常

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.10.0/19_外部来源核验证据.md（SiliconFlow 无 key 实测 401）`
- 契约：`MonitoringSourceSchema`；`MONITORING_ERROR_CODES`
- 前置任务：无
- 前置状态：U-M1 已裁决并提供凭证；TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/keyed/`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-070/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 每源 collector + fixture 单测（fixture 由持 key 者一次性录制并脱敏）
2. [ ] secret-scan 规则（TASK-007）覆盖 MONITOR_KEY_ 前缀
3. [ ] SiliconFlow 仅返回 id/object/owned_by（实测文档），价格不从该接口取
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] `grep -rn 'sk-' apps/web/lib/monitoring/keyed` 无输出
- [ ] 缺 env 时 collector 返回 credential_missing（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/keyed && node scripts/guard/secret-scan.mjs
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-070/`

## 允许修改
- `apps/web/lib/monitoring/keyed/`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-070/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-071
- 阻塞条件：U-M1 未裁决/未提供凭证 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：按既有 collector 框架（060）加 keyed 源，模式已定

## 升级条件
厂商 ToS 禁止自动化列举 → 停止并回报；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h
