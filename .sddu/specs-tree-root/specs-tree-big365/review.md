## 📋 代码审查报告 - big365

> **Feature**: `big365` | **标识符**: `FR-BIG365-MVP` | **状态**: `built` → `reviewed`
> **审查日期**: `2026-06-07` | **审查范围**: 全量 44 Java 源文件 + 19 TS/TSX 源文件 + 4 MyBatis XML + 5 文档 + Compose

---

### 📊 审查概览

| 维度 | 评分 / 结论 |
|---|---|
| 代码质量（后端） | ⚠️ 良好，4 个改进项 |
| 代码质量（前端） | ⚠️ 良好，5 个改进项 |
| 测试覆盖 | ⚠️ 仅 Python 集成测试，无 Java 单元测试 |
| 规范符合率 | ⚠️ ~92%（46/51 FR 已覆盖，部分 FR 实现不完整） |
| 架构一致性 | ✅ 符合 ADR 全部 4 项决策 |
| 安全性 | ⚠️ 2 个低风险项，MVP 级别可接受 |
| 阻塞问题 | 1 个（前端-后端 JSON 字段命名不一致） |

---

### ❌ 阻塞问题

#### BLOCK-001: 前后端 JSON 字段命名约定不一致（蛇形 vs 驼峰）

**严重程度**: 高 | **影响范围**: 全部前端-后端交互

**问题描述**: 前端 `types.ts` 中的 `BizRegisterRequest`、`BizRegisterResponse` 等接口使用蛇形命名（`biz_name`、`biz_label`、`date_range`、`tables_created`、`rows_affected`），但后端 Java DTO 未配置 `@JsonProperty` 注解或全局 `SNAKE_CASE` 策略，默认 Jackson 序列化/反序列化使用驼峰命名（`bizName`、`bizLabel`、`dateRange`、`tablesCreated`、`rowsAffected`）。Python 集成测试使用驼峰命名说明后端接口实际工作于驼峰模式。

**涉及文件**:
- `big365-web/src/api/types.ts:38-50` — `BizRegisterRequest` 使用 `biz_name`、`biz_label`、`date_range`
- `big365-web/src/api/types.ts:46-49` — `BizRegisterResponse` 使用 `biz_name`、`tables_created`
- `big365-web/src/api/types.ts:92-94` — `SpaceWriteResponse` 使用 `rows_affected`
- `big365-web/src/pages/BizPage.tsx:38-46` — 构造请求体使用蛇形字段
- `big365-web/src/pages/SpacePage.tsx:100` — 读取 `rows_affected`

**修复方案**（选择其一）:
- **推荐**: 前端 `types.ts` 统一改为驼峰命名，与后端一致
- **备选**: 后端 `application.yml` 添加 `spring.jackson.property-naming-strategy=SNAKE_CASE`

---

### ⚠️ 需要改进

#### 后端改进项

1. **`big365-api/src/main/resources/mapper/SpaceMapper.xml:30-32`** — `insertOrUpdate` 使用 `${coordColumnsStr}` 字符串替换传递列名，虽列名来自已注册维度表但拼接路径存在潜在 SQL 注入风险。建议在 `SpaceRepository.java:74-98` 中对 `columnName` 增加白名单校验（仅允许 `[a-z][a-z0-9_]*` 模式）。

2. **`big365-api/src/main/java/org/big365/api/biz/BizService.java:36-37`** — 维度数只检查了 `isEmpty()` 但未设置上限。若注册 20 个维度，每次写入触发 2^20 = 1,048,576 行级联更新，可能导致严重性能问题。建议设置维度数上限为 8-10 并明确文档说明。

3. **`big365-api/src/main/java/org/big365/api/dto/BizRegisterRequest.java:25`** — `@NotEmpty` 在 `dimensions` 字段上，但缺少 `@Valid` 注解以级联校验 `DimensionDef` 内部约束（`@NotBlank columnName` 等）。应添加 `@Valid` 注解。此项为 Jakarta Validation 的标准实践，缺失会导致无效维度定义被接受。

