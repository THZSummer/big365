package org.big365.api.space.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceWriteRequest {

    @NotEmpty(message = "坐标不可为空")
    private Map<String, Integer> coordinates;

    @NotNull(message = "日期不可为空")
    private String date;

    @NotNull(message = "指标值不可为空")
    private Long value;
}
