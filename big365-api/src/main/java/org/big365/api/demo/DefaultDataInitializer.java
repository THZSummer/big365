package org.big365.api.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.biz.BizService;
import org.big365.api.dto.BizInfo;
import org.big365.api.dto.BizRegisterRequest;
import org.big365.api.dto.DateRange;
import org.big365.api.dto.DimensionDef;
import org.big365.api.model.Coordinate;
import org.big365.api.model.DimensionConcept;
import org.big365.api.model.Vector;
import org.big365.api.space.SpaceRepository;
import org.big365.api.space.SpaceService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Component
@Order(1)
@Slf4j
@RequiredArgsConstructor
public class DefaultDataInitializer implements CommandLineRunner {

    private static final String DEMO_BIZ_NAME = "demo_logs";
    private static final String DEMO_BIZ_LABEL = "日志分析示例";
    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final BizService bizService;
    private final BizRepository bizRepository;
    private final DemoDataGenerator demoDataGenerator;
    private final SpaceService spaceService;
    private final SpaceRepository spaceRepository;

    private final AtomicBoolean initialized = new AtomicBoolean(false);

    public boolean isInitialized() {
        return initialized.get();
    }

    @Override
    public void run(String... args) {
        try {
            if (!bizRepository.bizExists(DEMO_BIZ_NAME)) {
                log.info("Default business '{}' not found. Starting initialization...", DEMO_BIZ_NAME);
                BizRegisterRequest request = buildDemoLogsRequest();
                bizService.register(request);
                log.info("Business '{}' registered with {} dimensions, date range {}~{}",
                        DEMO_BIZ_NAME, request.getDimensions().size(),
                        request.getDateRange().getFrom(), request.getDateRange().getTo());
                generateAndWriteData(request.getDateRange());
                initialized.set(true);
                log.info("Default business '{}' initialized successfully", DEMO_BIZ_NAME);
                return;
            }

            long rowCount = countSpaceRows(DEMO_BIZ_NAME);
            if (rowCount > 0) {
                log.info("Default business '{}' already exists with {} rows, skipping", DEMO_BIZ_NAME, rowCount);
                initialized.set(true);
                return;
            }

            log.warn("Default business '{}' exists but has 0 rows, re-initializing data", DEMO_BIZ_NAME);
            BizInfo bizInfo = bizRepository.getBizInfo(DEMO_BIZ_NAME);
            DateRange dateRange = DateRange.builder()
                    .from(bizInfo.getDateFrom())
                    .to(bizInfo.getDateTo())
                    .build();
            log.info("Using registered date range: {}~{}", dateRange.getFrom(), dateRange.getTo());
            generateAndWriteData(dateRange);
            initialized.set(true);
            log.info("Default business '{}' data re-initialized successfully", DEMO_BIZ_NAME);

        } catch (Exception e) {
            log.error("Default data initialization failed: {}", e.getMessage(), e);
        }
    }

    private void generateAndWriteData(DateRange dateRange) {
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(DEMO_BIZ_NAME);
        if (dimensions.isEmpty()) {
            log.error("No dimensions found for '{}' — aborting data generation", DEMO_BIZ_NAME);
            return;
        }
        log.info("Loaded {} dimensions for data generation: {}",
                dimensions.size(),
                dimensions.stream().map(DimensionConcept::getColumnName).collect(Collectors.joining(", ")));

        DemoDataParameters params = demoDataGenerator.createParameters("small", dateRange, dimensions);
        log.info("Demo data parameters: scale={}, totalRows={}, batchSize={}, dateRange={}~{}",
                params.getScale(), params.getTotalRows(), params.getBatchSize(),
                dateRange.getFrom(), dateRange.getTo());

        List<Vector> vectors = demoDataGenerator.generateBatch(params.getTotalRows(), params, dimensions);
        log.info("Generated {} demo data vectors", vectors.size());

        int successCount = 0;
        int failCount = 0;
        for (Vector vec : vectors) {
            try {
                Map<String, Integer> coords = vec.getCoordinates().stream()
                        .collect(Collectors.toMap(Coordinate::getDimension, Coordinate::getValue));
                spaceService.write(DEMO_BIZ_NAME, coords, vec.getDate(), vec.getValue());
                successCount++;
            } catch (Exception e) {
                failCount++;
                if (failCount <= 10) {
                    log.warn("Failed to write demo vector ({}): {}", vec, e.getMessage());
                }
            }
        }

        log.info("Demo data write completed: total={}, success={}, failed={}", vectors.size(), successCount, failCount);
        if (failCount > 0) {
            log.warn("{} out of {} demo data writes failed — space table may have partial data",
                    failCount, vectors.size());
        }
    }

    private long countSpaceRows(String bizName) {
        try {
            List<DimensionConcept> dims = spaceRepository.getDimensionConcepts(bizName);
            if (dims.isEmpty()) {
                return 0L;
            }
            List<String> coordColumns = dims.stream()
                    .map(DimensionConcept::getColumnName)
                    .collect(Collectors.toList());
            Map<String, Object> result = spaceRepository.listCells(bizName, coordColumns, null, 1, 1, "id");
            Object totalObj = result.get("total");
            if (totalObj instanceof Number) {
                return ((Number) totalObj).longValue();
            }
            return 0L;
        } catch (Exception e) {
            log.warn("Failed to count space rows for {}: {}", bizName, e.getMessage());
            return 0L;
        }
    }

    private BizRegisterRequest buildDemoLogsRequest() {
        LocalDate today = LocalDate.now();
        String dateTo = today.format(DTF);
        String dateFrom = today.minusDays(30).format(DTF);

        return BizRegisterRequest.builder()
                .bizName(DEMO_BIZ_NAME)
                .bizLabel(DEMO_BIZ_LABEL)
                .dimensions(List.of(
                        DimensionDef.builder()
                                .columnName("app")
                                .displayName("应用")
                                .description("应用名称")
                                .leafMin(1)
                                .leafMax(3)
                                .build(),
                        DimensionDef.builder()
                                .columnName("endpoint")
                                .displayName("接口")
                                .description("API 接口")
                                .leafMin(1)
                                .leafMax(5)
                                .build(),
                        DimensionDef.builder()
                                .columnName("statusCode")
                                .displayName("状态码")
                                .description("HTTP 状态码")
                                .leafMin(200)
                                .leafMax(500)
                                .build(),
                        DimensionDef.builder()
                                .columnName("env")
                                .displayName("环境")
                                .description("部署环境")
                                .leafMin(1)
                                .leafMax(2)
                                .build(),
                        DimensionDef.builder()
                                .columnName("region")
                                .displayName("区域")
                                .description("地理区域")
                                .leafMin(1)
                                .leafMax(3)
                                .build()
                ))
                .dateRange(DateRange.builder()
                        .from(dateFrom)
                        .to(dateTo)
                        .build())
                .build();
    }
}
