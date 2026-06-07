package org.big365.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BizInfo {

    private String bizName;
    private String bizLabel;
    private int dimensionCount;
    private String dateFrom;
    private String dateTo;
    private String status;
    private LocalDateTime createdAt;
}
