# big365

big365 是面向中小业务的开源多维数据服务。当前主线将以两个顶层独立工程实现轻量 REST API、MySQL 普通表存储、React 演示前端、Compose 一键体验、日志分析示例和端到端验证。

## 当前工程规划

计划创建的顶层独立工程：

- `big365-api/`：Java 21 + Spring Boot 3.5.14 REST API 服务，包含维度管理、业务数据管理、组合查询、演示数据生成、MySQL 存储、OpenAPI 和后端测试。
- `big365-web/`：React 演示前端，包含默认演示、数据生成向导、维度管理、数据管理、组合查询、文档入口和前端测试。

仓库级资产：

- `docs/`：快速开始、概念模型、API 文档和日志分析教程。
- `tests/e2e/`：端到端验证脚本。
- `compose.yml`：Docker Compose 编排。
- `compose.podman.yml`：Podman Compose 覆盖配置，可选。
- `.env.example`：本地启动环境变量示例。

暂不单独拆分 `big365-data-gen`、`big365-compose`、`big365-docs`、`big365-e2e` 等顶层工程。演示数据生成先作为 `big365-api` 内部业务能力实现；文档、测试和 Compose 作为仓库级资产管理。

## 历史工程资产

历史 Java 工程已迁移到：

```text
backup/legacy-20260606/
```

其中包含原 `pom.xml`、`big365-core/`、`big365-web/`、`doc/`、历史 `README.md` 和 `README.en.md`。这些内容仅作为参考资产，不作为当前新工程主线直接改造。

## SDDU 规范

当前 Feature 规范与技术计划位于：

```text
.sddu/specs-tree-root/specs-tree-big365/
```

下一步请继续运行：

```text
@sddu-tasks big365
```
