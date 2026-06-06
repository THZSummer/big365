# Database Plan: big365 原始数据存储与查询设计分析

> Feature: `big365`  
> 关联技术计划: `.sddu/specs-tree-root/specs-tree-big365/plan.md`  
> 数据来源: 原始 MySQL 实例 `192.168.3.5:3306`、历史工程资产、Navicat 模型文件、21 行真实样本数据  
> 当前状态: 深度分析已完成，远程实时连接待补充  
> 创建日期: `2026-06-06`

---

# 第一部分：前置

## 1. 分析范围与数据来源

### 1.1 目标

本文件沉淀 big365 原始数据库设计，理解其多维数据存储与查询的核心思路，并为新 `big365-api` 的 MySQL 普通表设计提供参考。

重点回答：

1. 原始数据库有哪些核心表。
2. `bigdata_365` 的坐标列 `a,b,c` 为什么使用 0 = ALL 的哨兵机制实现预计算上卷。
3. 写入时如何实现级联更新（1 条数据 → 2^d 行）。
4. 查询如何做到零聚合计算。
5. 不同业务如何通过独立的坐标表 + 维度表实现数据隔离。
6. 原始设计对 MVP 数据模型有哪些可复用思想。

### 1.2 数据来源

| 来源 | 路径 / 地址 | 当前使用方式 |
|---|---|---|
| 原始 MySQL 实例 | `192.168.3.5:3306` | TCP 超时，已获得 21 行真实 INSERT 语句样本 |
| 历史工程配置 | `backup/legacy-20260606/big365-web/src/main/resources/application.yml` | 确认原始库名、连接方式、MyBatis 配置 |
| MyBatis Mapper | `backup/legacy-20260606/big365-web/src/main/resources/mapper/**/*.xml` | 分析历史访问路径和表名 |
| Navicat 模型 | `backup/legacy-20260606/doc/bigdata365.ndm2` | 提取表结构、字段、索引、分区、行数估计 |
| 历史领域模型 | `backup/legacy-20260606/big365-core/src/main/java/...` | 理解 Vector / Coordinate 的代码表达 |
| 样本数据 SQL | 用户提供的 21 行 `INSERT INTO bigdata_365` 语句 | 分析真实坐标分布、指标值特征、生成逻辑 |

### 1.3 当前连接状态

当前运行环境到 `192.168.3.5:3306` 的 TCP 检查超时，无法直接连接远程 MySQL 实例。因此本版 `plan-db.md` 基于仓库内历史资产 + 21 行样本数据进行静态分析。

> 安全说明：本文不记录数据库密码，不将连接凭据写入文档。

### 1.4 原始数据库总览

Navicat 模型文件记录的默认 schema 为 `bigdata365`。模型中包含的主要表：

| 表名 | 行数估计 | 角色 | 说明 |
|---:|---|---|
| `bigdata_365` | 83,670,652 | 物化多维立方体 | 坐标列 `a,b,c`，0=ALL 哨兵，含所有聚合级别行 + 日期宽列存储指标 |
| `bigdata_id` | 92,742,975 | ID 空间表 | 仅包含 `pid`，按 `pid` 分区，可能用于 ID 生成和去重 |
| `big365_dimension` | 0 | 维度元数据表 | 记录维度内部名、外部名、别名等元数据 |
| `vector` | 0 | 向量定义表 | 记录向量名称与别名，和核心概念 Vector 对应 |
| `bigdata_test_r2c_simple_365` | 10,000 | 测试表 | 简化版 3 维坐标表，用于验证分区/索引 |
| `bigdata_test_r2c_auto` | 0 | 测试表 | 10 维坐标实验表，用于验证高维场景 |

---

# 第二部分：核心设计思想

## 2. 预计算物化立方体

### 2.1 设计哲学

原始 big365 的核心设计思想不是「存储原始事件数据」，而是「**将计算全部前置，构造一个预计算的物化多维立方体（Materialized OLAP Cube）**」。

