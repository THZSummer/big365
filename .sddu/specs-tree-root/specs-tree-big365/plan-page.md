# Page Plan: big365 React 演示前端设计

> Feature: `big365`  
> 关联技术计划: [`plan.md`](plan.md)

---

## 1. 技术栈

React + Vite + TypeScript，独立工程 `big365-web/`。Node.js 直接运行（Vite dev server）。

对应 ADR：[ADR-004-frontend-delivery.md](ADR-004-frontend-delivery.md)。

## 2. 页面结构与路由

| 页面 | 路由 | 职责 |
|---|---|---|
| 首页 | `/` | 产品介绍、快速入口 |
| 业务管理 | `/biz` | 注册新业务、查看已注册业务列表 |
| 维度管理 | `/biz/{biz}/dimensions` | 维度元数据 CRUD |
| 数据空间 | `/biz/{biz}/space` | 坐标写入、坐标查询、下钻演示 |
| 演示数据 | `/biz/{biz}/demo-data` | 创建生成任务、查看进度与结果 |
| 文档入口 | `/docs` | 链接快速开始、概念模型、API 文档、教程 |

---

## 3. 各页面详细设计

### 3.1 首页（`/`）

```
┌─────────────────────────────────────────────────────┐
│  [Logo] big365                   [业务管理] [文档]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│         big365 —— 多维数据空间服务                    │
│         计算前置 · 坐标定位 · 零聚合查询               │
│                                                     │
│   ┌─────────────────────┐  ┌──────────────────────┐  │
│   │  核心概念            │  │  快速入口             │  │
│   │  • 多维坐标空间       │  │  [注册新业务]         │  │
│   │  • 0=ALL 上卷哨兵     │  │  [查看已注册业务]     │  │
│   │  • 写入即计算         │  │  [查看文档]           │  │
│   │  • 查询零聚合         │  │                      │  │
│   └─────────────────────┘  └──────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**组件树**：

```text
HomePage
├── Layout（顶部导航）
├── Hero（标题 + 一句话描述）
├── ConceptCards（4 张概念卡片：坐标空间 / 上卷 / 级联更新 / 零聚合）
└── QuickActions（3 个按钮：注册业务 / 业务列表 / 文档）
```

**交互**：

- 点击「注册新业务」→ 跳转 `/biz` 并自动弹出注册表单。
- 点击「查看已注册业务」→ 跳转 `/biz`。
- 若已有注册业务，首页额外展示「最近业务」快捷入口列表。

**状态**：

| 状态 | 展示 |
|---|---|
| 加载中 | 骨架屏 |
| 无注册业务 | 引导注册 |
| 有注册业务 | 展示快捷入口 |

---

### 3.2 业务管理（`/biz`）

```
┌─────────────────────────────────────────────────────┐
│  [Logo] big365 > 业务管理                            │
├─────────────────────────────────────────────────────┤
│  [+ 注册新业务]                                      │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 业务名称     │ 维度数 │ 状态   │ 创建时间  │ 操作 │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ log_monitor │ 5     │ active │ 2026-06-06│ 进入 │ │
│  │ iot_device  │ 4     │ active │ 2026-06-07│ 进入 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  点击「注册新业务」弹出表单：                           │
│  ┌─────────────────────────────────────┐             │
│  │  注册新业务                          │             │
│  │  业务名称: [___________]             │             │
│  │  业务描述: [___________]             │             │
│  │                                     │             │
│  │  维度定义:                           │             │
│  │  列名  展示名  最小值  最大值  [+][-] │             │
│  │  [a]  [app  ] [1]    [10]   [x]     │             │
│  │  [b]  [endpt] [1]    [100]  [x]     │             │
│  │  [+ 添加维度]                        │             │
│  │                                     │             │
│  │  日期范围: [2026-01-01] ~ [2026-01-31]│            │
│  │                                     │             │
│  │  [取消]  [确认注册]                   │             │
│  └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

**组件树**：

