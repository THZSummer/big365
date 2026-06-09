# Technical Plan: big365-v2

> Feature: `big365-v2`  
> 标识符: `FR-BIG365-V2`  
> 状态: `planned`  
> 来源规范: `.sddu/specs-tree-root/specs-tree-big365-v2/spec.md`  
> 基于: `FR-BIG365-MVP`（MVP 已交付并验证）  
> 创建日期: `2026-06-10`  
> Plan 阶段结论: 在 MVP 已验证架构上增量增强 6 大能力域，不推翻 ADR-002，不新增工程，所有改动在现有 big365-api 和 big365-web 内部增量进行。

---

## 1. 前置条件检查

### 1.1 Spec 文件

| 检查项 | 结果 |
|---|---|
| 规范文件 | `.sddu/specs-tree-root/specs-tree-big365-v2/spec.md` |
| 是否存在 | ✅ 是（625 行） |
| Feature | `big365-v2` |
| 规范状态 | `specified` |
| Must Have FR | 27 条（M1~M6） |
| Should Have FR | 10 条（S1~S6） |
| Could Have FR | 6 条（C1~C6） |
| NFR | 10 条 |
| 边界情况 | 15 条 |
| 用户故事 | 7 条 |

### 1.2 外部 API 文档缓存

| 外部服务 | 是否需要缓存 | 处理 |
|---|---|---|
| MySQL | 否 | 数据库依赖，Compose 内置 |
| Docker/Podman Compose | 否 | 部署工具 |

> 规范第 7.8 节明确：当前规范未发现必须调用的外部第三方 HTTP API。`.sddu/api-docs/` 不存在不阻塞本次规划。

### 1.3 上游依赖检查

| 依赖项 | 状态 | 说明 |
|---|---|---|
| MVP plan.md | ✅ 已读取 | 架构决策（ADR-001~004）作为约束基准 |
| MVP plan-api.md | ✅ 已读取 | 现有 API 端点清单和包结构 |
| MVP plan-db.md | ✅ 已读取 | 0=ALL 哨兵 + 级联更新 + 日期宽列模型 |
| MVP plan-page.md | ✅ 已读取 | 现有 6 页面状态和组件树 |
| ADR-002（Space 预计算模型） | ✅ ACCEPTED | V2 不推翻，仅扩展查询/删除能力 |
| ADR-003（异步演示数据生成） | ✅ ACCEPTED | V2 预置初始化不走异步 Job，走同步 CLI Runner |
| 现有代码 big365-api | ✅ 已审计 | SpaceController/Service/Repository/Mapper 现状已掌握 |
| 现有代码 big365-web | ✅ 已审计 | HomePage/SpacePage/client.ts/types.ts 现状已掌握 |

---

## 2. 架构分析

### 2.1 现有架构影响

V2 所有改动在 MVP 现有架构内部增量进行，不引入新顶层工程、不推翻已有 ADR。

```text
big365/
├── big365-api/                          ← V2 增强点
│   ├── src/main/java/org/big365/api/
│   │   ├── Big365ApiApplication.java    ← 新增 DefaultDataInitializer Runner
│   │   ├── space/
│   │   │   ├── SpaceController.java     ← 扩展 query + 新增 list + delete
│   │   │   ├── SpaceService.java        ← 新增区间查询/列表/删除逻辑
│   │   │   ├── SpaceRepository.java     ← 新增区间遍历/列表查询/删除方法
│   │   │   └── SpaceMapper.java         ← 不变（空接口）
│   │   ├── demo/
│   │   │   └── DefaultDataInitializer.java  ← 新增
│   │   └── common/
│   │       └── ErrorCode.java           ← 新增 4 个 V2 错误码
│   ├── src/main/resources/mapper/
│   │   └── SpaceMapper.xml              ← 新增 listSpaceCells/deleteCells/deleteOrphanCoords SQL
│   └── src/test/java/                   ← 新增 JUnit 5 测试
│       ├── space/SpaceServiceTest.java
│       ├── dimension/DimensionServiceTest.java
│       └── demo/DemoDataGeneratorTest.java
│
├── big365-web/                          ← V2 增强点
│   └── src/
│       ├── pages/HomePage.tsx           ← 改造为预置数据直展模式
│       ├── pages/SpacePage.tsx          ← 新增时间区间选择 + 列表视图 + 删除交互
│       ├── pages/DocsPage.tsx           ← 新增 why-space-model.md 卡片
│       ├── api/space.ts                 ← 新增 listSpace/deleteSpaceCell/timeRangeQuery
│       ├── api/types.ts                 ← 新增 V2 类型定义
│       └── components/DateRangePicker.tsx ← 新增
│
├── docs/                                ← V2 新增
│   └── why-space-model.md               ← 概念模型深度文档
│
├── compose.yml                          ← 不变（预置数据初始化在后端 CLI Runner 中完成）
└── .sddu/specs-tree-root/specs-tree-big365-v2/
    ├── plan.md                          ← 本文件
    ├── ADR-V2-001~004.md                ← V2 架构决策记录
    └── ...
```

### 2.2 V2 目标逻辑架构

```mermaid
flowchart LR
    subgraph V2新增能力
        DDI[DefaultDataInitializer] -->|注册demo_logs业务| BS[BizService]
        DDI -->|生成500条预置数据| DDS[DemoDataService]
        SC_L[SpaceController.list] --> SS_L[SpaceService.listCells]
        SC_D[SpaceController.delete] --> SS_D[SpaceService.deleteCell]
    end

    subgraph V2扩展能力
        SC_Q[SpaceController.query] -->|扩展dateFrom/dateTo| SS_Q[SpaceService.queryRange]
        HP[HomePage] -->|改造数据直展| SC_Q
    end

    subgraph MVP现有
        CR[CommandLineRunner initDatabase]
        SC_W[SpaceController.write]
        DC[DimensionController]
        BC[BizController]
        DDC[DemoDataController]
    end

    DDI -->|@Order(1) 在 CR 之后执行| CR
    SC_L --> SS_L
    SC_D --> SS_D
    SC_Q --> SS_Q
    HP --> SC_Q
```

### 2.3 数据流变更

