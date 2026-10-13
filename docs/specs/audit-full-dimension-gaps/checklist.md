# Checklist

- [x] `docs/项目状态审计.md` 已创建且带版本标记（v1.0 | 2026-09-07）
- [x] 五维（界面/功能/数据/交互/发布事务）台账完整，覆盖对话分析全部条目
- [x] 每项含三态标注与依据引用（文档路径/commit）
- [x] 推荐行动序含依赖与前置条件
- [x] `docs/文档索引.md` 已注册并升版
- [x] project_memory.md 已同步断面摘要
- [x] 台账与 README §8.5 / spec 归档记录交叉一致
- [x] 未改动任何代码文件（纯文档交付）

## 门禁回归取证（员工 C 质量域 2026-09-09，详见 docs/项目状态审计.md §10.6）

> **[C-N7 正位注记 2026-09-09]** 本节为早期错位回填（本期主规格应为 `rebuild-admin-console-and-harden-auth/checklist.md`），证据已于同日正位至主规格 checklist 的 G-1/G-2/2-3/5-1 取证行与审计 §10.6，**本节仅留痕不再更新**。以下原始记录保留供追溯：

- [x] 四门禁退出码 0：tsc shared 3s / tsc web 6s / vitest 282 用例 4.9s / build 54.6s（BUILD_ID LcSwP3Hqg6PNn-Kcai3ba）[命令]
- [x] 孤儿 standalone 进程（PID 19292，持已删文件句柄锁 .next）甄别→回收→build 复通，根因闭环记录于审计 §10.6.2 [命令]
- [x] C-2 修复：turbo.json test 任务 outputs=[] + cache=false，复跑 no output files 警告消失 [命令]
- [x] C-3 处置：e2e/web 三份陈旧 spec（/aidean、/sphere/*、/compare、/evaluation 等已删路由）test.describe.skip 标记并注记原因，证据链保留 [断言]
- [x] 烟囱 7 项全过（3000 standalone）：health 200、/models 200、/admin 匿名 307、非管理员 denied=1、/auth/me 匿名 401、SUPER_ADMIN 登录进 /admin、logout 清 cookie [测试]
  - 正位补证（C-N6，2026-09-09）：改以 Playwright `e2e/tests/smoke.spec.ts` 7 断言在 3000 唯一端口真实浏览器上下文重跑，**7/7 expected（EXIT=0）**，JSON 统计 `{"expected":7,"unexpected":0}`；console error 清零（已豁免设计内匿名 /auth/me 探测 401）
- [ ] 待办（归属：管理者+员工A）：管理者确认新信息架构后重写三份 skip 的 e2e 并恢复运行
- [ ] 待办（归属：员工 C 下轮）：e2e/tests 15 用例在 standalone 常驻态全量跑 playwright 留档
