#!/bin/sh
# Aidean 定时脚本调度器 sidecar entrypoint（R-70）
# 每分钟调用 admin API run-due-scripts endpoint，触发到期 ScheduledScript 执行。
# 依赖 ADMIN_API_TOKEN 环境变量进行 admin 鉴权。

set -euo pipefail

WEB_URL="${WEB_URL:-http://web:3000}"
ADMIN_TOKEN="${ADMIN_API_TOKEN:-}"

# 安装 curl（alpine 默认无）
if ! command -v curl >/dev/null 2>&1; then
  apk add --no-cache curl
fi

# 写入调度脚本
cat > /usr/local/bin/run-scheduled.sh << 'SCRIPT'
#!/bin/sh
set -euo pipefail

WEB_URL="${WEB_URL:-http://web:3000}"
ADMIN_TOKEN="${ADMIN_API_TOKEN:-}"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "${WEB_URL}/api/v1/admin/scripts/run-due" \
  --max-time 55 \
  2>/dev/null || echo "000")

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
if [ "${RESPONSE}" = "200" ]; then
  echo "[${TIMESTAMP}] ✅ run-due triggered (HTTP ${RESPONSE})"
else
  echo "[${TIMESTAMP}] ⚠️ run-due failed (HTTP ${RESPONSE})"
fi
SCRIPT

chmod +x /usr/local/bin/run-scheduled.sh

# 写入 crontab（每分钟执行）
echo "* * * * * /usr/local/bin/run-scheduled.sh >> /var/log/scheduler.log 2>&1" > /etc/crontabs/root

echo "========================================"
echo "  Aidean Script Scheduler Sidecar"
echo "========================================"
echo "  Schedule: Every minute"
echo "  Target: ${WEB_URL}/api/v1/admin/scripts/run-due"
echo "  Auth: Bearer token (ADMIN_API_TOKEN)"
echo "========================================"
echo "  Starting cron daemon..."

# 前台运行 cron
exec crond -f -l 2