| 数据流 | MVP 现状 | V2 变更 |
|---|---|---|
| 启动数据流 | CommandLineRunner → 建 big365_biz_registry_t | **新增** DefaultDataInitializer → 注册 demo_logs + 500 条预置数据（在 CR 之后） |
| 查询数据流 | Controller → Service → Repository → 单日 SELECT | **扩展** 新增区间遍历模式：Controller → Service → 逐日调用 Repository.queryCell → 内存 SUM 聚合 |
| 列表数据流 | 无 | **新增** Controller → Service → Repository → SELECT 排除 0=ALL 行 + 分页 |
| 删除数据流 | 无 | **新增** Controller → Service → Repository → DELETE 坐标行 + 日期行 + 孤儿清理 |
| 前端首页数据流 | HomePage → GET /health | **改造** HomePage → GET /api/demo_logs/space/query（含 dateFrom/dateTo）→ 渲染数据表 |

### 2.4 新增/扩展组件清单

| 组件 | 类型 | 位置 | 职责 |
|---|---|---|---|
| `DefaultDataInitializer` | 新增 Component | `big365-api/demo/` | Compose 启动后检查并创建 demo_logs 业务 + 500 条预置数据 |
| `SpaceService.queryRange()` | 新增方法 | `big365-api/space/SpaceService.java` | 遍历日期列逐日查询 + 内存 SUM 聚合 |
| `SpaceService.listCells()` | 新增方法 | `big365-api/space/SpaceService.java` | 分页列表查询 + 维度过滤 + 排除 ALL 行 |
| `SpaceService.deleteCell()` | 新增方法 | `big365-api/space/SpaceService.java` | 硬删除 + 级联 + 禁止 ALL 行检查 |
| `SpaceRepository.listCells()` | 新增方法 | `big365-api/space/SpaceRepository.java` | MyBatis SQL 调用封装 |
| `SpaceRepository.deleteCells()` | 新增方法 | `big365-api/space/SpaceRepository.java` | 删除 SQL + 孤儿坐标清理 |
| `SpaceMapper.xml` listCells/deleteCells | 新增 SQL | `big365-api/resources/mapper/SpaceMapper.xml` | 动态 SQL 模板 |
| `DateRangePicker` | 新增组件 | `big365-web/components/` | 日期区间选择器 |
| `HomePage` 预置数据区 | 改造 | `big365-web/pages/HomePage.tsx` | 预置数据汇总表 + 趋势展示 |
| `SpacePage` 列表视图 | 改造 | `big365-web/pages/SpacePage.tsx` | 时间区间查询 + 列表模式 + 删除按钮 |

---

## 3. 方案对比（关键决策）

### 决策 1：DefaultDataInitializer 时序设计

#### 方案 A：独立 CommandLineRunner + @Order（推荐）

| 项目 | 内容 |
|---|---|
| 描述 | 创建 `DefaultDataInitializer` 作为第二个 `Component` 类，实现 `CommandLineRunner`，使用 `@Order(1)` 确保在建表 Runner（默认 Order 0）之后执行。初始化逻辑同步完成（注册 demo_logs + 写入 500 条数据），捕获异常降级不阻止启动。 |
| 优点 | 不修改现有 `Big365ApiApplication` 的 bean；独立类职责单一；`@Order` 语义清晰；Spring 原生编排。 |
| 缺点 | 需要在 Application 类中或用 `@Component` 注册；与建表 Runner 有耦合（共享 DataSource）。 |
| 风险评估 | 低。现有 initDatabase Runner 无 @Order（默认 Order=0），V2 用 @Order(1) 保证顺序。 |
| 预估工作量 | 1 人日 |

#### 方案 B：在现有 initDatabase Runner 中内联

| 项目 | 内容 |
|---|---|
| 描述 | 在 `Big365ApiApplication.initDatabase()` 方法尾部追加 demo_logs 初始化逻辑。 |
| 优点 | 只有一个 Runner，无需 @Order；代码集中。 |
| 缺点 | 现有 Runner 方法变长；破坏单一职责；初始化逻辑与建表耦合；难以独立测试。 |
| 风险评估 | 中。长时间运行的初始化逻辑嵌入建表方法，降低可维护性。 |
| 预估工作量 | 0.5 人日 |

> **推荐方案 A**，解耦建表和初始化职责，便于独立测试和维护。对应 ADR：`ADR-V2-001`。

---

### 决策 2：时间区间查询实现策略

#### 方案 A：应用层遍历日期列 + 内存 SUM 聚合（推荐）

| 项目 | 内容 |
|---|---|
| 描述 | 在 `SpaceService.queryRange()` 中，解析 dateFrom→dateTo 生成日期列表，循环调用 `SpaceRepository.queryCell()` 逐日查询相同坐标组合，内存中累加 SUM 并记录 scannedDates/aggregationMethod 元数据。 |
| 优点 | 完全复用现有 `queryCell` 和 `SpaceMapper.xml`；不改动数据库层；实现简单直接；可精确控制逐日查询的异常处理；符合 Spec NG-V2-009 "不引入动态 UNION ALL"。 |
| 缺点 | 多日查询产生 N 次 DB 往返（30 天 = 30 次 SELECT）；大数据量时网络开销明显。 |
| 风险评估 | 低。预置数据 ~500 条/30 天，30 次 SELECT 耗时远 < 1 秒；万级数据/90 天亦可控制在 3 秒内（NFR-V2-002）。 |
| 预估工作量 | 1 人日 |

#### 方案 B：单次多列 SELECT UNION ALL

| 项目 | 内容 |
|---|---|
| 描述 | 在 `SpaceMapper.xml` 中拼接 N 个 SELECT 子句，通过 `UNION ALL` 合并为单次查询。 |
| 优点 | 单次 DB 往返；可在 SQL 层面直接 SUM。 |
| 缺点 | 违反 Spec NG-V2-009（不引入动态 UNION ALL）；SQL 拼接复杂且长度随日期数线性增长（365 天 = 极长 SQL）；MyBatis `${}` 占位符拼接风险高；调试困难。 |
| 风险评估 | 中高。长 SQL 可能超过 MySQL `max_allowed_packet` 或 MyBatis 参数限制；安全审计难度大。 |
| 预估工作量 | 1.5 人日 |

> **推荐方案 A**。虽然逐列查询有 N 次往返，但在首版数据规模下性能完全可接受，且符合 Spec 明确约束。未来若数据量增长，可在后续版本引入并行查询或 DB 端批量查询优化。

