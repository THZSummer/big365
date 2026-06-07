# 日志分析完整教程

本教程带你完成 big365 的端到端体验：从注册业务、定义维度、写入数据、查询验证到演示数据生成。

> **前置条件**：big365 服务已启动（`docker-compose -f compose.yml up -d` 或 `podman-compose -f compose.yml up -d`）。

---

## 步骤 1：注册 log_monitor 业务

首先注册一个名为 `log_monitor` 的日志监控业务，包含 3 个维度：

```bash
curl -X POST http://localhost:8080/api/biz/register \
  -H 'Content-Type: application/json' \
  -d '{
    "bizName": "log_monitor",
    "bizLabel": "日志监控",
    "dimensions": [
      {"columnName": "a", "displayName": "app", "leafMin": 1, "leafMax": 10},
      {"columnName": "b", "displayName": "endpoint", "leafMin": 1, "leafMax": 100},
      {"columnName": "c", "displayName": "status_code", "leafMin": 1, "leafMax": 500}
    ],
    "dateRange": {"from": "20260101", "to": "20260107"}
  }'
```

**成功响应：**

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

此时系统自动创建了 3 张业务表：
- **维度表**：存储刚刚定义好的 3 个维度元数据
- **数据空间表**：存储多维数据的物化空间（含 ALL 哨兵行）
- **演示任务表**：存储演示数据生成任务记录

---

## 步骤 2：查看已注册业务

```bash
curl http://localhost:8080/api/biz/list
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

## 步骤 3：查看和管理维度

### 3.1 查看维度列表

```bash
curl http://localhost:8080/api/log_monitor/dimensions
```

可以看到注册时定义的 3 个维度（app、endpoint、status_code）。

### 3.2 新增一个维度

为 `log_monitor` 业务新增一个"环境"维度：

```bash
curl -X POST http://localhost:8080/api/log_monitor/dimensions \
  -H 'Content-Type: application/json' \
  -d '{
    "columnName": "d",
    "displayName": "env",
    "description": "环境（测试/生产）",
    "leafMin": 1,
    "leafMax": 3
  }'
```

---

## 步骤 4：写入业务数据

现在向数据空间写入一条业务记录。假设我们记录 `app=3`、`endpoint=7`、`status_code=200` 在 2026-01-01 的请求量为 500：

```bash
curl -X POST http://localhost:8080/api/log_monitor/space/write \
  -H 'Content-Type: application/json' \
  -d '{
    "coordinates": {"a": 3, "b": 7, "c": 200},
    "date": "20260101",
    "value": 500
  }'
```

**响应：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "rowsAffected": 8
  }
}
```

`rowsAffected=8` 表示系统自动更新了 `2^3=8` 行（因为当前注册时有 3 个维度 a、b、c）。

这 8 行覆盖了所有上卷组合：

| a | b | c | 含义 |
|---|---|---|---|
| 3 | 7 | 200 | 叶子级：app=3, endpoint=7, status=200 |
| 3 | 7 | 0 | app=3, endpoint=7 在所有 status 上的聚合 |
| 3 | 0 | 200 | app=3, status=200 在所有 endpoint 上的聚合 |
| 0 | 7 | 200 | endpoint=7, status=200 在所有 app 上的聚合 |
| 3 | 0 | 0 | app=3 在所有维度上的聚合 |
| 0 | 7 | 0 | endpoint=7 在所有维度上的聚合 |
| 0 | 0 | 200 | status=200 在所有维度上的聚合 |
| 0 | 0 | 0 | Grand Total（全局总计） |

---

## 步骤 5：查询验证

### 5.1 Grand Total（全局总计）

查询所有维度的全局总计：

```bash
curl "http://localhost:8080/api/log_monitor/space/query?a=0&b=0&c=0&date=20260101"
```

