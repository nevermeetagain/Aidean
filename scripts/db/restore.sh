#!/usr/bin/env bash
# Aidean 数据库恢复脚本（#3 生产级数据策略）
# 用法: ./restore.sh <backup_file> [database_name]
# 警告: 恢复会覆盖目标库现有数据！

set -euo pipefail

BACKUP_FILE="${1:?用法: ./restore.sh <backup_file> [database_name]}"
DB_NAME="${2:-aidean}"

PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-root}"
PG_PASSWORD="${PG_PASSWORD:?需设置 PG_PASSWORD 环境变量}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ 备份文件不存在: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠️  即将恢复 ${BACKUP_FILE} → ${DB_NAME}"
echo "⚠️  此操作将覆盖 ${DB_NAME} 库的所有数据！"
read -p "确认恢复？输入 yes 继续: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "取消恢复。"
  exit 0
fi

echo "🔄 恢复中..."

# 先断开现有连接并重建空库
PGPASSWORD="${PG_PASSWORD}" psql \
  --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" \
  --dbname=postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid<>pg_backend_pid();" 2>/dev/null || true

PGPASSWORD="${PG_PASSWORD}" psql \
  --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" \
  --dbname=postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
PGPASSWORD="${PG_PASSWORD}" psql \
  --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" \
  --dbname=postgres -c "CREATE DATABASE \"${DB_NAME}\";"

# 恢复数据
PGPASSWORD="${PG_PASSWORD}" pg_restore \
  --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" \
  --dbname="${DB_NAME}" --verbose --clean --if-exists \
  "${BACKUP_FILE}"

# 重新生成 Prisma Client（schema 可能已变化）
echo "🔄 重新生成 Prisma Client..."
cd "$(dirname "$0")/../../apps/web" && npx prisma generate 2>/dev/null || echo "⚠️ prisma generate 跳过（需手动执行）"

echo "✅ 恢复完成: ${DB_NAME}"

# 验证表数量
TABLE_COUNT=$(PGPASSWORD="${PG_PASSWORD}" psql \
  --host="${PG_HOST}" --port="${PG_PORT}" --username="${PG_USER}" \
  --dbname="${DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "📊 表数量: ${TABLE_COUNT}"