---

### 决策 3：列表端点的 Mapper SQL 设计

#### 方案 A：单条动态 SQL + 排除 ALL 行（推荐）

| 项目 | 内容 |
|---|---|
| 描述 | 在 `SpaceMapper.xml` 中新增 `listSpaceCells` 语句，使用 `<where>` 动态拼接维度过滤条件（排除值为 0 的列），配合 `LIMIT`/`OFFSET` 分页，以及 `COUNT(*)` 查询总数。 |
| 优点 | 单次 SQL 返回分页结果 + 总数；动态条件灵活可扩展；与现有 DimensionMapper.xml 风格一致。 |
| 缺点 | ALL 行过滤需要遍历所有坐标列添加 `AND a!=0 AND b!=0 ...`；分页需要两次 DB 访问（count + select）。 |
| 风险评估 | 低。SQL 实现清晰，测试覆盖容易。 |
| 预估工作量 | 0.5 人日 |

**SQL 草案**：

```sql
SELECT * FROM `${tableName}`
<where>
    <foreach collection="coordColumns" item="col">
        AND `${col}` != 0
    </foreach>
    <if test="dimFilters != null and dimFilters.size() > 0">
        <foreach collection="dimFilters" item="filter">
            AND `${filter.col}` = #{filter.val}
        </foreach>
    </if>
</where>
ORDER BY `${dateColumn}` DESC
LIMIT #{limit} OFFSET #{offset}
```

---

### 决策 4：删除端点的级联处理策略

#### 方案 A：收集坐标组合 → 批量 DELETE（推荐）

| 项目 | 内容 |
|---|---|
| 描述 | ① 校验 coordinates 中无 ALL 值（任意维度 = 0 → 拒绝）；② 查询坐标组合表获取受影响的行 ID 列表；③ 若指定 date，DELETE 该日期的行；④ 若未指定 date，DELETE 该坐标组合的所有日期行；⑤ 检查坐标组合表是否还有该 coordinate_id 的引用：无 → 删除坐标组合行（孤儿清理）。 |
| 优点 | 一次收集全部受影响坐标后批量删除，SQL 高效；ALL 行拦截在应用层清晰可控；孤儿清理逻辑完备。 |
| 缺点 | 需要两次查询（坐标定位 + 引用检查）。 |
| 风险评估 | 低。删除操作频率低，两次查询开销可忽略。 |
| 预估工作量 | 0.5 人日 |

---

## 4. 推荐方案总结

| 决策编号 | 决策内容 | 推荐方案 | 对应 ADR |
|---|---|---|---|
| D1 | DefaultDataInitializer 时序 | 方案 A：独立 CommandLineRunner + @Order(1) | ADR-V2-001 |
| D2 | 时间区间查询策略 | 方案 A：应用层遍历日期列 + 内存 SUM 聚合 | ADR-V2-002 |
| D3 | 列表端点 SQL | 方案 A：动态 SQL + WHERE col!=0 | —（实现细节） |
| D4 | 删除级联策略 | 方案 A：收集坐标 → 批量 DELETE → 孤儿清理 | ADR-V2-003 |
| D5 | 首页预置数据展示 | 预设查询模式（见 §5.6） | ADR-V2-004 |
| D6 | Java 单元测试 Mock 策略 | Mock MyBatis Mapper 层（见 §5.5） | —（实现细节） |

---

## 5. 关键技术决策

### 5.1 DefaultDataInitializer 设计

**类路径**: `big365-api/src/main/java/org/big365/api/demo/DefaultDataInitializer.java`

```java
@Component
@Order(1)  // 在 initDatabase Runner（默认 Order 0）之后执行
@Slf4j
@RequiredArgsConstructor
public class DefaultDataInitializer implements CommandLineRunner {

    private final BizService bizService;
    private final BizRepository bizRepository;
    private final DemoDataService demoDataService;
    private final DemoDataGenerator demoDataGenerator;
    private final SpaceService spaceService;
    private final SpaceRepository spaceRepository;
    // ... 健康状态持有者（可选注入）

    @Override
    public void run(String... args) {
        try {
            if (bizRepository.bizExists("demo_logs")) {
                log.info("Default business 'demo_logs' already exists, skipping initialization");
                return;  // 幂等
            }
            log.info("Initializing default business: demo_logs...");
            initializeDefaultBusiness();
            log.info("Default business 'demo_logs' initialized successfully");
        } catch (Exception e) {
            log.error("Default data initialization failed: {}", e.getMessage(), e);
            // 降级：不阻止启动，健康检查反映 warning
        }
    }

    private void initializeDefaultBusiness() {
        // 1. 注册 demo_logs 业务 + 创建表
        // 2. 同步生成 500 条预置数据
        // 3. 遍历 Vector 批量写入 space 表
    }
}
```

**预置数据规格**:

| 参数 | 值 |
|---|---|
| 业务名 | `demo_logs` |
| 业务标签 | 日志分析示例 |
| 维度 | 5 个：`app`(1~3), `endpoint`(1~5), `statusCode`(200/404/500), `env`(1~2), `region`(1~3) |
| 日期范围 | 当前日期倒推 30 天 |
| 数据量 | ~500 条 |
| 生成方式 | 同步写入（复用 DemoDataGenerator.generateBatch + SpaceService.write） |

对应 ADR：`ADR-V2-001`。

### 5.2 时间区间查询设计

**在 SpaceController.query() 中扩展参数解析**:

```java
@GetMapping("/api/{biz}/space/query")
public ApiResponse<SpaceQueryResponse> query(
        @PathVariable String biz,
        @RequestParam Map<String, String> allParams) {

    // 新增：解析 dateFrom / dateTo
    String dateFrom = allParams.remove("dateFrom");
    String dateTo = allParams.remove("dateTo");

    if (dateFrom != null && dateTo != null) {
        // 区间查询模式
        return ApiResponse.ok(spaceService.queryRange(biz, coordinates, dateFrom, dateTo));
    }

    if (dateFrom != null && dateTo == null) {
        // dateFrom 等同于 date
        allParams.put("date", dateFrom);
    }

    // 兼容原有单日查询
    return ApiResponse.ok(spaceService.query(biz, coordinates, allParams.get("date")));
}
```

