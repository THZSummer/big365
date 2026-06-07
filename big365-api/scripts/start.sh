#!/bin/bash
# big365-api 启动脚本
# 用法:
#   ./start.sh              mvn spring-boot:run 启动（开发，始终最新代码）
#   ./start.sh --jar        先 mvn package 再 java -jar（生产）
#   ./start.sh --foreground 前台运行

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/.pid"
LOG_FILE="$PROJECT_DIR/logs/app.log"

HEALTH_URL="${HEALTH_URL:-http://localhost:18080/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"
USE_JAR=false
FOREGROUND=false

for arg in "$@"; do
    case $arg in
        --jar)            USE_JAR=true ;;
        --foreground|-f)  FOREGROUND=true ;;
        *) echo "Usage: $0 [--jar] [--foreground]"; exit 1 ;;
    esac
done

cd "$PROJECT_DIR"

# 已运行则跳过
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "[big365-api] Already running (PID $PID)"
        exit 0
    fi
    rm -f "$PID_FILE"
fi

mkdir -p "$PROJECT_DIR/logs"

# 前台模式
if $FOREGROUND; then
    echo "[big365-api] Starting in foreground..."
    exec mvn spring-boot:run
fi

# 后台启动
echo "[big365-api] Starting in background..."

if $USE_JAR; then
    if [ ! -f "target/big365-api.jar" ]; then
        echo "[big365-api] Building JAR..."
        mvn package -DskipTests -q
    fi
    nohup java -jar target/big365-api.jar > "$LOG_FILE" 2>&1 &
else
    nohup mvn spring-boot:run > "$LOG_FILE" 2>&1 &
fi

PID=$!
echo "$PID" > "$PID_FILE"
echo "[big365-api] Started (PID $PID), waiting..."

# 健康检查
elapsed=0
attempt=0
while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo ""
        echo "[big365-api] ❌ Process died during startup. Last 10 log lines:"
        tail -10 "$LOG_FILE" 2>/dev/null || echo "(no log)"
        rm -f "$PID_FILE"
        exit 1
    fi
    
    attempt=$((attempt + 1))
    HTTP_CODE=$(curl -s -o /tmp/big365-health.json -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || true)
    
    echo "── 第 ${attempt} 次 ─────────────────────────────"
    echo "  curl ${HEALTH_URL}"
    echo "  → HTTP ${HTTP_CODE}"
    if [ -f /tmp/big365-health.json ]; then
        echo "  $(python3 -m json.tool /tmp/big365-health.json 2>/dev/null | sed 's/^/  /')"
        rm -f /tmp/big365-health.json
    fi
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[big365-api] ✅ Ready (PID $PID, ${elapsed}s, ${attempt} attempts)"
        exit 0
    elif [ "$HTTP_CODE" = "503" ]; then
        echo "[big365-api] ⚠️  Running, database unavailable (PID $PID, ${elapsed}s)"
        exit 0
    fi

    sleep 2
    elapsed=$((elapsed + 2))
done
echo ""
echo "[big365-api] ❌ Health check timeout (${HEALTH_TIMEOUT}s)"
tail -10 "$LOG_FILE" 2>/dev/null || echo "(no log)"
kill "$PID" 2>/dev/null
rm -f "$PID_FILE"
exit 1
