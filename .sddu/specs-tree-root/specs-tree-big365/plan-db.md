# Database Plan: big365 原始数据存储与查询设计分析

> Feature: `big365`  
> 关联技术计划: `.sddu/specs-tree-root/specs-tree-big365/plan.md`  
> 数据来源: 原始 MySQL 实例 `192.168.3.5:3306`、历史工程资产、Navicat 模型文件  
> 当前状态: 静态结构分析完成，远程实时连接待网络连通后补充验证  
> 创建日期: `2026-06-06`

---

## 1. 分析范围与连接状态

### 1.1 目标

本文件用于单独沉淀 big365 原始数据库设计，理解历史 big365 在多维数据存储与查询上的核心思路，并为新 `big365-api` 的 MySQL 普通表设计提供参考。

重点回答：

1. 原始数据库有哪些核心表。
2. `bigdata_365` 为什么采用坐标列 + 日期宽列。
3. `Vector / Coordinate / Dimension` 与表结构之间如何映射。
4. 原始设计对 MVP 数据模型有哪些可复用思想。
5. 哪些历史设计不应直接进入当前 MVP 主路径。

### 1.2 数据来源

| 来源 | 路径 / 地址 | 当前使用方式 |
|---|---|---|
| 原始 MySQL 实例 | `192.168.3.5:3306` | 当前执行 TCP 连接检查超时，待网络连通后补充实时验证 |
| 历史工程配置 | `backup/legacy-20260606/big365-web/src/main/resources/application.yml` | 确认原始库名、连接方式、MyBatis 配置 |
| MyBatis Mapper | `backup/legacy-20260606/big365-web/src/main/resources/mapper/**/*.xml` | 分析历史访问路径和表名 |
| Navicat 模型 | `backup/legacy-20260606/doc/bigdata365.ndm2` | 提取表结构、字段、索引、分区、行数估计 |
| 历史领域模型 | `backup/legacy-20260606/big365-core/src/main/java/...` | 理解 Vector / Coordinate 的代码表达 |

### 1.3 当前连接状态

当前运行环境执行到 `192.168.3.5:3306` 的 TCP 检查结果为超时，说明无法从当前环境直接连接远程 MySQL 实例。因此本版 `plan-db.md` 基于仓库内历史资产进行静态分析。

后续网络连通后应补充：

```sql
SHOW TABLES;
SHOW CREATE TABLE bigdata_365;
SHOW CREATE TABLE bigdata_id;
SHOW CREATE TABLE big365_dimension;
SELECT COUNT(*) FROM bigdata_365;
SELECT COUNT(*) FROM bigdata_id;
SELECT * FROM bigdata_365 LIMIT 5;
SELECT * FROM big365_dimension LIMIT 20;
EXPLAIN SELECT * FROM bigdata_365 WHERE a = ? AND b = ? AND c = ?;
EXPLAIN SELECT * FROM bigdata_365 WHERE b = ? AND c = ?;
```

> 安全说明：本文不记录数据库密码，不将连接凭据写入文档。

---

## 2. 原始数据库总览

Navicat 模型文件记录的默认 schema 为：

```text
bigdata365
```

模型中包含的主要表：

| 表名 | 行数估计 | 角色 | 说明 |
|---|---:|---|---|
| `bigdata_365` | 83,670,652 | 核心事实表 / 宽表 | 使用坐标列 `a,b,c` + 每日指标列 `yyyyMMdd` 存储多维日数据 |
| `bigdata_id` | 92,742,975 | ID 空间 / pid 集合表 | 仅包含 `pid`，按 `pid` 分区，可能用于生成或管理数据 ID 空间 |
| `big365_dimension` | 0 | 维度元数据表 | 记录维度内部名、外部名、别名等元数据 |
| `vector` | 0 | 向量定义表 | 记录向量名称与别名，和核心概念 Vector 对应 |
| `bigdata_test_r2c_simple_365` | 10,000 | 测试表 | 简化版坐标表，仅包含 `pid,a,b,c`，用于验证分区/索引 |
| `bigdata_test_r2c_auto` | 0 | 测试表 | 多坐标列 + 少量日期列，用于测试更高维坐标设计 |

---

## 3. 核心模型理解

### 3.1 历史 Java 概念模型

历史 `big365-core` 中的核心模型非常简洁：