**SpaceService.queryRange() 实现思路**:

```java
public SpaceQueryResponse queryRange(String biz, Map<String, Integer> coords,
                                       String dateFrom, String dateTo) {
    // 1. 校验 dateFrom <= dateTo
    // 2. 计算日期间隔，超过 365 天设置 warning
    // 3. 生成日期列表
    // 4. 逐日调用 spaceRepository.queryCell()
    // 5. 内存 SUM 聚合
    // 6. 返回 scannedDates + aggregationMethod=SUM + warning
}
```

**日期范围校验**:
- 软限制 365 天（warning 不拒绝，符合 FR-V2-013）
- 日期格式 `yyyyMMdd` 校验
- `dateFrom > dateTo` → 参数错误

对应 ADR：`ADR-V2-002`。

### 5.3 列表端点设计

**新增端点**: `GET /api/{biz}/space/list`

```text
请求参数：
  pageNo=1         (默认 1)
  pageSize=20      (默认 20, 最大 200)
  dimensions=app:1,statusCode:200  (可选过滤，key:value 逗号分隔)

SQL 策略（SpaceMapper.xml 新增 listSpaceCells）：
  1. 获取该业务的坐标列列表（从 dimensions_t）
  2. WHERE 子句：排除所有坐标列中值为 0 的行（不在列表中显示 ALL 汇总行）
  3. 如有 dimensions 过滤参数，追加 AND 条件
  4. COUNT(*) 获取总数
  5. SELECT * + LIMIT/OFFSET 分页
  6. 返回 PageResponse<SpaceCellDto>
```

**SpaceCellDto**（新增）:
```java
public class SpaceCellDto {
    private Long id;
    private Map<String, Integer> coordinates;  // 所有坐标列的非零值
    private String date;
    private Long value;
}
```

**排除 ALL 行的 SQL 条件生成**:
```java
// 根据该业务的实际维度数动态生成
// 如 5 维度：WHERE a != 0 AND b != 0 AND c != 0 AND d != 0 AND e != 0
String allRowFilter = coordColumns.stream()
    .map(col -> "`" + col + "` != 0")
    .collect(Collectors.joining(" AND "));
```

### 5.4 删除端点设计

**新增端点**: `DELETE /api/{biz}/space/delete`

```text
请求体：
{
  "coordinates": { "app": 1, "endpoint": 3, "statusCode": 200, "env": 1, "region": 2 },
  "date": "20260601"    // 可选
}

处理流程：
1. 校验 biz 是否存在
2. 校验 coordinates 中无 ALL 值（任意维度 = 0 → FORBIDDEN_DELETE_ALL_ROW）
3. 校验 coordinates 的维度名与业务维度表一致
4. 在 space 表中定位坐标组合
   - 若不存在 → NOT_FOUND
5. 删除：
   a. 若指定 date → DELETE FROM space_t WHERE 坐标匹配（逐列）→ 1 行
      // 注意：需要从空间表中实际删除行，而非仅设 value=0
   b. 若未指定 date → 收集所有匹配坐标的行 ID 列表 → 批量 DELETE
      // Space 模型限制：无法直接删除行，因为主键是坐标组合
      // 需要遍历所有日期列，或先 DELETE 整行再重建不含 date 的
6. 孤儿坐标清理：检查该坐标组合是否还有其他日期引用
   - 无 → 删除坐标组合行
7. 返回 deletedRows
```

**关键点**：Space 模型的主键是坐标组合（不含日期），所以删除"某坐标某日期的数据"在表结构上意味着：
- **删除整行**（因为行 = 坐标组合），这会导致该坐标的所有日期数据都丢失
- **替代方案**：将对应日期列的值设为 0（UPDATE SET `dateColumn`=0），保持行结构

⚠️ **重要澄清**：基于 Space 模型的宽列表结构，日期是列而非行。因此：
- 指定 `date` 的删除 → 将该日期的列值 **重置为 0**（UPDATE SET `dateColumn` = 0）
- 未指定 `date` 的删除 → 删除整行
- 删除后若所有日期列值都为 0 → 清理该坐标组合行（孤儿清理）

**修订后的删除策略**:

```java
public DeleteResult deleteCell(String biz, Map<String, Integer> coordinates, String date) {
    // 1. ALL 行检查
    if (coordinates.values().stream().anyMatch(v -> v == 0)) {
        throw new BusinessException(ErrorCode.FORBIDDEN_DELETE_ALL_ROW);
    }

    // 2. 坐标存在性检查
    // ...

    // 3. 删除操作
    if (date != null) {
        // 指定日期：将该日期列值设为 0
        spaceRepository.zeroOutColumn(biz, coordinates, date);
        // 检查是否所有日期列都为 0 → 清理该行
        if (spaceRepository.isAllColumnsZero(biz, coordinates)) {
            spaceRepository.deleteRow(biz, coordinates);
        }
    } else {
        // 未指定日期：删除整行
        spaceRepository.deleteRow(biz, coordinates);
    }
}
```

对应 ADR：`ADR-V2-003`。

### 5.5 Java 单元测试设计

**测试基础设施**:

| 项目 | 决策 |
|---|---|
| 框架 | JUnit 5 + Mockito |
| 位置 | `big365-api/src/test/java/org/big365/api/` |
| 运行方式 | `mvn test -pl big365-api` |
| Mock 策略 | Mock MyBatis Mapper（使用 `@Mock` Mockito）+ 部分集成 Spring Test Context |
| 测试数据 | 内联构造（不使用 Testcontainers） |

**测试类清单**:

| 测试类 | 覆盖方法 | 用例数（最低） | 覆盖 FR |
|---|---|---|---|
| `SpaceServiceTest` | `generateCoordinateCombinations()`, `queryRange()`, `listCells()`, `deleteCell()` | ≥8 | FR-V2-040, FR-V2-010~015 |
| `DimensionServiceTest` | `create()`, `update()`, `disable()`, `validate()` | ≥6 | FR-V2-041 |
| `DemoDataGeneratorTest` | `createParameters()`, `generateBatch()` | ≥5 | FR-V2-042 |

**SpaceServiceTest 核心用例**:

