package com.vocabpet.backend.config;

import java.sql.Connection;
import java.util.List;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Column fixes that ddl-auto=update never makes on an existing MySQL database. Idempotent; skipped on other databases.
 * <ul>
 *   <li>item_type columns created as native ENUM (before KANA existed) become varchar, so new values can be stored.</li>
 *   <li>kana_item_progress.kana gets a binary collation: under utf8mb4_unicode_ci / 0900_ai_ci MySQL treats か and が
 *       as equal, which merges their progress rows.</li>
 * </ul>
 * shortcut: hand-written patches instead of a migration tool; move to Flyway once there are more of these.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LearningPathSchemaPatch implements ApplicationRunner {

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection c = dataSource.getConnection()) {
            if (!c.getMetaData().getDatabaseProductName().toLowerCase().contains("mysql")) return;
        }
        for (String table : List.of("item_progress", "question_reports")) {
            if ("enum".equalsIgnoreCase(column(table, "item_type", "DATA_TYPE"))) {
                jdbc.execute("ALTER TABLE " + table + " MODIFY item_type VARCHAR(16) NOT NULL");
                log.info("Learning Path schema patch: {}.item_type ENUM -> VARCHAR(16)", table);
            }
        }
        String collation = column("kana_item_progress", "kana", "COLLATION_NAME");
        if (collation != null && !collation.endsWith("_bin")) {
            jdbc.execute("ALTER TABLE kana_item_progress MODIFY kana VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");
            log.info("Learning Path schema patch: kana_item_progress.kana {} -> utf8mb4_bin", collation);
        }
    }

    /** One information_schema attribute of a column, or null when the column does not exist. */
    private String column(String table, String column, String attribute) {
        List<String> v = jdbc.queryForList(
                "SELECT " + attribute + " FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                String.class, table, column);
        return v.isEmpty() ? null : v.get(0);
    }
}
