package org.big365.api.space;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.model.DimensionConcept;
import org.big365.api.space.dto.SpaceQueryResponse;
import org.big365.api.space.dto.SpaceWriteResponse;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpaceService {

    private final SpaceRepository spaceRepository;
    private final BizRepository bizRepository;

    /**
     * Write a coordinate + date + value into the space table.
     * Triggers cascade update: 1 data point → 2^d rows (Cartesian product with 0=ALL sentinel).
     */
    public SpaceWriteResponse write(String bizName, Map<String, Integer> coordinates,
                                     String date, Long value) {
        // 1. Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // 2. Validate date format
        validateDate(date);

        // 3. Get dimension definitions for this biz
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
        if (dimensions.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "业务 '" + bizName + "' 尚未定义维度");
        }

        // 4. Validate coordinates: all dimension names must be present, values must be in leaf range
        List<String> coordColumns = new ArrayList<>();
        for (DimensionConcept dim : dimensions) {
            String col = dim.getColumnName();
            coordColumns.add(col);
            if (!coordinates.containsKey(col)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "缺少维度坐标: " + col);
            }
            int val = coordinates.get(col);
            if (val < dim.getLeafMin() || val > dim.getLeafMax()) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "维度 '" + col + "' 的值 " + val + " 超出范围 ["
                                + dim.getLeafMin() + ", " + dim.getLeafMax() + "]");
            }
        }

        // Also reject extra coordinates not in dimensions
        for (String col : coordinates.keySet()) {
            if (!coordColumns.contains(col)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "未知维度: " + col);
            }
        }

        // 5. Generate Cartesian product combinations (with 0=ALL sentinel)
        List<Map<String, Integer>> combinations = generateCoordinateCombinations(coordinates);

        // 6. Execute INSERT ... ON DUPLICATE KEY UPDATE for each combination
        for (Map<String, Integer> combo : combinations) {
            spaceRepository.writeCombination(bizName, coordColumns, combo, date, value);
        }

        log.info("Space write completed: biz={}, leaf={}, date={}, value={}, rowsAffected={}",
                bizName, coordinates, date, value, combinations.size());

        return SpaceWriteResponse.builder()
                .rowsAffected(combinations.size())
                .build();
    }

    /**
     * Query a single cell value by exact coordinate match.
     * Returns 0 if the cell does not exist (unwritten coordinates default to 0).
     */
    public SpaceQueryResponse query(String bizName, Map<String, Integer> coordinates, String date) {
        // 1. Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // 2. Validate date format
        validateDate(date);

        // 3. Get dimension definitions to validate coordinate names
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
        Set<String> validCols = new HashSet<>();
        for (DimensionConcept dim : dimensions) {
            validCols.add(dim.getColumnName());
        }

        // 4. Validate coordinates against known dimensions
        for (String col : coordinates.keySet()) {
            if (!validCols.contains(col)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "未知维度: " + col);
            }
            int val = coordinates.get(col);
            if (val != 0) {
                // For non-zero, check against leaf range
                DimensionConcept dim = dimensions.stream()
                        .filter(d -> d.getColumnName().equals(col))
                        .findFirst().orElse(null);
                if (dim != null && (val < dim.getLeafMin() || val > dim.getLeafMax())) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "维度 '" + col + "' 的值 " + val + " 超出范围 ["
                                    + dim.getLeafMin() + ", " + dim.getLeafMax() + "]");
                }
            }
        }

        // 5. Ensure all defined dimensions are present in the query
        for (DimensionConcept dim : dimensions) {
            if (!coordinates.containsKey(dim.getColumnName())) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "缺少维度坐标: " + dim.getColumnName());
            }
        }

        // 6. Query the cell
        Long value = spaceRepository.queryCell(bizName, coordinates, date);

        return SpaceQueryResponse.builder()
                .coordinates(coordinates)
                .date(date)
                .value(value != null ? value : 0L)
                .build();
    }

    /**
     * Generate all coordinate combinations for cascade update.
     * For each dimension, the value is either 0 (ALL sentinel) or the leaf value.
     * Total combinations = 2^d where d = number of dimensions.
     *
     * Uses bitmask iteration: for mask from 0 to 2^d-1,
     * bit i = 0 → use 0 (ALL), bit i = 1 → use leaf value.
     */
    static List<Map<String, Integer>> generateCoordinateCombinations(
            Map<String, Integer> leafValues) {
        List<String> dims = new ArrayList<>(leafValues.keySet());
        int d = dims.size();
        int totalCombinations = 1 << d; // 2^d
        List<Map<String, Integer>> result = new ArrayList<>(totalCombinations);

        for (int mask = 0; mask < totalCombinations; mask++) {
            Map<String, Integer> combo = new LinkedHashMap<>();
            for (int i = 0; i < d; i++) {
                String dim = dims.get(i);
                // If bit i is 0 → use 0 (ALL sentinel), else → use leaf value
                combo.put(dim, ((mask >> i) & 1) == 0 ? 0 : leafValues.get(dim));
            }
            result.add(combo);
        }
        return result;
    }

    private void validateDate(String date) {
        if (date == null || date.length() != 8) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "日期格式错误，应为 yyyyMMdd");
        }
        try {
            DateTimeFormatter.ofPattern("yyyyMMdd").parse(date);
        } catch (DateTimeParseException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "日期格式错误，应为 yyyyMMdd: " + date);
        }
    }
}
