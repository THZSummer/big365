# API Plan: big365 REST API 设计

> Feature: `big365`  
> 关联技术计划: [`plan.md`](plan.md)  
> 关联数据库设计: [`plan-db.md`](plan-db.md)

---

## 1. 统一前缀

```text
/api
```

## 2. 接口清单

| 资源 | 方法 | 路径 | 说明 | 覆盖需求 |
|---|---|---|---|---|
| 健康检查 | GET | `/api/health` | 服务与数据库健康状态 | FR-004 |
| 业务注册 | POST | `/api/biz/register` | 注册新业务，动态创建全套业务表 | 新增 |
| 业务列表 | GET | `/api/biz/list` | 已注册业务清单 | 新增 |
| 维度列表 | GET | `/api/{biz}/dimensions` | 分页/列表查询 | FR-011 |
| 创建维度 | POST | `/api/{biz}/dimensions` | 创建维度（需在业务注册后） | FR-009, FR-014 |
| 维度详情 | GET | `/api/{biz}/dimensions/{id}` | 查询单个维度 | FR-010 |
| 更新维度 | PUT | `/api/{biz}/dimensions/{id}` | 更新名称、描述、启用状态 | FR-012 |
| 禁用维度 | DELETE | `/api/{biz}/dimensions/{id}` | MVP 采用禁用策略 | FR-013 |
| 写入数据 | POST | `/api/{biz}/space/write` | 写入坐标+日期+指标值，触发级联更新 | FR-015, FR-020 |
| 查询指标 | GET | `/api/{biz}/space/query` | 按坐标读指标，零聚合 | FR-016, FR-021~FR-026 |
| 创建生成任务 | POST | `/api/{biz}/demo-data/jobs` | 异步生成演示数据 | FR-027~FR-031 |
| 查询任务状态 | GET | `/api/{biz}/demo-data/jobs/{jobId}` | 查询阶段、进度、摘要 | FR-031 |
| API 文档 | GET | `/swagger-ui.html` | Swagger UI | FR-041 |

## 3. 核心接口示例

### 3.1 业务注册

```text
POST /api/biz/register
Content-Type: application/json

{
  "biz_name":   "log_monitor",
  "biz_label":  "日志监控",
  "dimensions": [
    {"column_name": "a", "display_name": "app",         "leaf_min": 1, "leaf_max": 10},
    {"column_name": "b", "display_name": "endpoint",    "leaf_min": 1, "leaf_max": 100},
    {"column_name": "c", "display_name": "status_code", "leaf_min": 1, "leaf_max": 50},
    {"column_name": "d", "display_name": "env",         "leaf_min": 1, "leaf_max": 5},
    {"column_name": "e", "display_name": "region",      "leaf_min": 1, "leaf_max": 10}
  ],
  "date_range": {"from": "20260101", "to": "20260131"}
}

Response:
{
  "success": true,
  "code": "OK",
  "data": {
    "biz_name": "log_monitor",
    "tables_created": [
      "big365_swks_log_monitor_dimensions_t",
      "big365_swks_log_monitor_mapping_t",
      "big365_swks_log_monitor_space_t",
      "big365_swks_log_monitor_demo_jobs_t"
    ]
  }
}
```

### 3.2 写入数据

```text
POST /api/log_monitor/space/write
Content-Type: application/json

{
  "coordinates": {
    "a": 3,
    "b": 7,
    "c": 500,
    "d": 4,
    "e": 7
  },
  "date": "20260101",
  "value": 100
}

Response:
{
  "success": true,
  "code": "OK",
  "data": { "rows_affected": 32 }
}
```

后端实际执行：

```sql
INSERT INTO big365_swks_log_monitor_space_t (a,b,c,d,e,`20260101`)
VALUES (3,7,500,0,0,100), ... -- 32 行
ON DUPLICATE KEY UPDATE `20260101` = `20260101` + VALUES(`20260101`);
```

### 3.3 查询指标

```text
GET /api/log_monitor/space/query?a=0&b=0&c=0&d=0&e=0&date=20260101

Response:
{
  "success": true,
  "code": "OK",
  "data": {
    "coordinates": {"a": 0, "b": 0, "c": 0, "d": 0, "e": 0},
    "date": "20260101",
    "value": 12345
  }
}
```

## 4. 数据流

### 4.1 写入数据流

```text
HTTP Request → SpaceController → SpaceService
  → 坐标校验 → mapping_t 映射
  → INSERT ... ON DUPLICATE KEY UPDATE space_t（2^d 行）
  → 返回 affected rows
```

### 4.2 查询数据流

```text
HTTP Request → SpaceController → SpaceService
  → 坐标解析 → SELECT 指标列 FROM space_t（1 行读取）
  → 返回 value
```

### 4.3 演示数据生成数据流

```text
POST /api/{biz}/demo-data/jobs → 创建 job
  → 后台线程执行生成 → 批量写入 space_t（级联更新）
  → 更新 job 状态 → GET job 查询进度
```

## 5. 统一响应格式

```json
{
  "success": true,
  "code": "OK",
  "message": "success",
  "data": {},
  "error": null
}
```

分页响应：

```json
{
  "items": [],
  "pageNo": 1,
  "pageSize": 20,
  "total": 0
}
```

## 6. 错误码

| 错误码 | 场景 |
|---|---|
| `VALIDATION_ERROR` | 参数校验失败 |
| `BIZ_NOT_FOUND` | 业务不存在 |
| `BIZ_ALREADY_EXISTS` | 业务名重复 |
| `MAPPING_NOT_FOUND` | raw_value 在 mapping_t 中无映射 |
| `DIMENSION_CODE_DUPLICATED` | 维度编码重复 |
| `DIMENSION_NOT_FOUND` | 维度不存在 |
| `DIMENSION_IN_USE` | 禁止删除被使用维度 |
| `SPACE_CELL_NOT_FOUND` | 坐标数据不存在 |
| `QUERY_TOO_BROAD` | 查询范围过大或 pageSize 超限 |
| `DEMO_JOB_NOT_FOUND` | 生成任务不存在 |
| `DEMO_JOB_FAILED` | 生成任务失败 |
| `DATABASE_UNAVAILABLE` | 数据库不可用 |

## 7. 内部包结构

```text
org.big365.api.controller
  ├── BizController.java          -- 业务注册/列表
  ├── HealthController.java       -- 健康检查
  ├── DimensionController.java    -- 维度 CRUD
  ├── SpaceController.java        -- 数据空间写入/查询
  └── DemoDataController.java     -- 演示数据任务

org.big365.api.service
  ├── BizService.java
  ├── DimensionService.java
  ├── SpaceService.java            -- 含级联更新逻辑
  └── DemoDataService.java

org.big365.api.dto
  ├── ApiResponse.java
  ├── PageResponse.java
  ├── BizRegisterRequest.java
  ├── SpaceWriteRequest.java
  └── SpaceQueryRequest.java
```
