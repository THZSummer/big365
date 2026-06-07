# 快速开始

本文档帮助你以最快的方式启动 big365 多维数据服务。

## 前置要求

| 工具 | 版本要求 | 说明 |
|---|---|---|
| Podman 或 Docker | 最新稳定版 | Compose 一键启动（推荐） |
| Podman Compose | 最新稳定版 | 与 Podman 配套 |
| Docker Compose | v2+ | 与 Docker 配套 |
| Java | 21+（可选） | 脚本启动后端时需要 |
| Maven | 3.8+（可选） | 脚本启动后端时需要 |
| Node.js | 20+（可选） | 脚本启动前端时需要 |

---

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | **13306** | 数据库 |
| Backend | **18080** | REST API + Swagger |
| Frontend | **13000** | 演示前端 |

---

## 方法一：Compose 一键启动（推荐）

### 启动全部服务

```bash
# Podman
podman-compose -f compose.yml -f compose.podman.yml up -d

# Docker
docker-compose -f compose.yml up -d
```

### 单独启动某个服务

```bash
# 仅 MySQL
podman-compose -f compose.yml -f compose.podman.yml up -d mysql

# 仅后端（自动等待 MySQL healthy 后启动）
podman-compose -f compose.yml -f compose.podman.yml up -d backend

# 仅前端（自动等待后端 healthy 后启动）
podman-compose -f compose.yml -f compose.podman.yml up -d frontend
```

### 停止服务

```bash
# 停止全部
podman-compose -f compose.yml -f compose.podman.yml down

# 停止某个服务
podman-compose -f compose.yml -f compose.podman.yml stop frontend
podman-compose -f compose.yml -f compose.podman.yml stop backend
podman-compose -f compose.yml -f compose.podman.yml stop mysql
```

### 验证

```bash
curl http://localhost:18080/api/health     # 后端健康检查
curl http://localhost:18080/swagger-ui.html # API 文档
# 浏览器打开 http://localhost:13000          # 前端页面
```

---

## 方法二：脚本启动（本地开发）

### 后端

```bash
cd big365-api

# 后台启动（自动编译 + 健康检查轮询）
bash scripts/start.sh

# 停止
bash scripts/stop.sh
```

### 前端

```bash
cd big365-web

# 后台启动（自动安装依赖 + 健康检查轮询）
bash scripts/start.sh

# 停止
bash scripts/stop.sh
```

### MySQL（Compose 仅启动数据库）

```bash
podman-compose -f compose.yml -f compose.podman.yml up -d mysql

# 停止
podman-compose -f compose.yml -f compose.podman.yml stop mysql
```

---

## 下一步

- 阅读 [概念模型文档](concepts.md) 了解 big365 的核心设计思想
- 跟随 [日志分析完整教程](log-analysis-tutorial.md) 完成端到端体验
- 查看 [API 文档](api.md) 了解全部接口
- 遇到问题请查阅 [故障排查指南](troubleshooting.md)
