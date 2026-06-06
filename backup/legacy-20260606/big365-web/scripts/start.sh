#!/bin/bash
# big365-web 一键启动脚本
# 用法: ./scripts/start.sh

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="big365-web"
PID_FILE="$APP_DIR/scripts/.app.pid"
MYSQL_CONTAINER="big365-mysql"

echo "========================================="
echo "  $APP_NAME 启动脚本"
echo "========================================="

# 1. 检查并启动 MySQL (Podman)
echo "[1/3] 检查 MySQL 容器..."
MYSQL_RUNNING=$(podman ps --filter name=$MYSQL_CONTAINER --filter status=running -q 2>/dev/null)
if [ -n "$MYSQL_RUNNING" ]; then
    echo "  ✅ MySQL 容器 ($MYSQL_CONTAINER) 已在运行"
else
    MYSQL_EXISTS=$(podman ps -a --filter name=$MYSQL_CONTAINER -q 2>/dev/null)
    if [ -n "$MYSQL_EXISTS" ]; then
        echo "  🔄 MySQL 容器已存在，正在启动..."
        podman start $MYSQL_CONTAINER
    else
        echo "  🐳 正在创建并启动 MySQL 容器..."
        podman run -d \
            --name $MYSQL_CONTAINER \
            -e MYSQL_ROOT_PASSWORD=root123 \
            -e MYSQL_DATABASE=bigdata365 \
            -e MYSQL_USER=bigdata365 \
            -e MYSQL_PASSWORD=bigdata365 \
            -p 3306:3306 \
            mysql:8.0
    fi
    # 等待 MySQL 就绪
    echo "  ⏳ 等待 MySQL 就绪..."
    for i in $(seq 1 30); do
        if podman exec $MYSQL_CONTAINER mysqladmin ping -ubigdata365 -pbigdata365 --silent 2>/dev/null; then
            echo "  ✅ MySQL 就绪"
            break
        fi
        sleep 2
    done
fi

# 2. 编译项目
echo "[2/3] 编译项目..."
cd "$APP_DIR"
./mvnw clean package -DskipTests -q
if [ $? -ne 0 ]; then
    echo "  ❌ 编译失败，请检查错误"
    exit 1
fi
echo "  ✅ 编译成功"

# 3. 启动应用（后台运行）
echo "[3/3] 启动 $APP_NAME ..."
cd "$APP_DIR"
nohup ./mvnw spring-boot:run -q > "$APP_DIR/scripts/app.log" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"
echo "  ✅ 应用已启动 (PID: $APP_PID)"

# 等待应用就绪
echo "  ⏳ 等待应用就绪..."
for i in $(seq 1 30); do
    sleep 2
    if curl -s http://localhost:8081/big365/ > /dev/null 2>&1; then
        echo "  ✅ 应用已就绪！"
        echo ""
        echo "========================================="
        echo "  访问地址: http://localhost:8081/big365/"
        echo "  监控面板: http://localhost:8081/big365/druid/"
        echo "  日志文件: scripts/app.log"
        echo "  停止命令: ./scripts/stop.sh"
        echo "========================================="
        exit 0
    fi
done

echo "  ⚠️ 应用启动超时，请查看日志: scripts/app.log"
