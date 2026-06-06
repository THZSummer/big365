# Directory: .sddu/specs-tree-root

## 目录简介

本目录用于组织 SDDU 规范与需求相关目录。当前包含 `specs-tree-big365/`，其 `discovery.md` 已完成 big365 的需求挖掘：围绕开源多维数据服务 MVP，明确了 docker-compose / podman-compose 一键体验、REST API、完整 CRUD、组合查询、Vector/Coordinate/Dimension 核心模型、MySQL 首个存储实现、React 演示前端、日志分析教程、数据生成、自解释文档和自动化测试等关键方向。

`specs-tree-big365/` 现已新增 `spec.md` 与 `spec.json`：`spec.md` 为 big365 的完整规范文档，标识符 `FR-BIG365-MVP`，状态 `specified`，优先级 `P0`；`spec.json` 为对应的结构化规范数据，记录目标、非目标、用户故事、功能需求、非功能需求、验收场景、范围边界和追踪矩阵等信息。

## 目录结构

```text
specs-tree-root/
├── README.md                # 本文件 - 规范与需求目录导航
└── specs-tree-big365/        # big365 目录
    ├── README.md            # big365 目录导航
    ├── discovery.md         # 需求挖掘报告：big365
    ├── spec.md              # big365 规范文档
    └── spec.json            # big365 结构化规范数据
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | 规范与需求目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-big365/](specs-tree-big365/README.md) | big365 聚合目录，记录面向中小业务的开源多维数据服务需求挖掘结果、完整规范文档和结构化规范数据。 |

## 上级目录

- [返回上级](../README.md)
- [返回首页](../README.md)
