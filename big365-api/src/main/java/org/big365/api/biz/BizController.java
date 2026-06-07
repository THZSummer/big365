package org.big365.api.biz;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.big365.api.common.PageResponse;
import org.big365.api.dto.BizInfo;
import org.big365.api.dto.BizRegisterRequest;
import org.big365.api.dto.BizRegisterResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/biz")
@RequiredArgsConstructor
@Tag(name = "Biz Management", description = "业务注册与管理接口")
public class BizController {

    private final BizService bizService;

    @PostMapping("/register")
    @Operation(summary = "注册新业务", description = "注册新业务并动态创建维度表、数据空间表和演示任务表")
    public ApiResponse<BizRegisterResponse> register(@Valid @RequestBody BizRegisterRequest request) {
        log.info("Registering biz: {}", request.getBizName());
        BizRegisterResponse result = bizService.register(request);
        return ApiResponse.ok(result);
    }

    @GetMapping("/list")
    @Operation(summary = "查询业务列表", description = "获取所有已注册的业务列表")
    public ApiResponse<PageResponse<BizInfo>> list(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.debug("Listing businesses: page={}, size={}", pageNo, pageSize);
        List<BizInfo> items = bizService.listAll();
        return ApiResponse.ok(PageResponse.of(items, pageNo, pageSize, items.size()));
    }
}
