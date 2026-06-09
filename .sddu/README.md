# Directory: .sddu

## 目录简介

本目录是 SDDU 工作空间，用于保存 big365 的需求挖掘、规范、技术计划、架构决策、任务分解与后续构建验证等工作流产物。当前包含两个目录：`specs-tree-big365/`（MVP，已走完全流程）和 `specs-tree-big365-v2/`（V2，构建阶段）。

big365 定位为面向中小业务的开源多维数据服务，目标是通过 docker-compose / podman-compose、REST API、React 演示前端、MySQL 普通表存储和自解释文档完成低复杂度快速接入闭环。

**工作流状态**：
- `FR-BIG365-MVP`：规范 → 技术计划 → 任务分解（14 个原子任务，6 个执行波次）→ 构建（103+ 文件）→ 代码审查（Round 2 通过）→ 验证（有条件通过，FR 覆盖率 90.2%）。✅ 已完成
- `FR-BIG365-V2`：需求挖掘 → 规范编写 → 技术规划 → 任务分解（12 任务 + 5 波次）→ 构建（9/12 任务已完成，Wave 3 收尾中）。⏳ 进行中

最新完成：TASK-V2-007（Java 单元测试）— 3 个 JUnit 5 测试类，52 个测试用例，覆盖 SpaceService / DimensionService / DemoDataGenerator。

最新技术计划决定：历史工程资产迁移到 `backup/legacy-20260606/`，新主线只保留两个顶层独立工程 `big365-api` 与 `big365-web`；`docs/`、`tests/e2e/`、根级 `compose.yml` 等作为仓库级资产。

## 目录结构

```text
.sddu/
├── README.md                # 本文件 - SDDU 工作空间导航
└── specs-tree-root/          # 规范、计划与决策目录集合
    ├── README.md            # 规范、计划与决策目录导航
    ├── specs-tree-big365/    # big365 MVP 目录（已完成）
    │   ├── README.md        # big365 目录导航
    │   ├── discovery.md     # 需求挖掘报告：big365
    │   ├── spec.md          # big365 规范文档
    │   ├── spec.json        # big365 结构化规范数据
    │   ├── state.json       # big365 工作流状态追踪
    │   ├── plan.md          # big365 技术计划（主计划）
    │   ├── plan-api.md       # big365 REST API 设计
    │   ├── plan-db.md        # big365 原始数据库设计分析
    │   ├── plan-page.md      # big365 React 演示前端页面设计
    │   ├── tasks.md          # big365 任务分解（14 个任务，6 个波次）
    │   ├── tasks.json        # big365 结构化任务数据
    │   ├── build.md          # big365 构建实现报告（103+ 文件）
    │   ├── review.md         # big365 代码审查报告（Round 2 通过）
    │   ├── validation-report.md  # big365 验证报告（FR 覆盖率 90.2%）
    │   ├── ADR-001-big365-star-independent-project.md
    │   ├── ADR-002-mysql-ordinary-table-model.md
    │   ├── ADR-003-async-demo-data-generation.md
    │   └── ADR-004-frontend-delivery.md
    └── specs-tree-big365-v2/ # big365 V2 目录（构建阶段）
        ├── README.md         # big365-v2 目录导航
        ├── discovery.md      # 需求挖掘报告：big365-v2
        ├── spec.md           # Feature 规范：big365-v2（36 FR）
        ├── plan.md           # 技术计划：big365-v2（4 ADR + 8 阶段）
        ├── tasks.md          # 任务分解：big365-v2（12 任务 + 5 波次）
        ├── tasks.json        # 结构化任务数据：big365-v2
        ├── build.md          # 构建实现报告：big365-v2（Wave 3 进行中）
        ├── state.json        # big365-v2 工作流状态追踪
        ├── ADR-V2-001-default-data-initializer.md
        ├── ADR-V2-002-date-range-query-strategy.md
        ├── ADR-V2-003-hard-delete-strategy.md
        └── ADR-V2-004-homepage-demo-data-display.md
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | SDDU 工作空间根目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-root/](specs-tree-root/README.md) | 规范、计划与架构决策目录集合。包含 `specs-tree-big365/`（MVP 已完成全流程）和 `specs-tree-big365-v2/`（V2 构建阶段，9/12 任务已完成）。 |

## 上级目录

- 当前为 SDDU 工作空间根目录