```java
@ExtendWith(MockitoExtension.class)
class SpaceServiceTest {

    @Mock SpaceRepository spaceRepository;
    @Mock BizRepository bizRepository;
    @InjectMocks SpaceService spaceService;

    @Test
    void generateCoordinateCombinations_2dim_returns4() {
        Map<String, Integer> leaf = Map.of("a", 3, "b", 7);
        List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);
        assertEquals(4, result.size());  // 2^2
        // 验证包含 (0,0), (3,0), (0,7), (3,7)
    }

    @Test
    void generateCoordinateCombinations_5dim_returns32() {
        // 2^5 = 32
    }

    @Test
    void generateCoordinateCombinations_0dim_returns1() {
        // 边界：空维度 → 1 行 (空坐标)
    }

    @Test
    void queryRange_7days_sumsCorrectly() {
        when(spaceRepository.queryCell(any(), any(), eq("20260601"))).thenReturn(100L);
        when(spaceRepository.queryCell(any(), any(), eq("20260602"))).thenReturn(200L);
        // ...
        // 验证 sum = 100+200+...
    }
}
```

**不测试的内容（由 Python 集成测试覆盖）**: Controller 层 HTTP 请求/响应、数据库实际写入、前端交互。

### 5.6 首页预置数据展示设计

**HomePage 改造方案**:

```
HomePage 状态机：
┌──────────────┐     demo_logs 存在      ┌──────────────────────┐
│  加载中       │ ──────────────────────→ │  预置数据直展模式      │
│  (Loading)   │                          │  - 最近 7 天汇总表     │
└──────────────┘                          │  - 下钻入口按钮        │
       │                                  │  - 健康检查面板        │
       │ demo_logs 不存在                  └──────────────────────┘
       │ 或查询失败                                │
       ↓                                          │ 用户删除 demo_logs
┌──────────────┐                                  ↓
│  降级展示      │                          ┌──────────────────────┐
│  - 概念卡片    │    ←─────────────────────│  降级展示              │
│  - 健康检查    │    刷新后回退            │  (同左)               │
│  - 快速入口    │                          └──────────────────────┘
└──────────────┘
```

**API 调用链**:

```typescript
// HomePage 加载时
useEffect(() => {
  // 1. 检查健康
  checkHealth();

  // 2. 检查 demo_logs 是否存在
  listBiz().then(bizList => {
    if (bizList.items.find(b => b.bizName === 'demo_logs')) {
      // 3. 获取预置数据：最近 7 天每个 app 的总请求量
      const today = getToday();
      const sevenDaysAgo = getDateBefore(7);
      // 对每个 app (1,2,3) 执行时间区间查询
      Promise.all([1,2,3].map(app =>
        querySpace('demo_logs', {
          coordinates: { app, endpoint: 0, statusCode: 0, env: 0, region: 0 },
          dateFrom: sevenDaysAgo,
          dateTo: today
        })
      )).then(results => {
        setDemoData(/* 构建汇总表数据 */);
      }).catch(() => {
        // 降级到概念卡片模式
        setShowFallback(true);
      });
    } else {
      setShowFallback(true);
    }
  });
}, []);
```

**展示区布局**:

```
┌─────────────────────────────────────────────────────┐
│  🟢 服务运行正常    （后端 v2.0 / MySQL OK）         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 预置演示：日志分析 (demo_logs)                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 最近 7 天各应用请求量趋势                          │ │
│  │                                                 │ │
│  │ 日期      │ app=order-svc │ app=user-svc │ app=pay ││
│  │ 2026-06-10│    15,200     │    18,350    │ 12,100  ││
│  │ 2026-06-09│    14,800     │    17,200    │ 11,800  ││
│  │ ...       │    ...        │    ...       │ ...     ││
│  │                                                 │ │
│  │ 汇总      │   102,500     │   118,600    │ 85,300  ││
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  [🔍 进入下钻分析]  → /biz/demo_logs/space            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📚 核心概念                                         │
│  [坐标空间] [上卷查询] [级联更新] [零聚合]              │
└─────────────────────────────────────────────────────┘
```

对应 ADR：`ADR-V2-004`。

### 5.7 Compose 文件影响

| 文件 | 影响 | 说明 |
|---|---|---|
| `compose.yml` | **不变** | 预置数据初始化在后端 CommandLineRunner 中完成，Compose 编排不变 |
| `compose.podman.yml` | **不变** | 同上 |
| `.env.example` | **不变** | 环境变量无新增 |

---

## 6. 文件影响分析

### 6.1 后端（big365-api）

```text
[NEW] big365-api/src/main/java/org/big365/api/demo/DefaultDataInitializer.java
      — CommandLineRunner, @Order(1), 幂等检查 + 注册 demo_logs + 生成 500 条预置数据

[MODIFY] big365-api/src/main/java/org/big365/api/space/SpaceController.java
      — query() 扩展 dateFrom/dateTo 参数解析
      — 新增 list() 端点 GET /api/{biz}/space/list
      — 新增 delete() 端点 DELETE /api/{biz}/space/delete

[MODIFY] big365-api/src/main/java/org/big365/api/space/SpaceService.java
      — 新增 queryRange(biz, coords, from, to)
      — 新增 listCells(biz, pageNo, pageSize, dimFilters)
      — 新增 deleteCell(biz, coords, date)

[MODIFY] big365-api/src/main/java/org/big365/api/space/SpaceRepository.java
      — 新增 listCells(biz, coordColumns, dimFilters, pageNo, pageSize)
      — 新增 zeroOutColumn(biz, coords, date) — 将指定日期列值设为 0
      — 新增 deleteRow(biz, coords) — 删除整行
      — 新增 isAllColumnsZero(biz, coords) — 孤儿坐标检查

[MODIFY] big365-api/src/main/resources/mapper/SpaceMapper.xml
      — 新增 listSpaceCells — 动态排除 ALL 行 + 分页
      — 新增 zeroOutColumn — UPDATE SET `date` = 0
      — 新增 deleteRow — DELETE FROM WHERE coordinates
      — 新增 isAllColumnsZero — 检查所有日期列
      — 新增 countSpaceCells — COUNT(*)

[MODIFY] big365-api/src/main/java/org/big365/api/common/ErrorCode.java
      — 新增 FORBIDDEN_DELETE_ALL_ROW
      — 新增 DATE_RANGE_INVALID
      — 新增 DATE_RANGE_TOO_LARGE
      — 新增 SPACE_CELL_NOT_FOUND

[NEW] big365-api/src/main/java/org/big365/api/space/dto/SpaceListResponse.java
      — 批量列表响应 DTO（含坐标列表 + 分页元数据）

[NEW] big365-api/src/main/java/org/big365/api/space/dto/DeleteSpaceRequest.java
      — 删除请求 DTO

[NEW] big365-api/src/main/java/org/big365/api/space/dto/DeleteSpaceResponse.java
      — 删除响应 DTO（deletedRows + coordinates + date）

[NEW] big365-api/src/test/java/org/big365/api/space/SpaceServiceTest.java
      — JUnit 5 + Mockito 测试 SpaceService 核心算法

[NEW] big365-api/src/test/java/org/big365/api/dimension/DimensionServiceTest.java
      — JUnit 5 + Mockito 测试 DimensionService CRUD

[NEW] big365-api/src/test/java/org/big365/api/demo/DemoDataGeneratorTest.java
      — JUnit 5 + Mockito 测试数据生成器和 DefaultDataInitializer 逻辑
```