```java
class Coordinate {
    private String dimension;
    private String value;
}

class Vector {
    private List<Coordinate> vectorCoordinate;
}
```

可以抽象为：

```text
Vector = [Coordinate(dimension, value), ...]
```

含义：

- `Dimension`：维度定义，例如业务维度名、内部列名、展示名。
- `Coordinate`：某个维度上的一个取值，例如 `a=1`、`b=10`、`c=10000`。
- `Vector`：一组坐标共同定位一个多维数据单元。

### 3.2 表结构中的模型映射

原始 `bigdata_365` 将 Vector/Coordinate 固化为表字段：

| 概念 | 表达方式 | 示例 |
|---|---|---|
| Vector | 主键坐标组合 | `(a,b,c)` |
| Coordinate | 一个坐标列及其值 | `a=1`、`b=10`、`c=10000` |
| Dimension | 坐标列元数据 | `big365_dimension` 中的 `innername/outtername/aliasname` |
| Metric / Value | 日期列中的数值 | `20221201 = 123` |
| Time / Period | 宽表列名 | `20221201`、`20230101` |

因此，历史核心思想可以总结为：

```text
用多个坐标列定位一个多维实体，用多个时间列保存该实体在不同日期上的指标值。
```

---

## 4. `bigdata_365` 表设计分析

### 4.1 表定位

`bigdata_365` 是历史设计的核心表。

它不是传统「一行一事件」或「一行一个时间点指标」模型，而是「一行一个多维坐标组合 + 多个日期列」的宽表模型。

### 4.2 字段结构

模型文件显示：

| 字段 | 类型 | 说明 |
|---|---|---|
| `pid` | `int unsigned not null` | 数据 ID，建立普通索引 `idx_pid` |
| `a` | `tinyint unsigned not null` | 第 1 个坐标维度，注释 `0-10` |
| `b` | `tinyint unsigned not null` | 第 2 个坐标维度，注释 `0-100` |
| `c` | `mediumint unsigned not null` | 第 3 个坐标维度，注释 `0-100000` |
| `20221201` ~ `20240131` | `int unsigned not null default 0` | 日期列，每列代表一天的指标值 |

字段数量：

```text
431 个字段
```

其中：

- 4 个基础字段：`pid,a,b,c`。
- 427 个日期指标列：从 `20221201` 到 `20240131`。

### 4.3 主键与索引

| 类型 | 字段 | 用途 |
|---|---|---|
| Primary Key | `(a,b,c)` | 以坐标组唯一定位一行，并支持按完整坐标快速查询 |
| Index | `idx_pid(pid)` | 支持通过数据 ID 查询 |
| Index | `idx_bc(b,c)` | 支持不带 `a` 的部分坐标查询 |

### 4.4 分区策略

`bigdata_365` 使用 MySQL 分区：

```text
PARTITION BY RANGE COLUMNS(a,b,c)
```

分区数：

```text
10
```

分区键：

```text
a,b,c
```

这说明历史设计重点优化的是：

```text
按坐标范围进行分区裁剪，而不是按时间进行分区裁剪。
```

### 4.5 数据规模

模型文件记录：

| 指标 | 数值 |
|---|---:|
| 估计行数 | 83,670,652 |
| 数据长度 | 196,017,651,712 bytes |
| 索引长度 | 2,686,648,320 bytes |
| Data Free | 51,380,224 bytes |

这些数据说明 `bigdata_365` 曾经承载千万级到亿级行数，且宽表日期列导致单表数据体积很大。

---

## 5. `bigdata_id` 表设计分析

### 5.1 表定位

`bigdata_id` 只有一个字段：

```text
pid int unsigned not null
```

主键：

```text
PRIMARY KEY(pid)
```

行数估计：

```text
92,742,975
```

### 5.2 分区策略

`bigdata_id` 使用：

```text
PARTITION BY RANGE COLUMNS(pid)
```

分区数：

```text
10
```

分区边界按 1 亿递增，例如：

```text
p1 < 100000000
p2 < 200000000
...
```

### 5.3 可能用途

结合命名和结构推断，`bigdata_id` 可能用于：

1. 保存已生成或可用的 `pid` 空间。
2. 支撑大规模数据生成或导入时的 ID 去重。
3. 与 `bigdata_365.pid` 建立逻辑关联，但没有外键约束。

