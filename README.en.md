# bigdata365 (big365)

> Multi-dimensional Big Data Storage & Query Platform — High-performance Daily Data Aggregation Service based on Dimensional Modeling

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.1.1-brightgreen)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-20-orange)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![MyBatis](https://img.shields.io/badge/MyBatis-3.0.2-red)](https://mybatis.org/)
[![Apache License 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 📖 Introduction

**bigdata365** is a **daily data aggregation storage and query platform** designed for multi-dimensional big data scenarios. It employs **dimensional modeling** principles, organizing data as **Vector → Coordinate** multi-dimensional structures, and leverages MySQL **RANGE COLUMNS partitioned tables** for efficient storage and retrieval of massive daily data.

The core table `bigdata_365` is designed with **daily granularity columns** (e.g., `20221201`, `20221202`…), combined with a three-dimensional partition key `(a, b, c)`, enabling **partition pruning queries** across tens of billions of data rows. It is well-suited for financial services, IoT, log analytics, and other scenarios requiring daily-aggregated queries.

> Hosted on [Gitee](https://gitee.com), managed with AI-assisted SDDU (Structured Development and Delivery Utility) workflow.

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│                  big365-web                      │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Controller │→│  Service  │→│   Mapper     │  │
│  │   (REST)   │  │ (Business)│  │  (MyBatis)  │  │
│  └───────────┘  └───────────┘  └──────┬──────┘  │
│                                        │         │
│  ┌─────────────────────────────────────┘         │
│  │  Druid Connection Pool + Kafka Messaging      │
│  └───────────────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   MySQL 8.0+    │
              │ (Partitioned)   │
              └─────────────────┘

┌─────────────────────────────────────────────────┐
│                  big365-core                     │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Vector     │  │   CoordinateManager      │  │
│  │  (Entity)    │  │   VectorManager          │  │
│  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Modules

| Module | Description | Stack |
|--------|-------------|-------|
| **big365-core** | Core domain model, defines Vector/Coordinate abstractions | Java 20, Lombok |
| **big365-web** | Web service layer, provides RESTful API & data persistence | Spring Boot 3.1.1, MyBatis 3.0.2, Druid, Kafka |

### Data Model

Core data structure uses a **Vector-Coordinate model**:

```
Vector = [Coordinate(dimension=name, value=value), ...]
```

- **Vector**: A multi-dimensional data entity composed of multiple Coordinates
- **Coordinate**: A key-value pair (dimension name + value) describing data characteristics along one dimension

### Database Design

| Table | Purpose | Features |
|-------|---------|----------|
| `bigdata_365` | Daily data main table | InnoDB, utf8mb4, RANGE COLUMNS partitioned (10 partitions), ~83.67M rows |
| `big365_dimension` | Dimension metadata | Stores dimension names, aliases, internal identifiers |
| `vector` | Vector definition table | pid + name + aliasname |

The `bigdata_365` table uses **RANGE COLUMNS(a, b, c)** partitioning strategy, with each date stored as an individual column (e.g., `20221201`), enabling efficient partition-pruning queries.

---

## 🚀 Quick Start

### Prerequisites

- **JDK** 20+ (tested compatible with JDK 21)
- **Maven** 3.8+ (recommended: use the bundled Maven Wrapper `./mvnw`)
- **MySQL** 8.0+ (8.0.33 or higher recommended)
- **Podman** or **Docker** (optional, for quick MySQL setup)
- **Kafka** (optional, messaging support)

### Quick MySQL Setup (Podman/Docker)

Start a MySQL 8.0 database with one command:

```bash
# Podman
podman run -d   --name big365-mysql   -e MYSQL_ROOT_PASSWORD=root123   -e MYSQL_DATABASE=bigdata365   -e MYSQL_USER=bigdata365   -e MYSQL_PASSWORD=bigdata365   -p 3306:3306   mysql:8.0

# or Docker
docker run -d --name big365-mysql   -e MYSQL_ROOT_PASSWORD=root123   -e MYSQL_DATABASE=bigdata365   -e MYSQL_USER=bigdata365   -e MYSQL_PASSWORD=bigdata365   -p 3306:3306 mysql:8.0
```

### Manual Database Setup

To initialize the database manually:

```sql
CREATE DATABASE `bigdata365` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

> See `doc/bigdata365.ndm2` (Navicat data modeler file) for the full table schema, or use the project's init API to auto-create tables.

### Build

```bash
# Clone repository
git clone https://gitee.com/your-org/big365.git
cd big365

# ✅ Recommended: use the bundled Maven Wrapper (no Maven installation needed)
cd big365-web
./mvnw clean package -DskipTests
cd ..

# Alternative: use system Maven
mvn clean package -DskipTests
```

> ⚠️ **JDK 21 Compatibility**: If using JDK 21, ensure Lombok version ≥ 1.18.32 (the project has been updated accordingly).

### Configuration

Edit `big365-web/src/main/resources/application.yml`:

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
      # Password callback class (for Base64 decoding)
      passwordCallbackClassName: com.mlj.share.big365.example.config.DruidCustomPasswordCallback
```

> 🔐 The database password is **Base64-encoded** in the config property `spring.datasource.druid.connect-properties.password` with value `YmlnZGF0YTM2NQ==` (decodes to `bigdata365`). The custom `DruidCustomPasswordCallback` decodes it automatically at runtime.

### Run

```bash
# ✅ Recommended: use Maven Wrapper for development
cd big365-web
./mvnw spring-boot:run

# Option 2: run the compiled JAR (production deployment)
java -jar big365-web/target/big365-web-0.0.1-SNAPSHOT.jar
```

Once started, visit: **http://localhost:8081/big365/**

Expected response: `Hello Bigdata365!`

### Verify

```bash
# Test the application
curl http://localhost:8081/big365/
# Output: Hello Bigdata365!

# Access the Druid monitoring console
open http://localhost:8081/big365/druid/   # Login: admin / 123456
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/big365/` | Welcome page (Hello Bigdata365!) |
| `GET` | `/api/v1/bigdata365/{id}` | Query a single record |
| `POST` | `/api/v1/bigdata365/` | Create a record |
| `PUT` | `/api/v1/bigdata365/{id}` | Update a record |
| `DELETE` | `/api/v1/bigdata365/{id}` | Delete a record |
| `POST` | `/api/v1/bigdata365/init/table` | Initialize dimension metadata table |
| `POST` | `/api/v1/bigdata365/init/dimension` | Initialize dimension data |

---

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run specific module tests
mvn test -pl big365-web
```

Current test coverage:
- `big365-core`: Basic unit tests (JUnit 4)
- `big365-web`: Spring context loading test (JUnit 5 + Spring Boot Test)

---

## 📂 Project Structure

```
big365/
├── .gitee/                    # Gitee PR & Issue templates
├── .opencode/                 # OpenCode AI assistant config
│   └── agents/                # SDDU workflow agent definitions
├── .sddu/                     # SDDU specs tree
│   └── specs-tree-root/       # Feature specification root
├── big365-core/               # Core module
│   └── src/main/java/com/mlj/share/big365/core/
│       ├── entries/           # Data models (Vector, Coordinate)
│       └── factory/           # Factory interfaces
├── big365-web/                # Web service module
│   └── src/main/java/com/mlj/share/big365/example/
│       ├── config/            # Configuration (Druid datasource, etc.)
│       ├── controller/        # REST controllers
│       ├── mapper/            # MyBatis mappers
│       ├── service/           # Business logic layer
│       └── vo/                # Value objects
├── doc/                       # Documentation
│   └── bigdata365.ndm2        # Navicat data modeler file
├── pom.xml                    # Parent POM (multi-module)
├── LICENSE                    # Apache License 2.0
├── README.md                  # Chinese README
└── README.en.md               # This file
```

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | Java | 20 |
| Framework | Spring Boot | 3.1.1 |
| ORM | MyBatis Spring Boot Starter | 3.0.2 |
| Connection Pool | Alibaba Druid | 1.2.18 |
| Messaging | Apache Kafka (spring-kafka) | - |
| Database | MySQL Connector Java | 8.0.33 |
| Utilities | Lombok | 1.18.28 |
| Scheduling | Spring @Scheduled | - |
| Testing | JUnit 4/5, Spring Boot Test | - |

---

## 🤝 Contributing

1. **Fork** the repository
2. Create your feature branch: `git checkout -b feat/xxx`
3. Commit your changes: `git commit -m 'feat: add xxx'`
4. Push to the branch: `git push origin feat/xxx`
5. Submit a **Pull Request**

### Development Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- Code style follows Alibaba Java Development Guide
- Ensure all tests pass before submitting

---

## 📄 License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- Developed with [OpenCode](https://opencode.ai) + [SDDU Workflow](.opencode/agents/) for AI-assisted development
- Thanks to all contributors

---

> **Author**: MLJ  
> **Hosted on**: [Gitee](https://gitee.com)
