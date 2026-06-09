package org.big365.api.space;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.dto.BizInfo;
import org.big365.api.model.DimensionConcept;
import org.big365.api.space.dto.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

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
     * Query aggregated value over a date range by iterating date columns
     * and performing in-memory SUM aggregation.
     *
     * Strategy (ADR-V2-002): application-layer iteration over date columns,
     * calling {@link SpaceRepository#queryCell(String, Map, String)} for each
     * date and accumulating results in memory.
     *
     * @param bizName     business name
     * @param coordinates dimension coordinate values
     * @param dateFrom    start date (yyyyMMdd, inclusive)
     * @param dateTo      end date (yyyyMMdd, inclusive)
     * @return aggregated query response with scannedDates and aggregationMethod
     */
    public SpaceQueryResponse queryRange(String bizName, Map<String, Integer> coordinates,
                                          String dateFrom, String dateTo) {
        // 1. Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // 2. Validate date formats
        validateDate(dateFrom);
        validateDate(dateTo);

        // 3. Validate dateFrom <= dateTo
        LocalDate parsedFrom = LocalDate.parse(dateFrom, DateTimeFormatter.ofPattern("yyyyMMdd"));
        LocalDate parsedTo = LocalDate.parse(dateTo, DateTimeFormatter.ofPattern("yyyyMMdd"));
        if (parsedFrom.isAfter(parsedTo)) {
            throw new BusinessException(ErrorCode.DATE_RANGE_INVALID);
        }

        // 4. Get dimension definitions to validate coordinate names
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
        Set<String> validCols = new HashSet<>();
        for (DimensionConcept dim : dimensions) {
            validCols.add(dim.getColumnName());
        }

        // 5. Validate coordinates against known dimensions
        for (String col : coordinates.keySet()) {
            if (!validCols.contains(col)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "未知维度: " + col);
            }
            int val = coordinates.get(col);
            if (val != 0) {
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

        // Ensure all defined dimensions are present in the query
        for (DimensionConcept dim : dimensions) {
            if (!coordinates.containsKey(dim.getColumnName())) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "缺少维度坐标: " + dim.getColumnName());
            }
        }

        // 6. Generate date list (inclusive)
        long daysBetween = ChronoUnit.DAYS.between(parsedFrom, parsedTo) + 1;
        List<String> dateList = new ArrayList<>();
        for (LocalDate d = parsedFrom; !d.isAfter(parsedTo); d = d.plusDays(1)) {
            dateList.add(d.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        }

        // 7. Soft limit: 365 days → warning, not rejected
        String warning = null;
        if (daysBetween > 365) {
            warning = ErrorCode.DATE_RANGE_TOO_LARGE.getMessage() +
                    " (实际跨度: " + daysBetween + " 天)";
            log.warn("Date range query exceeds 365-day limit: biz={}, from={}, to={}, span={} days",
                    bizName, dateFrom, dateTo, daysBetween);
        }

        // 8. Iterate over each date, query cell, sum in memory
        long sum = 0L;
        int scannedCount = 0;
        for (String date : dateList) {
            Long cellValue = spaceRepository.queryCell(bizName, coordinates, date);
            if (cellValue != null) {
                sum += cellValue;
            }
            scannedCount++;
        }

        log.info("queryRange completed: biz={}, coords={}, from={}, to={}, scannedDates={}, sum={}, warning={}",
                bizName, coordinates, dateFrom, dateTo, scannedCount, sum,
                warning != null ? "yes" : "none");

        return SpaceQueryResponse.builder()
                .coordinates(coordinates)
                .date(null) // no single date for range queries
                .value(sum)
                .dateFrom(dateFrom)
                .dateTo(dateTo)
                .scannedDates(scannedCount)
                .aggregationMethod("SUM")
                .warning(warning)
                .build();
    }

    /**
     * List space cells with pagination, excluding ALL rows (any coordinate = 0).
     * Returns raw coordinate-level data ordered by a date column value descending.
     *
     * @param bizName    business name
     * @param dimFilters optional dimension-value filter map (e.g. {"app": 1, "env": 1})
     * @param pageNo     1-based page number (≥1)
     * @param pageSize   page size (1–200)
     * @return paginated list response with total count and page metadata
     */
    public SpaceListResponse listCells(String bizName, Map<String, Integer> dimFilters,
                                        int pageNo, int pageSize) {
        // 1. Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // 2. Get dimension definitions for this biz
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
        if (dimensions.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "业务 '" + bizName + "' 尚未定义维度");
        }

        List<String> coordColumns = dimensions.stream()
                .map(DimensionConcept::getColumnName)
                .collect(Collectors.toList());

        // 3. Validate dimFilters: all keys must be valid dimension names
        if (dimFilters != null && !dimFilters.isEmpty()) {
            Set<String> validCols = new HashSet<>(coordColumns);
            for (String key : dimFilters.keySet()) {
                if (!validCols.contains(key)) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "未知维度: " + key);
                }
            }
        }

        // 4. Determine date column for ordering (use today's date)
        String dateColumn = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // 5. Call repository
        Map<String, Object> result = spaceRepository.listCells(
                bizName, coordColumns, dimFilters, pageNo, pageSize, dateColumn);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("list");
        long total = (Long) result.get("total");

        // 6. Transform rows to SpaceCellDto list
        List<SpaceCellDto> list = new ArrayList<>();
        if (rows != null) {
            for (Map<String, Object> row : rows) {
                Map<String, Integer> coords = new LinkedHashMap<>();
                Long id = null;
                Long value = null;

                for (Map.Entry<String, Object> entry : row.entrySet()) {
                    String key = entry.getKey();
                    Object val = entry.getValue();

                    if ("id".equals(key)) {
                        id = toLong(val);
                    } else if (key.equals(dateColumn)) {
                        value = toLong(val);
                    } else if (coordColumns.contains(key)) {
                        coords.put(key, toInt(val));
                    }
                }

                list.add(SpaceCellDto.builder()
                        .id(id)
                        .coordinates(coords)
                        .date(dateColumn)
                        .value(value != null ? value : 0L)
                        .build());
            }
        }

        // 7. Build response with pagination metadata
        int totalPages = (total == 0) ? 0 : (int) Math.ceil((double) total / pageSize);

        log.info("listCells completed: biz={}, pageNo={}, pageSize={}, total={}, returned={}, dimFilters={}",
                bizName, pageNo, pageSize, total, list.size(), dimFilters);

        return SpaceListResponse.builder()
                .list(list)
                .total(total)
                .pageNo(pageNo)
                .pageSize(pageSize)
                .totalPages(totalPages)
                .build();
    }

    /**
     * Delete a space cell. Three modes per ADR-V2-003:
     * <ul>
     *   <li>Specify coordinates + date → zero out that date column (UPDATE SET col = 0)</li>
     *   <li>Specify coordinates only → delete the entire row</li>
     *   <li>Any coordinate = 0 (ALL row) → rejected with FORBIDDEN_DELETE_ALL_ROW</li>
     * </ul>
     * After zeroing out a column, if all date columns become 0, the orphan row
     * is automatically physically deleted.
     *
     * @param bizName business name
     * @param request delete request containing coordinates and optional date
     * @return delete response with deletedRows count, coordinates, and date info
     */
    public DeleteSpaceResponse deleteCell(String bizName, DeleteSpaceRequest request) {
        Map<String, Integer> coordinates = request.getCoordinates();
        String date = request.getDate();

        // 1. Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // 2. Validate coordinates not null or empty
        if (coordinates == null || coordinates.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "coordinates 不能为空");
        }

        // 3. ALL row check: reject if any coordinate value is 0
        if (coordinates.values().stream().anyMatch(v -> v == 0)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_DELETE_ALL_ROW);
        }

        // 4. Get dimension definitions and validate coordinate names
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
        Set<String> validCols = dimensions.stream()
                .map(DimensionConcept::getColumnName)
                .collect(Collectors.toSet());

        for (String col : coordinates.keySet()) {
            if (!validCols.contains(col)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "未知维度: " + col);
            }
        }

        // Ensure all defined dimensions are present in coordinates
        for (DimensionConcept dim : dimensions) {
            if (!coordinates.containsKey(dim.getColumnName())) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "缺少维度坐标: " + dim.getColumnName());
            }
        }

        // 5. Validate date format if provided
        if (date != null) {
            validateDate(date);
        }

        // 6. Get biz info to determine date range
        List<BizInfo> bizList = bizRepository.listAllBiz();
        BizInfo bizInfo = bizList.stream()
                .filter(b -> b.getBizName().equals(bizName))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.BIZ_NOT_FOUND,
                        "业务 '" + bizName + "' 不存在"));

        // Generate all date columns from the biz's date range
        List<String> dateColumns = generateDateColumns(bizInfo.getDateFrom(), bizInfo.getDateTo());

        // 7. Coordinate existence check + get current version
        // Use queryCell with the first date column to determine if the coordinate row exists.
        // queryCell returns null only when no row matches the coordinate conditions.
        boolean coordinateExists = false;
        for (String dc : dateColumns) {
            Long cellValue = spaceRepository.queryCell(bizName, coordinates, dc);
            if (cellValue != null) {
                coordinateExists = true;
                break;
            }
        }

        if (!coordinateExists) {
            throw new BusinessException(ErrorCode.SPACE_CELL_NOT_FOUND,
                    "数据坐标不存在: " + coordinates);
        }

        // 8. If date is specified, validate it falls within the biz's date range
        if (date != null) {
            if (!dateColumns.contains(date)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "日期 " + date + " 不在业务的日期范围内 [" +
                                bizInfo.getDateFrom() + ", " + bizInfo.getDateTo() + "]");
            }
        }

        // 9. Read current version for optimistic locking (FR-V2-081)
        long currentVersion = spaceRepository.getVersion(bizName, coordinates);

        // 10. Execute delete with version check
        int deletedRows = 0;

        if (date != null) {
            // Mode A: Zero out the specified date column (with version check)
            log.info("deleteCell: zeroing out column biz={}, coords={}, date={}, version={}",
                    bizName, coordinates, date, currentVersion);
            int affected = spaceRepository.zeroOutColumn(bizName, coordinates, date, currentVersion);
            if (affected == 0) {
                throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION,
                        "数据坐标 " + coordinates + " 已被其他请求修改，请刷新后重试");
            }
            deletedRows = 1;

            // Check for orphan row: if all date columns are now 0, delete the row
            if (spaceRepository.isAllColumnsZero(bizName, coordinates, dateColumns)) {
                // Version was already incremented by zeroOutColumn; re-read for delete
                long versionAfterZero = spaceRepository.getVersion(bizName, coordinates);
                log.info("deleteCell: orphan cleanup — all date columns zero, deleting row biz={}, coords={}, version={}",
                        bizName, coordinates, versionAfterZero);
                int deleteAffected = spaceRepository.deleteRow(bizName, coordinates, versionAfterZero);
                if (deleteAffected == 0) {
                    // Row may have been deleted by concurrent request — log but don't fail
                    log.warn("deleteCell: orphan cleanup — row already deleted or version mismatch biz={}, coords={}",
                            bizName, coordinates);
                }
            }
        } else {
            // Mode B: Delete the entire row (with version check)
            log.info("deleteCell: deleting row biz={}, coords={}, version={}",
                    bizName, coordinates, currentVersion);
            int affected = spaceRepository.deleteRow(bizName, coordinates, currentVersion);
            if (affected == 0) {
                throw new BusinessException(ErrorCode.CONCURRENT_MODIFICATION,
                        "数据坐标 " + coordinates + " 已被其他请求修改，请刷新后重试");
            }
            deletedRows = 1;
        }

        log.info("deleteCell completed: biz={}, coords={}, date={}, deletedRows={}",
                bizName, coordinates, date, deletedRows);

        return DeleteSpaceResponse.builder()
                .deletedRows(deletedRows)
                .coordinates(coordinates)
                .date(date)
                .build();
    }

    /**
     * Generate all date column names between dateFrom and dateTo (inclusive).
     * Used for date column iteration and orphan cleanup checks.
     *
     * @param dateFrom start date in yyyyMMdd format
     * @param dateTo   end date in yyyyMMdd format
     * @return ordered list of date column names
     */
    static List<String> generateDateColumns(String dateFrom, String dateTo) {
        LocalDate from = LocalDate.parse(dateFrom, DateTimeFormatter.ofPattern("yyyyMMdd"));
        LocalDate to = LocalDate.parse(dateTo, DateTimeFormatter.ofPattern("yyyyMMdd"));
        List<String> columns = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            columns.add(d.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        }
        return columns;
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

    private static Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Long) return (Long) val;
        if (val instanceof Number) return ((Number) val).longValue();
        return Long.parseLong(val.toString());
    }

    private static Integer toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Integer) return (Integer) val;
        if (val instanceof Number) return ((Number) val).intValue();
        return Integer.parseInt(val.toString());
    }
}
