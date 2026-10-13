# Checklist

- [x] buildLayout 定距档实现核验：g = 相邻两行性能差值，量程恒 0→100，floor 自顶入档
- [x] g=5.0 时轴刻度序列为 [100, 95, 90, …, 5, 0]，每格标注性能值
- [x] 100 不被 g 整除时（如 g=3）末尾收敛到 0
- [x] 切换分度值天梯图（轴刻度密度 + 卡片档位行）即时重排，零网络请求、不进 URL
- [x] ladder 单测通过（含 g=5.0 刻度序列用例），tsc --noEmit 清洁
- [x] `docs/governance/经验教训.md` 已创建且带版本标记，记录四类错误根因与预防规则
- [x] `docs/governance/经验教训.md` 已注册进 `docs/文档索引.md`
- [x] agent 项目记忆（project_memory.md）已同步教训摘要
- [x] 构建前已确认无孤儿 standalone 进程持锁
- [x] next build 成功，static 与 public 已复制到 standalone 目录
- [x] :3000 服务健康检查 200，/models 200
- [x] 浏览器验收：切换分度值即时变化、下拉到底轴分达 0、「到底了」可见
