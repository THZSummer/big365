# Page Plan: big365 React 演示前端设计

> Feature: `big365`  
> 关联技术计划: [`plan.md`](plan.md)

---

## 1. 技术栈

React + Vite + TypeScript，独立工程 `big365-web/`。构建产物由 Nginx 容器托管，Compose 中作为 `frontend` 服务运行。

对应 ADR：[ADR-004-frontend-delivery.md](ADR-004-frontend-delivery.md)。

## 2. 页面结构

| 页面 | 路由 | 职责 |
|---|---|---|
| 首页 | `/` | 默认演示效果、关键指标、示例查询结果 |
| 业务管理 | `/biz` | 注册新业务、查看已注册业务列表 |
| 维度管理 | `/biz/{biz}/dimensions` | 维度列表、创建、编辑、禁用 |
| 数据空间 | `/biz/{biz}/space` | 坐标查询、写入向导 |
| 演示数据 | `/biz/{biz}/demo-data` | 参数表单、创建任务、轮询状态、摘要展示 |
| 文档入口 | `/docs` | 链接快速开始、概念模型、API 文档、教程 |

## 3. 页面说明

### 3.1 首页（`/`）

- 默认展示 big365 的核心概念（多维坐标空间、0=ALL 哨兵、级联更新）。
- 无需选择业务即可看到演示效果。

### 3.2 业务管理（`/biz`）

- 注册新业务：填写业务名称、维度定义、日期范围 → 提交 → 自动创建全套业务表。
- 已注册业务列表：展示 biz_name、biz_label、维度数、状态、创建时间。
- 点击某个业务进入其维度/空间/演示数据页面。

### 3.3 维度管理（`/biz/{biz}/dimensions`）

- 列表展示当前业务的所有维度（column_name、display_name、取值范围）。
- 支持新增/编辑/禁用维度。

### 3.4 数据空间（`/biz/{biz}/space`）

- **写入向导**：选择坐标值（每个维度下拉选择 0=ALL 或 1..N），输入日期和指标值，提交写入。
- **查询面板**：输入坐标值和日期，点击查询，显示结果值。
- **多维下钻演示**：从一个 Grand Total 开始，逐维修改为非 0，观察各级聚合变化。

### 3.5 演示数据（`/biz/{biz}/demo-data`）

- 参数表单：选择规模（small/medium/large）、指定日期范围。
- 创建任务后轮询状态，展示阶段进度（初始化→生成→写入→统计→完成）。
- 失败时展示失败原因。

### 3.6 文档入口（`/docs`）

- 链接到 `docs/quick-start.md`、`docs/concepts.md`、Swagger UI、`docs/log-analysis-tutorial.md`。

## 4. 工程结构

```text
big365-web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── Dockerfile
├── nginx.conf
├── README.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts              -- axios 实例，baseUrl 从环境变量读取
│   │   └── types.ts               -- 请求/响应 TypeScript 类型
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── BizPage.tsx            -- 业务注册与列表
│   │   ├── DimensionsPage.tsx
│   │   ├── SpacePage.tsx          -- 写入 + 查询
│   │   ├── DemoDataPage.tsx
│   │   └── DocsPage.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── BizSelector.tsx        -- 业务选择器
│   │   ├── CoordinateInput.tsx    -- 坐标输入组件
│   │   ├── ErrorBanner.tsx
│   │   └── Loading.tsx
│   └── styles/
│       └── global.css
└── tests/
    └── App.test.tsx
```

## 5. API Client 约定

```typescript
// src/api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

// 统一错误拦截
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message;
    console.error('[API Error]', msg);
    return Promise.reject(err);
  }
);

export default client;
```

## 6. Nginx 代理配置

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
