package org.big365.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DimensionConcept {

    private String columnName;
    private String displayName;
    private int leafMin;
    private int leafMax;
}
