package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.service.ServiceAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Never enable new writes after a partially successful production migration. */
@Component
@RequiredArgsConstructor
public class ServiceAppointmentSchemaReadiness {
    private final JdbcTemplate jdbc;
    private final ServiceAppointmentService appointments;

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.LOWEST_PRECEDENCE)
    public void verify() {
        if (!appointments.isEnabled()) return;
        jdbc.queryForList("SELECT version, original_first_appointment_date, current_service_appointment_key, first_increment_due_date FROM employees WHERE 1=0");
        Integer unversioned = jdbc.queryForObject("SELECT COUNT(*) FROM employees WHERE version IS NULL", Integer.class);
        if (unversioned == null || unversioned > 0)
            throw new IllegalStateException("Employee optimistic-locking versions are not initialised. Keep the feature disabled.");
        jdbc.queryForList("SELECT appointment_key, start_date, end_date FROM employee_service_appointments WHERE 1=0");
        jdbc.queryForList("SELECT appointment_id, requirement_order FROM service_appointment_requirements WHERE 1=0");
        jdbc.queryForList("SELECT service_appointment_key, appointment_basis, increment_date, first_increment_due_date FROM employee_actions WHERE 1=0");
        jdbc.queryForList("SELECT service_appointment_key FROM salary_increment_records WHERE 1=0");
        String product = jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>) c -> c.getMetaData().getDatabaseProductName());
        if (!"MySQL".equalsIgnoreCase(product) && !"MariaDB".equalsIgnoreCase(product)) return;
        String type = jdbc.queryForObject("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_actions' AND COLUMN_NAME='action_type'", String.class);
        if (type != null && type.toLowerCase().startsWith("enum(") && !type.contains("'SERVICE_APPOINTMENT'"))
            throw new IllegalStateException("Service appointment action type migration is incomplete. Keep the feature disabled.");
        Integer scoped = jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_increment_records' AND INDEX_NAME='uk_sir_active_scope_year' AND NON_UNIQUE=0", Integer.class);
        Integer old = jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_increment_records' AND INDEX_NAME='uk_sir_active_year'", Integer.class);
        if (scoped == null || scoped != 2 || old == null || old != 0)
            throw new IllegalStateException("Service appointment salary index migration is incomplete. Keep the feature disabled.");
    }
}
