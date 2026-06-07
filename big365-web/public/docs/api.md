# API 文档

big365 提供 REST API 作为首要接入方式。所有接口均可通过 HTTP 调用。

## Swagger UI

启动后端服务后，可以访问交互式 API 文档：

```
http://localhost:18080/swagger-ui.html
```

Swagger UI 支持在线测试所有接口。

---

## 统一响应格式

所有 API 响应遵循统一的 JSON 结构：

```json
{
  "success": true,
  "code": "OK",
  "message": "success",
  "data": { ... },
  "error": null
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 请求是否成功 |
| `code` | string | 业务状态码（如 `OK`、`BIZ_NOT_FOUND`） |
| `message` | string | 人类可读的描述信息 |
| `data` | object | 成功时的业务数据（可能为 null） |
| `error` | string | 失败时的错误详情 |

分页响应 `data` 结构：

```json
{
  "items": [...],
  "pageNo": 1,
  "pageSize": 50,
  "total": 3
}
```

---

## 完整接口列表

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查，返回服务和数据库状态 |
| POST | `/api/biz/register` | 注册新业务，自动创建维度表、数据空间表、演示任务表 |
| GET | `/api/biz/list` | 查询已注册业务列表 |
| GET | `/api/{biz}/dimensions` | 查询指定业务的所有维度（支持分页） |
| POST | `/api/{biz}/dimensions` | 为指定业务创建新维度 |
| GET | `/api/{biz}/dimensions/{id}` | 查询单个维度详情 |
| PUT | `/api/{biz}/dimensions/{id}` | 更新维度信息（显示名、描述、启用状态） |
| DELETE | `/api/{biz}/dimensions/{id}` | 禁用维度（软删除，不物理删除） |
| POST | `/api/{biz}/space/write` | 向数据空间写入一条数据（触发级联更新） |
| GET | `/api/{biz}/space/query` | 按坐标查询指标值（零聚合查询） |
| POST | `/api/{biz}/demo-data/jobs` | 创建演示数据生成任务（异步） |
| GET | `/api/{biz}/demo-data/jobs/{jobId}` | 查询演示数据生成任务状态与进度 |

---

## 核心接口详细说明

### 1. 健康检查

```
GET /api/health
```

**响应示例（正常）：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "status": "UP",
    "service": "big365-api",
    "timestamp": 1749200000000,
    "database": "UP"
  }
}
```

**响应示例（数据库不可用，HTTP 503）：**

```json
{
  "success": false,
  "code": "DATABASE_UNAVAILABLE",
  "message": "数据库连接失败",
  "data": {
    "status": "UP",
    "service": "big365-api",
    "database": "DOWN"
  }
}
```

---

### 2. 业务注册

```
POST /api/biz/register
```

**请求体：**

```json
{
  "bizName": "log_monitor",
  "bizLabel": "日志监控",
  "dimensions": [
    {
      "columnName": "a",
      "displayName": "app",
      "leafMin": 1,
      "leafMax": 10
    },
    {
      "columnName": "b",
      "displayName": "endpoint",
      "leafMin": 1,
      "leafMax": 100
    },
    {
      "columnName": "c",
      "displayName": "status_code",
      "leafMin": 1,
      "leafMax": 500
    }
  ],
  "dateRange": {
    "from": "20260101",
    "to": "20260107"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `bizName` | string | 是 | 业务名称，唯一标识（如 `log_monitor`） |
| `bizLabel` | string | 是 | 业务显示标签（如 `日志监控`） |
| `dimensions` | array | 是 | 维度定义列表，至少 1 个 |
| `dimensions[].columnName` | string | 是 | 坐标列名（如 `a`, `b`, `c`） |
| `dimensions[].displayName` | string | 是 | 业务显示名（如 `app`, `endpoint`） |
| `dimensions[].leafMin` | int | 是 | 叶子取值下限（≥1） |
| `dimensions[].leafMax` | int | 是 | 叶子取值上限（≥1） |
| `dateRange.from` | string | 是 | 开始日期（格式 `yyyyMMdd`） |
| `dateRange.to` | string | 是 | 结束日期（格式 `yyyyMMdd`） |

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "bizName": "log_monitor",
    "tablesCreated": [
      "big365_swks_log_monitor_dimensions_t",
      "big365_swks_log_monitor_space_t",
      "big365_swks_log_monitor_demo_jobs_t"
    ]
  }
}
```

**重复注册响应：**

```json
{
  "success": false,
  "code": "BIZ_ALREADY_EXISTS",
  "message": "业务已存在"
}
```

---

### 3. 业务列表

