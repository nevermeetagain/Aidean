# DESIGN-001-监控执行与运行请求

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）

- 关联：ADR-0011；T120-11/12/15

## 设计要点
领取 SQL：`UPDATE monitor_run_requests SET status='running',started_at=now() WHERE id=(SELECT id FROM monitor_run_requests WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`；僵死回收：running 且 started_at<now()-30min → failed(stale)；单源异常不影响其他源；结果写 monitoring_sources.last_status/last_count/last_error 与请求行 result_count/error；后台轮询 5s、最长 2 分钟后提示「仍在排队，可稍后在历史中查看」。