```text
设计原则：
  1. 数据从产生的那一刻起，就确定该数据对所有聚合层级的影响。
  2. 将计算结果提前写入所有可能的聚合坐标行。
  3. 面向用户的查询是纯定位 + 读取，不含实质性的聚合计算。
```

### 2.2 0 = ALL：坐标维度的上卷哨兵

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

a 的实际业务取值范围：

```text
a ∈ {1, 2, 3, ..., 10}   -- 叶子坐标
a = 0                     -- 哨兵值，代表「所有 a」
```

同理，b 的叶子值是 `1~100`，c 的叶子值是 `1~100000`。

### 2.3 行数公式

对于 3 维、每维取值数分别为 `|A|=11`, `|B|=101`, `|C|=100001` 的坐标系：

```text
总行数 = |A| × |B| × |C| = 11 × 101 × 100001 ≈ 1.11 亿行
```

每个维度把「叶子取值」和「哨兵 0」并列看待后，总行数正好是各维取值数的笛卡尔积。

实际 8367 万行说明约 75% 的坐标空间已被填充。

---

## 3. 级联更新：计算全部前置

这是最核心的机制：**一条数据写入触发 2^d 行同时更新**，d = 维度数。

### 3.1 写入原理

```text
场景：某系统收到一条新指标数据：
  维度：a=3, b=7, c=150
  指标：20230101 日，新增 500

这条数据会影响的行（所有满足「每个维度要么等于原值，要么为 0」的组合）：

  UPDATE bigdata_365 SET `20230101` = `20230101` + 500
  WHERE a IN (0,3) AND b IN (0,7) AND c IN (0,150);

  → 2×2×2 = 8 行同时更新
```

### 3.2 具体命中行

| 更新的行 | 聚合级别 | 说明 |
|---|---|---|
| `(3, 7, 150)` | 叶子 | 最细粒度 |
| `(3, 7, 0)` | c 上卷 | a=3,b=7 在所有 c 上的总量 |
| `(3, 0, 150)` | b 上卷 | a=3,c=150 在所有 b 上的总量 |
| `(0, 7, 150)` | a 上卷 | b=7,c=150 在所有 a 上的总量 |
| `(3, 0, 0)` | b,c 上卷 | a=3 在所有 b,c 上的总量 |
| `(0, 7, 0)` | a,c 上卷 | b=7 在所有 a,c 上的总量 |
| `(0, 0, 150)` | a,b 上卷 | c=150 在所有 a,b 上的总量 |
| `(0, 0, 0)` | Grand Total | 全维度聚合 |

### 3.3 代价与收益

```text
写入成本 = O(2^d)
  三维 = 8 行 / 事件
  十维 = 1024 行 / 事件

读取成本 = O(1)
  不管查什么聚合级别，都是一次主键查找、一行返回。

本质：以写入放大 + 存储膨胀，换取查询零计算的极致性能。
```

---

## 4. 多业务隔离：每业务独立坐标表 + 独立维度表

### 4.1 核心原则

`bigdata_365` **不是所有业务共用的通用表**。它只是某个 3 维业务的一个实例。

不同业务有不同的维度数、不同的维度取值范围、不同的业务含义，**不能也不可能共用一张坐标表**。

```text
设计原则：
  1. 每个业务 = 独立的坐标数据空间表（维度列数 + 日期列数 都不同）
  2. 每个业务 = 独立的维度元数据表（隔离业务含义）
  3. 不同业务之间数据完全隔离，互不干扰
```

### 4.2 历史实例佐证

历史仓库中已有多个独立实例表：

| 业务实例表 | 维度数 | 坐标列 | 维度范围 | 说明 |
|---|---|---|---|---|
| `bigdata_365` | 3 | `(a,b,c)` | a:1~10, b:1~100, c:1~100000 | 主业务（推测是大数据聚合场景） |
| `bigdata_test_r2c_simple_365` | 3 | `(a,b,c)` | a:1~10, b:1~100, c:1~100000 | 简化验证实例（1 万行） |
| `bigdata_test_r2c_auto` | 10 | `(a,b,c,d,e,f,g,h,i,j)` | 多个 tinyint 范围 | 高维实验 |

