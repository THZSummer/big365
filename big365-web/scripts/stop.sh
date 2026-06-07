#!/bin/bash
# big365-web 停止脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/.pid"

echo "[big365-web] Stopping..."

PIDS=""
if [ -f "$PID_FILE" ]; then
    PIDS="$PIDS $(cat "$PID_FILE")"
fi
PIDS="$PIDS $(pgrep -f "vite" 2>/dev/null || true)"

PIDS=$(echo "$PIDS" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')

if [ -z "$PIDS" ] || [ "$PIDS" = " " ]; then
    echo "[big365-web] Not running"
    rm -f "$PID_FILE"
    exit 0
fi

echo "[big365-web] Found PID(s):$PIDS"

for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
done

sleep 2

STILL_ALIVE=""
for pid in $PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
        STILL_ALIVE="$STILL_ALIVE $pid"
    fi
done

if [ -n "$STILL_ALIVE" ]; then
    echo "[big365-web] Force killing$STILL_ALIVE..."
    for pid in $STILL_ALIVE; do
        kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
fi

rm -f "$PID_FILE"
echo "[big365-web] Stopped"
