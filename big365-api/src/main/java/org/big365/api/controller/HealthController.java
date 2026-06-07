package org.big365.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Health", description = "健康检查接口")
public class HealthController {

    private final DataSource dataSource;

    @GetMapping("/health")
    @Operation(summary = "服务健康检查", description = "检查服务和数据库连接状态")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("status", "UP");
        info.put("service", "big365-api");
        info.put("timestamp", System.currentTimeMillis());

        boolean dbUp = checkDatabase();
        info.put("database", dbUp ? "UP" : "DOWN");

        if (!dbUp) {
            return ResponseEntity.status(503)
                    .body(ApiResponse.fail("DATABASE_UNAVAILABLE", "数据库连接失败", info));
        }

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    private boolean checkDatabase() {
        try (Connection conn = dataSource.getConnection()) {
            return conn != null && conn.isValid(3);
        } catch (Exception e) {
            log.error("Database health check failed", e);
            return false;
        }
    }
}
