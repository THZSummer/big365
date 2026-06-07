-- big365-api Database Schema
-- System tables (auto-created on startup)

-- Business registry table
CREATE TABLE IF NOT EXISTS `big365_biz_registry_t` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `biz_name` VARCHAR(64) NOT NULL COMMENT '业务名称（唯一标识）',
    `biz_label` VARCHAR(128) NOT NULL COMMENT '业务显示标签',
    `dimension_count` INT NOT NULL DEFAULT 0 COMMENT '维度数量',
    `date_from` VARCHAR(8) NOT NULL COMMENT '数据起始日期 yyyyMMdd',
    `date_to` VARCHAR(8) NOT NULL COMMENT '数据结束日期 yyyyMMdd',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_biz_name` (`biz_name`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务注册表';

-- Per-business dynamic tables (created by BizRepository during registration):
--   big365_swks_{biz}_dimensions_t  -- Dimension metadata
--   big365_swks_{biz}_space_t       -- Materialized data space (coordinates + date columns)
--   big365_swks_{biz}_demo_jobs_t   -- Demo data generation jobs