需要远程库连通后通过样例数据进一步确认。

---

## 6. `big365_dimension` 表设计分析

### 6.1 表定位

`big365_dimension` 是历史维度元数据表。

模型文件字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `dimensionpid` | `int` | 维度主键 |
| `innername` | `varchar` | 内部字段名 / 内部维度名 |
| `outtername` | `varchar` | 外部展示名，字段名存在拼写 `outter` |
| `aliasname` | `varchar` | 别名 |
| `createby` | `varchar` | 创建人 |
| `createtime` | `datetime` | 创建时间 |
| `updateby` | `varchar` | 更新人 |
| `updatetime` | `datetime` | 更新时间 |

### 6.2 历史工程中的不一致点

历史 Mapper 与初始化 SQL 存在字段命名不一致：

| 位置 | 表达 |
|---|---|
| Init Mapper | `dimension_pid`, `inner_name`, `outer_name`, `alias_name` |
| Dimension Mapper | `dimensionpid`, `innername`, `outtername`, `aliasname` |
| Java VO | `dimensionCode`, `innerName`, `outerName`, `aliasName` |
| ResultMap | `dimensionPid`，但 Java VO 中无同名字段 |

同时，历史 init DDL 中存在明显问题：

```sql
PRIMARY KEY (`pid`)
```

但创建字段为：

```sql
dimension_pid
```

这说明历史维度表设计意图明确，但实现并未完全收敛。

### 6.3 对新设计的启发

新 `big365-api` 不应直接沿用历史字段名，应统一为：

```text
id
code
name
type
description
enabled
created_at
updated_at
```

其中：

- `code` 对应历史 `innername` / 内部名。
- `name` 对应历史 `outtername` / 展示名。
- `description` 承载说明。
- `enabled` 支持禁用而非硬删除。

---

## 7. `vector` 表设计分析

模型文件显示 `vector` 表包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `pid` | `int` | 主键 |
| `name` | `varchar(255)` | 向量名称 |
| `aliasname` | `varchar(255)` | 向量别名 |

该表与历史 Java `Vector` 概念对应，但历史 Mapper 中未看到直接访问 `vector` 表的 SQL。

推断：

- `vector` 可能是早期用于定义向量类型或向量集合的元数据表。
- `bigdata_365` 才是真正承载向量坐标和时间指标值的事实表。
- 新设计可先不建立独立 `vector` 元数据表，而是在文档和领域模型中保留 Vector 概念。

---

## 8. 测试表设计分析

### 8.1 `bigdata_test_r2c_simple_365`

该表字段：

```text
pid, a, b, c
```

主键：

```text
(a,b,c)
```

索引：

```text
idx_pid(pid)
idx_bc(b,c)
```

分区：

```text
RANGE COLUMNS(a,b,c)
```

行数估计：

```text
10,000
```

该表像是 `bigdata_365` 的简化坐标索引实验表，用于验证坐标列主键、索引和分区策略。

### 8.2 `bigdata_test_r2c_auto`

该表字段包含：

```text
pid, k, a,b,c,d,e,f,g,h,i,j, 20230501,20230502,20230503
```

主键：

```text
(a,b,c,d,e,f,g,h,i,j)
```

该表体现了历史设计向更多维坐标扩展的方向：从 3 维坐标扩展到 10 维坐标，并继续保留日期列作为指标列。

这说明历史核心思路并不局限于 `a,b,c` 三维，而是尝试构建：

```text
多维坐标组合主键 + 时间宽列指标
```

---

## 9. 原始存储查询核心思路总结

### 9.1 核心思路

历史 big365 的核心存储查询思路是：

```text
把多维业务对象映射为坐标组合，把时间序列指标横向展开为日期列，通过坐标主键、辅助索引和 RANGE COLUMNS 分区提升查询效率。
```

### 9.2 查询模式

历史工程中实际暴露的查询很少：

```sql
SELECT * FROM bigdata_365 WHERE pid = ?;
SELECT * FROM bigdata_365 LIMIT 10;
```

但结合索引和分区设计，原始设计明显面向这些查询模式：

