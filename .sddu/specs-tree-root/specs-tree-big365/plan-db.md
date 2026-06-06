# Database Plan: big365 原始数据存储与查询设计分析

> Feature: `big365`  
> 关联技术计划: `.sddu/specs-tree-root/specs-tree-big365/plan.md`  
> 数据来源: 原始 MySQL 实例 `192.168.3.5:3306`、历史工程资产、Navicat 模型文件  
> 当前状态: 基于 Navicat 模型 + 21 行真实样本数据的深度分析已完成，远程实时连接待补充  
> 创建日期: `2026-06-06`

---

## 1. 分析范围与连接状态

### 1.1 目标

本文件用于单独沉淀 big365 原始数据库设计，理解历史 big365 在多维数据存储与查询上的核心思路，并为新 `big365-api` 的 MySQL 普通表设计提供参考。

重点回答：

1. 原始数据库有哪些核心表。
2. `bigdata_365` 的坐标列 `a,b,c` 为什么使用 0 = ALL 的哨兵机制实现预计算上卷。
3. `Vector / Coordinate / Dimension` 与物化立方体层级的映射关系。
4. 写入时如何实现级联更新（1 条数据 → 2^d 行）。
5. 查询如何做到零聚合计算。
6. 原始设计对 MVP 数据模型有哪些可复用思想。

### 1.2 数据来源

| 来源 | 路径 / 地址 | 当前使用方式 |
|---|---|---|
| 原始 MySQL 实例 | `192.168.3.5:3306` | 当前 TCP 超时，但已获得 21 行 real INSERT 语句样本 |
| 历史工程配置 | `backup/legacy-20260606/big365-web/src/main/resources/application.yml` | 确认原始库名、连接方式、MyBatis 配置 |
| MyBatis Mapper | `backup/legacy-20260606/big365-web/src/main/resources/mapper/**/*.xml` | 分析历史访问路径和表名 |
| Navicat 模型 | `backup/legacy-20260606/doc/bigdata365.ndm2` | 提取表结构、字段、索引、分区、行数估计 |
| 历史领域模型 | `backup/legacy-20260606/big365-core/src/main/java/...` | 理解 Vector / Coordinate 的代码表达 |
| 样本数据 SQL | 用户提供的 21 行 `INSERT INTO bigdata_365` 语句 | 分析真实坐标分布、指标值特征、生成逻辑 |

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
| `bigdata_365` | 83,670,652 | 物化多维立方体 | 坐标列 `a,b,c`，0=ALL 哨兵，包含所有聚合级别行 + 日期宽列存储指标 |
| `bigdata_id` | 92,742,975 | ID 空间 / pid 集合表 | 仅包含 `pid`，按 `pid` 分区，可能用于生成或管理数据 ID 空间 |
| `big365_dimension` | 0 | 维度元数据表 | 记录维度内部名、外部名、别名等元数据 |
| `vector` | 0 | 向量定义表 | 记录向量名称与别名，和核心概念 Vector 对应 |
| `bigdata_test_r2c_simple_365` | 10,000 | 测试表 | 简化版坐标表，仅包含 `pid,a,b,c`，用于验证分区/索引 |
| `bigdata_test_r2c_auto` | 0 | 测试表 | 多坐标列 + 少量日期列，用于测试更高维坐标设计 |

---

## 2.2 多业务隔离：每业务独立坐标表 + 独立维度表

### 2.2.1 核心原则

`bigdata_365` 不是所有业务共用的通用表。**它只是某个 3 维业务的一个实例**。

不同业务有不同的维度数、不同的维度取值范围、不同的业务含义，**不能也不可能共用一张坐标表**。

```text
设计原则：
  1. 每个业务 = 独立的坐标数据空间表（维度列数 + 日期列数 都不同）
  2. 每个业务 = 独立的维度元数据表（隔离业务含义）
  3. 不同业务之间数据完全隔离，互不干扰
```

### 2.2.2 实例对照

历史仓库中已有多个实例表，每个都是独立的坐标空间：