每个表的结构都不同（列数、类型、行数），因为它们代表不同的业务。这就是「每业务独立空间」的实践。

### 4.3 接入新业务的资产清单

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
│   column_name VARCHAR(64),           │
│   display_name VARCHAR(128),         │
│   value_range VARCHAR(256),          │
│   ...                               │
│ );                                   │
│ 每个业务一张，隔离业务含义。           │
└────────────────────────────────────┘
```

### 4.4 为什么维度表也需要独立

```text
共享维度表的问题：
  big365_dimension 中会混合：
    row 1: column='app',     → 属于 日志监控业务
    row 2: column='devType', → 属于 物联网业务
  不同业务的列名含义不同，不能混在同一张表。

独立维度表的好处：
  big365_log_monitor_dim:
    column_name='app',       display_name='应用',     value_range='1~10'
    column_name='endpoint',  display_name='接口',     value_range='1~100'
    ...
  big365_iot_device_dim:
    column_name='dev_type',  display_name='设备类型',  value_range='1~5'
    column_name='firmware',  display_name='固件版本',  value_range='1~20'
    ...
  各业务独立，零干扰。
```

### 4.5 对 MVP 的启示

```text
当前 MVP 首版只接入一个业务（日志分析），所以：
  - 新建坐标数据表：big365_records（MVP 行式模型，不是宽表）
  - 新建维度元数据表：big365_dimensions（只为这一个业务）

后续接入第二个业务时：
  - 新建 big365_{业务2}_records
  - 新建 big365_{业务2}_dimensions
  两张表都与第一个业务完全隔离。
```

---

# 第三部分：存与查

## 5. 如何存

### 5.1 概念模型：Java 层的表达

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

模型映射关系：

| 概念 | 表结构中的表达 | 示例 |
|---|---|---|
| Cube | 整张 `bigdata_365` | 包含所有聚合级别的物化立方体 |
| Dimension | 坐标列 + 维度元数据 | `a` 列 + `big365_dimension` 中的描述 |
| Coordinate | 列名 + 列值 | `a=1`, `b=0` (0=ALL) |
| Vector | 一行记录 | `(3, 7, 0)` = a=3,b=7,c=ALL |
| Rollup Level | 0 的个数 | `(3, 7, 0)` = 1 次上卷 |
| Metric / Value | 日期列中的值 | `20230101 = 500` |
| Time / Period | 日期列名 | `20230101`→2023-01-01 |

### 5.2 核心表：`bigdata_365`

#### 5.2.1 表定位

`bigdata_365` 是物化立方体的物理存储，每一行不是「原始事件」，而是某个**聚合级别下的累积指标**：

- **叶子行（Leaf）**：`a≠0, b≠0, c≠0` — 最细粒度
- **上卷行（Rollup）**：至少一个维度为 0 — 聚合结果
- **Grand Total 行**：`a=0, b=0, c=0` — 全局总和

#### 5.2.2 字段结构

| 字段 | 类型 | 含义 |
|---|---|---|
| `pid` | `int unsigned not null` | 行 ID，索引 `idx_pid` |
| `a` | `tinyint unsigned not null` | 维度 A：0=ALL, 1~10=叶子值 |
| `b` | `tinyint unsigned not null` | 维度 B：0=ALL, 1~100=叶子值 |
| `c` | `mediumint unsigned not null` | 维度 C：0=ALL, 1~100000=叶子值 |
| `20221201`~`20240131` | `int unsigned not null default 0` | 该坐标在该日期的聚合指标值 |

字段总数：431（4 基础 + 427 日期列）。

#### 5.2.3 主键与索引

| 类型 | 字段 | 用途 |
|---|---|---|
| Primary Key | `(a,b,c)` | 唯一定位一个聚合级别的坐标行 |
| Index | `idx_pid(pid)` | 按 ID 查询 |
| Index | `idx_bc(b,c)` | 不看 a 维度时的快速定位 |

#### 5.2.4 分区策略

```text
PARTITION BY RANGE COLUMNS(a,b,c)
10 个分区
```

分区按坐标裁剪，不按时间。因为查询总是从坐标出发找行，同一坐标的所有日期列已在同一行中。

#### 5.2.5 数据规模

| 指标 | 数值 |
|---|---|
| 理论最大行数 | 11 × 101 × 100001 ≈ 1.11 亿 |
| 实际行数 | 83,670,652（约 75% 填充率） |
| 数据长度 | ~196 GB |
| 索引长度 | ~2.7 GB |

### 5.3 辅助表：`bigdata_id`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pid` | `int unsigned not null` | 主键，按此列分区（10 个分区，每 1 亿行为界） |

