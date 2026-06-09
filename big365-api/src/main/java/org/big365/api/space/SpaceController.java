package org.big365.api.space;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.space.dto.DeleteSpaceRequest;
import org.big365.api.space.dto.DeleteSpaceResponse;
import org.big365.api.space.dto.SpaceListResponse;
import org.big365.api.space.dto.SpaceQueryResponse;
import org.big365.api.space.dto.SpaceWriteRequest;
import org.big365.api.space.dto.SpaceWriteResponse;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Space", description = "多维数据空间写入与查询接口")
public class SpaceController {

    private final SpaceService spaceService;

    @PostMapping("/api/{biz}/space/write")
    @Operation(summary = "写入数据", description = "写入坐标+日期+指标值，触发 2^d 行级联更新（0=ALL 哨兵机制）")
    public ApiResponse<SpaceWriteResponse> write(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Valid @RequestBody SpaceWriteRequest request) {
        log.info("Space write: biz={}, coords={}, date={}, value={}",
                biz, request.getCoordinates(), request.getDate(), request.getValue());
        SpaceWriteResponse result = spaceService.write(biz, request.getCoordinates(),
                request.getDate(), request.getValue());
        return ApiResponse.ok(result);
    }

    @GetMapping("/api/{biz}/space/query")
    @Operation(summary = "查询指标", description = "按坐标定位读取指标值，零聚合计算。V2 扩展：支持 dateFrom/dateTo 区间查询")
    public ApiResponse<SpaceQueryResponse> query(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Parameter(description = "坐标参数（如 a=0&b=0）与日期参数 date=yyyyMMdd 或区间参数 dateFrom=yyyyMMdd&dateTo=yyyyMMdd")
            @RequestParam Map<String, String> allParams) {

        // V2: Extract dateFrom / dateTo for time range queries
        String dateFrom = allParams.remove("dateFrom");
        String dateTo = allParams.remove("dateTo");

        // Convert remaining params to Map<String, Integer> (coordinates)
        Map<String, Integer> coordinates = new HashMap<>();
        for (Map.Entry<String, String> entry : allParams.entrySet()) {
            try {
                coordinates.put(entry.getKey(), Integer.parseInt(entry.getValue()));
            } catch (NumberFormatException e) {
                // skip non-integer params (could be other query params)
                log.debug("Skipping non-integer query param: {}={}", entry.getKey(), entry.getValue());
            }
        }

        // V2: Time range query (both dateFrom and dateTo present)
        if (dateFrom != null && !dateFrom.isBlank() && dateTo != null && !dateTo.isBlank()) {
            log.info("Space queryRange: biz={}, coords={}, dateFrom={}, dateTo={}",
                    biz, coordinates, dateFrom, dateTo);
            SpaceQueryResponse result = spaceService.queryRange(biz, coordinates, dateFrom, dateTo);
            return ApiResponse.ok(result);
        }

        // V2: dateFrom only → treat as single-date query (equivalent to date parameter)
        String date;
        if (dateFrom != null && !dateFrom.isBlank()) {
            date = dateFrom;
        } else {
            // MVP: extract date parameter (remove from params to avoid coordinate parsing)
            date = allParams.remove("date");
            if (date == null || date.isBlank()) {
                date = allParams.remove("Date"); // fallback
            }
        }

        log.debug("Space query: biz={}, coords={}, date={}", biz, coordinates, date);
        SpaceQueryResponse result = spaceService.query(biz, coordinates, date);
        return ApiResponse.ok(result);
    }

    @GetMapping("/api/{biz}/space/list")
    @Operation(summary = "列表查询", description = "获取原始坐标级别数据列表，排除 ALL 汇总行，支持分页和维度过滤")
    public ApiResponse<SpaceListResponse> list(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Parameter(description = "页码（从 1 开始）") @RequestParam(defaultValue = "1") int pageNo,
            @Parameter(description = "每页条数（默认 20，最大 200）") @RequestParam(defaultValue = "20") int pageSize,
            @Parameter(description = "维度过滤（格式: key:value,key:value，如 app:1,statusCode:200）")
            @RequestParam(required = false) String dimensions) {

        // Validate pagination params
        if (pageNo < 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "pageNo 必须 >= 1");
        }
        if (pageSize < 1 || pageSize > 200) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "pageSize 必须在 1-200 之间");
        }

        // Parse dimensions parameter
        Map<String, Integer> dimFilters = null;
        if (dimensions != null && !dimensions.isBlank()) {
            dimFilters = new LinkedHashMap<>();
            String[] pairs = dimensions.split(",");
            for (String pair : pairs) {
                String trimmed = pair.trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                String[] kv = trimmed.split(":", 2);
                if (kv.length != 2) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "dimensions 格式错误，应为 key:value,key:value: " + pair);
                }
                try {
                    dimFilters.put(kv[0].trim(), Integer.parseInt(kv[1].trim()));
                } catch (NumberFormatException e) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "dimensions 值必须为整数: " + pair);
                }
            }
            if (dimFilters.isEmpty()) {
                dimFilters = null;
            }
        }

        log.info("Space list: biz={}, pageNo={}, pageSize={}, dimFilters={}",
                biz, pageNo, pageSize, dimFilters);

        SpaceListResponse result = spaceService.listCells(biz, dimFilters, pageNo, pageSize);
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/api/{biz}/space/delete")
    @Operation(summary = "删除数据", description = "按坐标（+可选日期）硬删除数据记录。指定 date → 该日期列归零；未指定 date → 删除整行；禁止删除 ALL 汇总行。")
    public ApiResponse<DeleteSpaceResponse> delete(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Valid @RequestBody DeleteSpaceRequest request) {
        log.info("Space delete: biz={}, coords={}, date={}",
                biz, request.getCoordinates(), request.getDate());
        DeleteSpaceResponse result = spaceService.deleteCell(biz, request);
        return ApiResponse.ok(result);
    }
}
