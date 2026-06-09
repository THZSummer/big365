package org.big365.api.demo;

import org.big365.api.dto.DateRange;
import org.big365.api.model.DimensionConcept;
import org.big365.api.model.Vector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DemoDataGenerator 单元测试")
class DemoDataGeneratorTest {

    private final DemoDataGenerator generator = new DemoDataGenerator();

    private static List<DimensionConcept> twoDimensions() {
        return List.of(
                DimensionConcept.builder().columnName("app").displayName("应用").leafMin(1).leafMax(3).build(),
                DimensionConcept.builder().columnName("endpoint").displayName("接口").leafMin(1).leafMax(5).build()
        );
    }

    private static List<DimensionConcept> threeDimensions() {
        return List.of(
                DimensionConcept.builder().columnName("app").displayName("应用").leafMin(1).leafMax(3).build(),
                DimensionConcept.builder().columnName("endpoint").displayName("接口").leafMin(1).leafMax(5).build(),
                DimensionConcept.builder().columnName("env").displayName("环境").leafMin(1).leafMax(2).build()
        );
    }

    private static DateRange dateRange(String from, String to) {
        return DateRange.builder().from(from).to(to).build();
    }

    // =========================================================================
    // createParameters — 参数生成测试
    // =========================================================================

    @Nested
    @DisplayName("createParameters — 参数创建")
    class CreateParametersTests {

        @Test
        @DisplayName("small 规模 → totalRows=500, appCount=2")
        void createParameters_smallScale_returnsCorrectDefaults() {
            DateRange range = dateRange("20260601", "20260610");

            DemoDataParameters params = generator.createParameters("small", range, null);

            assertThat(params.getTotalRows()).isEqualTo(500);
            assertThat(params.getAppCount()).isEqualTo(2);
            assertThat(params.getEndpointCount()).isEqualTo(5);
            assertThat(params.getBatchSize()).isEqualTo(100);
            assertThat(params.getErrorRate()).isEqualTo(0.05);
            assertThat(params.getScale()).isEqualTo("small");
        }

        @Test
        @DisplayName("medium 规模 → totalRows=10000, appCount=5")
        void createParameters_mediumScale_increasesCounts() {
            DateRange range = dateRange("20260601", "20260630");

            DemoDataParameters params = generator.createParameters("medium", range, null);

            assertThat(params.getTotalRows()).isEqualTo(10_000);
            assertThat(params.getAppCount()).isEqualTo(5);
            assertThat(params.getEndpointCount()).isEqualTo(20);
        }

        @Test
        @DisplayName("large 规模 → totalRows=100000, appCount=10")
        void createParameters_largeScale_maxCounts() {
            DateRange range = dateRange("20260101", "20260630");

            DemoDataParameters params = generator.createParameters("large", range, null);

            assertThat(params.getTotalRows()).isEqualTo(100_000);
            assertThat(params.getAppCount()).isEqualTo(10);
            assertThat(params.getEndpointCount()).isEqualTo(50);
        }

        @Test
        @DisplayName("传入维度定义 → appCount 受限于维度的 leaf 范围")
        void createParameters_dimensionsAdjustAppCount() {
            DateRange range = dateRange("20260601", "20260610");

            // First dimension (app) has leafMax=3, so range=3. Default appCount for small=2 → min(3,2)=2
            DemoDataParameters params = generator.createParameters("small", range, twoDimensions());

            assertThat(params.getAppCount()).isEqualTo(2); // min(3, 2) = 2
            assertThat(params.getEndpointCount()).isEqualTo(5); // second dim range=5, min(5, 5)=5
        }

        @Test
        @DisplayName("维度范围小于默认值 → appCount/endpointCount 被截断")
        void createParameters_dimensionsNarrowLimits() {
            DateRange range = dateRange("20260601", "20260610");

            // app leafMin=1, leafMax=1 → range=1
            DimensionConcept narrowApp = DimensionConcept.builder()
                    .columnName("app").displayName("应用").leafMin(1).leafMax(1).build();
            DimensionConcept narrowEndpoint = DimensionConcept.builder()
                    .columnName("endpoint").displayName("接口").leafMin(1).leafMax(2).build();

            DemoDataParameters params = generator.createParameters("small", range,
                    List.of(narrowApp, narrowEndpoint));

            assertThat(params.getAppCount()).isEqualTo(1);      // min(1, 2) = 1
            assertThat(params.getEndpointCount()).isEqualTo(2);  // min(2, 5) = 2
        }

        @Test
        @DisplayName("null 维度列表 → 使用默认参数")
        void createParameters_nullDimensions_usesDefaults() {
            DateRange range = dateRange("20260601", "20260610");

            DemoDataParameters params = generator.createParameters("medium", range, null);

            assertThat(params.getAppCount()).isEqualTo(5);
            assertThat(params.getEndpointCount()).isEqualTo(20);
        }
    }

    // =========================================================================
    // generateBatch — 批量生成测试
    // =========================================================================

