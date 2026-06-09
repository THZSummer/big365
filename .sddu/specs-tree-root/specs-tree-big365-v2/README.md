# Directory: .sddu/specs-tree-root/specs-tree-big365-v2

## 目录简介

本目录保存 big365 V2 增强版本的 SDDU 工作流产物，当前处于 **构建（building）** 阶段，9/12 任务已完成。

`discovery.md` 记录需求挖掘结果：big365-v2 是 MVP 的增强版本，聚焦四大主攻方向 — 首次用户体验闭环（Compose 启动即见演示数据）、核心查询能力补全（时间区间查询 + 通用列表/搜索）、CRUD 删除能力补齐、测试覆盖均衡（Java 单元测试 + Playwright 全覆盖）、以及概念模型亲和力增强（降低 Space 预计算模型理解门槛）。

`spec.md` 为正式 Feature 规范，将需求细化为 **36 个 FR**（27 Must Have / 10 Should Have / 6 Could Have）+ 10 个 NFR + 15 个边缘案例 + 7 个用户故事，覆盖 6 大 Must Have FR 组。标识符为 `FR-BIG365-V2`，基于 `FR-BIG365-MVP`。

`plan.md` 为技术计划文档，将 36 个 FR 转化为可执行的技术方案。核心决策：DefaultDataInitializer 同步 CommandLineRunner + @Order(1)、时间区间查询逐列遍历 + 内存 SUM 聚合、Space Cell 硬删除 + 禁止 ALL 行 + 孤儿清理、首页预设查询模式。输出 4 份 ADR，定义 8 个实施阶段，影响 28 个文件（后端 13 + 前端 9 + 文档 2 + ADR 4）。

`tasks.md` 为任务分解文档，将技术计划拆解为 **12 个原子任务 + 5 个执行波次**。复杂度分布：S(2) + M(9) + L(1)。Wave 1 后端基础设施（ErrorCode/DTO/SQL扩展/预置初始化）→ Wave 2 后端核心逻辑（区间查询/列表/删除）→ Wave 3 测试+文档+首页 → Wave 4 前端 SpacePage 增强 → Wave 5 测试补充+Review 修复。每个任务均标注前置依赖、覆盖 FR 和验证方式。

`build.md` 为构建实现报告，按任务记录实现详情。当前记录 TASK-V2-009（前端 HomePage 预置数据直展改造）和 TASK-V2-007（Java 单元测试）。

**最新进展**：TASK-V2-007（Java 单元测试）已完工 — 3 个 JUnit 5 测试类，52 个测试用例，部署于 `big365-api/src/test/java/`，覆盖 SpaceService / DimensionService / DemoDataGenerator（FR-V2-040~FR-V2-044）。

## 目录结构

