# 天梯分度值行为验收与教训沉淀 Spec

> 版本: v1.0 | 更新: 2026-09-04 | 变更: 首版——分度值=行距口径端到端验收、教训文档化、服务重启

## Why

分度值口径（v2.1 定距档：g = 相邻两行性能差值，轴量程恒 0→100）已落码，但服务中断导致「每次切换分度值天梯图即时变化」从未被验收；同时本轮迭代连续发生三类错误（工具栏左右位镜像、孤儿进程锁构建、强杀构建损坏 .pnpm/静态资源缺失），教训仅存于 agent 私有记忆，团队文档缺失，存在复发风险。

## What Changes

- 核验并保障分度值行为：g = 相邻两行性能差值；g=5.0 → 刻度/单元格序列 [100, 95, 90, …, 0]；每次切换分度值天梯图（轴刻度密度 + 卡片档位行）即时重排、零网络请求；发现缺陷则修复并补回归测试
- 新建 `docs/governance/经验教训.md`：记录本轮全部错误的根因与可执行预防规则（左右位镜像、孤儿进程锁构建、强杀构建损坏 .pnpm、standalone 缺静态资源致无交互）；注册进 `docs/文档索引.md`；agent 项目记忆同步
- 修复完成后重建并重启 :3000 standalone 服务（构建前清孤儿进程、构建后复制 static/public、健康检查）

## Impact

- Affected specs: implement-ladder-module（天梯模块）
- Affected code:
  - `apps/web/components/ladder/LadderMatrixBoard.tsx`（buildLayout 定距档：如需修复）
  - `apps/web/components/ladder/GranularitySelector.tsx`、`LadderBoard.tsx`（状态接线：如需修复）
  - `apps/web/lib/features/ladder`（单测）
  - `docs/governance/经验教训.md`（新建）、`docs/文档索引.md`（注册）

## ADDED Requirements

### Requirement: 分度值=行距且切换即时生效

分度值 g SHALL 表示性能轴相邻两行之间的性能差值；轴量程恒定 0→100（顶格恒 100、底格恒 0）；g=5.0 时刻度序列 SHALL 为 [100, 95, 90, …, 0]（100 不被 g 整除时末尾收敛到 0，如 g=3 → [100, 97, …, 1, 0]）；用户每次切换分度值，天梯图（轴刻度密度与卡片档位行）SHALL 即时重排，全程零网络请求、不进 URL。

#### Scenario: g=5.0 刻度序列
- **WHEN** 用户选择分度值 5.0
- **THEN** 轴刻度自顶向底依次为 100, 95, 90, …, 5, 0，每格标注性能值

#### Scenario: 切换即时重排
- **WHEN** 用户在 0.1 与 5.0 之间切换分度值
- **THEN** 天梯图轴刻度密度与卡片所在行随新 g 立即变化，页面不发出任何网络请求

#### Scenario: 底部恒达 0
- **WHEN** 用户下拉天梯图至底部
- **THEN** 性能轴底缘显示 0 刻度，「到底了」状态可见

### Requirement: 教训文档化

`docs/` SHALL 新增《经验教训.md》（带版本标记）：完整记录本轮四类错误的根因与可执行预防规则——① UI 重排凭需求文字顺序自创左右排布致镜像（预防：重排以原版式横向位置为锚）；② StopCommand 未杀 node 子进程致孤儿服务持 .next 锁、构建无限挂起（预防：构建前用 Get-CimInstance 检查并清理 standalone server 进程）；③ 强杀挂死构建致 .pnpm next 目录损坏（预防：避免强杀；损坏后按既定恢复流程：删目录→pnpm install --force→金丝雀文件校验）；④ standalone 产物缺 .next/static 与 public 致 chunk 全 404、页面无交互（预防：构建后必须复制静态资源再启动）。SHALL 同步注册进《文档索引.md》并同步 agent 项目记忆摘要。

#### Scenario: 教训可检索
- **WHEN** 开发者打开 `docs/文档索引.md`
- **THEN** 能找到《经验教训.md》条目并跳转阅读

### Requirement: 修复后重启服务

修复验证通过后 SHALL 重建并重启 :3000 standalone 服务：构建前确认无孤儿 standalone 进程持锁；构建后复制 `.next/static` 与 `public` 到 standalone 目录再启动；`/api/v1/system/health` 与 `/models` 返回 200。

#### Scenario: 重启成功
- **WHEN** 构建、复制、启动依次完成
- **THEN** 健康检查 200、/models 200、页面可交互（分度值切换生效）
