package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class UserRoleMigrationInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        migrateLegacyRoles();
    }

    private void migrateLegacyRoles() {
        try {
            int adminMigrated = jdbcTemplate.update(
                    "UPDATE users SET role = 'SUBJECT_OFF_ORG' WHERE role = 'ADMIN'"
            );
            int dataEntryMigrated = jdbcTemplate.update(
                    "UPDATE users SET role = 'SUBJECT_OFF_EMP' WHERE role = 'DATA_ENTRY'"
            );

            log.info(
                    "Legacy user role migration complete: ADMIN -> SUBJECT_OFF_ORG ({}), DATA_ENTRY -> SUBJECT_OFF_EMP ({})",
                    adminMigrated,
                    dataEntryMigrated
            );
        } catch (Exception e) {
            log.error("User role migration failed", e);
            throw new IllegalStateException("Failed to migrate legacy user roles", e);
        }
    }
}
