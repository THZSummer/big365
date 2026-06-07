package org.big365.api.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.big365.api.demo.dto.CreateDemoJobRequest;
import org.big365.api.demo.dto.DemoJobResponse;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Demo Data", description = "演示数据生成接口")
public class DemoDataController {

    private final DemoDataService demoDataService;

    @PostMapping("/api/{biz}/demo-data/jobs")
    @Operation(summary = "创建演示数据生成任务",
            description = "提交生成参数（规模 + 日期范围），异步执行批量生成。返回任务 ID 用于轮询进度。")
    public ApiResponse<DemoJobResponse> createJob(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Valid @RequestBody CreateDemoJobRequest request) {
        log.info("Demo job create: biz={}, scale={}, dateRange={}-{}",
                biz, request.getScale(), request.getDateRange().getFrom(), request.getDateRange().getTo());

        // 1. Create job record synchronously
        DemoJobResponse response = demoDataService.createJob(biz, request);

        // 2. Start async generation (returns immediately through @Async proxy)
        demoDataService.startGeneration(biz, response.getJobId(),
                request.getScale(), request.getDateRange());

        return ApiResponse.ok(response);
    }

    @GetMapping("/api/{biz}/demo-data/jobs/{jobId}")
    @Operation(summary = "查询演示数据生成任务状态",
            description = "根据任务 ID 查询当前状态、进度百分比和生成摘要。用于前端轮询。")
    public ApiResponse<DemoJobResponse> getJob(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Parameter(description = "任务 ID") @PathVariable String jobId) {
        log.debug("Demo job query: biz={}, jobId={}", biz, jobId);
        DemoJobResponse response = demoDataService.getJob(biz, jobId);
        return ApiResponse.ok(response);
    }
}