```text
BizPage
├── Layout
├── BizList
│   └── BizRow（业务名、维度数、状态、创建时间、操作按钮）
└── BizRegisterModal（弹窗）
    ├── Form.Item（业务名称）
    ├── Form.Item（业务描述）
    ├── DimensionTable
    │   └── DimensionRow × N（列名、展示名、leaf_min、leaf_max、删除按钮）
    │   └── AddDimensionButton
    └── DateRangePicker
```

**交互**：

- 列表加载时显示 Loading。
- 点击「进入」→ 跳转 `/biz/{biz}/space`。
- 点击「注册新业务」→ 弹出 Modal。
- 维度行默认 1 行，点击「+ 添加维度」追加新行。
- 点击「确认注册」→ 调用 `POST /api/biz/register` → 成功后关闭弹窗 + 刷新列表 + 提示「已创建 N 张表」。
- 注册失败 → Modal 内显示错误信息，不关闭弹窗。

**状态**：

| 状态 | 展示 |
|---|---|
| 列表加载中 | Loading 指示器 |
| 列表为空 | 引导文字「暂无业务，请注册新业务」 |
| 注册提交中 | 确认按钮 loading，不可重复点击 |
| 注册成功 | Toast「业务 xxx 已注册，共创建 N 张表」 |
| 注册失败 | Modal 内红色错误提示 |

---

### 3.3 维度管理（`/biz/{biz}/dimensions`）

```
┌─────────────────────────────────────────────────────┐
│  [Logo] big365 > log_monitor > 维度管理              │
├─────────────────────────────────────────────────────┤
│  业务：log_monitor（日志监控）    [+ 新增维度]        │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ 列名 │ 展示名    │ 取值范围 │ 状态   │ 操作     │ │
│  ├────────────────────────────────────────────────┤ │
│  │ a    │ app       │ 1 ~ 10  │ 启用   │ 编辑 禁用│ │
│  │ b    │ endpoint  │ 1 ~ 100 │ 启用   │ 编辑 禁用│ │
│  │ c    │ status    │ 1 ~ 50  │ 启用   │ 编辑 禁用│ │
│  │ d    │ env       │ 1 ~ 5   │ 启用   │ 编辑 禁用│ │
│  │ e    │ region    │ 1 ~ 10  │ 已禁用 │ 编辑 启用│ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**组件树**：

```text
DimensionsPage
├── Layout
├── BizHeader（业务名 + 描述）
├── DimensionTable
│   └── DimensionRow × N（列名、展示名、leaf_min~leaf_max、状态标签、编辑/启用-禁用按钮）
└── DimensionEditModal（创建/编辑维度弹窗）
```

**交互**：

- 点击「新增维度」→ 弹出编辑 Modal。
- 编辑维度 → 弹出 Modal，预填当前值，可修改 display_name / leaf_min / leaf_max / description。
- 禁用维度 → 二次确认弹窗「禁用后该维度相关坐标查询将受影响，确认？」，确认后调用 `DELETE /api/{biz}/dimensions/{id}`。
- 启用已禁用维度 → 直接调用更新接口。

---

### 3.4 数据空间（`/biz/{biz}/space`）

最核心的页面，设计为**左侧查询 + 右侧下钻**的布局。

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo] big365 > log_monitor > 数据空间                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  左侧：坐标查询面板                    右侧：下钻演示区        │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ 坐标输入              │  │  多维下钻                     │  │
│  │                      │  │                              │  │
│  │ a: [0 ▼]  (ALL/app)  │  │  当前聚合级别：Grand Total     │  │
│  │ b: [0 ▼]  (ALL/接口)  │  │  ┌─────────────────────┐     │  │
│  │ c: [0 ▼]  (ALL/状态码)│  │  │ 日期: 2026-01-01     │     │  │
│  │ d: [0 ▼]  (ALL/环境)  │  │  │ 指标值: 12,345       │     │  │
│  │ e: [0 ▼]  (ALL/区域)  │  │  └─────────────────────┘     │  │
│  │                      │  │                              │  │
│  │ 日期: [2026-01-01  ]  │  │  维度钻取：                   │  │
│  │                      │  │  [app ▼] → 选 app=3          │  │
│  │  [查询]               │  │  值变为该 app 的总量          │  │
│  │                      │  │                              │  │
│  ├──────────────────────┤  │  上卷/下钻历史：               │  │
│  │ 写入向导              │  │  1. ALL → app=3              │  │
│  │                      │  │  2. app=3 → app=3,endpoint=7 │  │
│  │ 坐标同查询面板        │  │  3. ... → app=3,end=7,st=500 │  │
│  │ 指标值: [______]      │  │                              │  │
│  │ [提交写入]            │  │                              │  │
│  └──────────────────────┘  └──────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**组件树**：

```text
SpacePage
├── Layout
├── BizHeader
├── CoordinateForm（坐标 + 日期选择）
│   ├── DimensionPicker × N（下拉：0=ALL, 1..N=叶子值）
│   │   └── 选项从 dimensions API 获取
│   └── DatePicker
├── QueryPanel
│   ├── CoordinateForm（复用）
│   ├── QueryButton
│   └── ResultDisplay（日期 + 指标值）
├── WritePanel
│   ├── CoordinateForm（复用）
│   ├── ValueInput（指标值输入框）
│   └── SubmitButton
└── DrillDownDemo（右侧）
    ├── CurrentLevel（当前聚合级别描述）
    ├── ResultCard（当前查询结果）
    ├── DimensionPicker（钻取用下拉）
    └── DrillHistory（下钻步骤历史列表）
