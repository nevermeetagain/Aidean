# Aidean 数据库迁移指南

## 概述

本文档描述Aidean AI模型天梯图平台的数据库迁移步骤，包括开发环境初始化和生产环境升级。

## 环境说明

| 环境 | 数据库 | 地址 | 端口 |
|------|--------|------|------|
| 开发 | PostgreSQL 16 | localhost | 5432 |
| 开发 | Redis 7 | localhost | 6379 |
| 生产 | PostgreSQL 16 (主从) | postgres-primary | 5432 |
| 生产 | Redis 7 (主从) | redis-primary | 6379 |

---

## 一、开发环境初始化

### 1.1 启动Docker服务

```bash
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

### 1.2 等待服务就绪

```bash
# 检查PostgreSQL
docker exec -it aidean-postgres-dev pg_isready -U root

# 检查Redis
docker exec -it aidean-redis-dev redis-cli ping
```

### 1.3 初始化数据库

SQL脚本会自动执行（通过volume挂载到 `/docker-entrypoint-initdb.d`）

或手动执行：

```bash
# 进入容器
docker exec -it aidean-postgres-dev psql -U root -d aidean

# 执行初始化脚本
\i /docker-entrypoint-initdb.d/01_init_extensions.sql
\i /docker-entrypoint-initdb.d/02_create_schemas.sql
\i /docker-entrypoint-initdb.d/03_create_tables.sql
\i /docker-entrypoint-initdb.d/04_create_indexes.sql
\i /docker-entrypoint-initdb.d/05_create_constraints.sql
\i /docker-entrypoint-initdb.d/06_create_triggers.sql
\i /docker-entrypoint-initdb.d/07_partition_setup.sql
\i /docker-entrypoint-initdb.d/08_seed_data.sql
```

### 1.4 验证初始化

```sql
-- 检查表
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- 检查扩展
SELECT extname, extversion FROM pg_extension;

-- 检查种子数据
SELECT COUNT(*) FROM providers;
SELECT COUNT(*) FROM models;
```

---

## 二、生产环境部署

### 2.1 准备环境

```bash
# 复制环境变量模板
cp docker/.env.example docker/.env

# 编辑实际值
vim docker/.env
```

### 2.2 启动服务

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

### 2.3 验证主从复制

```bash
# PostgreSQL主库
docker exec -it aidean-postgres-primary psql -U root -d aidean -c "SELECT * FROM pg_stat_replication;"

# Redis主从
docker exec -it aidean-redis-primary redis-cli -a ${REDIS_PASSWORD} INFO replication
```

---

## 三、数据库升级迁移

### 3.1 备份

```bash
# PostgreSQL备份
docker exec -it aidean-postgres-primary pg_dump -U root aidean > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis备份
docker exec -it aidean-redis-primary redis-cli -a ${REDIS_PASSWORD} BGSAVE
```

### 3.2 执行迁移脚本

按顺序执行SQL迁移脚本：

```bash
docker exec -it aidean-postgres-primary psql -U root -d aidean -f /docker-entrypoint-initdb.d/03_create_tables.sql
```

### 3.3 验证迁移

```sql
-- 检查新表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%新表名%';

-- 检查索引
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename = '表名';
```

---

## 四、数据迁移（从旧系统）

### 4.1 导出旧数据

```bash
# 假设旧系统是MySQL
mysqldump -u root -p old_database table_name > old_data.sql
```

### 4.2 数据转换

使用ETL工具或编写转换脚本处理：
- 数据类型映射 (MySQL -> PostgreSQL)
- 字符集转换
- 时间戳处理

### 4.3 导入数据

```bash
# 转换后的SQL
psql -U root -d aidean -f transformed_data.sql
```

### 4.4 验证数据

```sql
-- 检查数据量
SELECT COUNT(*) FROM table_name;

-- 检查数据完整性
SELECT * FROM table_name WHERE id IS NULL;
```

---

## 五、回滚方案

### 5.1 紧急回滚

```bash
# 停止应用
docker-compose -f docker-compose.prod.yml stop app

# 恢复数据库
docker exec -it aidean-postgres-primary psql -U root -d aidean < backup_20260101_120000.sql

# 重启应用
docker-compose -f docker-compose.prod.yml start app
```

### 5.2 版本回滚

```bash
# 回滚到特定版本
git checkout v1.0.0
docker-compose -f docker-compose.prod.yml up -d
```

---

## 六、常见问题

### Q1: 连接被拒绝

**解决方案：**
```bash
# 检查端口
netstat -tlnp | grep 5432

# 检查防火墙
sudo ufw allow 5432/tcp
```

### Q2: 密码错误

**解决方案：**
```bash
# 重置密码
docker exec -it aidean-postgres-primary psql -U root -c "ALTER USER root WITH PASSWORD 'newpassword';"
```

### Q3: 磁盘空间不足

**解决方案：**
```bash
# 清理Docker
docker system prune -a

# 清理PostgreSQL WAL
docker exec -it aidean-postgres-primary psql -U root -c "SELECT pg_switch_wal();"
```
