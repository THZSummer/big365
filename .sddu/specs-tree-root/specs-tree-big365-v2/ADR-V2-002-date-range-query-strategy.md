# ADR-V2-002: 时间区间查询采用应用层遍历日期列 + 内存 SUM 聚合

## 状态
PROPOSED

## 背景

V2 需要为现有 `GET /api/{biz}/space/query` 端点扩展 `dateFrom`/`dateTo` 时间区间查询能力（FR-V2-010~015）。Space 模型使用日期宽列表结构（每天一列），同一坐标组合的不同日期值存储在同一行的不同列中。因此时间区间查询需要遍历多个日期列并聚合。

Spec 明确约束（NG-V2-009）："不引入动态 UNION ALL"。这排除了在 SQL 层面拼接多列 SELECT 的方案。

候选方案：
1. **应用层遍历**：解析日期范围 → 循环调用 `queryCell()` 逐日查询 → 内存 SUM
2. **单次多列 SELECT**：构造 `SELECT date1 + date2 + ... AS total` 的 SQL
3. **动态 UNION ALL**：拼接 N 个 SELECT 子句合并（已排除）

需要权衡 DB 往返次数、SQL 复杂度、首版数据规模和扩展性。

## 决策

采用 **应用层遍历日期列 + 内存 SUM 聚合** 方案。

具体实现：

```java
public SpaceQueryResponse queryRange(String biz, Map<String, Integer> coords,
                                       String dateFrom, String dateTo) {
    // 1. 生成日期列表
    List<String> dates = generateDateList(dateFrom, dateTo);
    
    // 2. 软限制检查（365 天 warning）
    String warning = null;
    if (dates.size() > 365) {
        warning = "Date range exceeds 365 days; query may be slow for large datasets.";
    }
    
    // 3. 逐日查询并聚合
    long total = 0;
    int scannedDates = 0;
    for (String date : dates) {
        Long cellValue = spaceRepository.queryCell(biz, coords, date);
        if (cellValue != null) {
            total += cellValue;
        }
        scannedDates++;
    }
    
    // 4. 返回聚合结果
    return SpaceQueryResponse.builder()
            .coordinates(coords)
            .dateFrom(dateFrom)
            .dateTo(dateTo)
            .value(total)
            .scannedDates(scannedDates)
            .aggregationMethod("SUM")
            .warning(warning)
            .build();
}
```

### 为什么不是方案 B（单次多列 SELECT）

方案 B 构造如下的 SQL：
```sql
SELECT `20260601` + `20260602` + ... + `20260630` AS total
FROM big365_swks_demo_logs_space_t
WHERE a=1 AND b=0 AND c=0 AND d=0 AND e=0
```

问题：
- MyBatis `${}` 占位符拼接 N 个列名不安全且难以测试
- 当列值为 NULL（而非 0）时 SQL 加法结果为 NULL，需要 `COALESCE` 包裹每列
- 日期列数变化时需要动态构建完全不同结构的 SQL，与日期固定假设耦合
- 不符合 NG-V2-009 的设计精神

## 后果

### 正面影响
- 完全复用现有 `queryCell()` 和 `SpaceMapper.xml`，不改动数据库层
- 实现简单直接，易于调试和测试
- 可精确控制逐日查询的异常处理（某日期列不存在时跳过而非整体失败）
- 响应中包含 `scannedDates` 元数据，对用户透明
- 符合 Spec 约束 NG-V2-009

### 负面影响
- N 天查询产生 N 次 DB 往返（30 天 = 30 次 SELECT）
- 高维数据（如万级记录 × 90 天）时网络开销累积

### 缓解措施
- 首版预置数据 ~500 条/30 天，30 次 SELECT 在本地网络耗时 < 100ms
- NFR-V2-002 定义性能目标：预置数据 < 1 秒，万级数据/90 天 < 3 秒
- 软限制 365 天 warning 提示用户（不拒绝请求）
- 后续版本可引入并行查询（`CompletableFuture` 并发逐日查询）或 DB 端批量查询优化
- 日志记录区间查询的日期列数（scannedDates）便于性能监控