### 6.2 前端（big365-web）

```text
[MODIFY] big365-web/src/pages/HomePage.tsx
      — 新增预置数据加载逻辑（检查 demo_logs → 时间区间查询 → 渲染汇总表）
      — 新增降级展示逻辑（demo_logs 不存在时回退到概念卡片）

[MODIFY] big365-web/src/pages/SpacePage.tsx
      — 新增时间区间查询 UI（DateRangePicker + from/to 选择）
      — 新增列表视图 Tab（切换 Query/List 模式）
      — 新增列表展示（分页表格 + 维度过滤）
      — 新增删除按钮 + 确认弹窗

[NEW] big365-web/src/components/DateRangePicker.tsx
      — 日期区间选择组件（from → to）

[MODIFY] big365-web/src/api/space.ts
      — 新增 querySpaceRange(biz, coords, dateFrom, dateTo)
      — 新增 listSpace(biz, pageNo, pageSize, dimFilters)
      — 新增 deleteSpaceCell(biz, coordinates, date)

[MODIFY] big365-web/src/api/types.ts
      — 新增 SpaceListResponse（list: SpaceCellDto[], total, pageNo, pageSize, totalPages）
      — 新增 DeleteSpaceRequest / DeleteSpaceResponse
      — 新增 DemoSummaryData

[MODIFY] big365-web/src/pages/SpacePage.tsx
      — 新增模型原理可视化区域（折叠面板 Accordion + 2^d 行数计算）

[MODIFY] big365-web/src/pages/DocsPage.tsx
      — 新增 "为什么不是普通表" 文档卡片（链接 why-space-model.md）

[MODIFY] big365-web/tests/test_home.py
      — 新增 ≥2 个测试用例：验证首页预置数据展示

[MODIFY] big365-web/tests/test_space.py
      — 新增 ≥3 个测试用例：时间区间查询 + 列表浏览 + 删除操作
```

### 6.3 文档

```text
[NEW] docs/why-space-model.md
      — 概念模型深度文档（为什么不是普通表）

[MODIFY] docs/concepts.md
      — 交叉引用 why-space-model.md
```

### 6.4 规范产物（本目录）

```text
[MODIFY] .sddu/specs-tree-root/specs-tree-big365-v2/state.json
      — 更新 status: "planned", plannedAt: "2026-06-10"

[NEW] .sddu/specs-tree-root/specs-tree-big365-v2/plan.md
      — 本文件

[NEW] .sddu/specs-tree-root/specs-tree-big365-v2/ADR-V2-001-default-data-initializer.md
[NEW] .sddu/specs-tree-root/specs-tree-big365-v2/ADR-V2-002-date-range-query-strategy.md
[NEW] .sddu/specs-tree-root/specs-tree-big365-v2/ADR-V2-003-hard-delete-strategy.md
[NEW] .sddu/specs-tree-root/specs-tree-big365-v2/ADR-V2-004-homepage-demo-data-display.md
```

### 6.5 不变的文件

```text
[NO CHANGE] compose.yml / compose.podman.yml — 预置初始化在后端 CLI Runner 中完成
[NO CHANGE] big365-api/src/main/java/org/big365/api/biz/ — 业务注册逻辑不变
[NO CHANGE] big365-api/src/main/java/org/big365/api/dimension/ — 维度 CRUD 不变
[NO CHANGE] big365-api/src/main/java/org/big365/api/demo/DemoDataController.java — 现有异步 Job 接口保留
[NO CHANGE] big365-api/src/main/java/org/big365/api/model/ — Vector/Coordinate 概念模型不变
[NO CHANGE] big365-web/src/pages/BizPage.tsx — 业务注册页面不变
[NO CHANGE] big365-web/src/pages/DimensionsPage.tsx — 维度管理页面不变
[NO CHANGE] big365-web/src/pages/DemoDataPage.tsx — 演示数据页面不变（异步 Job 功能保留）
```

---

## 7. 风险评估与缓解措施

| 风险类别 | 风险 | 影响 | 概率 | 缓解措施 |
|---|---|---|---|---|
| 技术风险 | 时间区间查询逐列 SELECT 在大数据量时性能下降 | 中 | 中 | 首版数据量小（500 条/30 天），NFR 定义 3 秒内返回；超过 365 天返回 warning；后续版本可引入并行查询或 DB 端优化 |
| 技术风险 | 删除操作导致 Space 表行结构不一致（某坐标行所有日期列为 0） | 低 | 低 | DELETE 后自动孤儿清理检查；写入时 INSERT ... ON DUPLICATE KEY UPDATE 可重建行 |
| 技术风险 | 预置数据初始化在低配机器上耗时过长 | 中 | 低 | 500 条规模下预计 <10 秒；超时可在日志中反映；健康检查反映 warning 状态 |
| 技术风险 | DefaultDataInitializer 与现有 initDatabase 有竞争条件 | 中 | 低 | `@Order(1)` 确保在建表 Runner 之后执行；`bizExists()` 幂等检查；try-catch 降级 |
| 技术风险 | 硬删除后级联更新未触发（ALL 行数据不一致） | 高 | 低 | 禁止删除 ALL 行（FORBIDDEN_DELETE_ALL_ROW）；删除叶子坐标后不影响 ALL 行数据（ALL 行保留历史累积值） |
| 依赖风险 | JUnit 5 + Mockito 依赖缺失 | 低 | 低 | spring-boot-starter-test 已包含 JUnit 5 和 Mockito；仅需在 pom.xml 确认（已验证已有） |
| 兼容风险 | V2 新增端点破坏 MVP 现有 API | 高 | 低 | 复用统一响应格式 ApiResponse<T>；GET query 端点向后兼容单日查询参数 |
| 安全风险 | 删除端点 SQL 注入 | 中 | 低 | 所有 dimension columnName 从数据库维度表获取（非用户直接输入）；bizName 已被过滤为 `[a-z0-9_]` |

