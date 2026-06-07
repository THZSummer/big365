package org.big365.api.demo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.big365.api.dto.DateRange;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDemoJobRequest {

    @NotBlank(message = "规模不可为空")
    private String scale;

    @NotNull(message = "日期范围不可为空")
    @Valid
    private DateRange dateRange;
}