```

**CoordinateForm 组件**：

```typescript
// 每个维度的选项
interface DimensionOption {
  columnName: string;     // 'a'
  displayName: string;    // 'app'
  value: number;          // 0=ALL, 1..N
  leafMin: number;
  leafMax: number;
}

// 下拉项：
// { label: 'ALL (所有app)', value: 0 }
// { label: '1 - order-service', value: 1 }
// { label: '2 - user-service', value: 2 }
// ...
// label 中「order-service」来自 mapping_t
```

**交互**：

- 页面加载时，从 `dimensions_t` 获取该业务的维度列表，动态渲染 N 个下拉框。
- 每个下拉框默认值 = 0（ALL）。
- 点击「查询」→ `GET /api/{biz}/space/query?{坐标}&date={日期}` → 显示结果。
- 下钻演示：修改某个维度从 0 改为具体值 → 自动重新查询 → 对比前后结果。
- 写入向导：输入坐标 + 日期 + 指标值 → 点击「提交写入」→ `POST /api/{biz}/space/write` → 提示 affected rows。

**状态**：

| 状态 | 展示 |
|---|---|
| 维度加载中 | 下拉框禁用 + loading |
| 查询中 | 查询按钮 loading，结果区骨架屏 |
| 查询成功 | 结果卡片展示指标值 |
| 查询失败 | 错误提示「坐标不存在 / 日期列不存在」 |
| 写入中 | 提交按钮 loading |
| 写入成功 | Toast「已写入，影响 N 行」 |

---

### 3.5 演示数据（`/biz/{biz}/demo-data`）

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo] big365 > log_monitor > 演示数据                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  创建新任务：                                                 │
│  ┌──────────────────────────────────────────┐                │
│  │ 规模:  [small ▼]  (100~1000条)           │                │
│  │ 日期范围: [2026-01-01] ~ [2026-01-07]     │                │
│  │                                          │                │
│  │ [创建生成任务]                             │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
│  任务列表：                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 任务ID │ 规模   │ 状态     │ 进度 │ 创建时间 │ 操作      │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ abc123 │ small  │ ████░░60%│ 60%  │ 06-06    │ 查看详情  │ │
│  │ def456 │ medium │ ✓ 已完成  │ 100% │ 06-05    │ 查看详情  │ │
│  │ ghi789 │ large  │ ✗ 失败   │  30% │ 06-05    │ 查看原因  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  任务详情（展开 ghi789）：                                     │
│  ┌──────────────────────────────────────────┐                │
│  │ 失败原因：日期列 2026-01-31 不存在于 space_t│               │
│  │ 已生成数据：12,000 条                      │               │
│  │ 耗时：45 秒                               │               │
│  └──────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

**组件树**：

```text
DemoDataPage
├── Layout
├── BizHeader
├── CreateJobForm
│   ├── ScaleSelect（small / medium / large）
│   ├── DateRangePicker
│   └── SubmitButton
└── JobList
    └── JobRow × N
        ├── ProgressBar（进行中时显示动画进度条）
        ├── StatusBadge（pending/initializing/generating/writing/summarizing/completed/failed）
        └── JobDetail（展开时显示 summary_json 或失败原因）
