#!/bin/bash
# big365-web 一键停止脚本
# 用法: ./scripts/stop.sh

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="big365-web"
PID_FILE="$APP_DIR/scripts/.app.pid"

echo "========================================="
echo "  $APP_NAME 停止脚本"
echo "========================================="

# 1. 通过 PID 文件停止应用
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[1/2] 停止应用进程 (PID: $OLD_PID)..."
        kill "$OLD_PID" 2>/dev/null
        sleep 2
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo "  强制终止..."
            kill -9 "$OLD_PID" 2>/dev/null
        fi
        echo "  ✅ 应用已停止"
    else
        echo "  ℹ️  进程 ($OLD_PID) 已不存在"
    fi
    rm -f "$PID_FILE"
else
    echo "[1/2] 查找应用进程..."
    APP_PID=$(ps aux | grep "spring-boot:run" | grep -v grep | awk '{print $2}')
    if [ -n "$APP_PID" ]; then
        echo "  停止应用进程 (PID: $APP_PID)..."
        kill $APP_PID 2>/dev/null
        echo "  ✅ 应用已停止"
    else
        echo "  ℹ️  未找到运行中的应用"
    fi
fi

# 2. 确认端口已释放
echo "[2/2] 检查端口 8081..."
sleep 2
if ss -tlnp 2>/dev/null | grep -q 8081; then
    echo "  ⚠️  端口 8081 仍被占用"
else
    echo "  ✅ 端口 8081 已释放"
fi

echo ""
echo "========================================="
echo "  $APP_NAME 已停止"
echo "  MySQL 容器 (big365-mysql) 仍在运行"
echo "  如需停止 MySQL: podman stop big365-mysql"
echo "========================================="
