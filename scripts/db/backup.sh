#!/usr/bin/env bash
# Aidean 数据库备份脚本（R-60：生产级数据策略，每日备份）
# 用法: ./backup.sh [database_name]
# 默认备份 aidean 库，输出到 docker/postgres/backups/
# 保留最近 30 份备份（R-60：从 7 份扩展为 30 份）

set -euo pipefail

DB_NAME="${1:-aidean}"
BACKUP_DIR="docker/postgres/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# 从 .env 或环境变量读取凭据
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-root}"
PG_PASSWORD="${PG_PASSWORD:?需设置 PG_PASSWORD 环境变量}"

mkdir -p "${BACKUP_DIR}"

echo "🔄 [PostgreSQL] 备份 ${DB_NAME} → ${BACKUP_FILE}"

PGPASSWORD="${PG_PASSWORD}" pg_dump \
  --host="${PG_HOST}" \
  --port="${PG_PORT}" \
  --username="${PG_USER}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [PostgreSQL] 备份完成: ${BACKUP_FILE} (${FILESIZE})"

# ============================
# Redis 备份（R-60 扩展）
# ============================
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_BACKUP_DIR="docker/redis/backups"
REDIS_BACKUP_FILE="${REDIS_BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

mkdir -p "${REDIS_BACKUP_DIR}"

echo "🔄 [Redis] 触发 BGSAVE ..."

if [ -n "${REDIS_PASSWORD}" ]; then
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" --no-auth-warning BGSAVE >/dev/null 2>&1 || true
else
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE >/dev/null 2>&1 || true
fi

# 等待 BGSAVE 完成（最多 30 秒）
for i in $(seq 1 30); do
  if [ -n "${REDIS_PASSWORD}" ]; then
    LAST_SAVE=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" --no-auth-warning LASTSAVE 2>/dev/null || echo "0")
  else
    LAST_SAVE=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE 2>/dev/null || echo "0")
  fi
  NOW_TS=$(date +%s)
  DIFF=$((NOW_TS - LAST_SAVE))
  if [ "${DIFF}" -lt 10 ]; then
    break
  fi
  sleep 1
done

# 从 Redis 容器拷贝 dump.rdb（如果运行在 Docker 中）
if docker exec aidean-redis-primary cat /data/dump.rdb >/dev/null 2>&1; then
  docker cp aidean-redis-primary:/data/dump.rdb "${REDIS_BACKUP_FILE}" 2>/dev/null || true
  REDIS_SIZE=$(du -h "${REDIS_BACKUP_FILE}" 2>/dev/null | cut -f1 || echo "unknown")
  echo "✅ [Redis] 备份完成: ${REDIS_BACKUP_FILE} (${REDIS_SIZE})"
else
  echo "⚠️ [Redis] 未检测到 Docker 容器，跳过 RDB 拷贝（BGSAVE 已触发）"
fi

# ============================
# 清理旧备份（保留最近 30 份）
# ============================
echo "🧹 清理旧备份（保留最近 30 份）..."
ls -t "${BACKUP_DIR}"/${DB_NAME}_*.dump 2>/dev/null | tail -n +31 | xargs -r rm -v
ls -t "${REDIS_BACKUP_DIR}"/redis_*.rdb 2>/dev/null | tail -n +31 | xargs -r rm -v

# ============================
# 备份清单
# ============================
echo "📋 PostgreSQL 备份清单（最近 5 份）:"
ls -lh "${BACKUP_DIR}"/${DB_NAME}_*.dump 2>/dev/null | tail -5

echo "📋 Redis 备份清单（最近 5 份）:"
ls -lh "${REDIS_BACKUP_DIR}"/redis_*.rdb 2>/dev/null | tail -5

echo "========================================"
echo "✅ 全量备份完成: ${TIMESTAMP}"
echo "========================================"