```

**交互**：

- 创建任务 → `POST /api/{biz}/demo-data/jobs` → 返回 jobId → 加入列表并开始轮询。
- 进行中的任务每 2 秒轮询 `GET /api/{biz}/demo-data/jobs/{jobId}`，更新进度条和状态。
- 任务完成 → 停止轮询，显示摘要（生成坐标数、写入行数、耗时）。
- 任务失败 → 停止轮询，显示失败原因。

**状态**：

| 状态 | 展示 |
|---|---|
| 创建中 | 提交按钮 loading |
| 创建成功 | job 加入列表，自动开始轮询 |
| 任务进行中 | 进度条动画 + 百分比 |
| 任务完成 | 绿色对勾 + 摘要 |
| 任务失败 | 红色叉号 + 失败原因 |
| 轮询网络异常 | 不影响 UI，静默重试 |

---

### 3.6 文档入口（`/docs`）

```
┌─────────────────────────────────────────────────────┐
│  [Logo] big365 > 文档                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │  📖 快速开始     │  │  🧠 概念模型     │           │
│  │  5 分钟启动      │  │  坐标空间详解     │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │  📡 API 文档     │  │  📝 日志分析教程  │           │
│  │  Swagger UI     │  │  端到端示例      │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

链接分别指向：`docs/quick-start.md`、`docs/concepts.md`、`/swagger-ui.html`、`docs/log-analysis-tutorial.md`。

---

## 4. 全局组件

### 4.1 Layout

```text
Layout
├── Header
│   ├── Logo（点击回首页）
│   └── Nav（业务管理 | 文档）
├── Breadcrumb（首页 > 业务名 > 当前页面）
├── Content（子页面）
└── Toast（全局消息提示，基于 react-hot-toast 或类似库）
```

### 4.2 BizSelector

业务选择器，用于页面顶部快速切换业务。显示当前选中业务名，下拉列出所有已注册业务。

### 4.3 CoordinateInput

坐标输入组件，根据业务的维度定义动态渲染。接收 `bizName`，自动请求 `dimensions_t` API，渲染 N 个下拉选择器。

### 4.4 ErrorBanner / Loading

全局错误提示和加载指示器，各页面复用。

---

## 5. 工程结构

```text
big365-web/
├── package.json
├── tsconfig.json
├── vite.config.ts                  # 含 proxy 配置（/api → backend:8080）
├── Dockerfile
├── README.md
├── scripts/
│   ├── start.sh
│   └── stop.sh
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── BizPage.tsx
│   │   ├── DimensionsPage.tsx
│   │   ├── SpacePage.tsx
│   │   ├── DemoDataPage.tsx
│   │   └── DocsPage.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── BizSelector.tsx
│   │   ├── CoordinateInput.tsx
│   │   ├── ErrorBanner.tsx
│   │   └── Loading.tsx
│   └── styles/
│       └── global.css
└── tests/
    ├── conftest.py
    ├── test_home.py
    ├── test_biz_register.py
    ├── test_dimensions.py
    ├── test_space.py
    └── test_demo_data.py
```

## 6. API Client 约定

```typescript
// src/api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

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

## 7. Vite 代理配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
});
```

## 8. Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```
