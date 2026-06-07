package org.big365.api.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoJobResponse {

    private String jobId;
    private String scale;
    private String status;
    private int progress;
    private Long totalRows;
    private String summary;
    private String errorMessage;
    private String createdAt;
    private String updatedAt;
}
