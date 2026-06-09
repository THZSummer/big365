# ADR-V2-003: Space Cell 硬删除 + 禁止删除 ALL 行 + 孤儿坐标清理

## 状态
PROPOSED

## 背景

V2 需要新增 `DELETE /api/{biz}/space/delete` 端点（FR-V2-030~035），补齐 MVP 缺少的删除能力。MVP 的 Space 模型使用宽列表结构：主键是坐标组合（各维度列），日期是列而非行。这意味着无法像行式表那样简单地 `DELETE WHERE coordinate_id = ? AND date = ?`。

关键设计问题：
1. 硬删除 vs 软删除（设值 0）
2. 如何处理 ALL 汇总行（0=ALL 哨兵）的删除
3. 如何实现「删除某坐标某日期的数据」的语义（日期列存储模式）
4. 删除后是否需要级联更新 ALL 行
5. 孤儿坐标组合（所有日期列都为 0 的行）如何处理

MVP 的 ADR-002 已确定 Space Cell 采用软删除策略。但 V2 的 Spec 明确要求硬删除（FR-V2-031）。

## 决策

采用 **硬删除 + 禁止删除 ALL 行 + 日期列归零 + 孤儿坐标清理** 方案。

### 删除语义定义

| 场景 | 操作 | 说明 |
|---|---|---|
| 指定 date 删除 | `UPDATE space_t SET \`date\` = 0 WHERE coordinates` | 将对应日期列值归零（保留行结构） |
| 未指定 date 删除 | `DELETE FROM space_t WHERE coordinates` | 删除整行 |
| 坐标中存在 ALL 值 | 拒绝（`FORBIDDEN_DELETE_ALL_ROW`） | 禁止删除 ALL 汇总行 |
| 删除后所有日期列为 0 | `DELETE FROM space_t`（孤儿清理） | 防止残留全零行 |

### 删除流程

```
1. 校验 coordinates 中无 ALL 值（任意维度 = 0）→ 拒绝
2. 定位坐标组合
   - 若不存在 → NOT_FOUND
3. 执行删除：
   a. 若指定 date：
      - UPDATE SET `dateColumn` = 0
      - 检查所有日期列是否都为 0 → 是则 DELETE 整行（孤儿清理）
   b. 若未指定 date：
      - DELETE FROM space_t WHERE 坐标匹配
4. 返回 deletedRows + coordinates + date（如有）
```

### 为什么禁止删除 ALL 行

ALL 行（坐标中至少一个维度 = 0）是 Space 模型的核心资产：
- ALL 行存储了所有聚合级别的预计算值
- 删除 ALL 行会导致上卷查询返回错误结果
- ALL 行由系统自动管理（写入时级联更新），不应由用户直接操作
- 若 ALL 行被误删，下次写入会通过 `INSERT ... ON DUPLICATE KEY UPDATE` 重建

### 为什么不级联更新 ALL 行

当删除叶子坐标（如 app=3, endpoint=7）的数据时，ALL 行（如 app=0, endpoint=7）中的值是预计算累积值，不应因删除单条叶子数据而扣减。原因：
- ALL 行记录的是历史累积值，难以精确反向计算（不知道哪些写入贡献了该值）
- 若用户希望 ALL 行反映删除后的状态，应通过重新生成数据实现
- 保持 ALL 行的不变性简化了系统复杂度

## 后果

### 正面影响
- 彻底删除数据（物理删除 / 归零），释放存储空间
- 删除语义清晰：指定 date = 归零该列，不指定 = 删行
- ALL 行保护防止误操作破坏预计算数据
- 孤儿清理防止残留全零行（保持表整洁）
- 符合 Spec FR-V2-031~033 的明确要求

### 负面影响
- 日期归零（UPDATE SET=0）与物理删除（DELETE）的语义差异需要文档说明
- 孤儿清理增加了一次额外 DB 查询（所有日期列检查）
- 与 MVP 原有软删除策略不一致（但 MVP 实际未实现删除端点）

### 缓解措施
- API 文档和错误消息明确说明「指定日期 = 将该日期值清零」「不指定日期 = 删除整行」
- `FORBIDDEN_DELETE_ALL_ROW` 错误消息包含解释：「汇总行由系统自动管理，不可直接删除」
- 孤儿检查 SQL 可通过 `SELECT COUNT(*) WHERE coordinate_id=? AND (date1!=0 OR date2!=0 ...)` 单次查询完成
- 若 ALL 行被绕过 API 直接操作数据库删除，系统不会主动检测但下次 write 会重建
