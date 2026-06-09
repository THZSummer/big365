# Directory: .sddu/specs-tree-root/specs-tree-big365

## 目录简介

本目录保存 big365 的 SDDU 工作流产物，已走完 discovery → specified → planned → tasked → built → reviewed → validated 全流程（14 个任务，6 个波次，103+ 文件）。

`discovery.md` 记录需求挖掘结果：big365 要成为面向中小业务的开源多维数据服务，帮助潜在用户以低复杂度、低接入成本完成多维数据建模、CRUD、组合查询和演示验证。

`spec.md` 是 big365 的完整规范文档，标识符为 `FR-BIG365-MVP`，状态为 `specified`，优先级为 `P0`，创建日期为 `2026-06-06`。`spec.json` 是与规范对应的结构化数据文件，便于后续计划、任务分解和验证阶段复用。`state.json` 追踪工作流各阶段状态（当前状态：`validated`）。

`plan.md` 是 big365 的技术计划，状态为 `planned`。最新计划结论是：先将历史工程资产迁移到 `backup/legacy-20260606/`，再新建两个顶层独立工程 `big365-api` 与 `big365-web`；文档、端到端测试和 Compose 作为仓库级资产管理。

`plan-db.md` 是数据库设计分析文档，基于原始 MySQL 实例信息、21 行真实 INSERT 样本数据、历史 Mapper、Navicat 模型文件和历史 Vector/Coordinate 代码，深度分析 `bigdata_365` 作为**预计算物化多维数据空间**的核心思想：坐标 `0=ALL` 哨兵机制实现维度上卷、写入时级联更新 `2^d` 行、查询零聚合计算。

`plan-api.md` 是 REST API 设计文档，包含接口清单、核心接口示例（业务注册/写入/查询）、数据流、统一响应格式、错误码表和内部包结构。

`plan-page.md` 是 React 演示前端页面设计文档，包含页面结构、路由、组件树、API Client 约定和 Vite 代理配置。

`tasks.md` / `tasks.json` 是任务分解（14 个原子任务，6 个执行波次）。`build.md` 是构建实现报告（103+ 文件）。`review.md` 是代码审查报告（Round 2 通过）。`validation-report.md` 是验证报告（FR 覆盖率 90.2%，有条件通过）。

ADR 文件记录已接受的关键架构决策：历史工程归档与 API/Web 两工程组织、MySQL 普通表结构化列 + JSON 扩展模型、异步演示数据生成 Job、`big365-web` React 前端独立构建并由 Compose 托管交付。

## 目录结构