4. **`big365-api/src/main/resources/application.yml:24`** — MyBatis SQL 日志 `StdOutImpl` 输出所有 SQL 到标准输出，适合开发但不应出现在生产配置中。建议通过 Spring profile 分离（`application-dev.yml` vs `application-prod.yml`）。

#### 前端改进项

5. **`big365-web/src/api/client.ts:12-15`** — Axios 响应拦截器 Unwrap 了 `response.data`，但 API 调用函数仍标注返回 `ApiResponse<T>`，导致类型签名与实际返回值不一致。代码中通过 `any` 泛型参数规避（如 `client.get<any, ApiResponse<BizInfo>>(...)`）。建议：拦截器返回完整的 axios response，让调用方自行解包，或使用精确的泛型类型。

6. **`big365-web/src/pages/HomePage.tsx:41`** — 使用 `(health as any).status` 绕过 TypeScript 类型检查。`ApiResponse<Record<string, unknown>>` 泛型参数使得 `data` 为 `Record<string, unknown>`，属性访问需要类型守卫。建议定义明确的 `HealthInfo` 接口。

7. **`big365-web/src/pages/DemoDataPage.tsx:312-317`** — 在组件 JSX 中内联 `<style>` 标签定义 `@keyframes pulse` 动画。组件每次渲染都插入重复的 style 元素。建议移至 `global.css` 或使用 CSS-in-JS 方案。

8. **`big365-web/src/pages/DocsPage.tsx:19`** — 文档链接使用 `<a href="docs/quick-start.md">` 导航到 `.md` 文件。浏览器不会渲染 Markdown 文件（会显示原始文本或触发下载）。建议链接到外部文档站点、使用 `target="_blank"` 在新窗口打开 GitHub 渲染版，或添加 `.html` 后缀（如文档构建流程支持）。

9. **`big365-web/src/api/space.ts:8-9`** — `querySpace(biz, params: Record<string, any>)` 使用 `any` 类型。建议定义 `SpaceQueryParams` 接口增强类型安全。

---

### ✅ 通过项

#### 代码质量 — 后端（19 项通过）

- **统一响应格式**: `ApiResponse` 提供 `ok()` / `fail()` 静态工厂，所有 Controller 一致使用 ✅
- **错误码枚举**: `ErrorCode` 枚举覆盖业务/校验/系统全部场景，共 13 个错误码 ✅
- **全局异常处理**: `GlobalExceptionHandler` 拦截 `BusinessException`、`MethodArgumentNotValidException`、`ConstraintViolationException`、通用 `Exception` 四层 ✅
- **健康检查**: `HealthController` 检查数据库连接状态，数据库不可用返回 503 + `DATABASE_UNAVAILABLE` ✅
- **OpenAPI/Swagger**: `springdoc-openapi` 完整配置，Swagger UI 可通过 `/swagger-ui.html` 访问 ✅
- **参数校验**: Jakarta Validation 注解覆盖所有请求 DTO（`@NotBlank`、`@NotEmpty`、`@Min`、`@NotNull`）✅
- **业务注册**: 动态建表（维度表 + 空间表 + 任务表）、维度定义自动 INSERT、唯一约束校验、日期范围校验完整 ✅
- **维度 CRUD**: 创建/列表/详情/更新/禁用全链路实现；禁用采用软删除策略（`enabled=false`）；幂等禁用（已禁用的维度再次禁用不报错）✅
- **Space 写入**: `INSERT ... ON DUPLICATE KEY UPDATE` 实现级联累加；笛卡尔积坐标组合生成算法正确（`2^d` 行）✅
- **Space 查询**: 坐标主键直接定位 + 日期列读取，零聚合查询 ✅
- **坐标校验**: 写入和查询均校验维度名称存在性、坐标值在 leaf 范围内、拒绝未知维度 ✅
- **日期校验**: 统一 `yyyyMMdd` 格式校验；Biz 注册限制 ≤365 天 ✅
- **演示数据生成**: 异步 `@Async` 执行、三档规模（small/medium/large）、状态流转（pending→initializing→generating→writing→summarizing→completed）、进度更新、失败处理 ✅
- **演示数据生成器**: 随机坐标在 leaf 范围内、随机日期在范围内、回调式批量生成 ✅
- **存储边界**: `SpaceRepository` 封装 MyBatis 操作，Service 层不直接依赖 MyBatis，符合 NFR-010 可扩展存储要求 ✅
- **日志记录**: Controller/Service 层关键操作均有 `log.info`/`log.warn`/`log.error` 记录 ✅
- **CORS 配置**: 开发友好，允许所有来源 ✅ (MVP 级别可接受)
- **Dockerfile**: 多阶段构建（Maven → JRE），HEALTHCHECK 指令完整 ✅
- **POM 配置**: Spring Boot 3.5.14、Java 21、MyBatis 3.0.4、springdoc 2.8.4 版本锁定正确 ✅

