package org.big365.api.dimension;

import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.common.PageResponse;
import org.big365.api.dimension.dto.CreateDimensionRequest;
import org.big365.api.dimension.dto.UpdateDimensionRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DimensionService 单元测试")
class DimensionServiceTest {

    @Mock
    private DimensionMapper dimensionMapper;

    @Mock
    private BizRepository bizRepository;

    @InjectMocks
    private DimensionService dimensionService;

    private static final String BIZ_NAME = "demo_logs";
    private static final String TABLE_NAME = "big365_swks_demo_logs_dimensions_t";

    private void stubBizExists() {
        when(bizRepository.bizExists(BIZ_NAME)).thenReturn(true);
    }

    private Dimension sampleDimension(Long id, String columnName, boolean enabled) {
        return Dimension.builder()
                .id(id)
                .columnName(columnName)
                .displayName("显示名称")
                .description("描述")
                .leafMin(1)
                .leafMax(100)
                .enabled(enabled)
                .sortOrder(0)
                .build();
    }

    // =========================================================================
    // create 创建维度测试
    // =========================================================================

    @Nested
    @DisplayName("create — 创建维度")
    class CreateTests {

        @Test
        @DisplayName("正常创建维度")
        void createDimension_success() {
            stubBizExists();
            when(dimensionMapper.countByColumnName(TABLE_NAME, "endpoint")).thenReturn(0);
            when(dimensionMapper.countByBizName(TABLE_NAME)).thenReturn(2L);

            CreateDimensionRequest request = CreateDimensionRequest.builder()
                    .columnName("endpoint")
                    .displayName("接口")
                    .description("API 接口")
                    .leafMin(1)
                    .leafMax(10)
                    .build();

            Dimension result = dimensionService.create(BIZ_NAME, request);

            assertThat(result.getColumnName()).isEqualTo("endpoint");
            assertThat(result.getDisplayName()).isEqualTo("接口");
            assertThat(result.getBizName()).isEqualTo(BIZ_NAME);
            verify(dimensionMapper).insert(eq(TABLE_NAME), any(Dimension.class));
        }