```text
specs-tree-big365/
├── README.md                                      # 本文件 - big365 目录导航
├── discovery.md                                   # 需求挖掘报告：big365
├── spec.md                                        # big365 规范文档
├── spec.json                                      # big365 结构化规范数据
├── state.json                                     # big365 工作流状态追踪
├── plan.md                                        # big365 技术计划（主计划，引用子文档）
├── plan-api.md                                    # big365 REST API 设计
├── plan-db.md                                     # big365 原始数据库设计分析
├── plan-page.md                                   # big365 React 演示前端页面设计
├── tasks.md                                       # big365 任务分解（14 个任务，6 个波次）
├── tasks.json                                     # big365 结构化任务数据（供构建阶段使用）
├── build.md                                       # big365 构建实现报告（103+ 文件）
├── review.md                                      # big365 代码审查报告（Round 2 通过）
├── validation-report.md                           # big365 验证报告（FR 覆盖率 90.2%）
├── ADR-001-big365-star-independent-project.md     # ADR-001：历史归档与 API/Web 两工程组织
├── ADR-002-mysql-ordinary-table-model.md          # ADR-002：MySQL 普通表模型
├── ADR-003-async-demo-data-generation.md          # ADR-003：异步演示数据生成
└── ADR-004-frontend-delivery.md                   # ADR-004：big365-web 前端交付
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| [discovery.md](discovery.md) | 需求挖掘报告：big365 - 定义开源多维数据服务 MVP 的问题、用户、需求、方案、指标、范围、风险、下一步和拆分建议。 | 已完成 |
| [spec.md](spec.md) | 规范文档：big365 - 标识符 `FR-BIG365-MVP`，优先级 `P0`；定义上下文、目标、非目标、用户故事、功能需求、非功能需求、验收场景、范围边界和追踪矩阵。 | specified |
| [spec.json](spec.json) | big365 结构化规范数据 - 供后续计划、任务和验证阶段使用。 | specified |
| [state.json](state.json) | big365 工作流状态追踪 - 记录 14 个任务完成状态和文件统计。 | validated |
| [plan.md](plan.md) | 技术计划（主计划）：big365 - 结论为先归档历史工程，再创建 `big365-api` 与 `big365-web` 两个顶层独立工程。引用 plan-api / plan-db / plan-page 子文档。 | planned |
| [plan-api.md](plan-api.md) | API 设计：接口清单、核心接口示例、数据流、统一响应格式、错误码、内部包结构。 | planned |
| [plan-db.md](plan-db.md) | 数据库设计分析（四部分）：核心设计思想→存与查→落地到 MVP，含系统表 DDL 和业务表模板。 | planned |
| [plan-page.md](plan-page.md) | 前端页面设计：React + Vite 页面结构、路由、组件树、API Client 约定、Vite 代理配置。 | planned |
| [tasks.md](tasks.md) | 任务分解：14 个原子任务，6 个执行波次，覆盖历史归档、API 骨架、Web 骨架、通用基础设施、根级部署、前端框架、业务注册、维度 CRUD、Space 写入查询、前端业务管理、演示数据生成、前端页面、文档体系、Compose 闭环与 E2E 验证。 | tasked |
| [tasks.json](tasks.json) | 结构化任务数据（14 项），含依赖关系、产出文件清单、验证命令，供构建阶段使用。 | tasked |
| [build.md](build.md) | 构建实现报告：14 个任务全部完成，103+ 文件（44 API 源文件，19 前端源文件，5 文档，6 测试文件）。 | built |
| [review.md](review.md) | 代码审查报告（Round 2）：BLOCK-001 已修复，4 项修复全部验证通过，无阻塞问题。 | reviewed |
| [validation-report.md](validation-report.md) | 验证报告：FR 覆盖率 90.2%（43/51 完全通过），NFR 覆盖率 91.7%，ADR 4/4 合规，结论：有条件通过。 | validated |
| [ADR-001-big365-star-independent-project.md](ADR-001-big365-star-independent-project.md) | ADR-001：归档历史工程并保留 API/Web 两个顶层独立工程。 | ACCEPTED |
| [ADR-002-mysql-ordinary-table-model.md](ADR-002-mysql-ordinary-table-model.md) | ADR-002：MySQL 普通表采用结构化列 + JSON 扩展模型。 | ACCEPTED |
| [ADR-003-async-demo-data-generation.md](ADR-003-async-demo-data-generation.md) | ADR-003：演示数据生成采用异步 Job 模型。 | ACCEPTED |
| [ADR-004-frontend-delivery.md](ADR-004-frontend-delivery.md) | ADR-004：`big365-web` 作为 React 前端并由 Compose 托管交付。 | ACCEPTED |

## 内容摘要

### 核心定位

big365 面向中小业务和开源评估用户，提供一个低复杂度、低接入成本的多维数据服务，优先完成从启动、建模、数据写入、CRUD、组合查询到前端演示和文档试跑的端到端闭环。

### 关键决策

| 维度 | 结论 |
|------|------|
| 工程组织 | 历史工程迁移到 `backup/legacy-20260606/`；新主线只保留 `big365-api` 与 `big365-web` 两个顶层独立工程 |
| API 服务 | `big365-api`，Java 21 + Spring Boot 3.5.14 REST API + MyBatis + MySQL 普通表 |
| 后端内部包 | `common`、`dimension`、`record`、`query`、`demo`、`model`、`storage`、`config` |
| 数据生成 | 作为 `big365-api` 内部 `demo` 包能力，采用异步 Job 模型；暂不拆顶层工程 |
| 前端工程 | `big365-web`，React + Vite + TypeScript，Node.js 直接运行 |
| 部署体验 | 根级 `compose.yml` + 可选 `compose.podman.yml`；不拆独立 Compose 工程 |
| 文档与教程 | `docs/`，快速开始、概念模型、API 文档和日志分析教程；不拆独立工程 |
| 验证 | `tests/e2e/`，端到端验证脚本；不拆独立工程 |
| API 设计 | `plan-api.md` 单独定义 REST API 接口清单、错误码和数据流 |
| 数据库分析 | `plan-db.md` 深度分析 `bigdata_365` 预计算物化数据空间：0=ALL 哨兵、级联写入、零计算查询 |
| 前端设计 | `plan-page.md` 单独定义 React 页面结构、路由和组件 |
| 数据模型 | MySQL 普通表采用结构化列 + JSON 扩展模型 |

### ADR 清单

| ADR | 决策 | 状态 |
|-----|------|------|
| [ADR-001](ADR-001-big365-star-independent-project.md) | 归档历史工程并保留 API/Web 两个顶层独立工程。 | ACCEPTED |
| [ADR-002](ADR-002-mysql-ordinary-table-model.md) | MySQL 普通表采用结构化列 + JSON 扩展模型。 | ACCEPTED |
| [ADR-003](ADR-003-async-demo-data-generation.md) | 演示数据生成采用异步 Job 模型。 | ACCEPTED |
| [ADR-004](ADR-004-frontend-delivery.md) | `big365-web` 作为 React 前端并由 Compose 托管交付。 | ACCEPTED |

### 下一步

big365 已走完 SDDU 全流程（discovery → specified → planned → tasked → built → reviewed → validated）。14 个任务全部完成，103+ 文件产出，FR 覆盖率 90.2%，验证结论为有条件通过。改进建议见 `validation-report.md` 末尾（补充删除端点、Java 单元测试、前端 Playwright 测试、并发控制等）。

> **V2 跟进**：上述改进建议中，**Java 单元测试** 已在 FR-BIG365-V2 的 TASK-V2-007 中实施（3 个 JUnit 5 测试类，52 个测试用例，覆盖 SpaceService / DimensionService / DemoDataGenerator）。其他建议（删除端点、Playwright 测试、并发控制）也在 V2 的 12 个任务中覆盖。参见 [../specs-tree-big365-v2/README.md](../specs-tree-big365-v2/README.md)。

## 子目录

暂无子目录。

## 上级目录

- [返回上级](../README.md)
- [返回首页](../../README.md)