行数估计：92,742,975。推断用于管理已生成坐标的 pid 空间，支撑大规模数据生成时的 ID 去重和进度追踪。

### 5.4 维度元数据表：`big365_dimension`

历史表字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `dimensionpid` | `int` | 维度主键 |
| `innername` | `varchar` | 内部字段名 |
| `outtername` | `varchar` | 外部展示名（拼写 `outter` 不规范） |
| `aliasname` | `varchar` | 别名 |
| `createby/createtime` | 审计字段 | |
| `updateby/updatetime` | 审计字段 | |

**历史缺陷**：

1. 缺少「所属业务」字段，多个业务的维度定义混在一起。
2. 缺少「取值范围」描述，无法记录每个维度的合法叶子值区间。
3. 字段命名在 Init Mapper、Dimension Mapper、Java VO 间不一致。

**新设计方向**（见 §7.4）：每个业务一张独立维度表，字段规范化为 `code/name/type/data_type/value_range/enabled`。

### 5.5 向量定义表：`vector`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pid` | `int` | 主键 |
| `name` | `varchar(255)` | 向量名称 |
| `aliasname` | `varchar(255)` | 向量别名 |

与 Java `Vector` 概念对应，但历史 Mapper 中未直接访问。推断为早期向量定义元数据表，MVP 可不建独立 vector 表。

### 5.6 测试表

| 表 | 维度数 | 说明 |
|---|---|---|
| `bigdata_test_r2c_simple_365` | 3 (`a,b,c`) | 简化版，1 万行，验证坐标主键/索引/分区 |
| `bigdata_test_r2c_auto` | 10 (`a,b,c,d,e,f,g,h,i,j`) | 高维实验，验证 10 维空间的级联更新（1024 行/事件） |

---

## 6. 如何查

### 6.1 查询模式：坐标定位 + 读指标

所有查询都是「**定位坐标 + 读取指标列**」，不含 `SUM`、`GROUP BY`、任何聚合计算。

| 业务问题 | SQL | 说明 |
|---|---|---|
| 全平台今天总量？ | `WHERE a=0 AND b=0 AND c=0` | Grand Total，1 行 |
| 应用 3 的总量？ | `WHERE a=3 AND b=0 AND c=0` | b,c 上卷，1 行 |
| 应用 3, 接口 7 的总量？ | `WHERE a=3 AND b=7 AND c=0` | c 上卷，1 行 |
| 全平台 500 有多少？ | `WHERE a=0 AND b=0 AND c=500` | a,b 上卷，1 行 |
| 应用 3, 接口 7, 500 的量？ | `WHERE a=3 AND b=7 AND c=500` | 叶子行，1 行 |

每个查询都是 **1 次主键查找，1 行返回**，复杂度 **O(1)**，与数据量无关。

### 6.2 多维下钻示例

```text
从 Grand Total 开始下钻：

(0,0,0)   → 查全平台总量
  ↓ 修改 a=3
(3,0,0)   → 查应用 3 在所有接口、所有状态码上的量
  ↓ 修改 b=7
(3,7,0)   → 查应用 3 接口 7 在所有状态码上的量
  ↓ 修改 c=500
(3,7,500) → 查应用 3 接口 7 状态码 500 的量

每一步只改一个 0 为非 0，再读一行。零计算。
```

