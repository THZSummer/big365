# Directory: .sddu/specs-tree-root

## 目录简介

本目录用于组织 SDDU 规范、计划与架构决策相关目录。当前包含 `specs-tree-big365/`，记录 big365 从需求挖掘到技术规划的工作流产物。

`specs-tree-big365/` 已包含需求挖掘报告 `discovery.md`、规范文档 `spec.md`、结构化规范数据 `spec.json`、技术计划主文档 `plan.md`、API 设计 `plan-api.md`、数据库分析 `plan-db.md`、前端页面设计 `plan-page.md` 以及 4 份 ADR。规范标识符为 `FR-BIG365-MVP`，规范状态为 `specified`，技术计划状态为 `planned`。技术规划结论为：先将历史工程资产迁移到 `backup/legacy-20260606/`，再创建 `big365-api` 与 `big365-web` 两个顶层独立工程；`docs/`、`tests/e2e/`、根级 `compose.yml` 作为仓库级资产；存储采用 MySQL 普通表结构化列 + JSON 扩展模型，演示数据生成采用 API 内部异步 Job，`big365-web` 作为 React 前端并由 Compose 托管交付。

## 目录结构

```text
specs-tree-root/
├── README.md                # 本文件 - 规范、计划与决策目录导航
└── specs-tree-big365/        # big365 目录
    ├── README.md            # big365 目录导航
    ├── discovery.md         # 需求挖掘报告：big365
    ├── spec.md              # big365 规范文档
    ├── spec.json            # big365 结构化规范数据
    ├── plan.md              # big365 技术计划（主计划）
    ├── plan-api.md           # big365 REST API 设计
    ├── plan-db.md            # big365 原始数据库设计分析
    ├── plan-page.md          # big365 React 演示前端页面设计
    ├── ADR-001-big365-star-independent-project.md
    ├── ADR-002-mysql-ordinary-table-model.md
    ├── ADR-003-async-demo-data-generation.md
    └── ADR-004-frontend-delivery.md
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | 规范、计划与决策目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-big365/](specs-tree-big365/README.md) | big365 聚合目录，记录面向中小业务的开源多维数据服务需求挖掘结果、完整规范、技术计划、结构化规范数据和架构决策。 |

## 上级目录

- [返回上级](../README.md)
- [返回首页](../README.md)
