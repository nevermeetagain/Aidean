# TASK-043：生产部署实弹（条件方案 A：自有服务器 docker compose prod）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #2 生产部署实弹（P0）
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-003
- 来源方案：SOL-S8 方案A/B

## 目标
在用户提供的服务器上以 docker/docker-compose.prod.yml 起服，/api/v1/system/ready=200、e2e smoke 对生产域名通过、备份任务就绪

## 输入
- 文档：`docker/docker-compose.prod.yml`；`docs/engineering/部署运维文档.md`；`docs/archive/REL-ENG-02-发布收口与运行契约.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-042, TASK-007, TASK-003
- 前置状态：U-3 裁决（服务器/域名/密钥/registry）完成；TASK-042 演练通过

## 输出
- 新增/修改的文件路径：
  - `docker/.env（不入库）`
  - `deploy/**（按需）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-043/`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-043/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 方案A：服务器供给→env 五件套→compose up -d→migrate deploy→seed（生产口径）→ready 检查→smoke
2. [ ] 方案B（U-3=暂缓）：本卡冻结，仅保留 TASK-042
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `curl https://<域名>/api/v1/system/ready` 200
- [ ] smoke 7 例对生产 baseURL 通过
- [ ] 密钥扫描（TASK-007）对仓库 0 命中
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
E2E_BASE_URL=https://<域名> pnpm exec playwright test --config playwright.config.ts --project=smoke
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-043/`

## 允许修改
- `deploy/**`
- `docker/**`
- `Dockerfile`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-043/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042, TASK-007, TASK-003
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-3 未裁决 → 不执行

## 建议执行档位
opus　理由：生产环境不可逆操作 + 密钥处理

## 升级条件
生产故障 → 立即回滚并上报用户；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 16h　≥2h