**响应：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "coordinates": {"a": 0, "b": 0, "c": 0},
    "date": "20260101",
    "value": 500
  }
}
```

### 5.2 单维度下钻

只看 `app=3` 的所有数据：

```bash
curl "http://localhost:8080/api/log_monitor/space/query?a=3&b=0&c=0&date=20260101"
```

**响应：** `value=500`（因为只写入了这 1 条数据，所以与 Grand Total 相同）。

### 5.3 叶子级查询

精确查询 `app=3, endpoint=7, status=200`：

```bash
curl "http://localhost:8080/api/log_monitor/space/query?a=3&b=7&c=200&date=20260101"
```

**响应：** `value=500`。

### 5.4 验证级联累加

再次写入同一天的数据，验证累加行为：

```bash
# 写入相同坐标，但 value=300
curl -X POST http://localhost:8080/api/log_monitor/space/write \
  -H 'Content-Type: application/json' \
  -d '{"coordinates": {"a": 3, "b": 7, "c": 200}, "date": "20260101", "value": 300}'
```

再次查询 Grand Total：

```bash
curl "http://localhost:8080/api/log_monitor/space/query?a=0&b=0&c=0&date=20260101"
```

**响应：** `value=800`（500 + 300，累加成功！）

---

## 步骤 6：生成演示数据

big365 支持批量生成随机演示数据，用于快速验证功能。

### 6.1 创建演示数据生成任务

```bash
curl -X POST http://localhost:8080/api/log_monitor/demo-data/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "scale": "small",
    "dateRange": {"from": "20260101", "to": "20260103"}
  }'
```

**响应：**

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

**规模说明：**

| 规模 | 生成行数 | 预计耗时 | 适用场景 |
|---|---|---|---|
| `small` | ~500 行 | <10 秒 | 快速体验 |
| `medium` | ~10,000 行 | <30 秒 | 中等数据量验证 |
| `large` | ~100,000 行 | 1~5 分钟 | 较大规模测试 |

### 6.2 查询任务进度

使用上一步返回的 `jobId`，轮询查询进度：

```bash
# 替换 YOUR_JOB_ID 为实际的 jobId
curl http://localhost:8080/api/log_monitor/demo-data/jobs/YOUR_JOB_ID
```

**进度中的响应：**

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
    "summary": null
  }
}
```

**完成后的响应：**

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
    "summary": "演示数据生成完成。业务: log_monitor, 规模: small, 生成数据行数: 500, 写入成功: 500, 维度数: 3, 日期范围: 20260101~20260103。"
  }
}
```

### 6.3 验证生成的演示数据

生成完成后，查询 Grand Total 验证数据已写入：

```bash
curl "http://localhost:8080/api/log_monitor/space/query?a=0&b=0&c=0&date=20260101"
```

现在应该能看到一个比之前大得多的累计值。

---

## 步骤 7：前端体验

打开浏览器访问：

```
http://localhost:3000
```

在前端可以直观地：
- 查看业务列表和维度信息
- 使用坐标选择器进行多维下钻查询
- 可视化地创建演示数据生成任务
- 实时查看生成进度

---

## 状态流转

演示数据生成任务的状态流转：

```
pending → initializing → generating → writing → summarizing → completed
                                                       ↘ failed
```

- **pending**: 任务已创建，等待执行
- **initializing**: 正在初始化，加载维度定义
- **generating**: 正在生成随机数据向量
- **writing**: 正在将向量写入数据空间（触发级联更新）
- **summarizing**: 正在汇总统计信息
- **completed**: 生成完成
- **failed**: 生成失败（`errorMessage` 字段包含失败原因）

---

## 小结

恭喜！你已完成日志分析完整教程。本教程覆盖了：

1. ✅ 注册 `log_monitor` 业务，定义 3 个维度
2. ✅ 查看已注册业务列表
3. ✅ 管理维度（查看、新增）
4. ✅ 写入业务数据（含级联更新 `2^3=8` 行）
5. ✅ 查询验证（Grand Total → 下钻 → 叶子级）
6. ✅ 验证级联累加（重复写入同一坐标+日期）
7. ✅ 生成演示数据（异步任务 + 进度轮询）
8. ✅ 前端可视化体验
