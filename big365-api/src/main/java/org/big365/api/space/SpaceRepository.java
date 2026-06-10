package org.big365.api.space;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.big365.api.model.DimensionConcept;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Repository
@RequiredArgsConstructor
public class SpaceRepository {

    private static final String SPACE_MAPPER = "org.big365.api.space.SpaceMapper";

    /** Pattern for safe SQL identifier names (alphanumeric + underscore, 1-64 chars). */
    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("^[a-zA-Z0-9_]{1,64}$");

    private final SqlSessionFactory sqlSessionFactory;

    /**
     * Get dimension definitions from the biz-specific dimensions table.
     */
    public List<DimensionConcept> getDimensionConcepts(String bizName) {
        String tableName = tableName(bizName, "dimensions_t");
        try (SqlSession session = sqlSessionFactory.openSession()) {
            List<Map<String, Object>> rows = session.selectList(
                    SPACE_MAPPER + ".listDimensions",
                    Map.of("tableName", tableName));
            return rows.stream()
                    .map(row -> DimensionConcept.builder()
                            .columnName((String) row.get("column_name"))
                            .displayName((String) row.get("display_name"))
                            .leafMin((Integer) row.get("leaf_min"))
                            .leafMax((Integer) row.get("leaf_max"))
                            .build())
                    .collect(Collectors.toList());
        }
    }