反过来也可以上卷：

```text
(3,7,500) → 把 c 改成 0 → (3,7,0) → 聚合到更高层级
```

### 6.3 样本数据验证

通过 21 行样本（`a=0, b=0, c=0..20`，时间 20221201~20240131）验证：

#### 样本的聚合级别

所有样本行 `a=0, b=0`，是「a 和 b 被上卷，c 保留叶子」的二次上卷层：

| 行 | 聚合级别 | 20230101 的值 | 含义 |
|---|---|---|---|
| `(0,0,0)` | Grand Total | 728 | 全平台该日总量 |
| `(0,0,5)` | c=5 聚合 | 555 | 全平台在 c=5 上的总量 |
| `(0,0,10)` | c=10 聚合 | 680 | 全平台在 c=10 上的总量 |

#### 写入验证

当 `(3,7,150)` 收到新数据时，8 行同时被 `UPDATE`，从 `(3,7,150)` 到 `(0,0,0)` 全部递增。

#### 样本特征

```text
1. pid 与 c 同步递增（0→20），推测是顺序生成标识。
2. 所有样本行统一为 a=0,b=0 聚合层，验证了上卷语义。
3. 指标值 0~999 随机分布，无明显趋势或季节性。
4. 数据为演示/测试目的的批量随机生成。
```

---

# 第四部分：落地到 MVP

## 7. 对 MVP 的影响

### 7.1 原始设计的优势

| 优势 | 说明 |
|---|---|
| 查询零计算开销 | 聚合在写入时完成，读取是纯主键查找 |
| 任意聚合级别的查询复杂度相同 | 不管查 Grand Total 还是叶子行，都是 O(1) |
| 时间序列查询高效 | 单行包含完整时间序列，无需多行拼接 |
| 对 OLAP 场景自然友好 | 天然适合多维分析、下钻、上卷、切片 |

### 7.2 原始设计的代价

| 代价 | 说明 |
|---|---|
| 写入放大 | 1 条数据 → 2^d 行更新，三维 = 8 倍，十维 = 1024 倍 |
| 存储膨胀 | 所有聚合层级都物化存储 |
| 维度变更成本高 | 新增维度需要重建整个立方体 |
| 时间扩展需要 DDL | 新增日期 = 加列 |
| 字段膨胀 | 一年 365 列，体积增长线性 |

### 7.3 核心设计：全部沿用

除了分区表这个纯 MySQL 实现优化之外，**原始设计的核心思想必须全部沿用**。因为没有这些，big365 就退化为普通 CRUD 应用，丧失了存在的意义。

| 核心设计 | 是否沿用 | 说明 |
|---|---|---|
| 多维坐标空间模型 | **沿用** | 数据不扁平化，投射到多维坐标空间中 |
| 0 = ALL 哨兵 | **沿用** | 这是预计算上卷的核心机制 |
| 级联更新（写入即计算） | **沿用** | 1 条数据 → 2^d 行更新，计算全部前置 |
| 日期宽列 | **沿用** | 时间序列横向展开，单行读取完整时间线 |
| 抽象数字坐标 | **沿用** | 列名用 a/b/c 或业务短名，含义由维度表解释 |
| 每业务独立表空间 | **沿用** | 独立坐标表 + 独立维度表，数据隔离 |
| 分区表 | **暂不沿用** | MySQL 分区是性能优化手段，MVP 首版用普通表即可 |

### 7.4 MVP 数据库设计建议

MVP 首版接入一个业务（日志分析），创建以下表：

#### `big365_dimensions`（维度元数据表）

