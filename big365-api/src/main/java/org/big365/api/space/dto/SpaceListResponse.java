package org.big365.api.space.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceListResponse {

    private List<SpaceCellDto> list;
    private long total;
    private int pageNo;
    private int pageSize;
    private int totalPages;
}
