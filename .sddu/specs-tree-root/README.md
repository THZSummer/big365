# Directory: .sddu/specs-tree-root

## 目录简介

本目录用于组织 SDDU 规范、计划与架构决策相关目录。当前包含两个目录：

- **`specs-tree-big365/`**：big365 MVP 的完整 SDDU 工作流产物（discovery → specified → planned → tasked → built → reviewed → validated），14 个任务全部完成，FR 覆盖率 90.2%。
- **`specs-tree-big365-v2/`**：big365 V2 增强版本，当前处于构建（building）阶段。聚焦首次用户体验闭环、核心查询能力补全、测试覆盖均衡和概念模型亲和力增强。12 个任务中 9 个已完成，Wave 3 收尾中。

`specs-tree-big365/` 已包含需求挖掘报告 `discovery.md`、规范文档 `spec.md`、结构化规范数据 `spec.json`、状态追踪 `state.json`、技术计划主文档 `plan.md`、API 设计 `plan-api.md`、数据库分析 `plan-db.md`、前端页面设计 `plan-page.md`、任务分解 `tasks.md` / `tasks.json`（14 个任务，6 个波次）、构建报告 `build.md`、代码审查报告 `review.md`（Round 2 通过）、验证报告 `validation-report.md`（FR 覆盖率 90.2%，有条件通过）以及 4 份 ADR。规范标识符为 `FR-BIG365-MVP`，工作流已走完 discovery → specified → planned → tasked → built → reviewed → validated 全流程。

`specs-tree-big365-v2/` 当前包含需求挖掘报告 `discovery.md`、Feature 规范 `spec.md`（36 FR）、技术计划 `plan.md`（4 ADR + 8 阶段 + 28 文件变更）、任务分解 `tasks.md`/`tasks.json`（12 任务 + 5 波次）、构建报告 `build.md`（Wave 3 进行中，记录 TASK-V2-009 HomePage 改造和 TASK-V2-007 Java 单元测试）、4 份 ADR（V2-001 ~ V2-004）和状态追踪 `state.json`。标识符为 `FR-BIG365-V2`，工作流已走完 discovery → specified → planned → tasked → building。

**最新进展**：TASK-V2-007（Java 单元测试）已完工 — 3 个 JUnit 5 测试类，52 个测试用例，覆盖 SpaceService / DimensionService / DemoDataGenerator（FR-V2-040~FR-V2-044）。

## 目录结构

```text
specs-tree-root/
├── README.md                    # 本文件 - 规范、计划与决策目录导航
├── specs-tree-big365/            # big365 MVP 目录（已完成全流程）
│   ├── README.md                # big365 目录导航
│   ├── discovery.md             # 需求挖掘报告：big365
│   ├── spec.md                  # big365 规范文档
│   ├── spec.json                # big365 结构化规范数据
│   ├── state.json               # big365 工作流状态追踪
│   ├── plan.md                  # big365 技术计划（主计划）
│   ├── plan-api.md               # big365 REST API 设计
│   ├── plan-db.md                # big365 原始数据库设计分析
│   ├── plan-page.md              # big365 React 演示前端页面设计
│   ├── tasks.md                  # big365 任务分解（14 个任务，6 个波次）
│   ├── tasks.json                # big365 结构化任务数据
│   ├── build.md                  # big365 构建实现报告
│   ├── review.md                 # big365 代码审查报告（Round 2）
│   ├── validation-report.md      # big365 验证报告（FR 覆盖率 90.2%）
│   ├── ADR-001-big365-star-independent-project.md
│   ├── ADR-002-mysql-ordinary-table-model.md
│   ├── ADR-003-async-demo-data-generation.md
│   └── ADR-004-frontend-delivery.md
└── specs-tree-big365-v2/         # big365 V2 目录（构建阶段）
    ├── README.md                 # big365-v2 目录导航
    ├── discovery.md              # 需求挖掘报告：big365-v2
    ├── spec.md                   # Feature 规范：big365-v2（36 FR）
    ├── plan.md                   # 技术计划：big365-v2（4 ADR + 8 阶段）
    ├── tasks.md                  # 任务分解：big365-v2（12 任务 + 5 波次）
    ├── tasks.json                # 结构化任务数据：big365-v2
    ├── build.md                  # 构建实现报告：big365-v2（Wave 3 进行中）
    ├── state.json                # big365-v2 工作流状态追踪
    ├── ADR-V2-001-default-data-initializer.md
    ├── ADR-V2-002-date-range-query-strategy.md
    ├── ADR-V2-003-hard-delete-strategy.md
    └── ADR-V2-004-homepage-demo-data-display.md
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | 规范、计划与决策目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-big365/](specs-tree-big365/README.md) | big365 MVP 聚合目录，已走完 discovery → specified → planned → tasked → built → reviewed → validated 全流程。包含需求挖掘结果、完整规范、技术计划、任务分解、构建报告、审查报告、验证报告和架构决策（4 ADR）。标识符 `FR-BIG365-MVP`。 |
| [specs-tree-big365-v2/](specs-tree-big365-v2/README.md) | big365 V2 增强版本，当前处于构建（building）阶段。已走完 discovery → specified → planned → tasked → building。包含需求挖掘、Feature 规范（36 FR）、技术计划（4 ADR + 8 阶段 + 28 文件变更）、任务分解（12 任务 + 5 波次）、构建报告（Wave 3 进行中）、4 份 ADR（V2-001~V2-004）。聚焦首次体验闭环、查询能力补全、CRUD 补齐、测试均衡、模型亲和力增强。标识符 `FR-BIG365-V2`。9/12 任务已完成。 |

## 上级目录

- [返回上级](../README.md)
- [返回首页](../README.md)
