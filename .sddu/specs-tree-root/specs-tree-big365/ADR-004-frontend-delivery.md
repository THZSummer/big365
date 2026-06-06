# ADR-004: big365-web 作为 React + Vite 前端，Node.js 直接运行

## 状态
ACCEPTED

## 背景

big365 需要提供 React 演示前端。Spec 开放问题 OQ-006 要求决定前端交付方式。

候选方案：

1. Node.js dev server（Vite 内置）。
2. 构建静态资源后由 Nginx 容器托管。
3. 构建静态资源后由 Spring Boot 后端托管。

## 决策

采用 React + Vite + TypeScript 独立前端工程 `big365-web`。**直接使用 Node.js 运行（Vite dev server），不引入 Nginx**。

理由：

- MVP 阶段不需要生产级静态文件托管，Vite dev server 足够。
- Vite 内置 proxy 可处理 `/api` → 后端的代理，无需 Nginx。
- 减少一个中间层，降低复杂度。

## 后果

正面影响：

- 前后端工程边界清晰。
- Compose 启动后用户可直接访问前端入口。
- 无需维护 Nginx 配置。
- Vite 内置 HMR，开发体验好。

负面影响：

- Vite dev server 不适用于高并发生产环境。
- 后续规模化需要补充 Nginx 或 CDN。

缓解措施：

- MVP 定位为本地试用和演示，Vite 性能完全满足。
- 后续版本再引入 Nginx 作为可选优化。