---

## 8. 实施顺序建议

| 阶段 | 工作包 | 主要产出 | 依赖 |
|---|---|---|---|
| 1 | DefaultDataInitializer + 预置数据 | `DefaultDataInitializer.java`、demo_logs 业务 + 500 条数据 | 无（复用现有 BizService/DemoDataGenerator） |
| 2 | 时间区间查询 | SpaceController/SpaceService/SpaceRepository 查询扩展 | 阶段 1（可用 demo_logs 验证） |
| 3 | 列表端点 + 删除端点 | SpaceController/SpaceService/SpaceRepository 新增；Mapper XML；ErrorCode 扩展 | 阶段 2 |
| 4 | 前端 HomePage 改造 + SpacePage 扩展 | HomePage 预置数据直展、DateRangePicker、列表视图、删除交互 | 阶段 1-3 |
| 5 | Java 单元测试 | SpaceServiceTest / DimensionServiceTest / DemoDataGeneratorTest | 阶段 1-3 |
| 6 | 文档 + 模型可视化 | why-space-model.md、DocsPage 更新、SpacePage Accordion | 阶段 1-5 |
| 7 | Playwright 测试补充 + 全量回归 | test_home.py / test_space.py 新增用例 | 阶段 4-6 |
| 8 | Review 残留项修复（S5/S6） | 维度唯一约束 DDL、乐观锁、文档链接 target=_blank | 阶段 1-7 |

---

## 9. 需求追踪矩阵

### 9.1 Must Have 能力域 ↔ 实现方案

| FR 编号 | 需求 | 实现文件/方法 | 验证方式 |
|---|---|---|---|
| FR-V2-001 | Compose 启动自动创建 demo_logs | `DefaultDataInitializer.run()` | 首次 Compose 启动后 `GET /api/biz/list` |
| FR-V2-002 | 5 维度预置 | `DefaultDataInitializer` 维度定义 | `GET /api/demo_logs/dimensions` |
| FR-V2-003 | ~500 条预置数据 | `DemoDataGenerator.generateBatch(500, ...)` | 单日查询返回非零结果 |
| FR-V2-004 | 幂等初始化 | `bizRepository.bizExists("demo_logs")` | 二次 Compose 启动数据量不变 |
| FR-V2-005 | 同步完成 + 降级 | try-catch + log.error + 健康检查 | 日志追踪 + 健康检查 |
| FR-V2-006 | 不影响自定义业务 | 仅检查 demo_logs | 注册 my_biz 并正常 CRUD |
| FR-V2-010 | dateFrom/dateTo 区间查询 | `SpaceController.query()` + `SpaceService.queryRange()` | API 测试验证 5 天汇总 |
| FR-V2-011 | dateFrom 单日等价 date | `SpaceController.query()` 参数解析 | 对比测试 |
| FR-V2-012 | dateFrom ≤ dateTo 校验 | `validateDateRange()` | 提交反向日期返回错误 |
| FR-V2-013 | 365 天 warning 不拒绝 | `queryRange()` 软限制 | 400 天查询返回 warning |
| FR-V2-014 | SUM + scannedDates 元数据 | `SpaceQueryResponse` 扩展字段 | JSON 响应检查 |
| FR-V2-015 | 维度过滤 + 区间联动 | `queryRange()` 参数合并 | 指定 app + 区间，结果仅该 app |
| FR-V2-020 | GET /api/{biz}/space/list | `SpaceController.list()` | 对 demo_logs 执行 GET |
| FR-V2-021 | pageNo/pageSize 分页 | `SpaceService.listCells()` | pageSize=50 返回 ≤50 条 |
| FR-V2-022 | dimensions 过滤 | `SpaceService.listCells()` 参数解析 | api:1,env:1 过滤 |
| FR-V2-023 | 日期倒序排列 | SQL `ORDER BY dateColumn DESC` | 第一条日期 ≥ 最后一条 |
| FR-V2-024 | 分页元数据返回 | `PageResponse<SpaceCellDto>` | total/pageNo/pageSize/totalPages |
| FR-V2-025 | 排除 ALL 行 | SQL `WHERE a!=0 AND b!=0 ...` | 结果中无 0 值坐标 |
| FR-V2-030 | DELETE 端点 | `SpaceController.delete()` | 写入后删除 → 查询验证 |
| FR-V2-031 | 硬删除 | `DELETE FROM` / `UPDATE SET dateCol=0` | 删除后查询 DB 表 |
| FR-V2-032 | 级联删除所有日期 | 未指定 date → `DELETE WHERE` 整行 | 30 天数据全部被删 |
| FR-V2-033 | 禁止删除 ALL 行 | `coordinates.values().anyMatch(v==0)` | 删除 app=0 返回 FORBIDDEN |
| FR-V2-034 | 不存在返回 NOT_FOUND | try-catch + BusinessException | 删除不存在坐标返回错误 |
| FR-V2-035 | biz 不存在返回 404 | `bizRepository.bizExists()` 前置检查 | 对 nonexistent 调用 DELETE |
| FR-V2-040 | SpaceService 笛卡尔积测试 | `SpaceServiceTest` | `mvn test` 通过 |
| FR-V2-041 | DimensionService CRUD 测试 | `DimensionServiceTest` | `mvn test` 通过 |
| FR-V2-042 | DemoDataGenerator 测试 | `DemoDataGeneratorTest` | `mvn test` 通过 |
| FR-V2-043 | JUnit 5 + Mockito 集成 | `src/test/java` 目录 | `mvn test` |
| FR-V2-044 | 不替代 Python 集成测试 | 测试独立运行 | 两类测试均可独立运行 |
| FR-V2-050 | HomePage 自动检测 demo_logs | `HomePage.tsx` useEffect | 首页展示预置数据表 |
| FR-V2-051 | 最近 7 天汇总 + 下钻入口 | 时间区间查询 + 表格渲染 | 首页可见趋势表 + 按钮 |
| FR-V2-052 | 无 demo_logs 降级展示 | `showFallback` 状态 | 删除 demo_logs 后回退 |
| FR-V2-053 | loading/error 不阻塞渲染 | 独立状态管理 | 后端未就绪时独立展示 |
| FR-V2-054 | 使用 V2 时间区间查询端点 | `querySpace()` with dateFrom/dateTo | DevTools 网络面板验证 |

