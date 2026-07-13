package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.util.DefaultServiceRequirements;
import com.nwpengdep.hrms.util.DefaultServiceRequirements.RequirementMigration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Migrates legacy fixed employee requirement rows to custom-named requirements.
 * Does not seed default service requirement templates onto services.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceRequirementsMigrationInitializer {

    private final EmployeeRepository employeeRepository;

    @Order(15)
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrateServiceRequirements() {
        try {
            int migratedEmployees = migrateEmployeeRequirements();
            if (migratedEmployees > 0) {
                log.info(
                        "Migrated legacy fixed employee requirements for {} employee(s)",
                        migratedEmployees
                );
            }
        } catch (Exception exception) {
            log.warn(
                    "Service requirements migration skipped: {}",
                    exception.getMessage()
            );
        }
    }

    private int migrateEmployeeRequirements() {
        List<Employee> employees = employeeRepository.findAll();
        int migratedCount = 0;

        for (Employee employee : employees) {
            if (employee.getRequirements() == null || employee.getRequirements().isEmpty()) {
                continue;
            }

            boolean changed = false;
            List<EmployeeRequirement> requirements = employee.getRequirements();

            for (EmployeeRequirement requirement : List.copyOf(requirements)) {
                RequirementMigration migration = DefaultServiceRequirements.migrationFor(
                        requirement.getRequirementType()
                );
                if (migration == null) {
                    continue;
                }

                EmployeeRequirement target = findMatchingRequirement(
                        requirements,
                        migration.customType(),
                        migration.defaultName()
                );

                if (target == null) {
                    requirement.setRequirementType(migration.customType());
                    requirement.setRequirementName(migration.defaultName());
                    changed = true;
                    continue;
                }

                if (requirement.getStatus() == RequirementStatus.COMPLETED
                        && target.getStatus() != RequirementStatus.COMPLETED) {
                    target.setStatus(RequirementStatus.COMPLETED);
                    if (target.getCompletedDate() == null) {
                        target.setCompletedDate(requirement.getCompletedDate());
                    }
                    if ((target.getRemarks() == null || target.getRemarks().isBlank())
                            && requirement.getRemarks() != null
                            && !requirement.getRemarks().isBlank()) {
                        target.setRemarks(requirement.getRemarks());
                    }
                    changed = true;
                } else if (requirement.getStatus() == RequirementStatus.COMPLETED
                        && target.getStatus() == RequirementStatus.COMPLETED
                        && target.getCompletedDate() == null
                        && requirement.getCompletedDate() != null) {
                    target.setCompletedDate(requirement.getCompletedDate());
                    changed = true;
                }

                requirements.remove(requirement);
                changed = true;
            }

            if (changed) {
                employeeRepository.save(employee);
                migratedCount++;
            }
        }

        return migratedCount;
    }

    private EmployeeRequirement findMatchingRequirement(
            List<EmployeeRequirement> requirements,
            RequirementType customType,
            String requirementName
    ) {
        return requirements.stream()
                .filter(requirement ->
                        requirement.getRequirementType() == customType
                                && sameName(
                                        requirement.getRequirementName(),
                                        requirementName
                                )
                )
                .findFirst()
                .orElse(null);
    }

    private boolean sameName(String left, String right) {
        String leftValue = left != null ? left.trim() : "";
        String rightValue = right != null ? right.trim() : "";
        return leftValue.equalsIgnoreCase(rightValue);
    }
}
