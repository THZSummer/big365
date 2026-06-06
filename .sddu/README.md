# Directory: .sddu

## 目录简介

本目录是 SDDU 工作空间，用于保存 big365 的需求挖掘、规范、计划、任务与验证等工作流产物。当前已包含 `specs-tree-root/` 目录，核心内容来自 `specs-tree-root/specs-tree-big365/`：big365 定位为面向中小业务的开源多维数据服务，目标是通过 docker-compose / podman-compose、REST API、React 演示前端、MySQL 存储和自解释文档完成低复杂度快速接入闭环。

当前 big365 目录已包含需求挖掘报告 `discovery.md`、规范文档 `spec.md` 和结构化规范数据 `spec.json`。规范状态为 `specified`，优先级为 `P0`，标识符为 `FR-BIG365-MVP`。

## 目录结构

```text
.sddu/
├── README.md                # 本文件 - SDDU 工作空间导航
└── specs-tree-root/          # 规范与需求目录集合
    ├── README.md            # 规范与需求目录导航
    └── specs-tree-big365/    # big365 目录
        ├── README.md        # big365 目录导航
        ├── discovery.md     # 需求挖掘报告：big365
        ├── spec.md          # big365 规范文档
        └── spec.json        # big365 结构化规范数据
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | SDDU 工作空间根目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-root/](specs-tree-root/README.md) | 规范与需求目录集合，当前包含 big365 的需求挖掘报告、规范文档和结构化规范数据。 |

## 上级目录

- 当前为 SDDU 工作空间根目录
