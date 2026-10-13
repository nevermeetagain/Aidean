# Aidean 监控与告警指南

## 概述

本文档描述Aidean AI模型天梯图平台的PostgreSQL和Redis监控告警配置。

---

## 一、PostgreSQL 监控

### 1.1 关键指标

| 指标 | 阈值 | 告警级别 | 说明 |
|------|------|---------|------|
| 连接数使用率 | >80% | Warning | 接近最大连接数 |
| 连接数使用率 | >95% | Critical | 即将耗尽连接 |
| 慢查询数量 | >10/min | Warning | 执行超过1秒的查询 |
| 慢查询数量 | >50/min | Critical | 数据库性能问题 |
| 磁盘使用率 | >80% | Warning | 磁盘空间不足 |
| 磁盘使用率 | >90% | Critical | 即将耗尽空间 |
| 复制延迟 | >5s | Warning | 主从复制延迟 |
| 复制延迟 | >30s | Critical | 复制严重滞后 |
| 死锁数量 | >0 | Critical | 发生死锁 |
| 表膨胀率 | >20% | Warning | 需要VACUUM |
| 缓存命中率 | <80% | Warning | 缓存效率低 |

### 1.2 监控SQL查询

```sql
-- 连接数使用
SELECT 
    max_conn.setting::int AS max_connections,
    cur_conn.count AS current_connections,
    ROUND(cur_conn.count::numeric / max_conn.setting::numeric * 100, 2) AS usage_pct
FROM pg_settings max_conn,
    (SELECT count(*)::numeric AS count FROM pg_stat_activity) cur_conn
WHERE max_conn.name = 'max_connections';

-- 慢查询统计
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE total_exec_time > 1000
ORDER BY total_exec_time DESC
LIMIT 10;

-- 复制延迟
SELECT 
    client_addr,
    state,
    sync_delta,
    write_delta,
    replay_delta
FROM pg_stat_replication;

-- 表大小和膨胀
SELECT 
    schemaname,
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_tuple_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 索引使用率
SELECT 
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 1.3 Prometheus监控配置

```yaml
# postgres_exporter配置
scrape_configs:
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

---

## 二、Redis 监控

### 2.1 关键指标

| 指标 | 阈值 | 告警级别 | 说明 |
|------|------|---------|------|
| 内存使用率 | >80% | Warning | 内存接近上限 |
| 内存使用率 | >90% | Critical | 即将触发淘汰 |
| 内存碎片率 | >1.5 | Warning | 内存碎片过多 |
| CPU使用率 | >80% | Warning | CPU负载高 |
| 连接数 | >10000 | Warning | 连接数过多 |
| 命中率 | <80% | Warning | 缓存效率低 |
| 持久化耗时 | >5s | Warning | AOF/RDB阻塞 |
| 从库同步状态 | down | Critical | 从库断开 |

### 2.2 监控命令

```bash
# 内存使用
redis-cli -a ${REDIS_PASSWORD} INFO memory | grep used_memory_human

# 命中率
redis-cli -a ${REDIS_PASSWORD} INFO stats | grep keyspace_hits

# 连接数
redis-cli -a ${REDIS_PASSWORD} INFO clients | grep connected_clients

# 持久化状态
redis-cli -a ${REDIS_PASSWORD} INFO persistence

# 复制状态
redis-cli -a ${REDIS_PASSWORD} INFO replication
```

---

## 三、告警配置

### 3.1 告警规则 (Prometheus/PrometheusAlertmanager)

```yaml
# alert-rules.yml
groups:
  - name: postgresql
    rules:
      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL连接数使用率过高"
          
      - alert: PostgreSQLSlowQueries
        expr: rate(pg_stat_statements_mean_exec_time[5m]) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL慢查询过多"

  - name: redis
    rules:
      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis内存使用率过高"
          
      - alert: RedisLowHitRate
        expr: redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses) < 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis缓存命中率过低"
```

### 3.2 告警通知配置

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://alert-webhook:5000/alerts'
        send_resolved: true
```

---

## 四、Dashboard配置

### 4.1 PostgreSQL Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Aidean PostgreSQL监控",
    "panels": [
      {
        "title": "连接数使用率",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count / pg_settings_max_connections * 100",
            "legendFormat": "使用率%"
          }
        ]
      },
      {
        "title": "查询QPS",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_statements_calls_total[5m])",
            "legendFormat": "{{query}}"
          }
        ]
      },
      {
        "title": "磁盘IO",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_bgwriter_buffers_backend_total[5m])",
            "legendFormat": "Backend writes"
          }
        ]
      }
    ]
  }
}
```

### 4.2 Redis Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Aidean Redis监控",
    "panels": [
      {
        "title": "内存使用",
        "type": "gauge",
        "targets": [
          {
            "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
            "legendFormat": "使用率%"
          }
        ]
      },
      {
        "title": "缓存命中率",
        "type": "gauge",
        "targets": [
          {
            "expr": "redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses) * 100",
            "legendFormat": "命中率%"
          }
        ]
      },
      {
        "title": "操作QPS",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_commands_total[5m])",
            "legendFormat": "QPS"
          }
        ]
      }
    ]
  }
}
```

---

## 五、日志分析

### 5.1 PostgreSQL 慢查询日志

```sql
-- 开启慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- 查询慢查询
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE query NOT ILIKE '%pg_stat_activity%'
AND state = 'active'
AND now() - pg_stat_activity.query_start > interval '1 second'
ORDER BY duration DESC;
```

### 5.2 Redis 慢查询日志

```bash
# 开启慢查询日志
redis-cli -a ${REDIS_PASSWORD} CONFIG SET slowlog-log-slower-than 10000
redis-cli -a ${REDIS_PASSWORD} CONFIG SET slowlog-max-len 128

# 查看慢查询
redis-cli -a ${REDIS_PASSWORD} SLOWLOG GET 10
```

---

## 六、巡检脚本

### 6.1 日常巡检

```bash
#!/bin/bash
# health_check.sh

echo "=== Aidean 数据库健康检查 ==="
echo "时间: $(date)"
echo ""

# PostgreSQL
echo "--- PostgreSQL ---"
docker exec aidean-postgres-primary psql -U root -d aidean -c "SELECT '连接数: ' || count(*) || '/' || current_setting('max_connections') FROM pg_stat_activity;"

# 慢查询
docker exec aidean-postgres-primary psql -U root -d aidean -c "SELECT '慢查询(1s+): ' || count(*) FROM pg_stat_statements WHERE total_exec_time > 1000;"

# Redis
echo ""
echo "--- Redis ---"
docker exec aidean-redis-primary redis-cli -a ${REDIS_PASSWORD} INFO memory | grep used_memory_human
docker exec aidean-redis-primary redis-cli -a ${REDIS_PASSWORD} INFO stats | grep keyspace_hits

echo ""
echo "=== 检查完成 ==="
```
