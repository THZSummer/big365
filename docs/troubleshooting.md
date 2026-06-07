# 故障排查指南

本文档覆盖 big365 使用过程中常见的故障场景和解决方案。

---

## 端口冲突

### 症状

启动 Compose 时报错 `port is already allocated`，或启动后无法访问服务。

### 排查与解决

big365 默认占用以下端口：

| 服务 | 默认端口 |
|---|---|
| MySQL | 3306 |
| Backend API | 8080 |
| Frontend | 3000 |

修改 `.env` 文件中的端口配置：

```ini
# 修改为未被占用的端口
BACKEND_PORT=8081
FRONTEND_PORT=3001
```

MySQL 端口修改需要同时修改 `compose.yml` 中 `ports` 配置（或通过环境变量覆盖）：

```ini
# .env 中添加
MYSQL_PORT=3307
```

修改后重新启动：

```bash
docker-compose -f compose.yml down
docker-compose -f compose.yml up -d
```

---

## MySQL 连接失败

### 症状

后端日志中出现 `CommunicationsException: Communications link failure` 或健康检查返回 `database: "DOWN"`。

### 排查步骤

**1. 检查 MySQL 容器状态**

```bash
docker-compose -f compose.yml ps mysql
# 或
podman-compose -f compose.yml ps mysql
```

确保 MySQL 容器的状态为 `healthy`。

**2. 检查 MySQL 健康检查**

```bash
docker-compose -f compose.yml exec mysql mysqladmin ping -h localhost -u root -pbig365123
```

**3. 检查后端到 MySQL 的网络连通性**

```bash
# 进入后端容器检查
docker-compose -f compose.yml exec backend sh -c "wget -q -O- http://localhost:8080/api/health"
```

**4. 确认 .env 配置正确**

```ini
MYSQL_ROOT_PASSWORD=big365123
MYSQL_DATABASE=big365
```

确保 `MYSQL_ROOT_PASSWORD` 与你创建 `.env` 时的值一致。

### 解决方案

如果 MySQL 容器启动失败：

```bash
# 清理旧数据并重新启动
docker-compose -f compose.yml down -v
docker-compose -f compose.yml up -d
```

> ⚠️ `down -v` 会删除数据库数据卷，仅用于首次初始化或调试场景。

---

## Compose 启动慢

### 症状

首次执行 `docker-compose up -d` 耗时很长（5 分钟以上）。

### 原因

首次启动需要从 Docker Hub 拉取以下镜像：
- `mysql:8.0`（约 500 MB）
- `eclipse-temurin:21-jre`（约 200 MB，用于后端构建）
- `node:20-alpine`（约 120 MB，用于前端构建）

### 解决方案

**使用国内镜像源：**

1. Docker 用户编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com"
  ]
}
```

2. 重启 Docker 服务：

```bash
sudo systemctl restart docker
```

3. Podman 用户编辑 `/etc/containers/registries.conf`，添加：

```toml
[[registry]]
prefix = "docker.io"
location = "docker.m.daocloud.io"
```

---

## 百万级生成耗时长

### 症状

选择 `large` 规模的演示数据生成，任务长时间停留在 `generating` 或 `writing` 状态。

### 说明

| 规模 | 记录数 | 维度数 | 级联行数 | 预计耗时 |
|---|---|---|---|---|
| small | ~500 | 3 | ~4,000 | <10 秒 |
| medium | ~10,000 | 3 | ~80,000 | <30 秒 |
| large | ~100,000 | 3 | ~800,000 | 1~5 分钟 |

`large` 规模在上例中（3 维）会生成 100,000 条数据，每条数据触发 `2^3=8` 行级联更新，总计约 **80 万次** SQL UPDATE 操作。

### 排查

```bash
# 查询任务状态
curl http://localhost:8080/api/{biz}/demo-data/jobs/{jobId}
```

检查 `status` 和 `progress` 字段：
- 卡在 `generating`（0%-40%）：正在内存中生成随机数据，多等一会即可
- 卡在 `writing`（40%-90%）：正在批量写入数据库，写入级联行数较多
- `status=failed`：查看 `errorMessage` 字段定位具体原因

### 建议

- **先用 `small` 验证功能**：确保所有接口正常工作
- **再用 `medium` 观察性能**：验证批量写入和进度反馈
- **最后用 `large` 测试**：此时如有性能问题可以针对性分析

---

## 前端无法访问后端

### 症状

浏览器打开 `http://localhost:3000`，页面显示"后端不可用"或 API 请求全部失败。

### 排查

**1. 检查后端健康状态**

```bash
curl http://localhost:8080/api/health
```

如果返回 503 或连接拒绝，说明后端尚未就绪。

**2. Compose 模式：检查服务依赖**

```bash
docker-compose -f compose.yml ps
```

三个服务都必须为 `healthy` 状态。启动顺序为：

```
mysql → backend → frontend
```

后端需要等待 MySQL 健康后才启动，前端需要等待后端健康后才启动。

**3. 本地开发模式：检查 Vite 代理配置**

`big365-web/vite.config.ts` 中的代理配置：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

确保：
- 后端确实运行在 `http://localhost:8080`
- 没有其他服务占用 8080 端口

### 解决方案

```bash
# Compose 模式：完全重启
docker-compose -f compose.yml down
docker-compose -f compose.yml up -d

# 等待服务就绪（查看日志）
docker-compose -f compose.yml logs -f backend
```

---

## 数据库权限问题

### 症状

后端日志中出现 `Access denied for user 'root'@'...'`。

### 排查

```bash
# 确认 .env 中的密码
grep MYSQL_ROOT_PASSWORD .env
```

### 解决方案

1. 确保 `.env` 和 `compose.yml` 中的 `MYSQL_ROOT_PASSWORD` 一致
2. 如果是后续修改了密码：

```bash
# 清理数据卷并重启
docker-compose -f compose.yml down -v
docker-compose -f compose.yml up -d
```

---

## Java 版本不匹配

### 症状

本地运行 `mvn spring-boot:run` 时报错：

```
Fatal error compiling: error: release version 21 not supported
```

### 排查

```bash
java -version
# 确保输出包含 "21.x"
```

```bash
mvn -version
# 确保使用 Java 21
```

### 解决方案

big365 要求 **JDK 21**。如果系统安装了多个 Java 版本：

```bash
# 设置 JAVA_HOME
export JAVA_HOME=/path/to/jdk-21

# 或在 Maven 命令中指定
JAVA_HOME=/path/to/jdk-21 mvn spring-boot:run
```

推荐使用 [SDKMAN](https://sdkman.io) 管理 Java 版本：

```bash
sdk install java 21.0.0-tem
sdk use java 21.0.0-tem
```

---

## 前端构建失败

### 症状

`npm run build` 报 TypeScript 类型错误或依赖缺失。

### 排查

```bash
# 确认 Node.js 版本
node -v
# 需要 >= 20

# 清理并重装依赖
cd big365-web
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 常见问题

**1. `npm install` 慢**

使用国内镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

**2. TypeScript 类型错误**

```bash
cd big365-web
npx tsc --noEmit
```

查看具体错误信息并修复。

---

## 快速诊断命令合集

```bash
# 一键检查所有服务状态
echo "=== MySQL ===" && docker-compose -f compose.yml ps mysql
echo "=== Backend ===" && curl -s http://localhost:8080/api/health | head -c 200
echo "=== Frontend ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# 查看后端日志
docker-compose -f compose.yml logs --tail=50 backend

# 查看 MySQL 日志
docker-compose -f compose.yml logs --tail=20 mysql

# 进入容器调试
docker-compose -f compose.yml exec backend bash
```