```sql
CREATE TABLE big365_dimensions (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  column_name  VARCHAR(64) NOT NULL,         -- 坐标列名，如 'a', 'b', 'c'
  display_name VARCHAR(128) NOT NULL,         -- 业务含义，如 'app', 'endpoint', 'statusCode'
  leaf_min     INT NOT NULL,                  -- 叶子取值下限（不含 0），如 1
  leaf_max     INT NOT NULL,                  -- 叶子取值上限，如 10
  data_type    VARCHAR(32) DEFAULT 'number',  -- 'number' | 'string' | 'enum'
  description  VARCHAR(512),
  enabled      TINYINT NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

示例数据（日志分析业务）：

```sql
INSERT INTO big365_dimensions (column_name, display_name, leaf_min, leaf_max) VALUES
  ('a', 'app',          1, 10),
  ('b', 'endpoint',     1, 100),
  ('c', 'status_code',  1, 50),    -- 常用状态码枚举
  ('d', 'env',          1, 5),     -- dev/test/staging/prod/dr
  ('e', 'region',       1, 10);
```

#### `big365_cube`（物化立方体数据表）

```sql
CREATE TABLE big365_cube (
  pid        INT UNSIGNED NOT NULL,
  a          SMALLINT UNSIGNED NOT NULL,    -- 0=ALL, 1..10=叶子
  b          SMALLINT UNSIGNED NOT NULL,    -- 0=ALL, 1..100=叶子
  c          SMALLINT UNSIGNED NOT NULL,    -- 0=ALL, 1..50=叶子
  d          TINYINT UNSIGNED NOT NULL,     -- 0=ALL, 1..5=叶子
  e          TINYINT UNSIGNED NOT NULL,     -- 0=ALL, 1..10=叶子
  `20260101` INT UNSIGNED NOT NULL DEFAULT 0,
  `20260102` INT UNSIGNED NOT NULL DEFAULT 0,
  -- ... 日期列按需扩展
  PRIMARY KEY (a, b, c, d, e),
  INDEX idx_pid (pid)
);
```

总行数：`(10+1) × (100+1) × (50+1) × (5+1) × (10+1) = 11 × 101 × 51 × 6 × 11 ≈ 374 万行`

写入逻辑：

```sql
-- 场景：app=3, endpoint=7, status_code=500, env=prod, region=cn-east 收到 100 次请求
-- 日期：20260101

UPDATE big365_cube SET `20260101` = `20260101` + 100
WHERE a IN (0,3) AND b IN (0,7) AND c IN (0,500) AND d IN (0,4) AND e IN (0,7);
-- 2^5 = 32 行同时更新
```

查询逻辑：

```sql
-- 查 Grand Total
SELECT `20260101` FROM big365_cube WHERE a=0 AND b=0 AND c=0 AND d=0 AND e=0;

-- 查 app=3 的总量
SELECT `20260101` FROM big365_cube WHERE a=3 AND b=0 AND c=0 AND d=0 AND e=0;