| 业务实例表 | 维度数 | 坐标列 | 维度范围 | 说明 |
|---|---|---|---|---|
| `bigdata_365` | 3 | `(a,b,c)` | a:1~10, b:1~100, c:1~100000 | 主业务（推测是某个大数据聚合场景） |
| `bigdata_test_r2c_simple_365` | 3 | `(a,b,c)` | a:1~10, b:1~100, c:1~100000 | 简化实例（1 万行） |
| `bigdata_test_r2c_auto` | 10 | `(a,b,c,d,e,f,g,h,i,j)` | 多个 tinyint 范围 | 高维实验 |

每个表的结构都不同（列数不同、类型不同、行数不同），因为它们代表不同的业务。

### 2.2.3 接入新业务时创建的资产

```text
新业务接入 = 以下全部新建：

┌─ 坐标数据空间表 ───────────────────┐
│ CREATE TABLE big365_{业务名} (      │
│   pid       INT UNSIGNED NOT NULL,  │
│   {维度1列}  SMALLINT NOT NULL,     │
│   ...                               │
│   {日期1}   INT UNSIGNED DEFAULT 0, │
│   ...                               │
│   PRIMARY KEY ({维度1列}, ...)      │
│ );                                   │
│ 每个业务一张，结构完全独立。           │
└────────────────────────────────────┘

┌─ 维度元数据表 ──────────────────────┐
│ CREATE TABLE big365_{业务名}_dim (   │
│   id          INT AUTO_INCREMENT,    │
│   column_name VARCHAR(64),  -- 列名  │
│   display_name VARCHAR(128), -- 展示名 │
│   value_range VARCHAR(256), -- 取值范围 │
│   ...                               │
│ );                                   │
│ 每个业务一张，隔离业务含义。           │
└────────────────────────────────────┘
```

### 2.2.4 为什么维度表也需要独立

```text
共享维度表的问题：
  big365_dimension 中混合了：
    row 1: column='a',  display='应用',    属于 日志监控业务
    row 2: column='b',  display='接口',    属于 日志监控业务
    row 3: column='a',  display='设备类型', 属于 物联网业务 ← 冲突！

  不同业务的 'a' 含义不同，不能放在同一张表里。

独立维度表的好处：
  big365_log_monitor_dim:
    column_name='app', display_name='应用', value_range='1~10'
    column_name='endpoint', display_name='接口', value_range='1~100'
    ...

  big365_iot_device_dim:
    column_name='dev_type', display_name='设备类型', value_range='1~5'
    column_name='firmware_ver', display_name='固件版本', value_range='1~20'
    ...

  各业务独立、业务间零干扰。
```

### 2.2.5 对 MVP 新工程的设计启示

```text
当前 MVP 首版只接入一个业务（日志分析），所以：
  - 新建坐标数据表：big365_records（MVP 行式模型，不是宽表）
  - 新建维度元数据表：big365_dimensions（只为日志分析这一个业务）

后续接入第二个业务时：
  - 新建 big365_{业务2}_records
  - 新建 big365_{业务2}_dimensions
  - 两张表都与第一个业务完全隔离

MVP 设计应预留这种「按业务建表」的扩展能力，
而不是假设所有业务共用同一张维度表。
```

---

## 3. 核心模型理解：预计算物化立方体

### 3.1 设计哲学

原始 big365 的核心设计思想不是「存储原始事件数据」，而是「**将计算全部前置，构造一个预计算的物化多维立方体（Materialized OLAP Cube）**」。

```text
设计原则：
  1. 数据从产生的那一刻起，就确定该数据对所有聚合层级的影响。
  2. 将计算结果提前写入所有可能的聚合坐标行。
  3. 面向用户的查询是纯定位 + 读取，不含实质性的聚合计算。
```

### 3.2 0 = ALL：坐标维度的上卷哨兵

三维坐标 `(a, b, c)` 中，**任何维度取值为 0，表示该维度被「上卷（Roll-up）」，即代表该维度的全部取值**。

