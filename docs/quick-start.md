# 快速开始

本文档帮助你以最快的方式启动 big365 多维数据服务。

## 前置要求

| 工具 | 版本要求 | 说明 |
|---|---|---|
| Docker 或 Podman | 最新稳定版 | Compose 一键启动（推荐） |
| Docker Compose | v2+ | 与 Docker 配套 |
| Podman Compose | 最新稳定版 | Podman 替代方案 |
| Java | 21（可选） | 仅在本地开发时需要 |
| Maven | 3.8+（可选） | 仅在本地开发时需要 |
| Node.js | 20+（可选） | 仅在本地开发时需要 |

---

## 方法一：Compose 一键启动（推荐）

这是最简单的方式，无需安装 Java、Maven、Node.js。

### 1. 复制环境变量文件

```bash
cp .env.example .env
```

`.env` 文件包含以下默认配置，你可以根据需要修改：

```ini
MYSQL_ROOT_PASSWORD=big365123
MYSQL_DATABASE=big365
BACKEND_PORT=8080
FRONTEND_PORT=3000
```

### 2. 启动全部服务

**Docker Compose：**

```bash
docker-compose -f compose.yml up -d
```

**Podman Compose：**

```bash
podman-compose -f compose.yml up -d
```

启动过程包含三个服务：

| 服务 | 端口 | 说明 |
|---|---|---|
| MySQL 8.0 | 3306 | 数据库，首次启动需要 30s 左右初始化 |
| Backend (Spring Boot) | 8080 | REST API 服务，依赖 MySQL 健康后就绪 |
| Frontend (React + Vite) | 3000 | 演示前端，依赖 Backend 健康后就绪 |

**首次启动** 需要下载镜像和构建，可能需要 3-5 分钟。后续启动仅需数秒。

### 3. 验证服务

```bash
# 健康检查
curl http://localhost:8080/api/health

# 预期响应
# {
#   "success": true,
#   "code": "OK",
#   "data": {
#     "status": "UP",
#     "service": "big365-api",
#     "database": "UP"
#   }
# }
```

```bash
# 前端访问（浏览器打开）
# http://localhost:3000
```

---

## 方法二：本地开发启动

适用于开发者需要本地调试的场景。

### 1. 启动 MySQL

确保本地有 MySQL 8.0 实例运行。可以使用 Compose 仅启动 MySQL：

```bash
docker-compose -f compose.yml up -d mysql
```

或使用本地已安装的 MySQL。配置 `.env` 中的连接信息。

### 2. 启动后端

```bash
cd big365-api
mvn spring-boot:run
```

后端默认启动在 `http://localhost:8080`。

### 3. 启动前端

```bash
cd big365-web
npm install
npm run dev
```

前端默认启动在 `http://localhost:3000`，Vite 代理会自动将 `/api` 请求转发到后端。

---

## 下一步

- 阅读 [概念模型文档](concepts.md) 了解 big365 的核心设计思想
- 跟随 [日志分析完整教程](log-analysis-tutorial.md) 完成端到端体验
- 查看 [API 文档](api.md) 了解全部接口
- 遇到问题请查阅 [故障排查指南](troubleshooting.md)
