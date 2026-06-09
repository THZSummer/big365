package org.big365.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Slf4j
@SpringBootApplication
public class Big365ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(Big365ApiApplication.class, args);
    }

    @Bean
    @Order(0)
    CommandLineRunner initDatabase(DataSource dataSource) {
        return args -> {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS `big365_biz_registry_t` (
                        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                        `biz_name` VARCHAR(64) NOT NULL COMMENT '业务名称',
                        `biz_label` VARCHAR(128) NOT NULL COMMENT '业务标签',
                        `dimension_count` INT NOT NULL DEFAULT 0,
                        `date_from` VARCHAR(8) NOT NULL,
                        `date_to` VARCHAR(8) NOT NULL,
                        `status` VARCHAR(20) NOT NULL DEFAULT 'active',
                        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY `uk_biz_name` (`biz_name`),
                        KEY `idx_status` (`status`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """);
                log.info("Database initialized: big365_biz_registry_t ensured");
            } catch (Exception e) {
                log.warn("Could not auto-initialize registry table: {}", e.getMessage());
            }
        };
    }
}
