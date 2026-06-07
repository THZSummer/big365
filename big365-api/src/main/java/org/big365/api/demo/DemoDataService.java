package org.big365.api.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.demo.dto.CreateDemoJobRequest;
import org.big365.api.demo.dto.DemoJobResponse;
import org.big365.api.dto.DateRange;
import org.big365.api.model.DimensionConcept;
import org.big365.api.model.Vector;
import org.big365.api.space.SpaceRepository;
import org.big365.api.space.SpaceService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemoDataService {

    private static final String TABLE_SUFFIX = "demo_jobs_t";

    private final DemoJobMapper demoJobMapper;
    private final DemoDataGenerator demoDataGenerator;
    private final SpaceService spaceService;
    private final SpaceRepository spaceRepository;
    private final BizRepository bizRepository;

    /**
     * Create a new demo data generation job and return immediately.
     */
    public DemoJobResponse createJob(String bizName, CreateDemoJobRequest request) {
        // Validate biz exists
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        // Validate scale
        String scale = request.getScale().toLowerCase();
        if (!Set.of("small", "medium", "large").contains(scale)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "无效的规模参数: " + scale + "，可选值: small/medium/large");
        }

        // Validate date range
        validateDateRange(request.getDateRange());

        // Build job entity
        String jobId = UUID.randomUUID().toString().replace("-", "");
        String tableName = tableName(bizName);
        DemoGenerationJob job = DemoGenerationJob.builder()
                .jobId(jobId)
                .scale(scale)
                .status("pending")
                .progress(0)
                .build();

        demoJobMapper.insert(tableName, job);
        log.info("Demo job created: biz={}, jobId={}, scale={}", bizName, jobId, scale);

        return toResponse(job);
    }

    /**
     * Asynchronously execute the generation pipeline.
     * Status flow: pending → initializing → generating → writing → summarizing → completed
     * On failure: → failed
     */
    @Async("demoDataExecutor")
    public void startGeneration(String bizName, String jobId, String scale, DateRange dateRange) {
        String tableName = tableName(bizName);
        log.info("Demo generation starting: biz={}, jobId={}, scale={}", bizName, jobId, scale);

        try {
            // 1. initializing
            updateStatus(tableName, jobId, "initializing", 5, null);

            // 2. Load dimensions
            List<DimensionConcept> dimensions = spaceRepository.getDimensionConcepts(bizName);
            if (dimensions.isEmpty()) {
                failJob(tableName, jobId, "业务 '" + bizName + "' 尚未定义维度");
                return;
            }

            // 3. Create parameters
            DemoDataParameters params = demoDataGenerator.createParameters(scale, dateRange, dimensions);

            // 4. generating — collect all vectors into memory first
            updateStatus(tableName, jobId, "generating", 10, null);

            List<Vector> allVectors = new ArrayList<>(params.getTotalRows());
            demoDataGenerator.generateAll(params, dimensions, (batch, genProgress) -> {
                allVectors.addAll(batch);
                // Update progress 10-40 during generation phase
                int progress = 10 + (int) (genProgress * 30);
                updateStatus(tableName, jobId, "generating", progress, null);
                return true;
            });

            log.info("Demo data generated: biz={}, jobId={}, vectors={}", bizName, jobId, allVectors.size());

            // 5. writing — write each vector through SpaceService
            updateStatus(tableName, jobId, "writing", 40, null);

            int batchSize = params.getBatchSize();
            int totalVectors = allVectors.size();
            long totalRowsAffected = 0;
            int failedWrites = 0;

            for (int i = 0; i < totalVectors; i += batchSize) {
                int end = Math.min(i + batchSize, totalVectors);
                for (int j = i; j < end; j++) {
                    Vector vec = allVectors.get(j);
                    try {
                        // Convert coordinates List<Coordinate> to Map<String, Integer>
                        Map<String, Integer> coords = vec.getCoordinates().stream()
                                .collect(Collectors.toMap(
                                        org.big365.api.model.Coordinate::getDimension,
                                        org.big365.api.model.Coordinate::getValue));
                        spaceService.write(bizName, coords, vec.getDate(), vec.getValue());
                        totalRowsAffected++;
                    } catch (Exception e) {
                        failedWrites++;
                        log.warn("Failed to write vector {}: {}", j, e.getMessage());
                    }
                }
                // Update progress 40-90 during writing phase
                int progress = 40 + (int) (((double) end / totalVectors) * 50);
                updateStatus(tableName, jobId, "writing", Math.min(progress, 90), null);
            }

            // 6. summarizing
            updateStatus(tableName, jobId, "summarizing", 95, null);

            String summary = buildSummary(bizName, scale, allVectors.size(), totalRowsAffected,
                    failedWrites, params, dimensions, dateRange);

            // 7. completed
            demoJobMapper.complete(tableName, jobId, totalRowsAffected, summary);
            log.info("Demo generation completed: biz={}, jobId={}, rows={}, summary={}",
                    bizName, jobId, totalRowsAffected, summary);

        } catch (Exception e) {
            log.error("Demo generation failed: biz={}, jobId={}", bizName, jobId, e);
            failJob(tableName, jobId, e.getMessage());
        }
    }

    /**
     * Query a job by its ID.
     */
    public DemoJobResponse getJob(String bizName, String jobId) {
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND, "业务 '" + bizName + "' 不存在");
        }

        String tableName = tableName(bizName);
        DemoGenerationJob job = demoJobMapper.findByJobId(tableName, jobId);
        if (job == null) {
            throw new BusinessException(ErrorCode.DEMO_JOB_NOT_FOUND, "任务 '" + jobId + "' 不存在");
        }
        return toResponse(job);
    }

    // ─── private helpers ──────────────────────────────────────────────

    private void updateStatus(String tableName, String jobId, String status,
                               int progress, String errorMessage) {
        demoJobMapper.updateStatus(tableName, jobId, status, progress, errorMessage);
    }

    private void failJob(String tableName, String jobId, String errorMessage) {
        demoJobMapper.updateStatus(tableName, jobId, "failed", 0, errorMessage);
    }

    private String buildSummary(String bizName, String scale, int generated,
                                 long written, int failed, DemoDataParameters params,
                                 List<DimensionConcept> dimensions, DateRange dateRange) {
        StringBuilder sb = new StringBuilder();
        sb.append("演示数据生成完成。");
        sb.append("业务: ").append(bizName).append(", ");
        sb.append("规模: ").append(scale).append(", ");
        sb.append("生成数据行数: ").append(generated).append(", ");
        sb.append("写入成功: ").append(written).append(", ");
        if (failed > 0) {
            sb.append("写入失败: ").append(failed).append(", ");
        }
        sb.append("维度数: ").append(dimensions.size()).append(", ");
        sb.append("日期范围: ").append(dateRange.getFrom()).append("~").append(dateRange.getTo()).append("。");
        if (failed > 0) {
            sb.append(" 注意: 部分数据写入失败，请检查业务表结构。");
        }
        return sb.toString();
    }

    private DemoJobResponse toResponse(DemoGenerationJob job) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return DemoJobResponse.builder()
                .jobId(job.getJobId())
                .scale(job.getScale())
                .status(job.getStatus())
                .progress(job.getProgress())
                .totalRows(job.getTotalRows())
                .summary(job.getSummary())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt() != null ? job.getCreatedAt().format(dtf) : null)
                .updatedAt(job.getUpdatedAt() != null ? job.getUpdatedAt().format(dtf) : null)
                .build();
    }

    private void validateDateRange(DateRange dateRange) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyyMMdd");
        try {
            java.time.LocalDate from = java.time.LocalDate.parse(dateRange.getFrom(), dtf);
            java.time.LocalDate to = java.time.LocalDate.parse(dateRange.getTo(), dtf);
            if (from.isAfter(to)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "开始日期不能晚于结束日期");
            }
        } catch (java.time.format.DateTimeParseException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日期格式错误，应为 yyyyMMdd");
        }
    }

    static String tableName(String bizName) {
        return "big365_swks_" + bizName + "_" + TABLE_SUFFIX;
    }
}
