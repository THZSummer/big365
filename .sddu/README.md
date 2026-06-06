# Directory: .sddu

## 目录简介

本目录是 SDDU 工作空间，用于保存 big365 的需求挖掘、规范、技术计划、架构决策、任务分解与后续构建验证等工作流产物。当前核心内容位于 `specs-tree-root/specs-tree-big365/`。

big365 定位为面向中小业务的开源多维数据服务，目标是通过 docker-compose / podman-compose、REST API、React 演示前端、MySQL 普通表存储和自解释文档完成低复杂度快速接入闭环。当前规范标识符为 `FR-BIG365-MVP`，规范状态为 `specified`，技术计划状态为 `planned`，任务分解状态为 `tasked`（14 个原子任务，6 个执行波次）。

最新技术计划决定：历史工程资产迁移到 `backup/legacy-20260606/`，新主线只保留两个顶层独立工程 `big365-api` 与 `big365-web`；`docs/`、`tests/e2e/`、根级 `compose.yml` 等作为仓库级资产。

## 目录结构

```text
.sddu/
├── README.md                # 本文件 - SDDU 工作空间导航
└── specs-tree-root/          # 规范、计划与决策目录集合
    ├── README.md            # 规范、计划与决策目录导航
    └── specs-tree-big365/    # big365 目录
        ├── README.md        # big365 目录导航
        ├── discovery.md     # 需求挖掘报告：big365
        ├── spec.md          # big365 规范文档
        ├── spec.json        # big365 结构化规范数据
        ├── plan.md          # big365 技术计划（主计划）
        ├── plan-api.md       # big365 REST API 设计
        ├── plan-db.md        # big365 原始数据库设计分析
        ├── plan-page.md      # big365 React 演示前端页面设计
        ├── tasks.md          # big365 任务分解（14 个任务，6 个波次）
        ├── tasks.json        # big365 结构化任务数据
        ├── ADR-001-big365-star-independent-project.md
        ├── ADR-002-mysql-ordinary-table-model.md
        ├── ADR-003-async-demo-data-generation.md
        └── ADR-004-frontend-delivery.md
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | SDDU 工作空间根目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-root/](specs-tree-root/README.md) | 规范、计划与架构决策目录集合，当前包含 big365 的需求挖掘、规范、技术计划、任务分解和 ADR 决策记录。 |

## 上级目录

- 当前为 SDDU 工作空间根目录
