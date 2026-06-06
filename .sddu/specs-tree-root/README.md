# Directory: .sddu/specs-tree-root

## 目录简介

本目录用于组织 SDDU 规范与需求相关目录。当前包含 `specs-tree-big365/`，其 `discovery.md` 已完成 big365 的需求挖掘：围绕开源多维数据服务 MVP，明确了 docker-compose / podman-compose 一键体验、REST API、完整 CRUD、组合查询、Vector/Coordinate/Dimension 核心模型、MySQL 首个存储实现、React 演示前端、日志分析教程、数据生成、自解释文档和自动化测试等关键方向。

最新 `discovery.md` 采用结构化章节和 Mermaid 图展示核心结论，包括体验闭环、用户旅程、需求优先级、逻辑架构、验收路径、版本路线、验证计划和后续拆分机会；5.3 验收路径和前端范围已更新为：用户打开演示页面后先看到默认演示效果 / 示例查询结果，再进入演示数据生成向导；生成过程中展示初始化、生成、写入、统计等阶段状态；前端表达保持业务化，避免要求用户直接理解维度等内部概念。

## 目录结构

```text
specs-tree-root/
├── README.md                # 本文件 - 规范与需求目录导航
└── specs-tree-big365/        # big365 目录
    ├── README.md            # big365 目录导航
    └── discovery.md         # 需求挖掘报告：big365
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | 规范与需求目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-big365/](specs-tree-big365/README.md) | big365 聚合目录，记录面向中小业务的开源多维数据服务需求挖掘结果和后续规范入口。 |

## 上级目录

- [返回上级](../README.md)
- [返回首页](../README.md)
