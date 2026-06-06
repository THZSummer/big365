# ADR-002: MySQL 普通表采用结构化列 + JSON 扩展模型

## 状态
ACCEPTED

## 背景

big365 MVP 需要使用 MySQL 普通表作为首个存储实现，不采用历史分区表、宽表动态列或复杂 OLAP 架构。MVP 同时需要支持日志分析示例中的多维过滤：应用、接口、状态码、环境、区域、时间范围，以及指标：请求量、错误数、平均耗时。

Spec 开放问题 OQ-003 要求在 Plan 阶段决定：MySQL 普通表采用 JSON 字段保存维度/指标，还是采用更结构化的普通表设计。

候选方案：

1. 纯 JSON：所有维度和指标都保存在 JSON 字段中。
2. 纯结构化列：每个维度和指标都建成固定列。
3. 结构化列 + JSON 扩展：日志示例常用维度/指标建固定列，完整 dimensions/metrics 同步保存 JSON。

## 决策

采用结构化列 + JSON 扩展模型。

核心表：

- `big365_dimensions`：保存维度元数据。
- `big365_records`：保存业务数据记录 / Vector。
- `big365_demo_jobs`：保存演示数据生成任务。

`big365_records` 中将日志示例常用字段建为普通列：

- 维度列：`app`、`endpoint`、`status_code`、`env`、`region`。
- 时间列：`time_key`。
- 指标列：`request_count`、`error_count`、`avg_latency`。
- 扩展列：`dimensions_json`、`metrics_json`。

组合查询优先使用结构化列与普通索引；JSON 字段用于保留通用模型和文档中的 Vector / Coordinate / Dimension 映射。

## 后果

正面影响：

- 兼顾 MVP 查询性能和模型通用性。
- 常用日志场景可用普通索引支持多维过滤和时间范围查询。
- 文档可清晰解释业务化 API 字段与 Vector/Coordinate 的映射关系。
- 避免纯 JSON 查询性能和 SQL 可维护性问题。

负面影响：

- 同一数据在结构化列与 JSON 字段中存在一定冗余。
- 需要在写入/更新时保证结构化列与 JSON 内容一致。
- 如果后续支持任意维度高性能查询，需要进一步演进存储模型。

缓解措施：

- Service 层统一负责 DTO 到领域模型、结构化列和 JSON 的映射。
- 测试覆盖写入、更新、查询时字段一致性。
- 文档明确 MVP 的高性能查询字段范围，避免承诺任意维度高性能查询。