```text
(3, 7, 150)  → a=3, b=7, c=150 的最细粒度行（叶子级）
(3, 7, 0)    → a=3, b=7 在所有 c 上的聚合（一次上卷，卷掉 c）
(3, 0, 150)  → a=3, c=150 在所有 b 上的聚合（一次上卷，卷掉 b）
(0, 7, 150)  → b=7, c=150 在所有 a 上的聚合（一次上卷，卷掉 a）
(3, 0, 0)    → a=3 在所有 b,c 上的聚合（二次上卷）
(0, 7, 0)    → b=7 在所有 a,c 上的聚合（二次上卷）
(0, 0, 150)  → c=150 在所有 a,b 上的聚合（二次上卷）
(0, 0, 0)    → 全维度聚合（Grand Total）
```

因此，a 的实际业务取值范围是：

```text
a ∈ {1, 2, 3, ..., 10}   -- 叶子坐标
a = 0                     -- 哨兵值，代表「所有 a」
```

同理，b 的叶子值是 `1~100`，c 的叶子值是 `1~100000`。

### 3.3 完整行数计算

对于 3 维、每维取值数分别为 `|A|=11`, `|B|=101`, `|C|=100001` 的坐标系：

```text
总行数 = (|A| - 1) × (|B| - 1) × (|C| - 1)         -- 叶子级：约 10 × 100 × 100000 = 1 亿行
       + (|A| - 1) × (|B| - 1) × 1                    -- c 上卷：约 10 × 100 = 1000 行
       + (|A| - 1) × 1 × (|C| - 1)                    -- b 上卷：约 10 × 100000 = 100 万行
       + 1 × (|B| - 1) × (|C| - 1)                    -- a 上卷：约 100 × 100000 = 1000 万行
       + (|A| - 1) × 1 × 1                             -- b,c 上卷：约 10 行
       + 1 × (|B| - 1) × 1                             -- a,c 上卷：约 100 行
       + 1 × 1 × (|C| - 1)                             -- a,b 上卷：约 100000 行
       + 1 × 1 × 1                                     -- Grand Total：1 行

精简公式：

总行数 = |A| × |B| × |C| = 11 × 101 × 100001 ≈ 1.11 亿行
```

每个维度把「叶子取值」和「哨兵 0」并列看待后，总行数正好是各维取值数的笛卡尔积。

实际 8367 万行说明约 75% 的坐标空间已被填充。

### 3.4 数据写入时的级联更新

这是最核心的设计：**一条数据写入触发多行更新**。

```text
场景：某系统收到一条新指标数据：
  维度：a=3, b=7, c=150
  指标：20230101 = 500

这条数据会影响的行（所有满足「每个维度要么等于原值，要么为 0」的组合）：

  UPDATE bigdata_365 SET `20230101` = `20230101` + 500 
  WHERE a IN (0,3) AND b IN (0,7) AND c IN (0,150);
  -- 这是一个 2×2×2 = 8 行的批量更新
```

一个数据点写入 → 更新 `2^维度数` 行。

对三维来说每个数据点 = 8 次更新。对历史 10 维实验表 `bigdata_test_r2c_auto`，一个数据点 = 1024 次更新。

### 3.5 历史 Java 概念模型

历史 `big365-core` 中的核心模型：

```java
class Coordinate {
    private String dimension; // 维度名
    private String value;     // 取值（0=ALL 或 1..N 具体值）
}

class Vector {
    private List<Coordinate> vectorCoordinate;
    // Vector 不仅代表叶子坐标，也代表任意聚合级别的坐标
}
```

抽象为：

```text
Vector = [Coordinate(d, v) for d in dimensions]
  where v ∈ {0} ∪ {1..max(d)}
```

0 不只是一个取值，它是一个**维度消解符**，在查询中表示「不过滤该维度」，在存储中表示「该行是该维度的聚合结果」。

### 3.6 表结构中的模型映射