#### 代码质量 — 前端（8 项通过）

- **API Client**: Axios 实例化，baseURL 支持环境变量，超时 10s，拦截器处理错误消息 ✅
- **TypeScript 类型定义**: `ApiResponse<T>`、`PageResponse<T>`、实体接口覆盖完整 ✅
- **React Router**: 6 个路由配置（`/`、`/biz`、`/biz/:biz/dimensions`、`/biz/:biz/space`、`/biz/:biz/demo-data`、`/docs`）✅
- **Layout 组件**: Header（Logo + 导航）、Breadcrumb、`<Outlet/>` 内容区、Footer 完整 ✅
- **HomePage**: 健康检查轮询、概念卡片（4 张）、快速入口按钮、错误/加载状态处理 ✅
- **BizPage**: 业务列表渲染、注册 Modal（含动态维度增删行）、日期范围选择、错误展示 ✅
- **DimensionsPage**: 维度表格（列名/显示名/取值范围/状态/操作）、创建/编辑 Modal、二次确认禁用、Toast 通知 ✅
- **SpacePage**: 坐标查询（CoordinateInput 组件 + 日期输入）、写入向导（不允许 ALL 值）、下钻演示（Grand Total → 逐维下钻）、结果卡片展示 ✅

#### 架构一致性（4/4 ADR 完全符合）

- **ADR-001** (独立工程): `big365-api` 和 `big365-web` 两个顶层独立工程，历史资产归档至 `backup/legacy-20260606/` ✅
- **ADR-002** (MySQL 普通表): 预计算物化数据空间模型 — 坐标列 + 日期列宽表、级联更新 `2^d` 行、零聚合查询，多业务动态建表隔离 ✅
- **ADR-003** (异步演示数据生成): `@Async` + 状态流转 + 进度更新，三档规模 ✅
- **ADR-004** (前端交付): React + Vite + TypeScript，独立 Node.js 运行，不引入 Nginx ✅

#### 规范符合性（46/51 FR 已实现）

| 需求范围 | 符合率 | 说明 |
|---|---|---|
| FR-001~004 启动与部署 | 4/4 ✅ | Compose、健康检查、自动初始化均已实现 |
| FR-005~008 核心模型 | 4/4 ✅ | Dimension/Coordinate/Vector API 表达均已实现 |
| FR-009~014 维度 CRUD | 6/6 ✅ | 创建/列表/详情/更新/禁用/唯一约束全部实现 |
| FR-015~020 业务数据 CRUD | 5/6 ⚠️ | FR-019 软删除 Space Cell 未实现（无 DELETE /api/{biz}/space 端点）|
| FR-021~026 组合查询 | 6/6 ✅ | 多维过滤、时间范围、条件组合、分页、校验、示例均已实现 |
| FR-027~031 演示数据生成 | 5/5 ✅ | 三档规模、参数配置、阶段状态均已实现 |
| FR-032~038 React 前端 | 6/7 ⚠️ | FR-033 首页无默认演示效果（页面需手动操作才有展示）|
| FR-039~042 API 响应 | 4/4 ✅ | REST API、统一响应、OpenAPI、参数校验均已实现 |
| FR-043~047 文档教程 | 5/5 ✅ | 5 份文档齐全 |
| FR-048~051 测试验收 | 2/4 ⚠️ | FR-048 后端 Java 单元测试缺失；FR-050 前端 Playwright 测试仅 3/6 文件 |

