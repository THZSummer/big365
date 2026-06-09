package org.big365.api.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.biz.BizService;
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

/**
 * Default data initializer that runs on application startup to ensure the
 * demo_logs business exists with pre-populated demo data (~500 data points).
 *
 * <p>Execution order: {@code @Order(1)} ensures this runs after the
 * {@code initDatabase} runner ({@code @Order(0)}) which creates the
 * {@code big365_biz_registry_t} table.</p>
 *
 * <p>Idempotency: if demo_logs already exists, initialization is skipped.</p>
 *
 * <p>Graceful degradation: any failure during initialization is logged as an
 * error, but does not prevent the application from starting.</p>
 */
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

    /** Whether demo data initialization has completed (or was skipped because already exists). */
    private final AtomicBoolean initialized = new AtomicBoolean(false);

    /**
     * Returns true if the demo data initializer has completed successfully
     * or determined that demo data already exists (skip case).
     */
    public boolean isInitialized() {
        return initialized.get();
    }

    @Override
    public void run(String... args) {
        try {
            if (bizRepository.bizExists(DEMO_BIZ_NAME)) {
                log.info("Default business '{}' already exists, skipping initialization", DEMO_BIZ_NAME);
                initialized.set(true);
                return;
            }

            log.info("Default business '{}' not found. Starting initialization...", DEMO_BIZ_NAME);
            initializeDefaultBusiness();
            initialized.set(true);
            log.info("Default business '{}' initialized successfully", DEMO_BIZ_NAME);

        } catch (Exception e) {
            log.error("Default data initialization failed: {}", e.getMessage(), e);
            // Graceful degradation: do not prevent application startup
            // initialized remains false
        }
    }

    /**
     * Register the demo_logs business, generate ~500 demo data points,
     * and write them into the space table via {@link SpaceService#write}.
     */
    private void initializeDefaultBusiness() {
        // 1. Build and execute business registration (creates tables + inserts metadata)
        BizRegisterRequest request = buildDemoLogsRequest();
        bizService.register(request);
        log.info("Business '{}' registered with {} dimensions, date range {} ~ {}",
                DEMO_BIZ_NAME,
                request.getDimensions().size(),
                request.getDateRange().getFrom(),
                request.getDateRange().getTo());

        // 2. Load dimension concepts from the newly created dimensions table
        List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(DEMO_BIZ_NAME);
        if (dimensions.isEmpty()) {
            log.error("No dimensions found for '{}' after registration — aborting data generation", DEMO_BIZ_NAME);
            return;
        }
        log.info("Loaded {} dimensions for data generation: {}",
                dimensions.size(),
                dimensions.stream().map(DimensionConcept::getColumnName).collect(Collectors.joining(", ")));

        // 3. Create generation parameters (small scale → ~500 rows)
        DemoDataParameters params = demoDataGenerator.createParameters(
                "small", request.getDateRange(), dimensions);
        log.info("Demo data parameters: scale={}, totalRows={}, batchSize={}",
                params.getScale(), params.getTotalRows(), params.getBatchSize());

        // 4. Generate all vectors in a single batch
        List<Vector> vectors = demoDataGenerator.generateBatch(
                params.getTotalRows(), params, dimensions);
        log.info("Generated {} demo data vectors", vectors.size());

        // 5. Write each vector through SpaceService (cascade update into space table)
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

        log.info("Demo data write completed: total={}, success={}, failed={}",
                vectors.size(), successCount, failCount);
        if (failCount > 0) {
            log.warn("{} out of {} demo data writes failed — space table may have partial data",
                    failCount, vectors.size());
        }
    }

    /**
     * Build the registration request for the demo_logs business.
     *
     * <p>Dimensions:</p>
     * <ul>
     *   <li>app: 1~3 (applications)</li>
     *   <li>endpoint: 1~5 (API endpoints)</li>
     *   <li>statusCode: 200~500 (HTTP status codes)</li>
     *   <li>env: 1~2 (environments)</li>
     *   <li>region: 1~3 (geographic regions)</li>
     * </ul>
     *
     * <p>Date range: 30 days back from today.</p>
     */
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