| 概念 | 表达方式 | 示例 |
|---|---|---|
| Cube | 整张 `bigdata_365` | 包含所有聚合级别的物化立方体 |
| Dimension | 坐标列 + `big365_dimension` 中的元数据 | a, b, c |
| Coordinate | 列名 + 列值 | a=1, b=0 (0=ALL) |
| Vector | 一行，由主键坐标组成 | `(3, 7, 0)` = a=3,b=7,c=ALL |
| Rollup Level | 0 的个数 | `(3, 7, 0)` = 1 次上卷 |
| Metric / Value | 日期列中的值 | `20230101 = 500`，是聚合结果 |
| Time / Period | 日期列名 | `20230101` |

因此，历史核心思想应当总结为：

```text
将数据分散到多维坐标空间中，通过「坐标值 0 = ALL」的约定，
让一次写入同时更新多个聚合层级，
使查询成为坐标定位的纯读操作，不含 GROUP BY 或聚合计算。
```

---

## 4. `bigdata_365` 表设计分析

### 4.1 表定位

`bigdata_365` 是一个**预计算物化立方体**的物理存储。

每一行不是一条「原始事件」，而是某个**聚合级别下的累积指标**。表包含：

- **叶子行（Leaf）**：a≠0, b≠0, c≠0 — 最细粒度
- **上卷行（Rollup）**：至少一个维度为 0 — 聚合结果
- **Grand Total 行**：a=0, b=0, c=0 — 全局总和

### 4.2 字段结构

| 字段 | 类型 | 含义 |
|---|---|---|
| `pid` | `int unsigned not null` | 行 ID，建立普通索引 `idx_pid` |
| `a` | `tinyint unsigned not null` | 维度 A：0=ALL, 1..10=叶子值 |
| `b` | `tinyint unsigned not null` | 维度 B：0=ALL, 1..100=叶子值 |
| `c` | `mediumint unsigned not null` | 维度 C：0=ALL, 1..100000=叶子值 |
| `20221201`~`20240131` | `int unsigned not null default 0` | 该坐标在该日期的聚合指标值 |

字段总数：431（4 基础 + 427 日期列）。

### 4.3 主键与索引

| 类型 | 字段 | 用途 |
|---|---|---|
| Primary Key | `(a,b,c)` | 唯一定位一个聚合级别的坐标行 |
| Index | `idx_pid(pid)` | 按 ID 查询 |
| Index | `idx_bc(b,c)` | 不看 a 维度时的快速定位 |

### 4.4 分区策略

```text
PARTITION BY RANGE COLUMNS(a,b,c)
10 个分区
```

**分区按坐标裁剪，不按时间**。因为：

- 查询总是从坐标出发找行，不是从时间出发找坐标。
- 同一坐标的所有日期列已在同一行中，无需跨分区聚合。

### 4.5 数据规模

| 指标 | 数值 |
|---|---|
| 理论最大行数 | 11 × 101 × 100001 ≈ 1.11 亿 |
| 实际行数 | 83,670,652（约 75% 填充率） |
| 数据长度 | ~196 GB |
| 索引长度 | ~2.7 GB |

### 4.6 样本数据分析

通过 21 行样本（`a=0, b=0, c=0..20`，时间 20221201~20240131），可以验证上卷语义。

#### 4.6.1 样本是什么聚合级别？

所有样本行 `a=0, b=0` 意味着：

```text
a=0 → "所有 a"（维度 A 被上卷）
b=0 → "所有 b"（维度 B 被上卷）
c=0..20 → c 是唯一保留的叶子维度
```

所以这 21 行是**仅保留 c 维度的二次上卷聚合层**。

#### 4.6.2 样本含义的正确解读

| 行 | 聚合级别 | 含义 |
|---|---|---|
| `a=0,b=0,c=0` | Grande Total | 所有 a, b, c 的总和，20221201 指标值为 296 |
| `a=0,b=0,c=5` | c=5 聚合 | 所有 a, b 在 c=5 上的总和，20221201 指标值为 555 |
| `a=0,b=0,c=10` | c=10 聚合 | 所有 a, b 在 c=10 上的总和，20221201 指标值为 680 |

#### 4.6.3 查询等价于读一行

