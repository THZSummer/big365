package org.big365.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.Valid;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BizRegisterRequest {

    @NotBlank(message = "业务名称不可为空")
    private String bizName;

    @NotBlank(message = "业务标签不可为空")
    private String bizLabel;

    @NotEmpty(message = "至少需要一个维度")
    @Valid
    private List<DimensionDef> dimensions;

    @NotNull(message = "日期范围不可为空")
    private DateRange dateRange;
}