        @Test
        @DisplayName("重复编码创建 → 抛出 DIMENSION_CODE_DUPLICATED")
        void createDimension_duplicateCode_throwsException() {
            stubBizExists();
            when(dimensionMapper.countByColumnName(TABLE_NAME, "app")).thenReturn(1);

            CreateDimensionRequest request = CreateDimensionRequest.builder()
                    .columnName("app")
                    .displayName("应用")
                    .leafMin(1)
                    .leafMax(3)
                    .build();

            assertThatThrownBy(() -> dimensionService.create(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.DIMENSION_CODE_DUPLICATED.getCode());

            verify(dimensionMapper, never()).insert(anyString(), any());
        }

        @Test
        @DisplayName("业务不存在 → 抛出 BIZ_NOT_FOUND")
        void createDimension_bizNotFound_throwsException() {
            when(bizRepository.bizExists(BIZ_NAME)).thenReturn(false);

            CreateDimensionRequest request = CreateDimensionRequest.builder()
                    .columnName("app")
                    .displayName("应用")
                    .leafMin(1)
                    .leafMax(3)
                    .build();

            assertThatThrownBy(() -> dimensionService.create(BIZ_NAME, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.BIZ_NOT_FOUND.getCode());
        }
    }

    // =========================================================================
    // update 更新维度测试
    // =========================================================================

    @Nested
    @DisplayName("update — 更新维度")
    class UpdateTests {

        @Test
        @DisplayName("正常更新维度")
        void updateDimension_success() {
            stubBizExists();
            Dimension existing = sampleDimension(1L, "app", true);
            when(dimensionMapper.findById(TABLE_NAME, 1L)).thenReturn(existing);

            Dimension refreshed = sampleDimension(1L, "app", true);
            refreshed.setDisplayName("新显示名");
            refreshed.setDescription("新描述");
            when(dimensionMapper.findById(TABLE_NAME, 1L))
                    .thenReturn(existing)   // first call: existence check
                    .thenReturn(refreshed); // second call: refresh after update

            UpdateDimensionRequest request = UpdateDimensionRequest.builder()
                    .displayName("新显示名")
                    .description("新描述")
                    .enabled(true)
                    .build();

            Dimension result = dimensionService.update(BIZ_NAME, 1L, request);

            assertThat(result.getDisplayName()).isEqualTo("新显示名");
            assertThat(result.getDescription()).isEqualTo("新描述");
            verify(dimensionMapper).update(eq(TABLE_NAME), any(Dimension.class));
        }

        @Test
        @DisplayName("更新不存在的维度 → 抛出 DIMENSION_NOT_FOUND")
        void updateDimension_notFound_throwsException() {
            stubBizExists();
            when(dimensionMapper.findById(TABLE_NAME, 999L)).thenReturn(null);

            UpdateDimensionRequest request = UpdateDimensionRequest.builder()
                    .displayName("名称")
                    .enabled(true)
                    .build();

            assertThatThrownBy(() -> dimensionService.update(BIZ_NAME, 999L, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.DIMENSION_NOT_FOUND.getCode());

            verify(dimensionMapper, never()).update(anyString(), any());
        }

        @Test
        @DisplayName("通过 update 禁用维度")
        void updateDimension_disableViaUpdate() {
            stubBizExists();
            Dimension existing = sampleDimension(1L, "app", true);
            when(dimensionMapper.findById(TABLE_NAME, 1L)).thenReturn(existing);

            Dimension refreshed = sampleDimension(1L, "app", false);
            refreshed.setDisplayName("应用");
            when(dimensionMapper.findById(TABLE_NAME, 1L))
                    .thenReturn(existing)
                    .thenReturn(refreshed);

            UpdateDimensionRequest request = UpdateDimensionRequest.builder()
                    .displayName("应用")
                    .enabled(false)
                    .build();

            Dimension result = dimensionService.update(BIZ_NAME, 1L, request);

            assertThat(result.getEnabled()).isFalse();
        }
    }

    // =========================================================================
    // disable 禁用维度测试
    // =========================================================================

    @Nested
    @DisplayName("disable — 禁用维度")
    class DisableTests {

        @Test
        @DisplayName("正常禁用已启用的维度")
        void disableDimension_success() {
            stubBizExists();
            Dimension existing = sampleDimension(1L, "app", true);
            when(dimensionMapper.findById(TABLE_NAME, 1L)).thenReturn(existing);

            dimensionService.disable(BIZ_NAME, 1L);

            verify(dimensionMapper).disable(TABLE_NAME, 1L);
        }

        @Test
        @DisplayName("禁用已禁用的维度 → 幂等，不执行 SQL")
        void disableDimension_alreadyDisabled_idempotent() {
            stubBizExists();
            Dimension existing = sampleDimension(1L, "app", false); // already disabled
            when(dimensionMapper.findById(TABLE_NAME, 1L)).thenReturn(existing);

            dimensionService.disable(BIZ_NAME, 1L);

            verify(dimensionMapper, never()).disable(anyString(), anyLong());
        }

        @Test
        @DisplayName("禁用不存在的维度 → 抛出 DIMENSION_NOT_FOUND")
        void disableDimension_notFound_throwsException() {
            stubBizExists();
            when(dimensionMapper.findById(TABLE_NAME, 999L)).thenReturn(null);

            assertThatThrownBy(() -> dimensionService.disable(BIZ_NAME, 999L))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.DIMENSION_NOT_FOUND.getCode());

            verify(dimensionMapper, never()).disable(anyString(), anyLong());
        }
    }

    // =========================================================================
    // getById 查询维度测试
    // =========================================================================

    @Nested
    @DisplayName("getById — 按 ID 查询")
    class GetByIdTests {

        @Test
        @DisplayName("正常查询 — 返回维度对象")
        void getById_success() {
            stubBizExists();
            Dimension dim = sampleDimension(1L, "app", true);
            when(dimensionMapper.findById(TABLE_NAME, 1L)).thenReturn(dim);

            Dimension result = dimensionService.getById(BIZ_NAME, 1L);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getColumnName()).isEqualTo("app");
            assertThat(result.getBizName()).isEqualTo(BIZ_NAME);
        }

        @Test
        @DisplayName("查询不存在的维度 → 抛出 DIMENSION_NOT_FOUND")
        void getById_notFound_throwsException() {
            stubBizExists();
            when(dimensionMapper.findById(TABLE_NAME, 999L)).thenReturn(null);

            assertThatThrownBy(() -> dimensionService.getById(BIZ_NAME, 999L))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.DIMENSION_NOT_FOUND.getCode());
        }
    }

    // =========================================================================
    // list 列出维度测试
    // =========================================================================

    @Nested
    @DisplayName("list — 列出维度")
    class ListTests {

        @Test
        @DisplayName("正常分页列表查询")
        void list_success() {
            stubBizExists();
            when(dimensionMapper.countByBizName(TABLE_NAME)).thenReturn(5L);
            when(dimensionMapper.listByBizName(TABLE_NAME, 0, 10))
                    .thenReturn(List.of(
                            sampleDimension(1L, "app", true),
                            sampleDimension(2L, "endpoint", true)
                    ));

            PageResponse<Dimension> result = dimensionService.list(BIZ_NAME, 1, 10);

            assertThat(result.getTotal()).isEqualTo(5L);
            assertThat(result.getItems()).hasSize(2);
            assertThat(result.getPageNo()).isEqualTo(1);
            assertThat(result.getPageSize()).isEqualTo(10);
        }

        @Test
        @DisplayName("业务不存在 → 抛出 BIZ_NOT_FOUND")
        void list_bizNotFound_throwsException() {
            when(bizRepository.bizExists(BIZ_NAME)).thenReturn(false);

            assertThatThrownBy(() -> dimensionService.list(BIZ_NAME, 1, 10))
                    .isInstanceOf(BusinessException.class)
                    .extracting("code")
                    .isEqualTo(ErrorCode.BIZ_NOT_FOUND.getCode());
        }
    }
}
