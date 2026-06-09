# ADR-V2-001: DefaultDataInitializer 同步 CommandLineRunner + @Order(1)

## 状态
PROPOSED

## 背景

V2 需要在 Compose 首次启动后自动创建默认业务 `demo_logs` 并生成 ~500 条预置演示数据（FR-V2-001~006）。现有 `big365-api` 已有一个 `CommandLineRunner` bean（`initDatabase`）负责创建 `big365_biz_registry_t` 系统表。预置数据初始化必须在数据库表结构准备就绪后进行（demo_logs 的注册需要调用 `BizService` 动态建表）。

Spec 开放问题 OQ-V2-001 要求决定初始化使用同步还是异步模式。

需要考虑的约束：
- 初始化必须在建表 Runner 之后执行（避免 `biz_registry_t` 尚不存在）
- 必须是幂等的（多次 Compose 重启不重复创建）
- 失败不能阻止服务启动（降级模式）
- ~500 条数据生成和写入需在典型开发机 10 秒内完成

## 决策

采用 **同步 CommandLineRunner + @Order(1)** 方案：

1. 创建独立的 `DefaultDataInitializer` 类，实现 `CommandLineRunner`，标记 `@Component` + `@Order(1)`
2. 现有 `initDatabase` Runner 无 `@Order` 注解（默认 Order=0），自然在建表 Runner 之后执行
3. 初始化逻辑 **同步完成**：注册 demo_logs 业务（含建表）→ 生成 500 条 Vector → 逐条写入 space 表（复用 `DemoDataGenerator.generateBatch()` + `SpaceService.write()`）
4. 幂等检查：`bizRepository.bizExists("demo_logs")` → 已存在则跳过
5. 降级处理：整个初始化包裹在 try-catch 中，失败记录 ERROR 日志但不阻止 Spring Boot 启动

### 时序设计

```
Spring Boot 启动
  │
  ├── initDatabase Runner (Order=0, 默认)
  │   └── CREATE TABLE IF NOT EXISTS big365_biz_registry_t
  │
  ├── DefaultDataInitializer Runner (Order=1)
  │   ├── 检查 demo_logs 是否存在 → 存在则跳过
  │   └── 不存在：
  │       ├── 注册 demo_logs 业务（含建 3 张表 + 维度定义）
  │       ├── 生成 500 条预置 Vector
  │       └── 逐条写入 space 表（2^5=32 行/条，共 16,000 行更新）
  │
  └── 服务就绪，接受请求
```

### 预置数据规格

```java
// 业务定义
BizRegisterRequest demoLogs = BizRegisterRequest.builder()
    .bizName("demo_logs")
    .bizLabel("日志分析示例")
    .dimensions(List.of(
        DimensionDef.of("app", "应用", 1, 3),        // 3 个应用
        DimensionDef.of("endpoint", "接口", 1, 5),    // 5 个接口
        DimensionDef.of("statusCode", "状态码", 200, 500),  // 200/404/500
        DimensionDef.of("env", "环境", 1, 2),          // 2 个环境
        DimensionDef.of("region", "区域", 1, 3)        // 3 个区域
    ))
    .dateRange(DateRange.of(now.minusDays(30), now))
    .build();

// 生成参数
DemoDataParameters params = DemoDataParameters.defaultsFor("small", dateRange);
params.setTotalRows(500);
```

## 后果

### 正面影响
- 与现有 `initDatabase` Runner 解耦，独立类职责单一
- `@Order` 语义清晰，Spring 原生编排
- 同步模式简化 Compose 启动体验（无异步任务等待）
- 幂等机制确保多次重启安全
- 复用现有 `BizService`、`DemoDataGenerator`、`SpaceService`，不引入新类

### 负面影响
- 首次 Compose 启动时间增加 ~5-10 秒（500 条数据生成 + 16,000 行空间写入）
- 若 biz_registry_t 建表失败，DefaultDataInitializer 也会失败（降级处理）
- 同步模式在极端低配机器上可能延长启动时间

### 缓解措施
- 日志记录初始化各阶段耗时（注册耗时、生成耗时、写入耗时）
- 健康检查端点可扩展 warning 状态字段反映初始化失败
- 若未来 500 条初始化耗时超过 30 秒，可考虑切换为异步模式（但需前端启动后等待）
