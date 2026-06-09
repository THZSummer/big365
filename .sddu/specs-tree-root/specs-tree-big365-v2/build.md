## ✅ TASK-V2-012: Review 残留项修复 — 实现完成

> **Feature**: `big365-v2` (FR-BIG365-V2)  
> **波次**: Wave 5  
> **状态**: ✅ completed  
> **完成日期**: 2026-06-10  

---

### 修改的文件

#### 后端 (7 文件)

| 文件 | 变更说明 |
|---|---|
| `big365-api/src/main/java/org/big365/api/common/ErrorCode.java` | 新增 `CONCURRENT_MODIFICATION` 错误码（409 Conflict） |
| `big365-api/src/main/java/org/big365/api/common/GlobalExceptionHandler.java` | `CONCURRENT_MODIFICATION` → HTTP 409 Conflict |
| `big365-api/src/main/java/org/big365/api/biz/BizRepository.java` | Space 表 DDL 新增 `version BIGINT NOT NULL DEFAULT 0` 列（FR-V2-081） |
| `big365-api/src/main/resources/mapper/SpaceMapper.xml` | 6 处 SQL 变更：`insertOrUpdate` 含 version 列；`zeroOutColumn`/`deleteRow` 增加 `expectedVersion` 条件；新增 `getVersion` 查询 |
| `big365-api/src/main/java/org/big365/api/space/SpaceRepository.java` | 5 处变更：列名安全校验（R-001）；`zeroOutColumn`/`deleteRow` 增加 `expectedVersion` 参数并返回 `int`；新增 `getVersion()` 方法 |
| `big365-api/src/main/java/org/big365/api/space/SpaceService.java` | `deleteCell()` 重构：增加版本读取 + 冲突检测；孤儿清理流程使用重读版本号 |
| `big365-api/src/main/resources/application.yml` | 移除 `log-impl: StdOutImpl`（R-002） |
| `big365-api/src/main/resources/application-dev.yml` | **[NEW]** 开发环境 SQL 日志配置（R-002） |

#### 前端 (8 文件)

| 文件 | 变更说明 |
|---|---|
| `big365-web/src/styles/global.css` | 新增 `@keyframes pulse` 全局动画（R-005） |
| `big365-web/src/pages/DemoDataPage.tsx` | 移除内联 `<style>` 标签（R-005） |
| `big365-web/src/api/types.ts` | 新增 `HealthStatus`、`SpaceQueryParams` 类型（R-004） |
| `big365-web/src/pages/HomePage.tsx` | 移除 `client` 直接调用和 `(health as any)`，使用 `checkHealth()` + `HealthStatus` 类型（R-003/R-004） |
| `big365-web/src/api/health.ts` | **[NEW]** 健康检查 API 封装（R-003） |
| `big365-web/src/api/space.ts` | 移除 `<any, ApiResponse<T>>` 泛型 hack，使用显式返回类型（R-003） |
| `big365-web/src/api/dimensions.ts` | 同上（R-003） |
| `big365-web/src/api/demo.ts` | 同上（R-003） |
| `big365-web/src/pages/BizPage.tsx` | 移除 `client` 直接调用，使用 `listBiz()`/`registerBiz()` 封装（R-003） |
| `big365-web/src/pages/SpacePage.tsx` | `Record<string, any>` → `SpaceQueryParams`（R-003/R-007） |

#### 测试 (1 文件)

| 文件 | 变更说明 |
|---|---|
| `big365-api/src/test/java/org/big365/api/space/SpaceServiceTest.java` | 适配新的乐观锁签名（4-arg `zeroOutColumn`、3-arg `deleteRow`、`getVersion` stub） |

---

### 实现的功能

#### MVP Review 残留项修复

- [x] **R-001** — SpaceMapper.xml `${coordColumnsStr}` SQL 注入风险：在 `SpaceRepository` 中对所有传入列名执行 `^[a-zA-Z_][a-zA-Z0-9_]{0,63}$` 正则校验，拒绝非法标识符
- [x] **R-002** — MyBatis SQL 日志 `StdOutImpl` 未按 Spring profile 分离：从 `application.yml` 移除，迁移到 `application-dev.yml`（仅 dev profile 启用）
- [x] **R-003** — Axios 响应拦截器 Unwrap 导致泛型类型不一致：所有 API 函数移除 `<any, ApiResponse<T>>` hack，改用显式 `Promise<ApiResponse<T>>` 返回类型；组件层移除 `client` 直接调用，统一使用 API 封装函数
- [x] **R-004** — HomePage `(health as any).status` 绕过 TS 类型检查：定义 `HealthStatus` 类型，使用 `checkHealth()` API 封装，移除所有 `any` 类型断言
- [x] **R-005** — DemoDataPage 内联 `<style>` @keyframes 重复插入：动画移至 `global.css`，移除 JSX 中的 `<style>` 标签
- [x] **R-006** — DocsPage 文档链接 `.md` 后缀浏览器无法渲染：TASK-V2-008 已修复 `target="_blank"`；确认通过

#### V2 新增需求

- [x] **FR-V2-080** — 维度唯一约束 DDL：确认 `UNIQUE KEY uk_column_name (column_name)` 已存在，每业务独立维度表，约束等效 `UNIQUE(biz_name, column_name)`
- [x] **FR-V2-081** — 乐观锁：Space 表 DDL 新增 `version BIGINT NOT NULL DEFAULT 0`；`zeroOutColumn`/`deleteRow` 增加 `AND version = #{expectedVersion}` WHERE 条件 + 版本递增 SET；`deleteCell()` 读取版本后操作，affected=0 时抛出 `CONCURRENT_MODIFICATION`（HTTP 409 Conflict）

---

### 测试覆盖

- **单元测试**: 52 个用例全部通过（3 个测试类）
- **测试状态**: ✅ 0 Failures, 0 Errors, 0 Skipped
- **测试验证命令**: `mvn test -pl big365-api`
- **前端编译**: `npx tsc --noEmit` + `npm run build` 均通过

---

### 验证命令

```bash
# 后端编译 + 测试
cd big365-api && mvn compile -q && echo "OK: compilation"
cd big365-api && mvn test -q    # 52 tests pass

# 前端编译
cd big365-web && npx tsc --noEmit && echo "OK: type check"
cd big365-web && npm run build && echo "OK: build"

# 乐观锁手动验证（需启动服务）
# 并发 zeroOutColumn/deleteRow → 其中之一应返回 CONCURRENT_MODIFICATION
```

---

### 下一步

- 所有 12 个任务已完成 ✅
- 可运行 `@sddu-review big365-v2` 进行 V2 代码审查
- 或运行 `@sddu-validate big365-v2` 进行最终规范一致性验证