**查「所有 a, 所有 b, c=5」在 2023-01-01 的指标：**

```sql
SELECT `20230101` FROM bigdata_365 WHERE a=0 AND b=0 AND c=5;
-- 545
```

用户不需要写 `SUM`，不需要 `GROUP BY`。因为上卷计算已经提前完成了。

**查「a=3 在所有 b, c 下的总量」：**

```sql
SELECT `20230101` FROM bigdata_365 WHERE a=3 AND b=0 AND c=0;
-- 一行返回，0 次聚合
```

#### 4.6.4 写入时的级联更新模式

当 `a=3, b=7, c=150` 的数据更新时：

```sql
UPDATE bigdata_365 SET `20230101` = `20230101` + Δ
WHERE (a = 3 OR a = 0)
  AND (b = 7 OR b = 0)
  AND (c = 150 OR c = 0);
-- 2×2×2 = 8 行同时更新
```

| 更新的行 | 聚合级别 |
|---|---|
| `(3,7,150)` | 叶子 |
| `(3,7,0)` | c 上卷 |
| `(3,0,150)` | b 上卷 |
| `(0,7,150)` | a 上卷 |
| `(3,0,0)` | b,c 上卷 |
| `(0,7,0)` | a,c 上卷 |
| `(0,0,150)` | a,b 上卷 |
| `(0,0,0)` | Grand Total |

一条数据写入，8 行同时更新，这意味着：

- **写入成本 = O(2^d)**，d = 维度数。
- **读取成本 = O(1)**（单行主键直接命中）。

这是典型的「以写入换读取（Write Amplification → Instant Read）」模式。

#### 4.6.5 样本数据特征

```text
1. pid 与 c 同步递增（0→20），推测是顺序生成标识。
2. 所有样本行统一为 a=0,b=0 聚合层。
3. 指标值 0~999 随机分布，无明显趋势或季节性。
4. 数据为演示/测试目的的批量随机生成。
```

#### 4.6.6 对 MVP 的启示

| 原始设计 | MVP 可借鉴 | MVP 需要不同 |
|---|---|---|
| 坐标 0 = ALL 哨兵 | 理念：维度是坐标，指标是值 | MVP 坐标用业务化字段，不用数字 |
| 预计算所有聚合层级 | MVP 先不做预计算，按原始粒度写入 | 查询时可用普通 SQL 聚合 |
| 时间维度是列名 | 时间也是维度之一 | MVP 用行字段 `time_key` |
| 写放大 2^d 行 | 写入简单 | MVP 先 1 次写入 1 行 |
| 读 0 计算 | 体验好 | MVP 首版允许查询时做简单聚合 |

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

`big365_dimension` 是历史维度元数据表。**当前是一张共享表，不同业务的维度定义混在一起，这不是最佳实践。**

正确的设计模式（见 2.2 节）是：**每个业务拥有独立的维度表**（如 `big365_log_monitor_dim`、`big365_iot_device_dim`），因为不同业务的维度定义不同，列名含义不同，不应共享。

历史表存在的问题：
1. 缺少「所属业务」字段，无法区分哪行属于哪个业务。
2. 缺少「取值范围」描述，无法记录每个维度的合法叶子值区间。
3. 字段命名不规范（innername/outtername vs inner_name/outer_name）。

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

**核心原则**：每个业务一张独立的维度元数据表。

新 `big365-api` 的维度表应命名为 `big365_dimensions`（首版只为一个业务服务，后续新增业务时创建独立的维度表）：

```sql
CREATE TABLE big365_dimensions (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  code       VARCHAR(64) NOT NULL UNIQUE,   -- 维度内部编码
  name       VARCHAR(128) NOT NULL,          -- 展示名称
  type       VARCHAR(32) NOT NULL,           -- 'dimension' | 'metric'
  data_type  VARCHAR(32),                    -- 'string' | 'number' | 'time' | 'enum'
  value_range VARCHAR(256),                  -- '1~10' | '200,301,404,500'
  description VARCHAR(512),
  enabled    TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

其中：

- `code` 对应历史 `innername` / 内部名。
- `name` 对应历史 `outtername` / 展示名。
- `value_range` 是新增字段，描述该维度的合法叶子值区间（不含 0），比历史更完整。
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

### 9.1 核心设计哲学

```text
将计算全部前置，构建预计算物化立方体。

