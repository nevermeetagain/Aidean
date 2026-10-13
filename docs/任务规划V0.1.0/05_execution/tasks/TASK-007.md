# TASK-007：守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口一致性（零新依赖）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：§9.4 自动化守卫 / REQ-C-02 端口约束（Aidean 3000、AideanBot 3333）
- 来源方案：SOL-S0

## 目标
`node scripts/guard/run-all.mjs` 四项检查全 PASS 并接入 CI verify job

## 输入
- 文档：`AGENTS.md 铁律`；`docs/governance/目录结构文档.md`
- 契约：`contracts/03-identity.contract.ts AUTHZ_BOUNDARY（敏感字段名清单）`
- 前置任务：TASK-008
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `scripts/guard/root-pollution.mjs`
  - `scripts/guard/secret-scan.mjs`
  - `scripts/guard/module-boundary.mjs`
  - `scripts/guard/port-consistency.mjs`
  - `scripts/guard/run-all.mjs`
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-007/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] root-pollution：根目录文件白名单 = 当前 git ls-files 根级文件集合，新增根级文件即失败
2. [ ] secret-scan：git ls-files 全量扫描私钥头/AKIA/sk-[A-Za-z0-9]{20,}/password= 明文模式，.env.example 豁免
3. [ ] module-boundary：packages/** 不得 import apps/**；apps/web/components/** 不得 import @prisma/client 或 lib/db/**
4. [ ] port-consistency：apps/web/package.json dev/start 无 -p 或 -p 3000；playwright baseURL=3000；Dockerfile EXPOSE 3000；seed wechat-rag redirectUris 含 localhost:3333 且不含 localhost:3200（依赖 TASK-008）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 四脚本在当前 HEAD + TASK-008 后全部 exit 0
- [ ] 人为加入根级文件/私钥样本时对应脚本 exit 1（证据记录负向测试）
- [ ] CI verify job 含 guard 步骤
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/guard/run-all.mjs
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-007/`

## 允许修改
- `scripts/guard/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-007/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-008
- 资源锁串行（同文件，须在其后执行）：TASK-004, TASK-006
- Blocks：TASK-043
- 阻塞条件：现存代码违反模块边界（非新引入）→ 不改代码，登记为白名单例外并上报

## 建议执行档位
sonnect　理由：确定性脚本

## 升级条件
误报率高无法收敛 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