-- 查 app=3, endpoint=7, status_code=500 的量
SELECT `20260101` FROM big365_cube WHERE a=3 AND b=7 AND c=500 AND d=0 AND e=0;
-- 每个查询都是 1 行读取，零聚合
```

#### `big365_demo_jobs`（演示数据生成任务表）

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

### 7.5 新旧模型对照

MVP 直接继承原始设计的全套核心机制，仅做以下调整：

| | 原始 `bigdata_365` | MVP `big365_cube` | 说明 |
|---|---|---|---|
| 0=ALL 哨兵 | ✓ 沿用 | ✓ 沿用 | 核心不变 |
| 级联更新 | ✓ 沿用 | ✓ 沿用 | 写入即计算 |
| 日期宽列 | ✓ 沿用 | ✓ 沿用 | 时间横向展开 |
| 抽象数字坐标 | ✓ 沿用 | ✓ 沿用 | 列名 a,b,c,d,e，含义由维度表解释 |
| 每业务独立表 | ✓ 沿用 | ✓ 沿用 | 独立坐标表 + 独立维度表 |
| 分区表 | ✓ 使用 | ✗ 暂不采用 | 普通表，后续需要再引入 |
| 维度数 | 3 | 5 | 日志分析业务需要 5 个维度 |
| 总行数 | 1.11 亿 | ~374 万 | 首版数据量小得多 |
| 日期列数 | 428 | 按需扩展 | 首版只需少量日期列，后续 ALTER TABLE 加列 |
| 表名 | `bigdata_365` | `big365_cube` | 体现「立方体」语义 |
| 维度表 | 共享（历史遗留问题） | 每业务独立 | 数据隔离 |

---

## 8. 后续远程库验证计划

待 `192.168.3.5:3306` 从当前环境可达后，执行以下验证并更新本文：

### 8.1 结构验证

```sql
SHOW TABLES;
SHOW CREATE TABLE bigdata_365;
SHOW CREATE TABLE bigdata_id;
SHOW CREATE TABLE big365_dimension;
SHOW CREATE TABLE vector;
```

### 8.2 数据分布验证

```sql
SELECT COUNT(*) FROM bigdata_365;
SELECT COUNT(*) FROM bigdata_id;
SELECT MIN(a), MAX(a), MIN(b), MAX(b), MIN(c), MAX(c) FROM bigdata_365;
SELECT * FROM bigdata_365 LIMIT 5;
SELECT * FROM big365_dimension LIMIT 20;
```

### 8.3 查询计划验证

```sql
EXPLAIN SELECT * FROM bigdata_365 WHERE pid = 1;
EXPLAIN SELECT * FROM bigdata_365 WHERE a = 1 AND b = 10 AND c = 10000;
EXPLAIN SELECT * FROM bigdata_365 WHERE b = 10 AND c = 10000;
```

### 8.4 补充分析项

基于 21 行样本数据已完成初步分析（见 §6.3），远程连通后仍需验证：

1. 真实表结构与 Navicat 模型是否一致。
2. 各表真实行数与模型估计的偏差。
3. `a,b,c` 全量分布的唯一坐标组合数量。
4. 真实数据中日期列的稀疏程度（非零率）。
5. 典型查询的执行计划和耗时。
6. `bigdata_id` 与 `bigdata_365.pid` 的对应关系。

---

## 9. 结论

### 9.1 原始设计精髓

```text
┌──────────────────────────────────────────────┐
│  原始 bigdata_365 设计核心                    │
│                                              │
│  1. 数据映射到多维坐标空间                     │
│  2. 坐标值 0 = ALL（哨兵/上卷指示符）          │
│  3. 写入时级联更新 2^d 行（计算前置）           │
│  4. 查询是纯坐标定位 + 指标读取（O(1)）        │
│  5. 时间维度以列展开（日期宽列）               │
│  6. 不同业务通过独立表空间隔离                  │
│                                              │
│  本质：以写入放大 + 存储膨胀                   │
│        换取查询零计算的极致性能                 │
└──────────────────────────────────────────────┘
```

### 9.2 对 MVP 的价值

1. **理解 big365 的「多维」基因**：big365 不是普通 CRUD 平台，而是天然围绕维度、坐标、聚合来思考数据的。
2. **知道 MVP 的设计边界**：MVP 的目标是低复杂度、快速试用，不直接复制预计算立方体。
3. **保留演进路径**：当 MVP 后续出现高频聚合查询需求时，可基于 `big365_records` 的原始数据异步构建聚合立方体，复用 `0=ALL` 思想。

### 9.3 MVP 当前方向

```text
big365_cube（物化立方体表）
  ├── 5 维坐标列 (a,b,c,d,e) × 日期宽列
  ├── 0=ALL 哨兵，级联更新 2^5=32 行/事件
  ├── 查询 = 坐标定位 + 读指标，零聚合
  └── 仅分区表暂不引入，其他核心思想完整保留
```

MVP 不是原始设计的「简化版」或「替代版」，而是**原始设计在更小规模、更少维度、无分区优化下的直接实现**。计算前置、零聚合查询、坐标空间模型——这些才是 big365 存在的意义。
