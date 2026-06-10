package org.big365.api.demo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.big365.api.dto.DateRange;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoDataParameters {

    private String scale;
    private DateRange dateRange;

    /** Number of distinct applications to simulate */
    private int appCount;

    /** Number of distinct endpoints to simulate */
    private int endpointCount;

    /** Number of rows (data points) to generate */
    private int totalRows;

    /** Probability (0.0 ~ 1.0) of error metric values */
    private double errorRate;

    /** Batch size for writing */
    private int batchSize;

    public static DemoDataParameters defaultsFor(String scale, DateRange dateRange) {
        DemoDataParametersBuilder builder = DemoDataParameters.builder()
                .scale(scale)
                .dateRange(dateRange)
                .batchSize(100)
                .errorRate(0.05);

        switch (scale != null ? scale.toLowerCase() : "small") {
            case "large":
                return builder
                        .totalRows(1000)
                        .appCount(10)
                        .endpointCount(50)
                        .build();
            case "medium":
                return builder
                        .totalRows(200)
                        .appCount(5)
                        .endpointCount(20)
                        .build();
            case "small":
            default:
                return builder
                        .totalRows(50)
                        .appCount(2)
                        .endpointCount(5)
                        .build();
        }
    }
}
