# TASK-007：守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像未落地**｜V0.8.0 复核（c2da219）：scripts/guard/ 不存在；由 TASK-085 回补或按卡执行（V0.7.0 判定：他线声称完成·证据不足）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：§9.4 自动化守卫 / REQ-C-02 端口（Aidean 3000–3100，用户 2026-10-14 口径；子平台区间以 P-1/P-2 裁决为准）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-005、REQ-C-006、REQ-NF-006、REQ-M-010
- 来源方案：SOL-S0

## 目标
`node scripts/guard/run-all.mjs` 四项检查全 PASS 并接入 CI verify job

## 输入
- 文档：`AGENTS.md 铁律`；`docs/governance/目录结构文档.md`
- 契约：`contracts/03-identity.contract.ts AUTHZ_BOUNDARY（敏感字段名清单）`
- 前置任务：TASK-085
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `scripts/guard/root-pollution.mjs`
  - `scripts/guard/secret-scan.mjs`
  - `scripts/guard/module-boundary.mjs`
  - `scripts/guard/port-consistency.mjs`
  - `scripts/guard/run-all.mjs`
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-007/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] root-pollution：根目录文件白名单 = 当前 git ls-files 根级文件集合，新增根级文件即失败
2. [ ] secret-scan：git ls-files 全量扫描私钥头/AKIA/sk-[A-Za-z0-9]{20,}/password= 明文模式，.env.example 豁免
3. [ ] module-boundary：packages/** 不得 import apps/**；apps/web/components/** 不得 import @prisma/client 或 lib/db/**
4. [ ] port-consistency：Aidean 自身入口（apps/web/package.json dev/start、playwright baseURL、Dockerfile EXPOSE/PORT、auth/constants.ts AUTH_ISSUER 默认值）全部 ∈ 3000–3100；seed.ts OIDC localhost 回调端口逐一必须落在 scripts/guard/port-ranges.json 登记区间内——区间表初值只登记已确认项（Aidean 3000–3100、BotHot 3200–3300、AideanFleet 3100–3200），P-1/P-2 未裁决项输出 WARN 不失败
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 四脚本在当前 HEAD 全部 exit 0（端口项允许 WARN，WARN 清单写入证据）
- [ ] 人为加入根级文件/私钥样本/3500 端口回调时对应脚本 exit 1（负向测试证据）
- [ ] CI verify job 含 guard 步骤
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/guard/run-all.mjs
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-007/`

## 允许修改
- `scripts/guard/**`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-007/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：TASK-004, TASK-006
- Blocks：TASK-043, TASK-050
- 阻塞条件：现存代码违反模块边界（非新引入）→ 不改代码，登记为白名单例外并上报

## 建议执行档位
sonnect　理由：确定性脚本

## 升级条件
误报率高无法收敛 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
