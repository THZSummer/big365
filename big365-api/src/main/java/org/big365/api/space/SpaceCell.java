package org.big365.api.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceCell {

    private Map<String, Integer> coordinates;
    private String date;
    private Long value;
}
