package org.big365.api.space;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.big365.api.space.dto.SpaceQueryResponse;
import org.big365.api.space.dto.SpaceWriteRequest;
import org.big365.api.space.dto.SpaceWriteResponse;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
    @Operation(summary = "查询指标", description = "按坐标定位读取指标值，零聚合计算")
    public ApiResponse<SpaceQueryResponse> query(
            @Parameter(description = "业务名称") @PathVariable String biz,
            @Parameter(description = "坐标参数（如 a=0&b=0）与日期参数 date=yyyyMMdd")
            @RequestParam Map<String, String> allParams) {
        // Extract date parameter, treat the rest as coordinates
        String date = allParams.remove("date");
        if (date == null || date.isBlank()) {
            date = allParams.remove("Date"); // fallback
        }

        // Convert remaining params to Map<String, Integer>
        Map<String, Integer> coordinates = new HashMap<>();
        for (Map.Entry<String, String> entry : allParams.entrySet()) {
            try {
                coordinates.put(entry.getKey(), Integer.parseInt(entry.getValue()));
            } catch (NumberFormatException e) {
                // skip non-integer params (could be other query params)
                log.debug("Skipping non-integer query param: {}={}", entry.getKey(), entry.getValue());
            }
        }

        log.debug("Space query: biz={}, coords={}, date={}", biz, coordinates, date);
        SpaceQueryResponse result = spaceService.query(biz, coordinates, date);
        return ApiResponse.ok(result);
    }
}
