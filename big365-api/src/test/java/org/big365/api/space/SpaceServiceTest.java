package org.big365.api.space;

import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.dto.BizInfo;
import org.big365.api.model.DimensionConcept;
import org.big365.api.space.dto.DeleteSpaceRequest;
import org.big365.api.space.dto.DeleteSpaceResponse;
import org.big365.api.space.dto.SpaceCellDto;
import org.big365.api.space.dto.SpaceListResponse;
import org.big365.api.space.dto.SpaceQueryResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SpaceService 单元测试")
class SpaceServiceTest {

    @Mock
    private SpaceRepository spaceRepository;

    @Mock
    private BizRepository bizRepository;

    @InjectMocks
    private SpaceService spaceService;

    // ---- Shared test data ----

    private static final String BIZ_NAME = "demo_logs";
    private static final String DATE_VALID = "20260601";

    private static List<DimensionConcept> twoDimensions() {
        return List.of(
                DimensionConcept.builder().columnName("app").displayName("应用").leafMin(1).leafMax(3).build(),
                DimensionConcept.builder().columnName("endpoint").displayName("接口").leafMin(1).leafMax(5).build()
        );
    }

    private static List<DimensionConcept> fiveDimensions() {
        return List.of(
                DimensionConcept.builder().columnName("a").displayName("维度A").leafMin(1).leafMax(3).build(),
                DimensionConcept.builder().columnName("b").displayName("维度B").leafMin(1).leafMax(5).build(),
                DimensionConcept.builder().columnName("c").displayName("维度C").leafMin(1).leafMax(2).build(),
                DimensionConcept.builder().columnName("d").displayName("维度D").leafMin(1).leafMax(4).build(),
                DimensionConcept.builder().columnName("e").displayName("维度E").leafMin(1).leafMax(3).build()
        );
    }

    private void stubBizExists() {
        when(bizRepository.bizExists(BIZ_NAME)).thenReturn(true);
    }

    private void stubDimensions(List<DimensionConcept> dims) {
        when(spaceRepository.getDimensionConcepts(BIZ_NAME)).thenReturn(dims);
    }

    // =========================================================================
    // generateCoordinateCombinations 笛卡尔积测试
    // =========================================================================

    @Nested
    @DisplayName("generateCoordinateCombinations — 笛卡尔积生成")
    class GenerateCoordinateCombinationsTests {

        @Test
        @DisplayName("2 维度 → 返回 4 个组合 (2^2)")
        void generateCoordinateCombinations_2dim_returns4() {
            Map<String, Integer> leaf = new LinkedHashMap<>();
            leaf.put("app", 2);
            leaf.put("endpoint", 3);

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            assertThat(result).hasSize(4); // 2^2
            // 验证包含 (0,0), (2,0), (0,3), (2,3)
            assertThat(result).anyMatch(m -> m.get("app") == 0 && m.get("endpoint") == 0);
            assertThat(result).anyMatch(m -> m.get("app") == 2 && m.get("endpoint") == 0);
            assertThat(result).anyMatch(m -> m.get("app") == 0 && m.get("endpoint") == 3);
            assertThat(result).anyMatch(m -> m.get("app") == 2 && m.get("endpoint") == 3);
        }

        @Test
        @DisplayName("3 维度 → 返回 8 个组合 (2^3)")
        void generateCoordinateCombinations_3dim_returns8() {
            Map<String, Integer> leaf = new LinkedHashMap<>();
            leaf.put("a", 1);
            leaf.put("b", 2);
            leaf.put("c", 3);

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            assertThat(result).hasSize(8); // 2^3
        }

        @Test
        @DisplayName("5 维度 → 返回 32 个组合 (2^5)")
        void generateCoordinateCombinations_5dim_returns32() {
            Map<String, Integer> leaf = new LinkedHashMap<>();
            leaf.put("a", 1);
            leaf.put("b", 2);
            leaf.put("c", 3);
            leaf.put("d", 4);
            leaf.put("e", 5);

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            assertThat(result).hasSize(32); // 2^5
        }

        @Test
        @DisplayName("0 维度（空输入）→ 返回 1 个空组合 (2^0=1)")
        void generateCoordinateCombinations_0dim_returns1() {
            Map<String, Integer> leaf = Collections.emptyMap();

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            assertThat(result).hasSize(1); // 2^0
            assertThat(result.get(0)).isEmpty();
        }

