package org.big365.api.dimension.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDimensionRequest {

    private String displayName;
    private String description;
    private Boolean enabled;
}