### 9.2 Should Have 能力域 ↔ 实现方案

| FR 编号 | 需求 | 实现位置 | 备注 |
|---|---|---|---|
| FR-V2-060~062 | Playwright 测试补充 | `big365-web/tests/test_home.py`, `test_space.py` | 阶段 7 |
| FR-V2-070~072 | why-space-model.md + DocsPage | `docs/why-space-model.md`, `DocsPage.tsx` | 阶段 6 |
| FR-V2-075~076 | SpacePage 模型可视化 | `SpacePage.tsx` Accordion | 阶段 6 |
| FR-V2-080 | 维度唯一约束 | DDL `ALTER TABLE ... ADD UNIQUE(biz_related, column_name)` | 阶段 8 |
| FR-V2-081 | 乐观锁 | Space 表新增 `version` 列 + Service 校验 | 阶段 8 |
| FR-V2-082 | 文档链接 target=_blank | `DocViewer.tsx` 或 `DocsPage.tsx` | 阶段 8 |

---

## 10. ADR 清单

| ADR | 决策 | 状态 |
|---|---|---|
| `ADR-V2-001` | DefaultDataInitializer 同步 CommandLineRunner + @Order(1) | PROPOSED |
| `ADR-V2-002` | 时间区间查询采用应用层遍历日期列 + 内存 SUM 聚合 | PROPOSED |
| `ADR-V2-003` | Space Cell 硬删除 + 禁止 ALL 行 + 日期列归零 → 孤儿清理 | PROPOSED |
| `ADR-V2-004` | 首页预置数据采用预设查询模式（自动检测→时间区间查询→渲染表格） | PROPOSED |

> 注意：这些 ADR 在当前 Plan 阶段状态为 **PROPOSED**，在 Build 阶段实现后更新为 **ACCEPTED**。

---

## 11. 开放问题决策结果

| Spec 开放问题 | Plan 决策 | 对应 ADR/章节 |
|---|---|---|
| OQ-V2-001 同步 vs 异步初始化 | **同步**（Compose 启动流程内完成），低配机器验证 ~10 秒内 | ADR-V2-001 §5.1 |
| OQ-V2-002 遍历策略 | **逐列 SELECT + 内存聚合**，符合 NG-V2-009 | ADR-V2-002 §5.2 |
| OQ-V2-003 列表是否返回 ALL 行 | **不返回**（FR-V2-025 已定），列表仅展示原始坐标级别数据 | §5.3 |
| OQ-V2-004 删除 ALL 行策略 | **阻止并报错**（FORBIDDEN_DELETE_ALL_ROW），不提供级联删除选项 | ADR-V2-003 §5.4 |
| OQ-V2-005 预置数据日期范围 | **当前日期倒推 30 天**，使用 `LocalDate.now().minusDays(30)` | ADR-V2-001 §5.1 |
| OQ-V2-006 首页展示形式 | **汇总表**（表格展示最近 7 天趋势），为后续图表留接口 | ADR-V2-004 §5.6 |
| OQ-V2-007 Compose 文件变更 | **不变**，预置初始化在后端 CommandLineRunner 中完成 | §5.7 |

---

## 12. 下游 Tasks 阶段提示

`@sddu-tasks big365-v2` 应将本计划拆分为可并行任务，建议按以下工作流分组：

1. **后端基础扩展**（可并行）：
   - DefaultDataInitializer + 预置数据初始化
   - ErrorCode 新增 + dto 扩展
   - SpaceMapper.xml 新增 SQL 语句

2. **后端核心逻辑**（依赖 1）：
   - SpaceService.queryRange() 时间区间查询
   - SpaceService.listCells() 列表查询
   - SpaceService.deleteCell() 删除 + 级联
   - SpaceController.list() / delete() 端点

3. **前端增强**（依赖 2）：
   - DateRangePicker 组件
   - HomePage 预置数据直展改造
   - SpacePage 列表视图 + 删除交互
   - SpacePage 模型可视化 Accordion

4. **测试**（依赖 2-3）：
   - Java 单元测试（SpaceServiceTest / DimensionServiceTest / DemoDataGeneratorTest）
   - Playwright 测试补充（test_home.py / test_space.py）

5. **文档**（可提前并行）：
   - why-space-model.md
   - DocsPage 更新

6. **Review 残留项**（依赖全部）：
   - FR-V2-080~082 实现 + 验证

每个任务必须标注关联 FR/NFR，并包含验证命令或验收步骤。

---

## 13. 验证检查清单

- [ ] `mvn test -pl big365-api` 通过（≥3 个测试类）
- [ ] `pytest big365-web/tests/ -v` 通过（现有 31 + 新增 ≥5 用例）
- [ ] Compose 首次启动：首页可见预置数据汇总表
- [ ] Compose 二次启动：demo_logs 数据量不变（幂等）
- [ ] `GET /api/demo_logs/space/query?dateFrom=...&dateTo=...` 返回正确 SUM
- [ ] `GET /api/demo_logs/space/list` 返回分页列表（不含 ALL 行）
- [ ] `DELETE /api/demo_logs/space/delete` 正确删除并可查询验证
- [ ] 禁止删除 ALL 行（FORBIDDEN_DELETE_ALL_ROW 错误）
- [ ] 现有 MVP API 向后兼容（所有 5 个 Python 集成测试通过）
- [ ] `docs/why-space-model.md` 可读且与 concepts.md 交叉引用
