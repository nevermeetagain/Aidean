# TASK-084：核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**haiku**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-12）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-012 / REQ-L-014
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-014、REQ-NF-012
- 来源方案：需求文档:41；未完成事项目录.md:46

## 目标
e2e 断言 /models 与 /providers 无 footer；输出 #19 收口证据或缺口清单

## 输入
- 文档：`docs/product/requirements/需求文档.md:41`；`docs/plans/未完成事项目录.md:46`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-no-footer.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-084/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两页各断言 footer 不存在
2. [ ] #19 逐项对照代码，结果写证据
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g ladder-no-footer` 全绿或失败已登记
- [ ] 证据含 #19 逐项结论
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g ladder-no-footer
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-084/`

## 允许修改
- `e2e/ladder-no-footer.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-084/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：取证型 e2e 断言 + 台账核对

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