具体方法：
  1. 将原始数据分散到多维坐标空间，每个坐标组合对应一行。
  2. 利用「坐标值 0 = ALL」的哨兵约定，在写入时级联更新所有聚合层级。
  3. 查询时按坐标定位直接读取该聚合层级的行，无需 SUM / GROUP BY。

本质是：以写入时 2^d 倍放大为代价，换取查询的 O(1) 单行读取。
```

### 9.2 查询模式

所有查询都是「定位坐标 + 读取指标列」，不含聚合计算。

| 查询意图 | SQL | 说明 |
|---|---|---|
| 查 Grand Total | `WHERE a=0 AND b=0 AND c=0` | 所有维度的全局总和 |
| 查单个维度的细分 | `WHERE a=0 AND b=0 AND c=5` | a,b 上卷，仅 c 细分 |
| 查两个维度的交叉 | `WHERE a=0 AND b=7 AND c=5` | a 上卷，b,c 交叉 |
| 查最细粒度 | `WHERE a=3 AND b=7 AND c=150` | 无上卷，叶子行 |

### 9.3 优势

| 优势 | 说明 |
|---|---|
| 查询零计算开销 | 聚合在写入时完成，读取是纯主键查找 |
| 任意聚合级别的查询复杂度相同 | 不管查 Grand Total 还是叶子行，都是 1 行读取 |
| 时间序列查询高效 | 单行包含完整时间序列，无需多行拼接 |
| 对 OLAP 场景自然友好 | 天然适合多维分析、下钻、上卷、切片 |

### 9.4 局限与代价

| 局限 | 说明 |
|---|---|
| 写入放大严重 | 1 条数据 → 2^d 行更新，三维 = 8 倍 |
| 存储爆炸 | 所有聚合层级都物化存储 |
| 维度变更成本高 | 新增维度需要重建整个立方体 |
| 时间扩展需要 DDL | 新增日期 = 加列 |
| 字段膨胀 | 一年 365 列，体积增长线性 |
| 面向多维分析的极端设计 | 不适合低延迟写入、高频率更新场景

---

## 10. 对新 `big365-api` 数据模型的影响

### 10.1 应保留的核心思想

1. **多维坐标空间模型**：数据不是平铺的，而是投射到多维空间中，每个坐标组合是一个定位锚点。
2. **维度元数据的独立管理**：坐标的 code/name/type 需要独立于事实数据管理。
3. **查询驱动索引设计**：高频查询维度建立显式索引，不要完全依赖 JSON 查询。
4. **计算可以前置**：在 MVP 后续版本，可对高频聚合场景引入预计算机制。

### 10.2 不应直接沿用的设计

1. **0 = ALL 哨兵值**：MVP 坐标用业务化字段（如 `app="order-service"`），不存在「ALL」的单一数字表达。聚合通过 SQL `GROUP BY` 实现。
2. **写入时级联更新**：MVP 首版不预计算，1 条数据 = 1 行写入。后续版本可在后台异步构建聚合表。
3. **日期宽列**：用 `time_key` 行字段替代。
4. **抽象数字坐标**：用业务化字段名（`app`, `endpoint`, `status_code` 等）。
5. **分区表**：MVP 首版用普通表。

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

| 历史模型 | 含义（修正后） | 新模型 | 说明 |
|---|---|---|---|
| `bigdata_365.a` | 维度 A 的坐标值（0=ALL, 1..10=叶子） | `dimensions_json.app` 或 `app` | 业务化，不再用数字 |
| `bigdata_365.b` | 维度 B 的坐标值（0=ALL, 1..100=叶子） | `dimensions_json.endpoint` 或 `endpoint` | 业务化 |
| `bigdata_365.c` | 维度 C 的坐标值（0=ALL, 1..100000=叶子） | `dimensions_json.statusCode/...` | 业务化 |
| `bigdata_365.20230101` | 该坐标在该日期的聚合指标值 | `time_key` + `request_count/error_count/avg_latency` | 时间从列→行，指标结构化 |
| 单元格数值 | 聚合结果 | 原始记录 + SQL 聚合 | MVP 不预计算 |
| `a=0,b=0,c=0` 行 | Grand Total（全局聚合） | `SELECT SUM(...) FROM records` | MVP 用 SQL 聚合替代 |
| `a=0,b=5,c=100` 行 | b 和 c 交叉（a 上卷） | `SELECT ... FROM records WHERE b=? AND c=? GROUP BY ...` | 同 |
| `0=ALL` 语义 | 哨兵值表示维度上卷 | 无直接替代，通过是否传参数控制 | 含义不同但体验等价 |
| `big365_dimension` | 维度元数据 | `big365_dimensions` | 字段命名规范化 |

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

基于 21 行样本数据已完成的初步分析（见 4.6）：

1. 坐标分布：样本区间 a=0,b=0,c=0..20，验证了坐标网格模型的填充方式。
2. 指标值特征：0~999 随机分布，确认为演示/测试生成数据。
3. pid 与坐标关系：pid 与 c 同步递增，可能是顺序生成时的标识。
4. 日期列填充率：样本中几乎 100% 非零，推断为全填充生成算法。

仍需远程连通后验证：

1. 真实表结构与 Navicat 模型是否一致。
2. 各表真实行数与模型估计的偏差。
3. `a,b,c` 全量分布的唯一坐标组合数量。
4. 真实数据中日期列的稀疏程度（非零率）。
5. 典型查询的执行计划和耗时。
6. `bigdata_id` 与 `bigdata_365.pid` 的对应关系。

---

## 14. 结论

### 14.1 原始设计精髓

big365 的原始数据库体现了一种**先进的预计算物化立方体设计**：

```text
┌──────────────────────────────────────────────┐
│  原始 bigdata_365 设计核心                    │
│                                              │
│  1. 数据映射到多维坐标空间                     │
│  2. 坐标值 0 = ALL（哨兵/上卷指示符）          │
│  3. 写入时级联更新 2^d 行（计算前置）           │
│  4. 查询是纯坐标定位 + 指标读取（O(1)）        │
│  5. 时间维度以列展开（日期宽列）               │
│                                              │
│  本质：以写入放大 + 存储膨胀                   │
│        换取查询零计算的极致性能                 │
└──────────────────────────────────────────────┘
```

这不是简单的「坐标→指标」KV 表，而是一个**完整物化的 OLAP Cube**，所有聚合层级都已提前计算并存储在 MySQL 普通表中。它使得：

```text
"某个维度组合的总量是多少？"
  → 不需要 SUM
  → 直接找到坐标中有 0 的那行
  → 读取指标列
  → 返回
```

### 14.2 对 MVP 的价值

理解这个原始设计对 MVP 的价值在于：

1. **理解 big365 的「多维」基因**：big365 不是普通 CRUD 平台，而是天然围绕维度、坐标、聚合来思考数据的。
2. **知道 MVP 的设计边界**：MVP 的目标是低复杂度、快速试用，而不是性能极致。因此不直接复制预计算立方体。
3. **保留演进路径**：当 MVP 进入后续版本并出现高频聚合查询需求时，可以基于 `big365_records` 的原始数据**异步构建**聚合立方体，复用原始 `0=ALL` 思想。

### 14.3 MVP 当前实现方向

```text
big365_records（原始记录表）
  ├── time_key + 业务化维度列 + 指标列 + JSON 扩展
  ├── 1 条原始数据 = 1 行写入
  ├── 查询时通过普通 SQL 聚合（GROUP BY / SUM）
  └── 为后续预计算聚合立方体保留数据基础
```

这样既吸收了原始「多维坐标空间」的思想，又在 MVP 阶段保持了低复杂度和灵活演进的能力。
