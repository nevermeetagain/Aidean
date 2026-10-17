# TASK-054：S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-15 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / 铁律2 双向锚
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005

## 目标
《网关计费时序契约》补「生效价归一」一节、《API接口文档》EffectivePrice 字段表补 currency/unit/fx、术语表新增「计价口径归一」，三处双向锚，升版本头

## 输入
- 文档：`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`EffectivePriceSchema（v0.2）`
- 前置任务：TASK-053, TASK-031
- 前置状态：TASK-053 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/网关计费时序契约.md`
  - `docs/architecture/API接口文档.md`
  - `docs/governance/术语表.md`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-054/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 补节与锚
2. [ ] 版本头
3. [ ] 门禁
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS
- [ ] 三文档出现「计价口径归一」锚且互链可达
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-054/`

## 允许修改
- `docs/architecture/网关计费时序契约.md`
- `docs/architecture/API接口文档.md`
- `docs/governance/术语表.md`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-054/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.7.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-053, TASK-031
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：文档登记

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
