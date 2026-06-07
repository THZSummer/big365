package org.big365.api.biz;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.BusinessException;
import org.big365.api.common.ErrorCode;
import org.big365.api.dto.BizInfo;
import org.big365.api.dto.BizRegisterRequest;
import org.big365.api.dto.BizRegisterResponse;
import org.big365.api.dto.DimensionDef;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BizService {

    private final BizRepository bizRepository;

    @Transactional
    public BizRegisterResponse register(BizRegisterRequest request) {
        String bizName = request.getBizName().toLowerCase().replaceAll("[^a-z0-9_]", "_");

        // Check duplicate
        if (bizRepository.bizExists(bizName)) {
            throw new BusinessException(ErrorCode.BIZ_ALREADY_EXISTS, "业务 '" + bizName + "' 已存在");
        }

        // Validate dimensions
        if (request.getDimensions().isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "至少需要 1 个维度");
        }
        if (request.getDimensions().size() > 10) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "维度数不能超过 10 个，当前: " + request.getDimensions().size());
        }

        // Validate date range
        validateDateRange(request.getDateRange().getFrom(), request.getDateRange().getTo());

        // Generate date columns
        List<String> dateColumns = generateDateColumns(
                request.getDateRange().getFrom(),
                request.getDateRange().getTo());

        // Create schema
        List<String> tablesCreated = bizRepository.createBizSchema(
                bizName,
                request.getDimensions(),
                dateColumns);

        // Insert into registry
        bizRepository.insertBizRegistry(
                bizName,
                request.getBizLabel(),
                request.getDimensions().size(),
                request.getDateRange().getFrom(),
                request.getDateRange().getTo());

        // Insert dimension definitions
        bizRepository.insertDimensionDefinitions(bizName, request.getDimensions());

        return BizRegisterResponse.builder()
                .bizName(bizName)
                .tablesCreated(tablesCreated)
                .build();
    }

    public List<BizInfo> listAll() {
        return bizRepository.listAllBiz();
    }

    private void validateDateRange(String from, String to) {
        try {
            LocalDate fromDate = LocalDate.parse(from, DateTimeFormatter.ofPattern("yyyyMMdd"));
            LocalDate toDate = LocalDate.parse(to, DateTimeFormatter.ofPattern("yyyyMMdd"));
            if (fromDate.isAfter(toDate)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "开始日期不能晚于结束日期");
            }
            long daysDiff = toDate.toEpochDay() - fromDate.toEpochDay();
            if (daysDiff > 365) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "日期范围不能超过 365 天");
            }
        } catch (DateTimeParseException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "日期格式错误，应为 yyyyMMdd");
        }
    }

    static List<String> generateDateColumns(String from, String to) {
        LocalDate fromDate = LocalDate.parse(from, DateTimeFormatter.ofPattern("yyyyMMdd"));
        LocalDate toDate = LocalDate.parse(to, DateTimeFormatter.ofPattern("yyyyMMdd"));
        List<String> dates = new ArrayList<>();
        LocalDate current = fromDate;
        while (!current.isAfter(toDate)) {
            dates.add(current.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            current = current.plusDays(1);
        }
        return dates;
    }
}
