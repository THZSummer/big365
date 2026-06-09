package org.big365.api.biz;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.big365.api.dto.BizInfo;
import org.big365.api.dto.DimensionDef;
import org.springframework.stereotype.Repository;

import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Repository
@RequiredArgsConstructor
public class BizRepository {

    private final SqlSessionFactory sqlSessionFactory;

    public boolean bizExists(String bizName) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Integer count = session.selectOne(
                    "org.big365.api.biz.BizRegistryMapper.countByBizName", bizName);
            return count != null && count > 0;
        }
    }

    public List<String> createBizSchema(String bizName, List<DimensionDef> dimensions, List<String> dateColumns) {
        List<String> tablesCreated = new ArrayList<>();

        try (SqlSession session = sqlSessionFactory.openSession()) {
            java.sql.Connection conn = session.getConnection();

            // 1. Create dimensions table
            String dimTable = "big365_swks_" + bizName + "_dimensions_t";
            String dimSql = buildDimensionsTableDDL(dimTable);
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(dimSql);
                tablesCreated.add(dimTable);
            }

            // 2. Create space table
            String spaceTable = "big365_swks_" + bizName + "_space_t";
            String spaceSql = buildSpaceTableDDL(spaceTable, dimensions, dateColumns);
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(spaceSql);
                tablesCreated.add(spaceTable);
            }

            // 3. Create demo jobs table
            String demoTable = "big365_swks_" + bizName + "_demo_jobs_t";
            String demoSql = buildDemoJobsTableDDL(demoTable);
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(demoSql);
                tablesCreated.add(demoTable);
            }

            return tablesCreated;
        } catch (Exception e) {
            log.error("Failed to create biz schema for {}", bizName, e);
            throw new RuntimeException("创建业务表失败: " + e.getMessage(), e);
        }
    }

    private String buildDimensionsTableDDL(String tableName) {
        return """
            CREATE TABLE IF NOT EXISTS `%s` (
              `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
              `column_name` VARCHAR(32) NOT NULL COMMENT '坐标列名',
              `display_name` VARCHAR(128) NOT NULL COMMENT '显示名称',
              `description` VARCHAR(512) DEFAULT '' COMMENT '描述',
              `leaf_min` INT NOT NULL DEFAULT 1 COMMENT '叶子最小值',
              `leaf_max` INT NOT NULL COMMENT '叶子最大值',
              `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
              `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
              `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY `uk_column_name` (`column_name`),
              KEY `idx_enabled` (`enabled`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维度元数据表'
            """.formatted(tableName);
    }

    private String buildSpaceTableDDL(String tableName, List<DimensionDef> dimensions, List<String> dateColumns) {
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS `").append(tableName).append("` (\n");
        sql.append("  `id` BIGINT AUTO_INCREMENT,\n");

        // Coordinate columns
        List<String> coordColumns = new ArrayList<>();
        for (DimensionDef dim : dimensions) {
            String col = dim.getColumnName();
            sql.append("  `").append(col).append("` INT NOT NULL DEFAULT 0 COMMENT '").append(dim.getDisplayName()).append("',\n");
            coordColumns.add(col);
        }

        // Optimistic lock version column (FR-V2-081)
        sql.append("  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',\n");

        // Date columns (metrics)
        for (String date : dateColumns) {
            sql.append("  `").append(date).append("` BIGINT NOT NULL DEFAULT 0 COMMENT '日期 ").append(date).append(" 指标值',\n");
        }

        // Primary key on all coordinate columns
        String pkColumns = coordColumns.stream()
                .map(c -> "`" + c + "`")
                .collect(Collectors.joining(", "));
        sql.append("  PRIMARY KEY (").append(pkColumns).append("),\n");

        // Index on id
        sql.append("  KEY `idx_id` (`id`)\n");

        sql.append(") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多维数据空间表'");

        return sql.toString();
    }

    private String buildDemoJobsTableDDL(String tableName) {
        return """
            CREATE TABLE IF NOT EXISTS `%s` (
              `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
              `job_id` VARCHAR(64) NOT NULL,
              `scale` VARCHAR(16) NOT NULL COMMENT '生成规模: small/medium/large',
              `status` VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态: pending→initializing→generating→writing→summarizing→completed/failed',
              `progress` INT NOT NULL DEFAULT 0 COMMENT '进度 0-100',
              `total_rows` BIGINT DEFAULT 0 COMMENT '总生成行数',
              `summary` TEXT COMMENT '生成摘要',
              `error_message` TEXT COMMENT '错误信息',
              `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY `uk_job_id` (`job_id`),
              KEY `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='演示数据生成任务表'
            """.formatted(tableName);
    }

    public void insertBizRegistry(String bizName, String bizLabel, int dimensionCount,
                                   String dateFrom, String dateTo) {
        try (SqlSession session = sqlSessionFactory.openSession(true)) {
            session.insert("org.big365.api.biz.BizRegistryMapper.insert", Map.of(
                    "bizName", bizName,
                    "bizLabel", bizLabel,
                    "dimensionCount", dimensionCount,
                    "dateFrom", dateFrom,
                    "dateTo", dateTo,
                    "status", "active",
                    "createdAt", LocalDateTime.now()
            ));
        }
    }

    public void insertDimensionDefinitions(String bizName, List<DimensionDef> dimensions) {
        try (SqlSession session = sqlSessionFactory.openSession(true)) {
            String tableName = "big365_swks_" + bizName + "_dimensions_t";
            for (int i = 0; i < dimensions.size(); i++) {
                DimensionDef dim = dimensions.get(i);
                session.insert("org.big365.api.biz.BizRegistryMapper.insertDimension",
                        Map.of(
                                "tableName", tableName,
                                "columnName", dim.getColumnName(),
                                "displayName", dim.getDisplayName(),
                                "description", dim.getDescription() != null ? dim.getDescription() : "",
                                "leafMin", dim.getLeafMin(),
                                "leafMax", dim.getLeafMax(),
                                "sortOrder", i
                        ));
            }
        }
    }

    public List<BizInfo> listAllBiz() {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            return session.selectList("org.big365.api.biz.BizRegistryMapper.listAll");
        }
    }
}