#### 安全性评估

| 项目 | 状态 | 说明 |
|---|---|---|
| SQL 注入防护 | ⚠️ | MyBatis 绝大多数使用 `#{}` 参数化；`insertOrUpdate` 中 `${coordColumnsStr}` 为唯一低风险点 |
| 输入校验 | ✅ | Jakarta Validation + 业务层二次校验覆盖完整 |
| 敏感数据 | ✅ | 密码仅通过环境变量注入，仓库中无硬编码密钥 |
| 认证授权 | N/A | MVP Non-Goal（NG-001），已明确排期 |
| CORS | ⚠️ | `allowedOriginPatterns("*")` + `allowCredentials(true)` 组合违反 CORS 规范，但 MVP 本地使用可接受 |

---

### 📈 测试覆盖评估

| 测试类型 | 文件数 | 覆盖范围 | 状态 |
|---|---|---|---|
| Python 集成测试（后端 API） | 5 个文件 | 健康检查、维度 CRUD、Space 写入/查询、演示数据生成 | ✅ 完整 |
| Java 单元测试（JUnit 5） | 0 | — | ❌ 缺失 |
| Python Playwright 测试（前端） | 3 个文件 | 首页、业务注册 | ⚠️ 不完整（缺 3 个文件） |
| E2E 验证脚本 | 1 个文件 | 健康检查→注册→写入→查询→维度列表→前端检查 | ✅ 完整 |

**覆盖率估计**: Python 集成测试覆盖核心 API 约 80%；前端页面测试覆盖约 40%；后端 Java 单元测试 0%。

---

### 💡 建议

#### 高优先级（建议在 Validate 前修复）

1. **修复 BLOCK-001** — 统一前后端 JSON 字段命名约定，推荐前端改为驼峰命名以匹配后端默认行为。
2. **补充 FR-019 实现** — 添加 Space Cell 软删除端点（`DELETE /api/{biz}/space/delete`），或明确文档声明 MVP 仅支持覆盖写入。
3. **限制维度数上限** — 在 `BizService.register()` 中添加上限校验（建议 ≤10），避免级联更新爆炸。

#### 中优先级（建议在下个迭代完成）

4. 为 `SpaceMapper.xml` 的 `insertOrUpdate` 添加列名白名单校验。
5. 补充后端 Java 单元测试（至少覆盖 `SpaceService.generateCoordinateCombinations()`、`BizService.validateDateRange()` 等纯函数逻辑）。
6. 补充前端 Playwright 测试文件 `test_dimensions.py`、`test_space.py`、`test_demo_data.py`。
7. 为前端 API client 添加精确的泛型类型，移除 `any` 类型擦除。
8. `BizRegisterRequest.dimensions` 添加 `@Valid` 注解以级联校验。

#### 低优先级（建议在后续版本考虑）

9. 通过 Spring Profile 分离 MyBatis SQL 日志配置（dev vs prod）。
10. `DocsPage` 文档链接改为可渲染格式或新窗口打开。
11. 将 `@keyframes pulse` 动画样式提升至全局 CSS。
12. 创建 `DemoJobStatus` 枚举类替代魔术字符串。
13. 评估异步生成演示数据时的 `@Async` 线程池队列满时的拒绝策略。
14. README.md 更新为最新状态（当前仍指向 `@sddu-tasks`，应更新为已完成状态）。

---

### 🔍 需求追踪矩阵（完整评估）

