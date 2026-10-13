# Aidean 备份与恢复指南

## 概述

本文档描述Aidean AI模型天梯图平台的PostgreSQL和Redis备份恢复策略。

---

## 一、PostgreSQL 备份恢复

### 1.1 备份策略

| 备份类型 | 频率 | 保留时间 | 存储位置 |
|---------|------|---------|---------|
| 全量备份 | 每天 02:00 | 30天 | 本地 + 远程 |
| WAL归档 | 实时 | 7天 | 本地 |
| 增量备份 | 每6小时 | 7天 | 本地 |

### 1.2 全量备份脚本

```bash
#!/bin/bash
# backup_full.sh

BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="aidean-postgres-primary"

# 创建备份目录
mkdir -p ${BACKUP_DIR}

# 执行备份
docker exec ${CONTAINER_NAME} pg_dump -U root -Fc aidean > ${BACKUP_DIR}/full_backup_${DATE}.dump

# 压缩
gzip ${BACKUP_DIR}/full_backup_${DATE}.dump

# 清理30天前的备份
find ${BACKUP_DIR} -name "full_backup_*.dump.gz" -mtime +30 -delete

# 上传到远程存储 (可选)
# rclone copy ${BACKUP_DIR}/full_backup_${DATE}.dump.gz remote:backup/

echo "Backup completed: full_backup_${DATE}.dump.gz"
```

### 1.3 WAL归档备份

```bash
#!/bin/bash
# backup_wal.sh

BACKUP_DIR="/backup/wal"
CONTAINER_NAME="aidean-postgres-primary"

mkdir -p ${BACKUP_DIR}

# 归档当前WAL
docker exec ${CONTAINER_NAME} pg_switch_wal

# 复制WAL文件
docker cp ${CONTAINER_NAME}:/var/lib/postgresql/wal/. ${BACKUP_DIR}/

# 清理7天前的WAL
find ${BACKUP_DIR} -type f -mtime +7 -delete
```

### 1.4 恢复操作

```bash
# 停止应用
docker-compose -f docker-compose.prod.yml stop app

# 恢复全量备份
docker exec -it aidean-postgres-primary pg_restore -U root -d aidean -c /path/to/full_backup_20260407_020000.dump.gz

# 或恢复到指定时间点 (Point-in-Time Recovery)
docker exec -it aidean-postgres-primary psql -U root -d aidean -c "SELECT pg_recovery_target_time('2026-04-07 10:00:00+08');"

# 重启应用
docker-compose -f docker-compose.prod.yml start app
```

---

## 二、Redis 备份恢复

### 2.1 备份策略

| 备份类型 | 频率 | 保留时间 |
|---------|------|---------|
| RDB快照 | 每15分钟 | 7天 |
| AOF | 实时 | 3天 |

### 2.2 备份脚本

```bash
#!/bin/bash
# backup_redis.sh

BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="aidean-redis-primary"
REDIS_PASSWORD="YourRedisPassword"

mkdir -p ${BACKUP_DIR}

# 触发RDB快照
docker exec ${CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} BGSAVE

# 等待快照完成
sleep 5

# 复制RDB文件
docker cp ${CONTAINER_NAME}:/data/dump.rdb ${BACKUP_DIR}/dump_${DATE}.rdb

# 压缩
gzip ${BACKUP_DIR}/dump_${DATE}.rdb

# 清理7天前的备份
find ${BACKUP_DIR} -name "dump_*.rdb.gz" -mtime +7 -delete

echo "Redis backup completed: dump_${DATE}.rdb.gz"
```

### 2.3 恢复操作

```bash
# 停止Redis
docker-compose -f docker-compose.prod.yml stop redis-primary

# 复制备份文件
docker cp dump_20260407_020000.rdb.gz aidean-redis-primary:/data/dump.rdb.gz

# 解压
docker exec -it aidean-redis-primary gunzip -f /data/dump.rdb.gz

# 启动Redis
docker-compose -f docker-compose.prod.yml start redis-primary

# 验证
docker exec -it aidean-redis-primary redis-cli -a ${REDIS_PASSWORD} KEYS "*"
```

---

## 三、容灾备份

### 3.1 异地备份

```bash
#!/bin/bash
# backup_offsite.sh

# 复制到对象存储 (S3/MinIO)
aws s3 sync /backup/postgresql s3://aidean-backup/postgresql/
aws s3 sync /backup/redis s3://aidean-backup/redis/

# 或使用rclone
rclone copy /backup s3-compatible:backup --config rclone.conf
```

### 3.2 延迟从库恢复

生产环境配置了4小时延迟从库，可用于：

```bash
# 停止延迟从库
docker exec -it aidean-postgres-replica-async pg_ctl promote -D /var/lib/postgresql/data

# 切换应用连接指向新主库
# 更新环境变量或DNS
```

---

## 四、定时任务配置

### 4.1 Cron任务

```bash
# 编辑crontab
crontab -e

# 添加以下任务
# PostgreSQL全量备份 (每天2点)
0 2 * * * /opt/aidean/scripts/backup_full.sh

# WAL备份 (每小时)
0 * * * * /opt/aidean/scripts/backup_wal.sh

# Redis备份 (每15分钟)
*/15 * * * * /opt/aidean/scripts/backup_redis.sh

# 异地备份 (每天3点)
0 3 * * * /opt/aidean/scripts/backup_offsite.sh

# 清理旧备份 (每天4点)
0 4 * * * /opt/aidean/scripts/cleanup_old_backups.sh
```

---

## 五、验证恢复

### 5.1 定期演练

```bash
# 每月执行一次恢复演练
# 1. 在测试环境恢复备份
# 2. 验证数据完整性
# 3. 检查应用功能
# 4. 记录恢复时间
```

### 5.2 恢复检查清单

- [ ] 数据库连接正常
- [ ] 表数据量正确
- [ ] 索引存在
- [ ] 触发器工作正常
- [ ] 主从复制同步
- [ ] 缓存预热完成
