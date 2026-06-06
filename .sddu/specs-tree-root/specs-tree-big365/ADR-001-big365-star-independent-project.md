# ADR-001: 归档历史工程并保留 API/Web 两个顶层独立工程

## 状态
ACCEPTED

## 背景

big365 规范要求提供面向中小业务用户的开源多维数据服务闭环，包含 REST API、MySQL 普通表、React 演示前端、Compose 启动、日志分析教程和端到端验证。

现有仓库已有 `big365-core` 与 `big365-web` 历史工程，包含 Vector/Coordinate 概念、Spring Boot/MyBatis/MySQL 基础、历史分区表模型、Kafka/Druid 等能力。但 Spec 第 2.3 节明确规定：当前项目代码只能作为参考、样例或可拷贝复用素材，不能直接基于现有工程就地修改；新工程代码必须以独立工程方式组织。

同时，历史 `big365-web` 会与新的 React 演示前端候选名冲突；历史根 `pom.xml` 也会绑定旧模块路径。为了让新工程拥有清晰边界，需要先处理历史资产命名占用问题。

在进一步评估后，我们认为当前阶段不应把部署编排、文档、端到端测试、演示数据生成等非独立部署单元拆成顶层工程。当前真正需要独立构建、测试和部署的只有后端 API 与前端 Web。

## 决策

决定先将历史工程资产迁移到 `backup/legacy-20260606/`，再在仓库根目录只新建两个顶层独立工程：

- `big365-api`：Spring Boot 后端 API 服务，包含 REST API、领域模型、MySQL 普通表存储、组合查询、演示数据生成 Job、OpenAPI、后端测试。
- `big365-web`：React 演示前端，包含页面、组件、API client、前端测试、Dockerfile。

历史归档范围：

- `pom.xml` -> `backup/legacy-20260606/pom.xml`
- `big365-core/` -> `backup/legacy-20260606/big365-core/`
- `big365-web/` -> `backup/legacy-20260606/big365-web/`
- `doc/` -> `backup/legacy-20260606/doc/`
- `README.md` -> `backup/legacy-20260606/README.md`
- `README.en.md` -> `backup/legacy-20260606/README.en.md`

仓库级资产：

- `docs/`：快速开始、概念模型、API 文档、日志分析教程；不作为独立工程。
- `tests/e2e/`：端到端验证脚本；不作为独立工程。
- `compose.yml`：根级 Docker Compose 编排；不作为独立工程。
- `compose.podman.yml`：Podman Compose 覆盖配置，可选。
- `.env.example`：本地启动环境变量示例。

`big365-api` 内部按业务能力分包：

- `common`：统一响应、异常、错误码、分页。
- `dimension`：维度元数据 CRUD。
- `record`：业务数据 CRUD。
- `query`：多维组合查询。
- `demo`：演示数据生成与 Job 状态。
- `model`：Vector / Coordinate / Dimension 概念模型。
- `storage`：MySQL 存储适配与 repository 边界。
- `config`：Spring / OpenAPI / Async / Web 配置。

`.sddu/`、`.opencode/`、`.gitee/`、`.gitignore`、`LICENSE` 等仓库级配置与规范资产保留在根目录。

## 后果

正面影响：

- 完全符合 Spec 工程红线。
- 释放 `big365-web` 名称，用于新的 React 前端工程。
- 顶层工程数量少，认知成本低。
- 独立工程与真实部署单元一致：后端 API 和前端 Web。
- Compose、docs、e2e 测试不被误拆成非业务工程。
- 演示数据生成先作为 API 内部能力，避免过早拆分。
- 历史工程仍完整保留在 `backup/legacy-20260606/`，可作为参考资产。

负面影响：

- `big365-api` 初期承载多个业务包，需要明确内部边界。
- 如果后续数据生成、核心模型、查询或存储能力复杂度显著上升，可能需要再次拆分。
- 历史工程路径发生变化，原有构建命令不再位于仓库根目录。

缓解措施：

- `big365-api` 内部按业务能力分包，避免 Controller/Service/Mapper 混杂堆叠。
- 将数据库初始化 / migration 脚本放入 `big365-api/src/main/resources/db/`，明确表结构归属 API 工程。
- 根 README 说明新工程规划和历史资产归档位置。
- `backup/legacy-20260606/` 保留原历史 README，便于查阅旧工程启动和构建方式。
- 后续满足独立部署、独立发布、跨工程复用或复杂度显著提升时，再考虑拆出 `big365-data-gen`、`big365-core`、`big365-storage-*`、`big365-query` 等顶层模块。
