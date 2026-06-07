package org.big365.api.dimension;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.biz.BizRepository;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.common.PageResponse;
import org.big365.api.dimension.dto.CreateDimensionRequest;
import org.big365.api.dimension.dto.UpdateDimensionRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DimensionService {

    private final DimensionMapper dimensionMapper;
    private final BizRepository bizRepository;

    private String tableName(String bizName) {
        return "big365_swks_" + bizName + "_dimensions_t";
    }

    public PageResponse<Dimension> list(String bizName, int pageNo, int pageSize) {
        checkBizExists(bizName);
        String tbl = tableName(bizName);
        long total = dimensionMapper.countByBizName(tbl);
        int offset = (pageNo - 1) * pageSize;
        List<Dimension> items = dimensionMapper.listByBizName(tbl, offset, pageSize);
        items.forEach(d -> d.setBizName(bizName));
        return PageResponse.of(items, pageNo, pageSize, total);
    }

    public Dimension create(String bizName, CreateDimensionRequest request) {
        checkBizExists(bizName);
        String tbl = tableName(bizName);

        // Uniqueness check
        int existing = dimensionMapper.countByColumnName(tbl, request.getColumnName());
        if (existing > 0) {
            throw new BusinessException(ErrorCode.DIMENSION_CODE_DUPLICATED,
                    "列名 '" + request.getColumnName() + "' 已存在");
        }

        // Determine sort_order (place at end)
        long total = dimensionMapper.countByBizName(tbl);

        Dimension dim = Dimension.builder()
                .columnName(request.getColumnName())
                .displayName(request.getDisplayName())
                .description(request.getDescription() != null ? request.getDescription() : "")
                .leafMin(request.getLeafMin())
                .leafMax(request.getLeafMax())
                .sortOrder((int) total)
                .build();

        dimensionMapper.insert(tbl, dim);
        log.info("Created dimension id={} columnName={} in biz {}", dim.getId(), dim.getColumnName(), bizName);
        dim.setBizName(bizName);
        return dim;
    }

    public Dimension getById(String bizName, Long id) {
        checkBizExists(bizName);
        String tbl = tableName(bizName);
        Dimension dim = dimensionMapper.findById(tbl, id);
        if (dim == null) {
            throw new BusinessException(ErrorCode.DIMENSION_NOT_FOUND,
                    "维度 id=" + id + " 不存在");
        }
        dim.setBizName(bizName);
        return dim;
    }

    public Dimension update(String bizName, Long id, UpdateDimensionRequest request) {
        checkBizExists(bizName);
        String tbl = tableName(bizName);

        Dimension existing = dimensionMapper.findById(tbl, id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.DIMENSION_NOT_FOUND,
                    "维度 id=" + id + " 不存在");
        }

        Dimension update = Dimension.builder()
                .id(id)
                .displayName(request.getDisplayName())
                .description(request.getDescription())
                .enabled(request.getEnabled())
                .build();

        dimensionMapper.update(tbl, update);

        // Re-fetch to return current state
        Dimension refreshed = dimensionMapper.findById(tbl, id);
        refreshed.setBizName(bizName);
        return refreshed;
    }

    public void disable(String bizName, Long id) {
        checkBizExists(bizName);
        String tbl = tableName(bizName);

        Dimension existing = dimensionMapper.findById(tbl, id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.DIMENSION_NOT_FOUND,
                    "维度 id=" + id + " 不存在");
        }

        if (Boolean.FALSE.equals(existing.getEnabled())) {
            return; // Already disabled, idempotent
        }

        dimensionMapper.disable(tbl, id);
        log.info("Disabled dimension id={} in biz {}", id, bizName);
    }

    private void checkBizExists(String bizName) {
        if (!bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_NOT_FOUND,
                    "业务 '" + bizName + "' 不存在");
        }
    }
}
