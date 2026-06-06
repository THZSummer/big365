# Directory: .sddu/specs-tree-root/specs-tree-big365

## 目录简介

本目录保存 big365 的 SDDU 工作流产物，当前包括需求挖掘、规范、结构化规范数据、技术计划、数据库设计分析和架构决策记录。

`discovery.md` 记录需求挖掘结果：big365 要成为面向中小业务的开源多维数据服务，帮助潜在用户以低复杂度、低接入成本完成多维数据建模、CRUD、组合查询和演示验证。

`spec.md` 是 big365 的完整规范文档，标识符为 `FR-BIG365-MVP`，状态为 `specified`，优先级为 `P0`，创建日期为 `2026-06-06`。`spec.json` 是与规范对应的结构化数据文件，便于后续计划、任务分解和验证阶段复用。

`plan.md` 是 big365 的技术计划，状态为 `planned`。最新计划结论是：先将历史工程资产迁移到 `backup/legacy-20260606/`，再新建两个顶层独立工程 `big365-api` 与 `big365-web`；文档、端到端测试和 Compose 作为仓库级资产管理。

`plan-db.md` 是数据库设计分析文档，基于原始 MySQL 实例信息、历史 Mapper、Navicat 模型文件和历史 Vector/Coordinate 代码，分析 `bigdata_365`、`bigdata_id`、`big365_dimension`、`vector` 等表的存储查询核心思路。

ADR 文件记录已接受的关键架构决策：历史工程归档与 API/Web 两工程组织、MySQL 普通表结构化列 + JSON 扩展模型、异步演示数据生成 Job、`big365-web` React 前端独立构建并由 Compose 托管交付。

## 目录结构

```text
specs-tree-big365/
├── README.md                                      # 本文件 - big365 目录导航
├── discovery.md                                   # 需求挖掘报告：big365
├── spec.md                                        # big365 规范文档
├── spec.json                                      # big365 结构化规范数据
├── plan.md                                        # big365 技术计划
├── plan-db.md                                     # big365 原始数据库设计分析
├── ADR-001-big365-star-independent-project.md     # ADR-001：历史归档与 API/Web 两工程组织
├── ADR-002-mysql-ordinary-table-model.md          # ADR-002：MySQL 普通表模型
├── ADR-003-async-demo-data-generation.md          # ADR-003：异步演示数据生成
└── ADR-004-frontend-delivery.md                   # ADR-004：big365-web 前端交付
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| [discovery.md](discovery.md) | 需求挖掘报告：big365 - 定义开源多维数据服务 MVP 的问题、用户、需求、方案、指标、范围、风险、下一步和拆分建议。 | 已完成 |
| [spec.md](spec.md) | 规范文档：big365 - 标识符 `FR-BIG365-MVP`，状态 `specified`，优先级 `P0`；定义上下文、目标、非目标、用户故事、功能需求、非功能需求、验收场景、范围边界和追踪矩阵。 | specified |
| [spec.json](spec.json) | big365 结构化规范数据 - 供后续计划、任务和验证阶段使用。 | specified |
| [plan.md](plan.md) | 技术计划：big365 - 状态 `planned`；结论为先归档历史工程，再创建 `big365-api` 与 `big365-web` 两个顶层独立工程，并引用 `plan-db.md` 作为数据库设计依据。 | planned |
| [plan-db.md](plan-db.md) | 数据库设计分析：基于原始库信息和历史资产分析 `bigdata_365` 宽表、坐标主键、日期列、分区、维度元数据和新旧模型映射。 | planned |
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
| 前端工程 | `big365-web`，React + Vite + TypeScript，Nginx 容器托管 |
| 部署体验 | 根级 `compose.yml` + 可选 `compose.podman.yml`；不拆独立 Compose 工程 |
| 文档与教程 | `docs/`，快速开始、概念模型、API 文档和日志分析教程；不拆独立工程 |
| 验证 | `tests/e2e/`，端到端验证脚本；不拆独立工程 |
| 数据库分析 | `plan-db.md` 单独分析原始 `bigdata_365` 宽表、坐标列、日期列和分区设计 |
| 数据模型 | MySQL 普通表采用结构化列 + JSON 扩展模型 |

### ADR 清单

| ADR | 决策 | 状态 |
|-----|------|------|
| [ADR-001](ADR-001-big365-star-independent-project.md) | 归档历史工程并保留 API/Web 两个顶层独立工程。 | ACCEPTED |
| [ADR-002](ADR-002-mysql-ordinary-table-model.md) | MySQL 普通表采用结构化列 + JSON 扩展模型。 | ACCEPTED |
| [ADR-003](ADR-003-async-demo-data-generation.md) | 演示数据生成采用异步 Job 模型。 | ACCEPTED |
| [ADR-004](ADR-004-frontend-delivery.md) | `big365-web` 作为 React 前端并由 Compose 托管交付。 | ACCEPTED |

### 下一步

建议进入任务分解阶段，按历史资产归档、`big365-api`、`big365-web`、`docs/`、`tests/e2e/`、根级 Compose 和 README 更新等边界拆分可并行执行的原子任务。

## 子目录

暂无子目录。

## 上级目录

- [返回上级](../README.md)
- [返回首页](../../README.md)
