package org.big365.api.common;

import lombok.Getter;

@Getter
public enum ErrorCode {

    OK("OK", "success"),

    // Validation
    VALIDATION_ERROR("VALIDATION_ERROR", "参数校验失败"),

    // Biz
    BIZ_NOT_FOUND("BIZ_NOT_FOUND", "业务不存在"),
    BIZ_ALREADY_EXISTS("BIZ_ALREADY_EXISTS", "业务已存在"),

    // Dimension
    DIMENSION_CODE_DUPLICATED("DIMENSION_CODE_DUPLICATED", "维度编码重复"),
    DIMENSION_NOT_FOUND("DIMENSION_NOT_FOUND", "维度不存在"),
    DIMENSION_IN_USE("DIMENSION_IN_USE", "维度已被使用，不可删除"),

    // Mapping
    MAPPING_NOT_FOUND("MAPPING_NOT_FOUND", "坐标映射不存在"),

    // Space
    SPACE_CELL_NOT_FOUND("SPACE_CELL_NOT_FOUND", "数据坐标不存在"),
    QUERY_TOO_BROAD("QUERY_TOO_BROAD", "查询范围过大，请缩小筛选条件"),
    FORBIDDEN_DELETE_ALL_ROW("FORBIDDEN_DELETE_ALL_ROW", "不能删除 ALL 汇总行。ALL 汇总行由 Space 模型自动管理。"),
    DATE_RANGE_INVALID("DATE_RANGE_INVALID", "日期范围无效：开始日期不能晚于结束日期"),
    DATE_RANGE_TOO_LARGE("DATE_RANGE_TOO_LARGE", "日期范围超过 365 天限制，查询可能较慢"),
    CONCURRENT_MODIFICATION("CONCURRENT_MODIFICATION", "数据已被其他请求修改，请刷新后重试"),

    // Demo
    DEMO_JOB_NOT_FOUND("DEMO_JOB_NOT_FOUND", "演示数据生成任务不存在"),
    DEMO_JOB_FAILED("DEMO_JOB_FAILED", "演示数据生成失败"),

    // System
    DATABASE_UNAVAILABLE("DATABASE_UNAVAILABLE", "数据库不可用"),
    INTERNAL_ERROR("INTERNAL_ERROR", "系统内部错误");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