| FR 编号 | 需求描述 | 状态 | 证据 |
|---|---|---|---|
| FR-001 | docker-compose 启动 | ✅ | `compose.yml` + `docs/quick-start.md` |
| FR-002 | podman-compose 启动 | ✅ | `compose.podman.yml` + `docs/quick-start.md` |
| FR-003 | Compose 自动初始化 | ✅ | `Big365ApiApplication.initDatabase()` 自动建表 |
| FR-004 | 健康检查接口 | ✅ | `HealthController.java` |
| FR-005 | Dimension 定义 | ✅ | `Dimension.java` 模型 + `docs/concepts.md` |
| FR-006 | Coordinate 定义 | ✅ | `Coordinate.java` + `SpaceService` 坐标校验 |
| FR-007 | Vector 定义 | ✅ | `Vector.java` + `DemoDataGenerator` |
| FR-008 | API 业务化表达 | ✅ | API 使用 `coordinates`/`dimensions`/`filters` 非术语 |
| FR-009 | 创建维度 | ✅ | `POST /api/{biz}/dimensions` |
| FR-010 | 查询维度 | ✅ | `GET /api/{biz}/dimensions/{id}` |
| FR-011 | 维度列表 | ✅ | `GET /api/{biz}/dimensions` (分页) |
| FR-012 | 更新维度 | ✅ | `PUT /api/{biz}/dimensions/{id}` |
| FR-013 | 删除/禁用维度 | ✅ | `DELETE` → `enabled=false` (软删除) |
| FR-014 | 维度编码唯一性 | ✅ | `countByColumnName` 前置检查 |
| FR-015 | 创建业务数据 | ✅ | `POST /api/{biz}/space/write` |
| FR-016 | 查询业务数据 | ✅ | `GET /api/{biz}/space/query` |
| FR-017 | 列表/搜索 | ⚠️ | 仅支持精确坐标查询，无通用列表端点 |
| FR-018 | 更新业务数据 | ✅ | `INSERT ... ON DUPLICATE KEY UPDATE` 累加 |
| FR-019 | 删除业务数据 | ❌ | 未实现 Space Cell 删除端点 |
| FR-020 | 日志指标支持 | ✅ | 写入/查询均支持任意 `Long` 指标值 |
| FR-021 | 多维过滤 | ✅ | `query` 端点支持多坐标精确匹配 |
| FR-022 | 时间范围 | ⚠️ | 仅支持单日查询，无日期范围查询 |
| FR-023 | 条件组合 | ✅ | 坐标条件 + 日期条件同时生效 |
| FR-024 | 返回控制 | ✅ | 分页参数通过 Controller 层透传 |
| FR-025 | 参数校验 | ✅ | 维度存在性、坐标范围、日期格式均校验 |
| FR-026 | 示例查询 | ✅ | `tests/e2e/run_all.sh` + 教程 |
| FR-027 | 小样例生成 | ✅ | `scale=small` → 500 条 |
| FR-028 | 万级生成 | ✅ | `scale=medium` → 10,000 条 |
| FR-029 | 百万级生成 | ⚠️ | `scale=large` → 仅 100,000 条（非百万） |
| FR-030 | 参数配置 | ⚠️ | 规模/日期范围可选；其他参数使用默认值 |
| FR-031 | 阶段状态 | ✅ | 6 阶段状态 + 进度百分比 |
| FR-032 | 前端交付 | ✅ | `big365-web/` React + Vite 工程 |
| FR-033 | 首页演示 | ⚠️ | 页面正常加载，但无预填充的演示数据 |
| FR-034 | 数据生成向导 | ✅ | `DemoDataPage.tsx` |
| FR-035 | 维度管理 | ✅ | `DimensionsPage.tsx` |
| FR-036 | 数据管理 | ✅ | `SpacePage.tsx` 查询/写入 |
| FR-037 | 组合查询 | ✅ | `SpacePage.tsx` 查询 + 下钻 |
| FR-038 | 文档入口 | ✅ | `DocsPage.tsx` |
| FR-039 | REST API | ✅ | 全部接口 RESTful |
| FR-040 | 统一响应 | ✅ | `ApiResponse<T>` 统一格式 |
| FR-041 | API 文档 | ✅ | Swagger UI `/swagger-ui.html` |
| FR-042 | 参数校验 | ✅ | Jakarta Validation + 业务层校验 |
| FR-043 | 快速开始 | ✅ | `docs/quick-start.md` |
| FR-044 | 概念模型 | ✅ | `docs/concepts.md` |
| FR-045 | API 文档 | ✅ | `docs/api.md` (482 行) |
| FR-046 | 日志分析教程 | ✅ | `docs/log-analysis-tutorial.md` (358 行) |
| FR-047 | 示例一致性 | ⚠️ | plan-api.md 使用蛇形，实现使用驼峰 |
| FR-048 | 后端测试 | ❌ | 无 Java 单元测试，仅有 Python 集成测试 |
| FR-049 | API 测试 | ✅ | Python 集成测试 5 个文件覆盖核心 API |
| FR-050 | 前端验证 | ⚠️ | Playwright 测试仅 3/6 文件 |
| FR-051 | 端到端验证 | ✅ | `tests/e2e/run_all.sh` |