    /**
     * Query a single cell value by exact coordinate match.
     * Returns the value for the given date, or null if no row exists.
     */
    public Long queryCell(String bizName, Map<String, Integer> coordinates, String date) {
        String tableName = tableName(bizName, "space_t");
        if (!SAFE_IDENTIFIER.matcher(date).matches()) {
            throw new IllegalArgumentException("Invalid date column name: " + date);
        }
        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("tableName", tableName);
            params.put("dateColumn", date);
            params.put("conditions", conditions);

            try {
                Map<String, Object> result = session.selectOne(
                        SPACE_MAPPER + ".queryCell", params);
                if (result == null || result.get("value") == null) {
                    return null;
                }
                Object val = result.get("value");
                if (val instanceof Long) return (Long) val;
                if (val instanceof Number) return ((Number) val).longValue();
                return Long.parseLong(val.toString());
            } catch (Exception e) {
                log.debug("queryCell failed for biz={}, date={}: {}", bizName, date, e.getMessage());
                return null;
            }
        }
    }

    /**
     * Write a single coordinate combination row.
     * Uses INSERT ... ON DUPLICATE KEY UPDATE to accumulate values.
     */
    public void writeCombination(String bizName, List<String> coordColumns,
                                   Map<String, Integer> combination,
                                   String date, Long value) {
        String tableName = tableName(bizName, "space_t");

        // R-001: Validate all column names against SQL identifier whitelist
        for (String col : coordColumns) {
            if (!SAFE_IDENTIFIER.matcher(col).matches()) {
                throw new IllegalArgumentException("Invalid column name: " + col);
            }
        }
        if (!SAFE_IDENTIFIER.matcher(date).matches()) {
            throw new IllegalArgumentException("Invalid date column name: " + date);
        }

        // Build column string: like "`a`, `b`"
        String coordColumnsStr = coordColumns.stream()
                .map(c -> "`" + c + "`")
                .collect(Collectors.joining(", "));

        // Build value string: like "3, 7"
        String coordValuesStr = coordColumns.stream()
                .map(c -> String.valueOf(combination.get(c)))
                .collect(Collectors.joining(", "));

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("coordColumnsStr", coordColumnsStr);
        params.put("coordValuesStr", coordValuesStr);
        params.put("dateColumn", date);
        params.put("value", value);

        try (SqlSession session = sqlSessionFactory.openSession(true)) {
            session.insert(SPACE_MAPPER + ".insertOrUpdate", params);
        }
    }

    // ===== V2: List + Delete methods =====

    /**
     * List space cells with pagination, excluding ALL rows (any coordinate = 0).
     * Supports optional dimension-value filters and ordering by a date column.
     *
     * @param bizName      business name
     * @param coordColumns all coordinate column names for this business
     * @param dimFilters   optional dimension-value filter map (e.g. {"app": 1, "env": 1})
     * @param pageNo       1-based page number
     * @param pageSize     page size (1–200)
     * @param dateColumn   date column name for ORDER BY (e.g. "20260610")
     * @return map with keys "list" (List&lt;Map&gt;) and "total" (Long)
     */
    public Map<String, Object> listCells(String bizName, List<String> coordColumns,
                                          Map<String, Integer> dimFilters,
                                          int pageNo, int pageSize,
                                          String dateColumn) {
        String tableName = tableName(bizName, "space_t");
        int offset = (pageNo - 1) * pageSize;

        // Convert dimFilters Map to list of {col, val} objects for MyBatis
        List<Map<String, Object>> filterList = null;
        if (dimFilters != null && !dimFilters.isEmpty()) {
            filterList = dimFilters.entrySet().stream()
                    .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                    .collect(Collectors.toList());
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("coordColumns", coordColumns);
        params.put("dimFilters", filterList);
        params.put("dateColumn", dateColumn);
        params.put("limit", pageSize);
        params.put("offset", offset);

        try (SqlSession session = sqlSessionFactory.openSession()) {
            List<Map<String, Object>> list;
            long total;
            try {
                list = session.selectList(
                        SPACE_MAPPER + ".listSpaceCells", params);
                total = session.selectOne(SPACE_MAPPER + ".countSpaceCells", params);
            } catch (Exception e) {
                log.debug("listCells failed with dateColumn={}, falling back to id ordering: {}",
                        dateColumn, e.getMessage());
                // Fallback: ORDER BY id instead of missing date column
                Map<String, Object> fallbackParams = new HashMap<>(params);
                fallbackParams.put("dateColumn", "id");
                list = session.selectList(
                        SPACE_MAPPER + ".listSpaceCells", fallbackParams);
                total = session.selectOne(SPACE_MAPPER + ".countSpaceCells", fallbackParams);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("list", list);
            result.put("total", total);
            return result;
        }
    }

    /**
     * Zero out a specific date column for a coordinate combination.
     * Used when deleting a single date's data.
     *
     * @param bizName         business name
     * @param coordinates     exact coordinate values (e.g. {"app": 1, "endpoint": 3})
     * @param date            date column name to zero out (e.g. "20260601")
     * @param expectedVersion optimistic lock version; operation only succeeds if version matches
     * @return number of rows affected (0 = version mismatch / concurrent modification)
     */
    public int zeroOutColumn(String bizName, Map<String, Integer> coordinates, String date, long expectedVersion) {
        String tableName = tableName(bizName, "space_t");

        if (!SAFE_IDENTIFIER.matcher(date).matches()) {
            throw new IllegalArgumentException("Invalid date column name: " + date);
        }

        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("dateColumn", date);
        params.put("conditions", conditions);
        params.put("expectedVersion", expectedVersion);

        try (SqlSession session = sqlSessionFactory.openSession(true)) {
            return session.update(SPACE_MAPPER + ".zeroOutColumn", params);
        }
    }

    /**
     * Delete an entire row matching all coordinate columns.
     * Used when deleting all dates for a coordinate combination.
     *
     * @param bizName         business name
     * @param coordinates     exact coordinate values (e.g. {"app": 1, "endpoint": 3})
     * @param expectedVersion optimistic lock version; operation only succeeds if version matches
     * @return number of rows affected (0 = version mismatch / concurrent modification)
     */
    public int deleteRow(String bizName, Map<String, Integer> coordinates, long expectedVersion) {
        String tableName = tableName(bizName, "space_t");

        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("conditions", conditions);
        params.put("expectedVersion", expectedVersion);

        try (SqlSession session = sqlSessionFactory.openSession(true)) {
            return session.delete(SPACE_MAPPER + ".deleteRow", params);
        }
    }

    /**
     * Get the current optimistic lock version for a coordinate combination.
     * Returns 0 if the row does not exist (first write will use version=0).
     *
     * @param bizName     business name
     * @param coordinates exact coordinate values
     * @return current version number, or 0 if no row exists
     */
    public long getVersion(String bizName, Map<String, Integer> coordinates) {
        String tableName = tableName(bizName, "space_t");

        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("conditions", conditions);

        try (SqlSession session = sqlSessionFactory.openSession()) {
            Long version = session.selectOne(SPACE_MAPPER + ".getVersion", params);
            return version != null ? version : 0L;
        }
    }

    /**
     * Check whether all date columns are zero for a given coordinate combination.
     * Used for orphan cleanup: if all dates are 0 after zeroing out a column,
     * the entire coordinate row should be deleted.
     *
     * @param bizName      business name
     * @param coordinates  exact coordinate values
     * @param dateColumns  list of all date column names for this business
     * @return true if all date column values sum to 0 (or row does not exist)
     */
    public boolean isAllColumnsZero(String bizName, Map<String, Integer> coordinates,
                                     List<String> dateColumns) {
        String tableName = tableName(bizName, "space_t");

        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> params = new HashMap<>();
        params.put("tableName", tableName);
        params.put("conditions", conditions);
        params.put("dateColumns", dateColumns);

        try (SqlSession session = sqlSessionFactory.openSession()) {
            Long total = session.selectOne(SPACE_MAPPER + ".isAllColumnsZero", params);
            return total == null || total == 0L;
        }
    }

    static String tableName(String bizName, String suffix) {
        return "big365_swks_" + bizName + "_" + suffix;
    }
}