| 查询模式 | 可能 SQL | 支撑结构 |
|---|---|---|
| 按完整坐标查一行 | `WHERE a=? AND b=? AND c=?` | 主键 `(a,b,c)` + 分区裁剪 |
| 按部分坐标查询 | `WHERE b=? AND c=?` | `idx_bc(b,c)` |
| 按 pid 查询 | `WHERE pid=?` | `idx_pid(pid)` |
| 查某个时间点指标 | 选择特定日期列 | 日期列如 `20230101` |
| 查一段时间指标 | 选择多个日期列 | 多个日期列横向读取 |

### 9.3 优势

| 优势 | 说明 |
|---|---|
| 单行承载一组坐标的长时间序列 | 查询一个坐标组合的多日数据时不需要扫描多行 |
| 日期列为固定数值列 | 读取具体日期指标非常直接 |
| 主键即坐标组合 | 完整坐标定位效率高 |
| 分区按坐标裁剪 | 坐标范围查询可能减少扫描分区 |
| 对某些聚合预计算场景友好 | 如果数据已按日聚合，查询读取的是聚合结果 |

### 9.4 局限

| 局限 | 说明 |
|---|---|
| 时间扩展需要 DDL | 新增日期需要加列，不适合持续演进 |
| 字段数量快速膨胀 | 一年 365 列，多年会变成超宽表 |
| 查询任意时间范围不灵活 | 需要动态拼接列名，API 与 SQL 复杂 |
| 通用维度表达弱 | `a,b,c` 需要依赖元数据解释业务含义 |
| 维度变更困难 | 增加维度需要改表结构或新表 |
| 与 MVP 日志分析场景不完全匹配 | 日志示例更适合一行一个时间周期/记录的普通表模型 |
| 历史实现不完整 | 维度 DDL、Mapper、VO 命名不一致，CRUD 未真正闭环 |

---

## 10. 对新 `big365-api` 数据模型的影响

### 10.1 应保留的思想

新设计应保留以下思想：

1. **Vector / Coordinate / Dimension 概念**：这是 big365 区别于普通 CRUD 的核心抽象。
2. **坐标定位数据**：业务记录必须能表达多个维度上的取值。
3. **维度元数据**：维度需要 code/name/type/description/enabled 等元信息。
4. **查询索引围绕高频维度建立**：不要完全依赖 JSON 查询。
5. **面向演示场景做可解释建模**：日志分析示例应有明确维度和指标。

### 10.2 不应直接沿用的历史设计

新设计不应直接沿用：

1. 日期动态宽列。
2. `a,b,c` 这类不可解释字段作为对外 API 字段。
3. MySQL 分区表作为首版主路径。
4. 10 维主键宽坐标实验模型。
5. 历史 `big365_dimension` 字段命名和 DDL。
6. 历史 `bigdata_365` 的 `pid` + 坐标混合语义。

### 10.3 推荐的新表模型

当前 `plan.md` 推荐的 MVP 模型仍然成立，但可根据原始设计理解进一步解释为：

| 新表 | 继承的历史思想 | 新设计调整 |
|---|---|---|
| `big365_dimensions` | 维度元数据 | 字段命名统一，增加 `code/type/enabled`，约束 code 唯一 |
| `big365_records` | 坐标组合定位数据 | 不使用日期宽列；一行表示一个时间点/周期的指标记录 |
| `dimensions_json` | Vector/Coordinate 通用表达 | 保留任意维度扩展能力 |
| `app/endpoint/status_code/env/region` | 高频坐标列索引化 | 将日志示例高频维度结构化，方便查询与索引 |
| `time_key` | 时间维度 | 从列名变为字段值，避免每日加列 |
| `metrics_json` | 指标集合 | 保留多指标扩展能力 |
| `request_count/error_count/avg_latency` | 高频指标列 | 日志示例核心指标结构化，便于前端展示和查询 |

---

## 11. 新旧模型映射

| 历史模型 | 新模型 | 说明 |
|---|---|---|
| `bigdata_365.a` | `dimensions_json.app` 或结构化列 `app` | 历史 a 是抽象坐标，新模型使用业务化字段 |
| `bigdata_365.b` | `dimensions_json.endpoint` 或结构化列 `endpoint` | 历史 b 是抽象坐标，新模型使用业务化字段 |
| `bigdata_365.c` | `dimensions_json.statusCode/region/...` | 视示例场景映射 |
| `bigdata_365.20230101` | `time_key='2023-01-01'` + 指标列 | 时间从列名转为行字段 |
| 单元格数值 | `request_count/error_count/avg_latency` | 指标值结构化表达 |
| `big365_dimension.innername` | `big365_dimensions.code` | 内部编码 |
| `big365_dimension.outtername` | `big365_dimensions.name` | 展示名称 |
| `vector.name` | 文档中的 Vector 概念 / 可选未来元数据表 | MVP 不单独建 vector 元数据表 |

