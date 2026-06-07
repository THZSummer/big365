package org.big365.api.dimension;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.big365.api.common.PageResponse;
import org.big365.api.dimension.dto.CreateDimensionRequest;
import org.big365.api.dimension.dto.UpdateDimensionRequest;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/{biz}/dimensions")
@RequiredArgsConstructor
@Tag(name = "Dimension Management", description = "维度元数据 CRUD 接口")
public class DimensionController {

    private final DimensionService dimensionService;

    @GetMapping
    @Operation(summary = "维度列表", description = "分页查询指定业务的所有维度")
    public ApiResponse<PageResponse<Dimension>> list(
            @PathVariable String biz,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.debug("List dimensions: biz={}, page={}, size={}", biz, pageNo, pageSize);
        return ApiResponse.ok(dimensionService.list(biz, pageNo, pageSize));
    }

    @PostMapping
    @Operation(summary = "创建维度", description = "为指定业务创建新的维度定义")
    public ApiResponse<Dimension> create(
            @PathVariable String biz,
            @Valid @RequestBody CreateDimensionRequest request) {
        log.info("Create dimension: biz={}, column={}", biz, request.getColumnName());
        return ApiResponse.ok(dimensionService.create(biz, request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询维度", description = "根据 ID 查询单个维度完整信息")
    public ApiResponse<Dimension> getById(
            @PathVariable String biz,
            @PathVariable Long id) {
        log.debug("Get dimension: biz={}, id={}", biz, id);
        return ApiResponse.ok(dimensionService.getById(biz, id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新维度", description = "更新维度的显示名、描述和启用状态等可变字段")
    public ApiResponse<Dimension> update(
            @PathVariable String biz,
            @PathVariable Long id,
            @Valid @RequestBody UpdateDimensionRequest request) {
        log.info("Update dimension: biz={}, id={}", biz, id);
        return ApiResponse.ok(dimensionService.update(biz, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "禁用维度", description = "禁用维度（软删除，设置 enabled=false），不物理删除")
    public ApiResponse<Void> disable(
            @PathVariable String biz,
            @PathVariable Long id) {
        log.info("Disable dimension: biz={}, id={}", biz, id);
        dimensionService.disable(biz, id);
        return ApiResponse.ok();
    }
}