    @Nested
    @DisplayName("generateBatch — 批量数据生成")
    class GenerateBatchTests {

        @Test
        @DisplayName("generateBatch(500) → 返回 500 个 Vector")
        void generateBatch_500_returnsCorrectCount() {
            DemoDataParameters params = generator.createParameters("small",
                    dateRange("20260601", "20260610"), null);

            List<Vector> vectors = generator.generateBatch(500, params, twoDimensions());

            assertThat(vectors).hasSize(500);
        }

        @Test
        @DisplayName("generateBatch(0) → 返回空列表（边界情况）")
        void generateBatch_zero_returnsEmptyList() {
            DemoDataParameters params = generator.createParameters("small",
                    dateRange("20260601", "20260610"), null);

            List<Vector> vectors = generator.generateBatch(0, params, twoDimensions());

            assertThat(vectors).isEmpty();
        }

        @Test
        @DisplayName("生成的 Vector 中所有坐标值均在维度 leaf 范围内")
        void generateBatch_coordinatesInLeafRange() {
            DemoDataParameters params = generator.createParameters("small",
                    dateRange("20260601", "20260610"), null);
            List<DimensionConcept> dims = twoDimensions();

            List<Vector> vectors = generator.generateBatch(100, params, dims);

            for (Vector v : vectors) {
                assertThat(v.getCoordinates()).hasSize(2);

                // app: leafMin=1, leafMax=3
                assertThat(v.getCoordinates().get(0).getValue())
                        .isBetween(1, 3);
                // endpoint: leafMin=1, leafMax=5
                assertThat(v.getCoordinates().get(1).getValue())
                        .isBetween(1, 5);
                // dimension names match
                assertThat(v.getCoordinates().get(0).getDimension()).isEqualTo("app");
                assertThat(v.getCoordinates().get(1).getDimension()).isEqualTo("endpoint");
            }
        }

        @Test
        @DisplayName("生成的 Vector 中所有日期均在日期范围内")
        void generateBatch_datesInRange() {
            DateRange range = dateRange("20260601", "20260605");
            DemoDataParameters params = generator.createParameters("small", range, null);

            List<Vector> vectors = generator.generateBatch(200, params, twoDimensions());

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyyMMdd");
            LocalDate from = LocalDate.parse("20260601", dtf);
            LocalDate to = LocalDate.parse("20260605", dtf);

            for (Vector v : vectors) {
                LocalDate date = LocalDate.parse(v.getDate(), dtf);
                assertThat(date).isBetween(from, to);
            }
        }

        @Test
        @DisplayName("生成的 Vector 中所有值在 1~1000 范围内")
        void generateBatch_valuesInRange() {
            DemoDataParameters params = generator.createParameters("small",
                    dateRange("20260601", "20260610"), null);

            List<Vector> vectors = generator.generateBatch(100, params, twoDimensions());

            for (Vector v : vectors) {
                assertThat(v.getValue()).isBetween(1L, 1001L);
            }
        }

        @Test
        @DisplayName("大规模生成 — 日期和坐标具有合理分布")
        void generateBatch_dataDistributionIsReasonable() {
            DateRange range = dateRange("20260601", "20260610"); // 10 days
            DemoDataParameters params = generator.createParameters("small", range,
                    threeDimensions());

            List<Vector> vectors = generator.generateBatch(500, params, threeDimensions());

            // 验证日期覆盖：至少覆盖多种不同日期
            Set<String> uniqueDates = vectors.stream()
                    .map(Vector::getDate)
                    .collect(Collectors.toSet());
            assertThat(uniqueDates).hasSizeGreaterThan(1); // 不全部是同一天

            // 验证 app 值分布：至少有两种不同的 app
            Set<Integer> uniqueApps = vectors.stream()
                    .map(v -> v.getCoordinates().get(0).getValue())
                    .collect(Collectors.toSet());
            assertThat(uniqueApps).hasSizeGreaterThan(1);

            // 验证 env 值分布：至少有 1 和 2
            Set<Integer> uniqueEnvs = vectors.stream()
                    .map(v -> v.getCoordinates().get(2).getValue())
                    .collect(Collectors.toSet());
            assertThat(uniqueEnvs).contains(1, 2);
        }

        @Test
        @DisplayName("generateBatch 对每个维度生成对应数量的 Coordinate")
        void generateBatch_correctCoordinateCount() {
            DemoDataParameters params = generator.createParameters("small",
                    dateRange("20260601", "20260610"), null);

            List<Vector> vectors = generator.generateBatch(50, params, threeDimensions());

            for (Vector v : vectors) {
                assertThat(v.getCoordinates()).hasSize(3);
                assertThat(v.getCoordinates().get(0).getDimension()).isEqualTo("app");
                assertThat(v.getCoordinates().get(1).getDimension()).isEqualTo("endpoint");
                assertThat(v.getCoordinates().get(2).getDimension()).isEqualTo("env");
            }
        }
    }
}
