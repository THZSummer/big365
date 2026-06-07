package org.big365.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DateRange {

    @NotBlank(message = "开始日期不可为空")
    private String from;

    @NotBlank(message = "结束日期不可为空")
    private String to;
}
