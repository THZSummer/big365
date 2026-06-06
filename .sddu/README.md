# Directory: .sddu

## 目录简介

本目录是 SDDU 工作空间，用于保存 big365 的需求挖掘、规范、计划、任务与验证等工作流产物。当前已包含 `specs-tree-root/` 目录，核心内容来自 `specs-tree-root/specs-tree-big365/discovery.md`：big365 定位为面向中小业务的开源多维数据服务，目标是通过 docker-compose / podman-compose、REST API、React 演示前端、MySQL 存储和自解释文档完成低复杂度快速接入闭环。

`discovery.md` 已完成格式优化，并加入多处 Mermaid 图，覆盖用户体验闭环、用户旅程、需求优先级、推荐架构、验收路径、版本演进、验证计划和目录拆分建议；其中 5.3 验收路径和前端范围已更新为：用户打开演示页面后应先看到默认演示效果 / 示例查询结果，再进入演示数据生成向导；生成过程中应可感知初始化、生成、写入、统计等阶段，增强参与感；前端表达保持业务化，避免要求用户直接理解维度等内部概念。

## 目录结构

```text
.sddu/
├── README.md                # 本文件 - SDDU 工作空间导航
└── specs-tree-root/          # 规范与需求目录集合
    ├── README.md            # 规范与需求目录导航
    └── specs-tree-big365/    # big365 目录
        ├── README.md        # big365 目录导航
        └── discovery.md     # 需求挖掘报告：big365
```

## 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | SDDU 工作空间根目录导航 | 已更新 |

## 子目录

| 目录 | 说明 |
|------|------|
| [specs-tree-root/](specs-tree-root/README.md) | 规范与需求目录集合，当前包含 big365 的需求挖掘结果与目录导航。 |

## 上级目录

- 当前为 SDDU 工作空间根目录
