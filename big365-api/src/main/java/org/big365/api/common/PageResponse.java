package org.big365.api.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {

    private List<T> items;
    private int pageNo;
    private int pageSize;
    private long total;

    public static <T> PageResponse<T> of(List<T> items, int pageNo, int pageSize, long total) {
        return PageResponse.<T>builder()
                .items(items)
                .pageNo(pageNo)
                .pageSize(pageSize)
                .total(total)
                .build();
    }
}