        @Test
        @DisplayName("验证 ALL 哨兵行（全 0）总是第一个组合")
        void generateCoordinateCombinations_allSentinelRowIsFirst() {
            Map<String, Integer> leaf = new LinkedHashMap<>();
            leaf.put("x", 10);
            leaf.put("y", 20);

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            // mask=0 → all zeros (ALL row) should be first
            Map<String, Integer> first = result.get(0);
            assertThat(first.get("x")).isEqualTo(0);
            assertThat(first.get("y")).isEqualTo(0);
        }

        @Test
        @DisplayName("验证最后一个组合是所有叶子值（mask=2^d-1）")
        void generateCoordinateCombinations_lastIsAllLeafValues() {
            Map<String, Integer> leaf = new LinkedHashMap<>();
            leaf.put("x", 10);
            leaf.put("y", 20);

            List<Map<String, Integer>> result = SpaceService.generateCoordinateCombinations(leaf);

            Map<String, Integer> last = result.get(3);
            assertThat(last.get("x")).isEqualTo(10);
            assertThat(last.get("y")).isEqualTo(20);
        }
    }

    // =========================================================================
    // generateDateColumns 日期列生成测试
    // =========================================================================

    @Nested
    @DisplayName("generateDateColumns — 日期列范围生成")
    class GenerateDateColumnsTests {

        @Test
        @DisplayName("7 天范围生成 7 个日期列")
        void generateDateColumns_7days_returns7() {
            List<String> columns = SpaceService.generateDateColumns("20260601", "20260607");

            assertThat(columns).hasSize(7);
            assertThat(columns).containsExactly(
                    "20260601", "20260602", "20260603", "20260604", "20260605", "20260606", "20260607"
            );
        }

        @Test
        @DisplayName("单日范围（from=to）返回 1 个日期列")
        void generateDateColumns_singleDay_returns1() {
            List<String> columns = SpaceService.generateDateColumns("20260601", "20260601");

            assertThat(columns).hasSize(1);
            assertThat(columns.get(0)).isEqualTo("20260601");
        }
    }

    // =========================================================================
    // queryRange — 时间区间查询测试
    // =========================================================================

    @Nested
    @DisplayName("queryRange — 时间区间查询")
    class QueryRangeTests {

        @Test
        @DisplayName("7 天区间查询 — SUM 聚合正确")
        void queryRange_7days_sumsCorrectly() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());
            Map<String, Integer> coords = Map.of("app", 1, "endpoint", 3);

