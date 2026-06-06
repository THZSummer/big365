# bigdata365 (big365)

> 多维大数据存储与查询平台 —— 基于维度建模的高性能日数据聚合服务

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.1.1-brightgreen)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-20-orange)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![MyBatis](https://img.shields.io/badge/MyBatis-3.0.2-red)](https://mybatis.org/)
[![Apache License 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 📖 项目简介

**bigdata365** 是一个面向多维大数据场景的 **日数据聚合存储与查询平台**。项目采用 **维度建模** 思想，将数据组织为 **向量(Vector) → 坐标(Coordinate)** 的多维结构，并基于 MySQL 的 **RANGE COLUMNS 分区表** 实现海量日数据的高效存储与检索。

核心数据表 `bigdata_365` 以 **天为粒度** 设计列（如 `20221201`、`20221202`……），结合三维分区键 `(a, b, c)`，支持 **百亿级数据行** 的分区裁剪查询，适用于金融、物联网、日志分析等需要按天聚合查询的大数据场景。

> 项目托管于 [Gitee](https://gitee.com)，采用 AI 辅助的 SDDU（Structured Development and Delivery Utility）开发工作流进行管理。

---

## 🏗️ 软件架构

### 整体架构

```
┌─────────────────────────────────────────────────┐
│                  big365-web                      │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Controller │→│  Service  │→│   Mapper     │  │
│  │  (REST)    │  │  (业务层)  │  │  (MyBatis)  │  │
│  └───────────┘  └───────────┘  └──────┬──────┘  │
│                                        │         │
│  ┌─────────────────────────────────────┘         │
│  │  Druid 连接池 + Kafka 消息队列                  │
│  └───────────────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   MySQL 8.0+    │
              │  (分区表存储)     │
              └─────────────────┘

┌─────────────────────────────────────────────────┐
│                  big365-core                     │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Vector     │  │   CoordinateManager      │  │
│  │   (向量)      │  │   VectorManager           │  │
│  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 模块说明

| 模块 | 说明 | 技术栈 |
|------|------|--------|
| **big365-core** | 核心领域模型，定义 Vector/Coordinate 等基础抽象 | Java 20, Lombok |
| **big365-web** | Web 服务层，提供 RESTful API 及数据持久化能力 | Spring Boot 3.1.1, MyBatis 3.0.2, Druid, Kafka |

### 数据模型

核心数据结构采用 **向量-坐标模型**：

```
Vector = [Coordinate(dimension=维度名, value=值), ...]
```

- **Vector（向量）**：由多个 Coordinate 组成的多维数据实体
- **Coordinate（坐标）**：维度名 + 值的键值对，描述数据在一个维度上的特征

### 数据库设计

| 表名 | 用途 | 特点 |
|------|------|------|
| `bigdata_365` | 日数据主表 | InnoDB, utf8mb4, RANGE COLUMNS 分区(10个分区)，约 8367万行 |
| `big365_dimension` | 维度元数据表 | 存储维度名称、别名、内部标识等 |
| `vector` | 向量定义表 | pid + name + aliasname |

`bigdata_365` 表采用 **RANGE COLUMNS(a, b, c)** 分区策略，每日数据存储为独立列（如 `20221201`），支持高效的分区裁剪查询。

---

## 🚀 快速开始

### 环境要求

- **JDK** 20+（实测兼容 JDK 21）
- **Maven** 3.8+（推荐使用项目自带的 Maven Wrapper `./mvnw`）
- **MySQL** 8.0+（建议 8.0.33 及以上）
- **Podman** 或 **Docker**（可选，用于快速启动 MySQL）
- **Kafka**（可选，消息队列支持）

### 快速启动（Podman/Docker）

使用 Podman 或 Docker 一键启动 MySQL 数据库：

```bash
# Podman
podman run -d   --name big365-mysql   -e MYSQL_ROOT_PASSWORD=root123   -e MYSQL_DATABASE=bigdata365   -e MYSQL_USER=bigdata365   -e MYSQL_PASSWORD=bigdata365   -p 3306:3306   mysql:8.0

# 或 Docker
docker run -d --name big365-mysql   -e MYSQL_ROOT_PASSWORD=root123   -e MYSQL_DATABASE=bigdata365   -e MYSQL_USER=bigdata365   -e MYSQL_PASSWORD=bigdata365   -p 3306:3306 mysql:8.0
```

### 数据库手动初始化

如需手动初始化数据库：

```sql
CREATE DATABASE `bigdata365` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

> 表结构详见 `doc/bigdata365.ndm2`（Navicat 数据模型文件），或通过项目初始化 API 自动建表。

### 编译构建

```bash
# 克隆仓库
git clone https://gitee.com/your-org/big365.git
cd big365

# ✅ 推荐：使用项目自带的 Maven Wrapper（无需安装 Maven）
cd big365-web
./mvnw clean package -DskipTests
cd ..

# 备选：使用系统 Maven
mvn clean package -DskipTests
```

> ⚠️ **JDK 21 兼容性**：如使用 JDK 21，需确保 Lombok 版本 ≥ 1.18.32（项目已适配）。

### 配置

编辑 `big365-web/src/main/resources/application.yml`：

```yaml
server:
  port: 8081
  servlet:
    context-path: /big365

spring:
  datasource:
    druid:
      username: bigdata365
      password: bigdata365
      jdbc-url: jdbc:mysql://127.0.0.1:3306/bigdata365?serverTimezone=UTC&useUnicode=true&characterEncoding=UTF-8
      # 密码回调类（用于 Base64 解码）
      passwordCallbackClassName: com.mlj.share.big365.example.config.DruidCustomPasswordCallback
```

> 🔐 数据库密码采用 **Base64 编码** 存储于配置项 `spring.datasource.druid.connect-properties.password` 中，值为 `YmlnZGF0YTM2NQ==`（解码后为 `bigdata365`），由自定义 `DruidCustomPasswordCallback` 在运行时自动解码。

### 运行

```bash
# ✅ 推荐：使用 Maven Wrapper 启动（开发调试）
cd big365-web
./mvnw spring-boot:run

# 方式二：直接运行编译好的 JAR（生产部署）
java -jar big365-web/target/big365-web-0.0.1-SNAPSHOT.jar
```

启动后访问：**http://localhost:8081/big365/**

预期响应：`Hello Bigdata365!`

### 验证

```bash
# 测试应用是否正常
curl http://localhost:8081/big365/
# 输出：Hello Bigdata365!

# 查看 Druid 监控控制台
open http://localhost:8081/big365/druid/   # 登录 admin / 123456
```

---

## 📡 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/big365/` | 欢迎页（Hello Bigdata365!） |
| `GET` | `/api/v1/bigdata365/{id}` | 查询单条数据 |
| `POST` | `/api/v1/bigdata365/` | 新增数据 |
| `PUT` | `/api/v1/bigdata365/{id}` | 更新数据 |
| `DELETE` | `/api/v1/bigdata365/{id}` | 删除数据 |
| `POST` | `/api/v1/bigdata365/init/table` | 初始化维度元数据表 |
| `POST` | `/api/v1/bigdata365/init/dimension` | 初始化维度数据 |

---

## 🧪 测试

```bash
# 运行全部测试
mvn test

# 运行指定模块测试
mvn test -pl big365-web
```

当前测试覆盖：
- `big365-core`：基础单元测试（JUnit 4）
- `big365-web`：Spring 上下文加载测试（JUnit 5 + Spring Boot Test）

---

## 📂 项目结构

```
big365/
├── .gitee/                    # Gitee PR & Issue 模板
├── .opencode/                 # OpenCode AI 助手配置
│   └── agents/                # SDDU 工作流 Agent 定义
├── .sddu/                     # SDDU 规范树目录
│   └── specs-tree-root/       # Feature 规范根目录
├── big365-core/               # 核心模块
│   └── src/main/java/com/mlj/share/big365/core/
│       ├── entries/           # 数据模型（Vector, Coordinate）
│       └── factory/           # 工厂接口（CoordinateManager, VectorManager）
├── big365-web/                # Web 服务模块
│   └── src/main/java/com/mlj/share/big365/example/
│       ├── config/            # 配置（Druid 数据源等）
│       ├── controller/        # REST 控制器
│       ├── mapper/            # MyBatis Mapper
│       ├── service/           # 业务逻辑层
│       └── vo/                # 值对象
├── doc/                       # 文档
│   └── bigdata365.ndm2        # Navicat 数据模型文件
├── pom.xml                    # 父 POM（多模块）
├── LICENSE                    # Apache License 2.0
├── README.md                  # 本文件
└── README.en.md               # English README
```

---

## 🛠️ 技术栈详情

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | Java | 20 |
| 框架 | Spring Boot | 3.1.1 |
| ORM | MyBatis Spring Boot Starter | 3.0.2 |
| 连接池 | Alibaba Druid | 1.2.18 |
| 消息队列 | Apache Kafka (spring-kafka) | - |
| 数据库 | MySQL Connector Java | 8.0.33 |
| 工具 | Lombok | 1.18.28 |
| 调度 | Spring @Scheduled | - |
| 测试 | JUnit 4/5, Spring Boot Test | - |

---

## 🤝 参与贡献

1. **Fork** 本仓库
2. 创建您的特性分支：`git checkout -b feat/xxx`
3. 提交您的变更：`git commit -m 'feat: add xxx'`
4. 推送至分支：`git push origin feat/xxx`
5. 提交 **Pull Request**

### 开发规范

- 遵守 [Conventional Commits](https://www.conventionalcommits.org/) 提交规范
- 代码风格遵循阿里巴巴 Java 开发手册
- 提交前确保测试通过

---

## 📄 许可证

本项目基于 **Apache License 2.0** 开源协议，详情请参见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- 项目采用 [OpenCode](https://opencode.ai) + [SDDU 工作流](.opencode/agents/) 进行 AI 辅助开发
- 感谢所有贡献者的支持

---

> **作者**: MLJ  
> **托管平台**: [Gitee](https://gitee.com)
