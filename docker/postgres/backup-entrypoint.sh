#!/bin/sh
# Aidean PostgreSQL 每日备份 sidecar entrypoint（R-60）
# 在容器内安装 cron，写入每日 02:00 执行 pg_dump 的 crontab
# 然后以前台模式运行 cron（保持容器不退出）

set -euo pipefail

# 安装 cron（alpine 镜像默认无）
if ! command -v crond >/dev/null 2>&1; then
  apk add --no-cache curl
fi

# 备份目标目录
BACKUP_DIR="/backups"
mkdir -p "${BACKUP_DIR}"

# 写入备份脚本
cat > /usr/local/bin/do-backup.sh << 'BACKUP_SCRIPT'
#!/bin/sh
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/aidean_${TIMESTAMP}.dump"

echo "[$(date)] 🔄 Starting PostgreSQL backup → ${BACKUP_FILE}"

pg_dump \
  --host="${PG_HOST:-postgres-primary}" \
  --port="${PG_PORT:-5432}" \
  --username="${PG_USER:-root}" \
  --dbname="${PG_DB:-aidean}" \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

echo "[$(date)] ✅ Backup completed: ${BACKUP_FILE}"

# 清理 30 天前的备份
find "${BACKUP_DIR}" -name "aidean_*.dump" -mtime +30 -delete

echo "[$(date)] 🧹 Old backups cleaned (retain 30 days)"
echo "[$(date)] 📋 Current backups:"
ls -lh "${BACKUP_DIR}"/aidean_*.dump 2>/dev/null | tail -5
BACKUP_SCRIPT

chmod +x /usr/local/bin/do-backup.sh

# 写入 crontab（每日 02:00 执行备份）
echo "0 2 * * * /usr/local/bin/do-backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# 启动时立即执行一次备份（可选，注释掉则仅按 cron 执行）
# /usr/local/bin/do-backup.sh

echo "========================================"
echo "  Aidean PostgreSQL Backup Sidecar"
echo "========================================"
echo "  Schedule: Daily 02:00 (Asia/Shanghai)"
echo "  Retention: 30 days"
echo "  Target: ${BACKUP_DIR}"
echo "========================================"
echo "  Starting cron daemon..."

# 前台运行 cron（crond -f 保持容器不退出）
exec crond -f -l 2