            // 7 天，每天返回递增的值: 100,200,...,700
            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString()))
                    .thenReturn(100L, 200L, 300L, 400L, 500L, 600L, 700L);

            // When
            SpaceQueryResponse response = spaceService.queryRange(BIZ_NAME, coords, "20260601", "20260607");

            // Then
            assertThat(response.getValue()).isEqualTo(2800L); // 100+200+...+700
            assertThat(response.getScannedDates()).isEqualTo(7);
            assertThat(response.getAggregationMethod()).isEqualTo("SUM");
            assertThat(response.getDateFrom()).isEqualTo("20260601");
            assertThat(response.getDateTo()).isEqualTo("20260607");
            assertThat(response.getWarning()).isNull();

            // Verify queryCell called exactly 7 times
            verify(spaceRepository, times(7)).queryCell(eq(BIZ_NAME), anyMap(), anyString());
        }

        @Test
        @DisplayName("部分日期无数据（queryCell 返回 null）→ 该日期计为 0，不影响其他日期")
        void queryRange_nullCells_treatedAsZero() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());
            Map<String, Integer> coords = Map.of("app", 1, "endpoint", 3);

            // 3 天：第2天返回 null (视作 0)
            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString()))
                    .thenReturn(100L, null, 300L);

            // When
            SpaceQueryResponse response = spaceService.queryRange(BIZ_NAME, coords, "20260601", "20260603");

            // Then
            assertThat(response.getValue()).isEqualTo(400L); // 100+0+300
            assertThat(response.getScannedDates()).isEqualTo(3);
        }

        @Test
        @DisplayName("dateFrom > dateTo → 抛出 DATE_RANGE_INVALID 异常")
        void queryRange_dateRangeInvalid_throwsException() {
            // Given — only bizExists is needed; dimensions are never reached
            stubBizExists();
            Map<String, Integer> coords = Map.of("app", 1, "endpoint", 3);

            // When / Then
            assertThatThrownBy(() -> spaceService.queryRange(BIZ_NAME, coords, "20260610", "20260601"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.DATE_RANGE_INVALID.getCode());
        }

        @Test
        @DisplayName("超过 365 天 → 响应中包含 warning 但不拒绝请求")
        void queryRange_exceeds365Days_hasWarning() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());
            Map<String, Integer> coords = Map.of("app", 1, "endpoint", 3);

            // 366 天区间 (超过 365 天软限制)
            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString()))
                    .thenReturn(100L);

            // When
            SpaceQueryResponse response = spaceService.queryRange(BIZ_NAME, coords, "20250601", "20260601");

            // Then
            assertThat(response.getWarning()).isNotNull();
            assertThat(response.getWarning()).contains("365");
            assertThat(response.getScannedDates()).isEqualTo(366);
        }

        @Test
        @DisplayName("业务不存在 → 抛出 BIZ_NOT_FOUND")
        void queryRange_bizNotFound_throwsException() {
            when(bizRepository.bizExists("unknown")).thenReturn(false);

            assertThatThrownBy(() -> spaceService.queryRange("unknown",
                    Map.of("app", 1, "endpoint", 3), "20260601", "20260607"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.BIZ_NOT_FOUND.getCode());
        }

        @Test
        @DisplayName("日期格式无效 → 抛出 VALIDATION_ERROR")
        void queryRange_invalidDateFormat_throwsException() {
            // Given — only bizExists is needed; validateDate fails before dimensions
            stubBizExists();

            assertThatThrownBy(() -> spaceService.queryRange(BIZ_NAME,
                    Map.of("app", 1, "endpoint", 3), "2026-06-01", "20260607"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.VALIDATION_ERROR.getCode());
        }
    }

    // =========================================================================
    // deleteCell — 删除端点逻辑测试
    // =========================================================================

    @Nested
    @DisplayName("deleteCell — 删除逻辑")
    class DeleteCellTests {

        private void stubDeleteSetup() {
            stubBizExists();
            stubDimensions(twoDimensions());

            // bizRepository.listAllBiz returns a BizInfo with a small date range
            BizInfo bizInfo = BizInfo.builder()
                    .bizName(BIZ_NAME)
                    .dateFrom("20260601")
                    .dateTo("20260603")
                    .build();
            when(bizRepository.listAllBiz()).thenReturn(List.of(bizInfo));

            // queryCell returns non-null → coordinate exists
            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString())).thenReturn(100L);

            // FR-V2-081: version for optimistic lock
            lenient().when(spaceRepository.getVersion(eq(BIZ_NAME), anyMap())).thenReturn(1L);
            // zeroOutColumn / deleteRow return 1 (affected row); use lenient to allow test-level overrides
            lenient().when(spaceRepository.zeroOutColumn(eq(BIZ_NAME), anyMap(), anyString(), anyLong())).thenReturn(1);
            lenient().when(spaceRepository.deleteRow(eq(BIZ_NAME), anyMap(), anyLong())).thenReturn(1);
        }

        @Test
        @DisplayName("删除 ALL 行（任意坐标值为 0）→ 抛出 FORBIDDEN_DELETE_ALL_ROW")
        void deleteCell_allRow_forbidden() {
            stubBizExists();

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 0, "endpoint", 3)) // app=0 → ALL sentinel
                    .build();

            assertThatThrownBy(() -> spaceService.deleteCell(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.FORBIDDEN_DELETE_ALL_ROW.getCode());

            // No delete operations should be performed
            verify(spaceRepository, never()).zeroOutColumn(anyString(), anyMap(), anyString(), anyLong());
            verify(spaceRepository, never()).deleteRow(anyString(), anyMap(), anyLong());
        }

        @Test
        @DisplayName("指定 date → 将该日期列归零（调用 zeroOutColumn）")
        void deleteCell_withDate_zeroesColumn() {
            stubDeleteSetup();

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3))
                    .date("20260602")
                    .build();

            // isAllColumnsZero returns false → no orphan cleanup
            when(spaceRepository.isAllColumnsZero(eq(BIZ_NAME), anyMap(), anyList())).thenReturn(false);

            DeleteSpaceResponse response = spaceService.deleteCell(BIZ_NAME, request);

            // Verify zeroOutColumn called with the right date and version
            verify(spaceRepository).zeroOutColumn(eq(BIZ_NAME), anyMap(), eq("20260602"), eq(1L));
            // Verify deleteRow NOT called (no orphan cleanup)
            verify(spaceRepository, never()).deleteRow(anyString(), anyMap(), anyLong());
            // Verify response
            assertThat(response.getDeletedRows()).isEqualTo(1);
            assertThat(response.getDate()).isEqualTo("20260602");
        }

        @Test
        @DisplayName("指定 date 归零后所有日期列均为 0 → 触发孤儿清理（调用 deleteRow）")
        void deleteCell_withDate_zeroesColumn_orphanCleanup() {
            stubDeleteSetup();

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3))
                    .date("20260602")
                    .build();

            // isAllColumnsZero returns true → orphan cleanup triggers
            when(spaceRepository.isAllColumnsZero(eq(BIZ_NAME), anyMap(), anyList())).thenReturn(true);
            // After zeroOutColumn, version is re-read for deleteRow; return a new version
            when(spaceRepository.getVersion(eq(BIZ_NAME), anyMap())).thenReturn(1L, 2L);

            DeleteSpaceResponse response = spaceService.deleteCell(BIZ_NAME, request);

            // Both zeroOutColumn and deleteRow should be called (with versions)
            verify(spaceRepository).zeroOutColumn(eq(BIZ_NAME), anyMap(), eq("20260602"), eq(1L));
            verify(spaceRepository).deleteRow(eq(BIZ_NAME), anyMap(), eq(2L));
            assertThat(response.getDeletedRows()).isEqualTo(1);
        }

        @Test
        @DisplayName("未指定 date → 删除整行（调用 deleteRow）")
        void deleteCell_withoutDate_deletesRow() {
            stubDeleteSetup();

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3))
                    .date(null) // no date specified
                    .build();

            DeleteSpaceResponse response = spaceService.deleteCell(BIZ_NAME, request);

            // Verify deleteRow called with version, zeroOutColumn NOT called
            verify(spaceRepository).deleteRow(eq(BIZ_NAME), anyMap(), eq(1L));
            verify(spaceRepository, never()).zeroOutColumn(anyString(), anyMap(), anyString(), anyLong());
            verify(spaceRepository, never()).isAllColumnsZero(anyString(), anyMap(), anyList());
            assertThat(response.getDeletedRows()).isEqualTo(1);
            assertThat(response.getDate()).isNull();
        }

        @Test
        @DisplayName("删除不存在的坐标 → 抛出 SPACE_CELL_NOT_FOUND")
        void deleteCell_nonExistentCoordinate_throwsException() {
            stubBizExists();
            stubDimensions(twoDimensions());

            BizInfo bizInfo = BizInfo.builder()
                    .bizName(BIZ_NAME)
                    .dateFrom("20260601")
                    .dateTo("20260603")
                    .build();
            when(bizRepository.listAllBiz()).thenReturn(List.of(bizInfo));

            // queryCell returns null → coordinate does not exist
            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString())).thenReturn(null);

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3))
                    .build();

            assertThatThrownBy(() -> spaceService.deleteCell(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.SPACE_CELL_NOT_FOUND.getCode());
        }

        @Test
        @DisplayName("删除请求包含未知维度 → 抛出 VALIDATION_ERROR")
        void deleteCell_unknownDimension_throwsException() {
            stubBizExists();
            stubDimensions(twoDimensions());

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3, "unknown_dim", 5))
                    .build();

            assertThatThrownBy(() -> spaceService.deleteCell(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.VALIDATION_ERROR.getCode());
        }

        @Test
        @DisplayName("日期不在业务的日期范围内 → 抛出 VALIDATION_ERROR")
        void deleteCell_dateOutsideRange_throwsException() {
            stubBizExists();
            stubDimensions(twoDimensions());

            BizInfo bizInfo = BizInfo.builder()
                    .bizName(BIZ_NAME)
                    .dateFrom("20260601")
                    .dateTo("20260603")
                    .build();
            when(bizRepository.listAllBiz()).thenReturn(List.of(bizInfo));

            when(spaceRepository.queryCell(eq(BIZ_NAME), anyMap(), anyString())).thenReturn(100L);

            DeleteSpaceRequest request = DeleteSpaceRequest.builder()
                    .coordinates(Map.of("app", 1, "endpoint", 3))
                    .date("20260610") // Outside range [20260601, 20260603]
                    .build();

            assertThatThrownBy(() -> spaceService.deleteCell(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.VALIDATION_ERROR.getCode());
        }
    }

    // =========================================================================
    // listCells — 列表查询测试
    // =========================================================================

    @Nested
    @DisplayName("listCells — 列表查询")
    class ListCellsTests {

        private static final String TODAY = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        private Map<String, Object> mockListResult(List<Map<String, Object>> rows, long total) {
            Map<String, Object> result = new HashMap<>();
            result.put("list", rows);
            result.put("total", total);
            return result;
        }

        @Test
        @DisplayName("正常分页查询 — 返回 SpaceListResponse 含分页元数据")
        void listCells_normalPagination_returnsCorrectResponse() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());

            Map<String, Object> row = new HashMap<>();
            row.put("id", 1L);
            row.put("app", 1);
            row.put("endpoint", 3);
            row.put(TODAY, 250L);

            when(spaceRepository.listCells(eq(BIZ_NAME), anyList(), eq(null), eq(1), eq(20), eq(TODAY)))
                    .thenReturn(mockListResult(List.of(row), 1L));

            // When
            SpaceListResponse response = spaceService.listCells(BIZ_NAME, null, 1, 20);

            // Then
            assertThat(response.getTotal()).isEqualTo(1L);
            assertThat(response.getPageNo()).isEqualTo(1);
            assertThat(response.getPageSize()).isEqualTo(20);
            assertThat(response.getTotalPages()).isEqualTo(1);
            assertThat(response.getList()).hasSize(1);

            SpaceCellDto cell = response.getList().get(0);
            assertThat(cell.getId()).isEqualTo(1L);
            assertThat(cell.getCoordinates()).containsEntry("app", 1);
            assertThat(cell.getCoordinates()).containsEntry("endpoint", 3);
            assertThat(cell.getValue()).isEqualTo(250L);
        }

        @Test
        @DisplayName("带维度过滤的列表查询")
        void listCells_withDimFilters_filtersCorrectly() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());

            Map<String, Integer> dimFilters = Map.of("app", 2, "endpoint", 5);

            when(spaceRepository.listCells(eq(BIZ_NAME), anyList(), eq(dimFilters), eq(1), eq(10), eq(TODAY)))
                    .thenReturn(mockListResult(List.of(), 0L));

            // When
            SpaceListResponse response = spaceService.listCells(BIZ_NAME, dimFilters, 1, 10);

            // Then
            assertThat(response.getTotal()).isEqualTo(0L);
            assertThat(response.getList()).isEmpty();
        }

        @Test
        @DisplayName("未知维度过滤 → 抛出 VALIDATION_ERROR")
        void listCells_unknownDimFilter_throwsException() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());

            Map<String, Integer> badFilters = Map.of("unknown_dim", 1);

            // When / Then
            assertThatThrownBy(() -> spaceService.listCells(BIZ_NAME, badFilters, 1, 20))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.VALIDATION_ERROR.getCode());
        }

        @Test
        @DisplayName("业务不存在 → 抛出 BIZ_NOT_FOUND")
        void listCells_bizNotFound_throwsException() {
            when(bizRepository.bizExists("unknown")).thenReturn(false);

            assertThatThrownBy(() -> spaceService.listCells("unknown", null, 1, 20))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.BIZ_NOT_FOUND.getCode());
        }

        @Test
        @DisplayName("空结果 — total=0，不报错")
        void listCells_emptyResults_returnsZeroTotal() {
            // Given
            stubBizExists();
            stubDimensions(twoDimensions());

            when(spaceRepository.listCells(eq(BIZ_NAME), anyList(), eq(null), eq(1), eq(20), eq(TODAY)))
                    .thenReturn(mockListResult(List.of(), 0L));

            // When
            SpaceListResponse response = spaceService.listCells(BIZ_NAME, null, 1, 20);

            // Then
            assertThat(response.getTotal()).isEqualTo(0L);
            assertThat(response.getTotalPages()).isEqualTo(0);
            assertThat(response.getList()).isEmpty();
        }
    }
}
