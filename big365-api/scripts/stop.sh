#!/bin/bash
# big365-api 停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/.pid"

echo "[big365-api] Stopping..."

# 收集 PID（排除自身和父进程）
MYSELF=$$
PIDS=""

# 从 PID 文件读取
if [ -f "$PID_FILE" ]; then
    PIDS="$PIDS $(cat "$PID_FILE")"
fi

# 找 Java/mvn 进程（精确匹配，排除 grep 自身和当前脚本）
PIDS="$PIDS $(pgrep -f 'org\.big365\.api\.Big365ApiApplication' 2>/dev/null || true)"
PIDS="$PIDS $(pgrep -f 'big365-api.*spring-boot:run' 2>/dev/null || true)"

# 去重 + 排除自身
PIDS=$(echo "$PIDS" | tr ' ' '\n' | sort -u | grep -v "^$" | grep -v "^${MYSELF}$" | tr '\n' ' ')

if [ -z "$PIDS" ] || [ "$PIDS" = " " ]; then
    echo "[big365-api] Not running"
    rm -f "$PID_FILE"
    exit 0
fi

echo "[big365-api] Found PID(s):$PIDS"

# 先优雅停止
for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
done

# 等 3 秒
sleep 3

# 还未退出的强制 kill -9
STILL=""
for pid in $PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
        STILL="$STILL $pid"
    fi
done

if [ -n "$STILL" ]; then
    echo "[big365-api] Force killing:$STILL"
    for pid in $STILL; do
        kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
fi

rm -f "$PID_FILE"
echo "[big365-api] Stopped"