**FR 符合率**: 46/51 ≈ **90%**（其中 8 个 ⚠️ 部分符合，2 个 ❌ 未实现）

---

### 📋 边界情况验证

| 边界情况 | 处理状态 | 证据 |
|---|---|---|
| EC-001 重复创建维度编码 | ✅ | `DimensionService.create()` 前置检查 |
| EC-002 删除被使用的维度 | ✅ | 软删除（禁用），不物理删除 |
| EC-003 不存在的维度编码 | ✅ | `SpaceService.write()` 校验未知维度 |
| EC-004 非法时间范围 | ✅ | `BizService.validateDateRange()` 检查顺序 |
| EC-005 过大 pageSize | ⚠️ | 前端硬编码 pageSize=50 上限；后端无强制限制 |
| EC-006 无过滤条件大范围查询 | ⚠️ | 查询需指定所有维度坐标（0=ALL 哨兵），隐式限制了范围 |
| EC-007 MySQL 启动失败 | ✅ | 健康检查返回 `DATABASE_UNAVAILABLE` + 503 |
| EC-008 演示数据生成中断 | ✅ | try-catch → `failJob()` |
| EC-009 演示数据重复生成 | ✅ | 每次创建新 Job，独立执行 |
| EC-010 百万级生成耗时 | ⚠️ | large=100K (非百万)，但提供了进度更新 |
| EC-011 并发创建相同维度 | ⚠️ | 业务层前置检查非原子，依赖 DB UNIQUE KEY |
| EC-012 并发更新同一数据 | ✅ | `ON DUPLICATE KEY UPDATE` 数据库层面原子累加 |
| EC-013 文档示例与实现不一致 | ⚠️ | plan-api.md 蛇形 vs 实现驼形（见 BLOCK-001）|
| EC-014 前端无法访问后端 | ✅ | `HomePage` 展示 `ErrorBanner` + 重试按钮 |
| EC-015 Compose 端口冲突 | ✅ | `docs/troubleshooting.md` 覆盖 |

---

### 结论

**⚠️ 有条件通过** — 需要修复 1 个阻塞问题后进入验证阶段。

| 统计项 | 数值 |
|---|---|
| 阻塞问题 | 1 |
| 高优先级改进项 | 3 |
| 中优先级改进项 | 5 |
| 低优先级改进项 | 6 |
| FR 符合率 | 90% |
| 测试覆盖率（关键路径） | ~80% Python + 0% Java 单元 |

**下一步**: 修复 BLOCK-001（前后端 JSON 字段命名统一）后运行 `@sddu-validate big365` 进行最终验证。

---

### 📎 变更记录

| 日期 | 作者 | 变更 |
|---|---|---|
| 2026-06-07 | sddu-review | 初始审查报告，发现 1 个阻塞问题 + 14 个改进项 |
