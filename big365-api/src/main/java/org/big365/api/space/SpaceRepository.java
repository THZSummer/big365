package org.big365.api.space;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.big365.api.model.DimensionConcept;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Repository
@RequiredArgsConstructor
public class SpaceRepository {

    private static final String SPACE_MAPPER = "org.big365.api.space.SpaceMapper";

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
        List<Map<String, Object>> conditions = coordinates.entrySet().stream()
                .map(e -> Map.<String, Object>of("col", e.getKey(), "val", e.getValue()))
                .collect(Collectors.toList());

        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("tableName", tableName);
            params.put("dateColumn", date);
            params.put("conditions", conditions);

            Map<String, Object> result = session.selectOne(
                    SPACE_MAPPER + ".queryCell", params);
            if (result == null || result.get("value") == null) {
                return null;
            }
            Object val = result.get("value");
            if (val instanceof Long) return (Long) val;
            if (val instanceof Number) return ((Number) val).longValue();
            return Long.parseLong(val.toString());
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

    static String tableName(String bizName, String suffix) {
        return "big365_swks_" + bizName + "_" + suffix;
    }
}