```text
specs-tree-big365-v2/
├── README.md                                          # 本文件 - big365-v2 目录导航
├── discovery.md                                       # 需求挖掘报告：big365-v2（五大差距分析、需求清单、推荐方案、成功指标）
├── spec.md                                            # Feature 规范：big365-v2（36 FR + 10 NFR + 15 边缘案例 + 7 用户故事）
├── plan.md                                            # 技术计划：big365-v2（4 ADR + 8 实施阶段 + 28 文件变更）
├── tasks.md                                           # 任务分解：big365-v2（12 任务 + 5 波次）
├── tasks.json                                         # 结构化任务数据：big365-v2（12 任务，5 波次，3 复杂度级别）
├── build.md                                           # 构建实现报告：big365-v2（Wave 3 进行中，TASK-V2-009 + TASK-V2-007 已完成）
├── state.json                                         # big365-v2 工作流状态追踪
├── ADR-V2-001-default-data-initializer.md             # ADR-V2-001：DefaultDataInitializer 同步 CommandLineRunner + @Order(1)
├── ADR-V2-002-date-range-query-strategy.md            # ADR-V2-002：时间区间查询逐列遍历 + 内存 SUM 聚合
├── ADR-V2-003-hard-delete-strategy.md                 # ADR-V2-003：Space Cell 硬删除 + 禁止 ALL 行 + 孤儿坐标清理
└── ADR-V2-004-homepage-demo-data-display.md           # ADR-V2-004：首页预置数据预设查询模式
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| [discovery.md](discovery.md) | 需求挖掘报告：big365-v2 — 基于 MVP 评价识别的五大核心差距，定义 6 Must Have + 6 Should Have + 6 Could Have 需求；推荐方案为 MVP 增量增强，不做架构推翻。 | ✅ 已完成 |
| [spec.md](spec.md) | Feature 规范：big365-v2 — 将发现阶段需求细化为 36 个 FR（6 组 Must Have：预置数据/时间区间查询/列表端点/删除端点/Java 单元测试/首页增强）、10 个 NFR、15 个边缘案例、7 个用户故事；6 个端点变更（2 新增 + 1 扩展 + 3 不变）。 | ✅ 已完成 |
| [plan.md](plan.md) | 技术计划：big365-v2 — 在 MVP 已验证架构上增量增强 6 大能力域（预置初始化/区间查询/列表+删除端点/单元测试/首页改造/文档可视化），4 个 PROPOSED ADR，8 个实施阶段，28 个文件变更（后端 13 + 前端 9 + 文档 2 + ADR 4），不推翻 ADR-002。 | ✅ 已完成 |
| [tasks.md](tasks.md) | 任务分解：big365-v2 — 12 个原子任务 + 5 个执行波次。Wave 1 后端基础设施(3) → Wave 2 后端核心逻辑(3) → Wave 3 测试+文档+首页(3) → Wave 4 前端 SpacePage 增强(1) → Wave 5 测试补充+Review 修复(2)。复杂度 S(2) + M(9) + L(1)。 | ✅ 已完成 |
| [tasks.json](tasks.json) | 结构化任务数据：big365-v2 — 12 任务 × 5 波次，含前置依赖、覆盖 FR、文件清单、验证方式。 | ✅ 已完成 |
| [build.md](build.md) | 构建实现报告：big365-v2 — 记录 TASK-V2-009（HomePage 预置数据直展，5 状态覆盖）和 TASK-V2-007（Java 单元测试，3 类 52 用例）实现详情。 | ⏳ Wave 3 进行中 |
| [state.json](state.json) | big365-v2 工作流状态追踪 — 标识符 `FR-BIG365-V2`，当前阶段 `building`，9/12 任务已完成。 | ⏳ building |
| [ADR-V2-001](ADR-V2-001-default-data-initializer.md) | ADR-V2-001：DefaultDataInitializer 采用独立 CommandLineRunner + @Order(1) 确保在建表后执行，同步完成 demo_logs 注册 + 500 条预置数据，幂等检查 + 降级启动。 | PROPOSED |
| [ADR-V2-002](ADR-V2-002-date-range-query-strategy.md) | ADR-V2-002：时间区间查询采用应用层遍历日期列 + 内存 SUM 聚合，符合 Spec NG-V2-009 约束，首版数据规模下性能可接受。 | PROPOSED |
| [ADR-V2-003](ADR-V2-003-hard-delete-strategy.md) | ADR-V2-003：Space Cell 删除采用硬删除策略（指定日期 → 列值归零，未指定 → 删整行），禁止删除 ALL 汇总行，自动孤儿坐标清理。 | PROPOSED |
| [ADR-V2-004](ADR-V2-004-homepage-demo-data-display.md) | ADR-V2-004：首页预置数据采用预设查询模式（自动检测 demo_logs → 时间区间查询最近 7 天 → 渲染汇总表 + 下钻入口），无预置数据时降级到概念卡片。 | PROPOSED |

## 构建进展

### 任务完成情况（9/12）

| 任务 | 名称 | 波次 | 复杂度 | 状态 |
|------|------|:---:|:---:|------|
| TASK-V2-001 | ErrorCode 新增 + DTO 新增 | 1 | S | ✅ 已完成 |
| TASK-V2-002 | SpaceMapper.xml SQL 扩展 + SpaceRepository 方法 | 1 | M | ✅ 已完成 |
| TASK-V2-003 | DefaultDataInitializer 预置数据初始化 | 1 | M | ✅ 已完成 |
| TASK-V2-004 | 时间区间查询实现 | 2 | M | ✅ 已完成 |
| TASK-V2-005 | 列表端点实现 | 2 | M | ✅ 已完成 |
| TASK-V2-006 | 删除端点实现 | 2 | M | ✅ 已完成 |
| TASK-V2-007 | Java 单元测试（3 类 52 用例） | 3 | L | ✅ 已完成 |
| TASK-V2-008 | 概念模型文档 + DocsPage 更新 | 3 | S | ⏳ 待执行 |
| TASK-V2-009 | 前端 HomePage 预置数据直展改造 | 3 | M | ✅ 已完成 |
| TASK-V2-010 | 前端 SpacePage 增强 | 4 | M | ⏳ 待执行 |
| TASK-V2-011 | Playwright 测试补充 | 5 | M | ⏳ 待执行 |
| TASK-V2-012 | Review 残留项修复 | 5 | M | ⏳ 待执行 |

### TASK-V2-007 亮点

- **3 个 JUnit 5 测试类**：`SpaceServiceTest`、`DimensionServiceTest`、`DemoDataGeneratorTest`
- **52 个测试用例**，覆盖 FR-V2-040 ~ FR-V2-044
- **部署位置**：`big365-api/src/test/java/org/big365/api/`
- **覆盖范围**：Space 写入/查询/区间聚合/列表/删除、Dimension CRUD、DemoData 生成与幂等

## 内容摘要

### 核心定位

big365-v2 是 MVP 的增强版本，在现有架构上增量改进，修复 MVP 评价中识别的五大核心差距，实现 **从功能闭环到体验闭环** 的升级。

### 五大核心差距

| 差距 | 严重程度 | V2 应对 |
|------|----------|---------|
| 首次用户体检路径不闭环（Compose 启动 → 空白首页） | 高 | M1 预置数据初始化 + M6 首页演示增强 |
| 组合查询核心能力缺位（无时间区间、无列表搜索） | 高 | M2 时间区间查询 + M3 通用列表/搜索 |
| CRUD 缺 D — 删除端点未实现 | 中 | M4 Space Cell 删除端点 |
| 测试覆盖不均衡（0 Java 单元测试，仅 2/6 Playwright） | 中 | M5 Java 单元测试 + S1 Playwright 补齐 |
| 概念模型与"简单接入"定位的张力 | 中低 | S2 概念模型深度文档 + S3 前端可视化 |

### 规范阶段产出（spec.md 核心指标）

| 维度 | 数量 | 说明 |
|------|------|------|
| 总 FR | 36 | 覆盖 6 大 Must Have 组 + Should/Could Have |
| Must Have FR | 27 | 6 组：预置数据（FR-2.1~2.7）、时间区间查询（FR-2.8~2.12）、列表端点（FR-2.13~2.17）、删除端点（FR-2.18~2.21）、Java 单元测试（FR-2.22~2.24）、首页增强（FR-2.25~2.27） |
| Should Have FR | 10 | 业务注册 UI、时间区间模式、WebSocket 维度推送、Playwright 补齐等 |
| Could Have FR | 6 | 可视化统计图表、模糊搜索、数据归档等 |
| NFR | 10 | 性能（≤3s 启动、≤200ms 列表）、幂等安全、向后兼容、删除语义等 |
| 边缘案例 | 15 | 并发删除、无效日期区间、空业务列表、数据库连接失败等 |
| 用户故事 | 7 | 覆盖四大用户角色（中小业务用户、后端开发者、开源评估者、项目维护者） |
| 端点变更 | 6 | 2 新增（list/delete）+ 1 扩展（query 支持区间）+ 3 不变 |

### Must Have FR 组（6 组 / 27 项）

| 组 | 编号范围 | 核心产出 |
|------|----------|---------|
| 预置数据初始化 | FR-2.1~2.7 | Compose 启动时自动初始化默认业务 + ~500 条演示数据 |
| 时间区间查询 | FR-2.8~2.12 | Space 查询支持 `dateFrom`/`dateTo` 区间聚合 |
| 通用列表/搜索端点 | FR-2.13~2.17 | `GET /api/{biz}/space/list` 分页列表 + 条件筛选 |
| Space Cell 删除端点 | FR-2.18~2.21 | `DELETE /api/{biz}/space/delete` 硬删除 + 级联 |
| Java 单元测试 | FR-2.22~2.24 | SpaceService/DimensionService/DemoDataService ≥ 3 个测试类 |
| 首页默认演示增强 | FR-2.25~2.27 | HomePage 直接展示预置数据汇总 + 下钻入口 |

### 关键决策

| 维度 | 结论 |
|------|------|
| V2 定位 | MVP 增强版，增量改进，不做架构推翻 |
| 架构红线 | 不推翻 ADR-002（Space 预计算模型），时间区间通过日期列遍历实现 |
| 预置数据 | Compose 启动时 `CommandLineRunner` 幂等初始化默认业务 + ~500 条数据 |
| 北极星指标 | 新用户 3 分钟内可见预置数据，15 分钟内完成自定义业务闭环 |
| 工程组织 | 在现有 `big365-api` 和 `big365-web` 内部增强，不新增独立工程 |
| 删除策略 | 硬删除 + 级联处理（禁止删除 0=ALL 汇总行或级联删除子节点） |

### ADR 清单（V2 专属）

| ADR | 决策 | 状态 |
|-----|------|------|
| [ADR-V2-001](ADR-V2-001-default-data-initializer.md) | DefaultDataInitializer 同步 CommandLineRunner + @Order(1)，幂等检查 + 降级 | PROPOSED |
| [ADR-V2-002](ADR-V2-002-date-range-query-strategy.md) | 时间区间查询采用应用层遍历日期列 + 内存 SUM 聚合 | PROPOSED |
| [ADR-V2-003](ADR-V2-003-hard-delete-strategy.md) | Space Cell 硬删除 + 禁止 ALL 行 + 日期列归零 → 孤儿清理 | PROPOSED |
| [ADR-V2-004](ADR-V2-004-homepage-demo-data-display.md) | 首页预置数据采用预设查询模式（自动检测 → 时间区间查询 → 渲染表格） | PROPOSED |

> 注意：这些 ADR 在 Plan 阶段状态为 **PROPOSED**，在 Build 阶段实现后更新为 **ACCEPTED**。

### 下一步

Wave 3 尚有 **TASK-V2-008**（概念模型文档 + DocsPage 更新）待执行，无前置依赖，可与 Wave 4 并行启动。完成后进入 Wave 4（TASK-V2-010 前端 SpacePage 增强）和 Wave 5（TASK-V2-011 Playwright 测试补充 + TASK-V2-012 Review 残留项修复）。

运行 `@sddu-build big365-v2` 继续构建。

## 子目录

暂无子目录。

## 上级目录

- [返回上级](../README.md)
- [返回首页](../../README.md)
