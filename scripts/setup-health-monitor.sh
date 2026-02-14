#!/bin/bash
# ============================================
# CANMP Health Monitor Setup
# ============================================
# Installs a cron job that checks /api/health every 5 minutes.
# On failure it logs to /var/log/canmp-health.log and optionally
# restarts the Docker containers.
#
# Usage (run on the EC2 instance):
#   sudo bash scripts/setup-health-monitor.sh

set -e

HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/var/log/canmp-health.log"
SCRIPT_PATH="/opt/canmp/scripts/check-health.sh"

# Create the health check script
cat > "$SCRIPT_PATH" << 'HEALTHSCRIPT'
#!/bin/bash
HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/var/log/canmp-health.log"
MAX_LOG_SIZE=10485760  # 10MB

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
fi

RESPONSE=$(curl -sf -w "%{http_code}" -o /tmp/canmp-health-response.json "$HEALTH_URL" 2>/dev/null)

if [ "$RESPONSE" = "200" ]; then
    # Healthy — only log once per hour to avoid noise
    MINUTE=$(date +%M)
    if [ "$MINUTE" = "00" ]; then
        echo "$(date -Iseconds) OK - healthy" >> "$LOG_FILE"
    fi
else
    echo "$(date -Iseconds) FAIL - HTTP $RESPONSE" >> "$LOG_FILE"

    # If container is not running, try to restart
    RUNNING=$(docker inspect --format='{{.State.Running}}' canmp-app 2>/dev/null || echo "false")
    if [ "$RUNNING" != "true" ]; then
        echo "$(date -Iseconds) RESTART - container not running, restarting..." >> "$LOG_FILE"
        cd /opt/canmp && docker-compose up -d 2>> "$LOG_FILE"
    fi
fi
HEALTHSCRIPT

chmod +x "$SCRIPT_PATH"

# Install cron job (every 5 minutes)
CRON_ENTRY="*/5 * * * * $SCRIPT_PATH"

# Remove any existing canmp health cron entries, then add the new one
(crontab -l 2>/dev/null | grep -v "check-health.sh" ; echo "$CRON_ENTRY") | crontab -

echo "Health monitor installed:"
echo "  Script: $SCRIPT_PATH"
echo "  Log:    $LOG_FILE"
echo "  Cron:   every 5 minutes"
echo ""
echo "View logs: tail -f $LOG_FILE"
echo "Remove:    crontab -e  (delete the check-health.sh line)"
