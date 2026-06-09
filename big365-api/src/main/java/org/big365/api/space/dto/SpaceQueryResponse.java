package org.big365.api.space.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceQueryResponse {

    private Map<String, Integer> coordinates;
    private String date;
    private Long value;

    // V2: Time range query metadata (null for single-day queries)
    private String dateFrom;
    private String dateTo;
    private Integer scannedDates;
    private String aggregationMethod;
    private String warning;
}
