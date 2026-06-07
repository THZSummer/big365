package org.big365.api.dimension.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDimensionRequest {

    @NotBlank(message = "维度列名不可为空")
    private String columnName;

    @NotBlank(message = "维度显示名不可为空")
    private String displayName;

    private String description;

    @Min(value = 1, message = "叶子最小值至少为 1")
    private int leafMin;

    @Min(value = 1, message = "叶子最大值至少为 1")
    private int leafMax;
}