```
GET /api/biz/list
```

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "items": [
      {
        "bizName": "log_monitor",
        "bizLabel": "日志监控",
        "dimensionCount": 3,
        "status": "active",
        "createdAt": "2026-06-06T10:00:00"
      }
    ],
    "pageNo": 1,
    "pageSize": 50,
    "total": 1
  }
}
```

---

### 4. 维度 CRUD

#### 查询维度列表

```
GET /api/{biz}/dimensions?pageNo=1&pageSize=50
```

#### 创建维度

```
POST /api/{biz}/dimensions
```

**请求体：**

```json
{
  "columnName": "d",
  "displayName": "env",
  "description": "环境（测试/生产）",
  "leafMin": 1,
  "leafMax": 3
}
```

#### 查询单个维度

```
GET /api/{biz}/dimensions/{id}
```

#### 更新维度

```
PUT /api/{biz}/dimensions/{id}
```

**请求体：**

```json
{
  "displayName": "新显示名",
  "description": "新描述",
  "enabled": true
}
```

#### 禁用维度

```
DELETE /api/{biz}/dimensions/{id}
```

注意：此操作执行软禁用（`enabled=false`），不物理删除记录。

---

### 5. 数据写入

```
POST /api/{biz}/space/write
```

这是 big365 最核心的写入接口，会自动触发级联更新。

**请求体：**

```json
{
  "coordinates": {
    "a": 3,
    "b": 7,
    "c": 200
  },
  "date": "20260101",
  "value": 500
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `coordinates` | object | 是 | 坐标键值对，键为维度列名，值为叶子取值 |
| `date` | string | 是 | 数据日期（格式 `yyyyMMdd`） |
| `value` | int | 是 | 指标值（累加到数据空间） |

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "rowsAffected": 8
  }
}
```

`rowsAffected` 为实际更新的行数，应等于 `2^维度数`（上例 3 维 → 8 行）。

重复写入同一坐标+日期会触发**累加**（`INSERT ... ON DUPLICATE KEY UPDATE`）。

---

### 6. 数据查询

```
GET /api/{biz}/space/query?{坐标参数}&date={日期}
```

**请求示例：**

```bash
# Grand Total（全局总计）
GET /api/log_monitor/space/query?a=0&b=0&c=0&date=20260101

# 按 a=3 下钻
GET /api/log_monitor/space/query?a=3&b=0&c=0&date=20260101

# 叶子级精确查询
GET /api/log_monitor/space/query?a=3&b=7&c=200&date=20260101
```

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `a`, `b`, `c`, ... | int | 是 | 各维度坐标值，0=ALL 表示上卷 |
| `date` | string | 是 | 日期（格式 `yyyyMMdd`） |

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "coordinates": {
      "a": 3,
      "b": 0,
      "c": 0
    },
    "date": "20260101",
    "value": 500
  }
}
```

---

### 7. 演示数据生成

#### 创建生成任务

```
POST /api/{biz}/demo-data/jobs
```

**请求体：**

```json
{
  "scale": "small",
  "dateRange": {
    "from": "20260101",
    "to": "20260103"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scale` | string | 是 | 规模：`small`（~500 行）、`medium`（~1 万行）、`large`（~10 万行） |
| `dateRange.from` | string | 是 | 开始日期（格式 `yyyyMMdd`） |
| `dateRange.to` | string | 是 | 结束日期（格式 `yyyyMMdd`） |

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "jobId": "a1b2c3d4e5f6...",
    "scale": "small",
    "status": "pending",
    "progress": 0
  }
}
```

#### 查询任务状态

```
GET /api/{biz}/demo-data/jobs/{jobId}
```

**响应示例（进行中）：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "jobId": "a1b2c3d4e5f6...",
    "scale": "small",
    "status": "writing",
    "progress": 65,
    "totalRows": null,
    "summary": null,
    "errorMessage": null,
    "createdAt": "2026-06-06 10:00:00",
    "updatedAt": "2026-06-06 10:00:05"
  }
}
```

**响应示例（已完成）：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "jobId": "a1b2c3d4e5f6...",
    "scale": "small",
    "status": "completed",
    "progress": 100,
    "totalRows": 500,
    "summary": "演示数据生成完成。业务: log_monitor, 规模: small, 生成数据行数: 500, 写入成功: 500, 维度数: 3, 日期范围: 20260101~20260103。",
    "errorMessage": null,
    "createdAt": "2026-06-06 10:00:00",
    "updatedAt": "2026-06-06 10:00:10"
  }
}
```

**任务状态流转：**

```
pending → initializing → generating → writing → summarizing → completed
                                                       ↘ failed
```

---

## 错误码列表

| 错误码 | HTTP 状态 | 说明 |
|---|---|---|
| `OK` | 200 | 请求成功 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `BIZ_NOT_FOUND` | 404 | 业务不存在 |
| `BIZ_ALREADY_EXISTS` | 409 | 业务已存在，不可重复注册 |
| `DIMENSION_CODE_DUPLICATED` | 409 | 维度编码重复 |
| `DIMENSION_NOT_FOUND` | 404 | 维度不存在 |
| `DIMENSION_IN_USE` | 409 | 维度已被使用，不可删除 |
| `SPACE_CELL_NOT_FOUND` | 404 | 数据坐标不存在 |
| `QUERY_TOO_BROAD` | 400 | 查询范围过大 |
| `DEMO_JOB_NOT_FOUND` | 404 | 演示数据生成任务不存在 |
| `DEMO_JOB_FAILED` | 500 | 演示数据生成失败 |
| `DATABASE_UNAVAILABLE` | 503 | 数据库不可用 |
| `INTERNAL_ERROR` | 500 | 系统内部错误 |
