# ADR-004: big365-web 作为 React 前端并由 Compose 托管交付

## 状态
ACCEPTED

## 背景

big365 需要提供 React 演示前端，让用户打开浏览器即可看到默认演示效果，并完成数据生成、维度 CRUD、业务数据 CRUD、组合查询和文档入口跳转。

Spec 开放问题 OQ-006 要求决定前端交付方式：独立前端服务、构建后由后端托管，还是 Nginx 托管。

历史仓库中原 `big365-web` 是 Java Spring Boot 后端工程，会与新的前端工程命名冲突。ADR-001 已决定将历史 `big365-web` 迁移到 `backup/legacy-20260606/big365-web/`，因此根目录 `big365-web/` 可用于新的 React 演示前端。

候选方案：

1. 开发服务器方式运行 React。
2. 构建静态资源后由 Spring Boot 后端托管。
3. 构建静态资源后由独立 Nginx 容器托管，并通过 Compose 与后端联动。

## 决策

采用 React + Vite + TypeScript 独立前端工程，工程名为 `big365-web`。构建产物由独立 Nginx 容器托管，Compose 中作为 `frontend` 服务运行。

默认结构：

```text
big365-web/
├── package.json
├── vite.config.ts
├── Dockerfile
├── nginx.conf
└── src/
```

Compose 中包含：

- `mysql`
- `backend`：由 `big365-api` 构建
- `frontend`：由 `big365-web` 构建

前端通过环境配置或 Nginx 代理访问后端 `/api`。

## 后果

正面影响：

- 前后端工程边界清晰。
- 根目录 `big365-web` 名称直观表达 Web 前端，不再被历史 Java 后端占用。
- Compose 启动后用户可直接访问前端入口。
- Nginx 托管静态文件更贴近真实交付方式，比开发服务器更稳定。
- 不增加 Spring Boot 静态资源托管复杂度。

负面影响：

- Compose 需要多一个 `frontend` 服务。
- 需要处理前端访问后端的 base URL、CORS 或反向代理配置。
- 构建链路同时涉及 Maven 和 npm。

缓解措施：

- Nginx 配置 `/api` 反向代理到后端服务，减少浏览器 CORS 问题。
- 文档提供一键 Compose 命令和本地开发命令。
- 前端 API client 集中配置 base URL，避免页面散落硬编码。