---

## 12. MVP 数据库设计建议

### 12.1 `big365_dimensions`

```sql
CREATE TABLE big365_dimensions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL,
  description VARCHAR(512),
  enabled TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dimension_code (code)
);
```

### 12.2 `big365_records`

```sql
CREATE TABLE big365_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  time_key DATETIME NOT NULL,
  app VARCHAR(128),
  endpoint VARCHAR(255),
  status_code VARCHAR(16),
  env VARCHAR(64),
  region VARCHAR(64),
  request_count BIGINT NOT NULL DEFAULT 0,
  error_count BIGINT NOT NULL DEFAULT 0,
  avg_latency DECIMAL(12,2) NOT NULL DEFAULT 0,
  dimensions_json JSON,
  metrics_json JSON,
  deleted TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_record_time (time_key),
  KEY idx_record_app_time (app, time_key),
  KEY idx_record_endpoint_time (endpoint, time_key),
  KEY idx_record_status_time (status_code, time_key),
  KEY idx_record_env_region_time (env, region, time_key)
);
```

### 12.3 `big365_demo_jobs`

```sql
CREATE TABLE big365_demo_jobs (
  job_id VARCHAR(64) PRIMARY KEY,
  scale VARCHAR(32) NOT NULL,
  parameters_json JSON,
  status VARCHAR(32) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  summary_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 13. 后续远程库验证计划

待 `192.168.3.5:3306` 从当前环境可达后，执行以下验证并更新本文：

### 13.1 结构验证

```sql
SHOW TABLES;
SHOW CREATE TABLE bigdata_365;
SHOW CREATE TABLE bigdata_id;
SHOW CREATE TABLE big365_dimension;
SHOW CREATE TABLE vector;
```

### 13.2 数据分布验证

```sql
SELECT COUNT(*) FROM bigdata_365;
SELECT COUNT(*) FROM bigdata_id;
SELECT MIN(pid), MAX(pid) FROM bigdata_365;
SELECT MIN(a), MAX(a), MIN(b), MAX(b), MIN(c), MAX(c) FROM bigdata_365;
SELECT * FROM bigdata_365 LIMIT 5;
SELECT * FROM big365_dimension LIMIT 20;
SELECT * FROM vector LIMIT 20;
```

### 13.3 查询计划验证

```sql
EXPLAIN SELECT * FROM bigdata_365 WHERE pid = 1;
EXPLAIN SELECT * FROM bigdata_365 WHERE a = 1 AND b = 10 AND c = 10000;
EXPLAIN SELECT * FROM bigdata_365 WHERE b = 10 AND c = 10000;
```

### 13.4 补充分析

验证后应补充：

1. 真实表结构与 Navicat 模型是否一致。
2. 各表真实行数。
3. `a,b,c` 的实际分布和业务含义。
4. `pid` 与坐标组合的关系。
5. 日期列中非零值的稀疏程度。
6. 典型查询的执行计划和耗时。

---

## 14. 结论

原始 big365 数据库体现的是一种面向大规模多维日数据的宽表聚合设计：

```text
坐标列定位多维实体，日期列横向保存时间序列指标，通过坐标主键、辅助索引和 RANGE COLUMNS 分区优化查询。
```

该设计对理解 big365 的核心价值很重要：big365 不是普通表 CRUD，而是围绕 Vector / Coordinate / Dimension 构建多维数据定位和查询能力。

但当前 MVP 应优先服务低复杂度、快速试用和日志分析闭环，因此不直接复制历史宽表/分区表设计，而是吸收其概念抽象，采用：

```text
业务化维度列 + time_key + 指标列 + JSON 扩展
```

作为 MySQL 普通表首版实现。这样既能保留多维坐标思想，又避免历史宽表设计在字段演进、时间范围查询和用户理解上的复杂度。
