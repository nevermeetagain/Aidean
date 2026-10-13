# Tasks

- [x] Task 1: 分度值=行距口径代码核验（g = 相邻两行性能差值，量程恒 0→100）
  - [x] SubTask 1.1: 核验 `LadderMatrixBoard.tsx` buildLayout 定距档实现（bandOf floor 自顶入档、ticks 序列 [100, 100−g, …, 0]）——核验通过；纯布局数学抽至 `lib/features/ladder/matrix-layout.ts`（lib 零反向依赖，`pageType` 参数改为 `useSeries: boolean`）
  - [x] SubTask 1.2: 核验 `LadderBoard.tsx` 行2 接线：排序右方 `GranularitySelector`、状态 `axisGranularity` 传递
  - [x] SubTask 1.3: 核验分度值切换零网络请求、不进 URL（纯客户端重排，不在 ladderFetchQuery）
  - [x] SubTask 1.4: 无逻辑缺陷；按单测可测性抽取纯模块并补 4 用例（g=5.0 序列 / g=3 收敛 / floor 入档 / 双向重排）
- [x] Task 2: 分度值行为单测与构建校验
  - [x] SubTask 2.1: ladder 单测 32/32 通过（ladder.spec 23 含 g=5.0 序列 + store 9）
  - [x] SubTask 2.2: tsc --noEmit 清洁通过（exit 0）
- [x] Task 3: 教训文档化
  - [x] SubTask 3.1: 新建 `docs/governance/经验教训.md` v1.0（2026-09-05）：四类错误根因与预防规则
  - [x] SubTask 3.2: 注册进 `docs/文档索引.md`（索引升 v1.3）
  - [x] SubTask 3.3: 同步 agent 项目记忆摘要（project_memory.md 指针已加）
- [x] Task 4: 重建并重启 :3000 standalone 服务
  - [x] SubTask 4.1: 构建前确认无孤儿 standalone 进程
  - [x] SubTask 4.2: next build 首跑触发已知事故①（jest-worker processChild 缺失）→ 按《经验教训》§一.1 恢复（Remove-Item + pnpm install --force + 5 哨兵校验全 True）→ 重试 build exit 0；static/public 已复制进 standalone
  - [x] SubTask 4.3: `/api/v1/system/health` 200、`/models` 200（261KB SSR）
- [x] Task 5: 浏览器端到端验收
  - [x] SubTask 5.1: g=5.0 刻度 [100,95,90,…,5,0] 共 21 枚，每格标注
  - [x] SubTask 5.2: 切换 0.1↔5.0↔2 即时重排零请求（0.1→1001 枚、2→51 枚；网络面板仅导航预取，无 /api/v1/ladder）
  - [x] SubTask 5.3: 下拉到底轴分 0 在视口内可见；「到底了 · 已展示全部 4 个条目」可见

# Task Dependencies

- Task 2 依赖 Task 1（核验/修复完成后才能校验）
- Task 4 依赖 Task 2、Task 3（代码与文档就绪后构建）
- Task 5 依赖 Task 4（服务运行后才能端到端验收）
- Task 3 与 Task 1/2 可并行
