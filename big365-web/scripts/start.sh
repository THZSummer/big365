#!/bin/bash
# big365-web 启动脚本
# 用法: ./start.sh [--foreground]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/.pid"
LOG_FILE="$PROJECT_DIR/logs/app.log"

HEALTH_URL="${HEALTH_URL:-http://localhost:13000}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"
FOREGROUND=false

for arg in "$@"; do
    case $arg in
        --foreground|-f) FOREGROUND=true ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

cd "$PROJECT_DIR"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "[big365-web] Already running (PID $PID)"
        exit 0
    else
        echo "[big365-web] Stale PID file found, removing..."
        rm -f "$PID_FILE"
    fi
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "[big365-web] Installing dependencies..."
    npm install
fi

mkdir -p "$PROJECT_DIR/logs"

# 启动
if $FOREGROUND; then
    echo "[big365-web] Starting in foreground..."
    npm run dev
else
    echo "[big365-web] Starting in background..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    PID=$!
    echo "$PID" > "$PID_FILE"
    echo "[big365-web] Started (PID $PID), waiting for health check..."

    elapsed=0
    attempt=0
    while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo ""
            echo "[big365-web] ❌ Process died during startup. Last 10 log lines:"
            tail -10 "$LOG_FILE" 2>/dev/null || echo "(no log)"
            rm -f "$PID_FILE"
            exit 1
        fi
        
        attempt=$((attempt + 1))
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || true)
        
        echo "── 第 ${attempt} 次 ─────────────────────────────"
        echo "  curl ${HEALTH_URL}"
        echo "  → HTTP ${HTTP_CODE}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "[big365-web] ✅ Ready (PID $PID, ${elapsed}s, ${attempt} attempts)"
            exit 0
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo ""
    echo "[big365-web] ❌ Health check timeout (${HEALTH_TIMEOUT}s)"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "(no log)"
    kill "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    exit 1
fi
