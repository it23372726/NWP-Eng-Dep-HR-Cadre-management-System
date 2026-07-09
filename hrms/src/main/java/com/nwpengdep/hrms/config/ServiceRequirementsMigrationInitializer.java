package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceGrade1Requirement;
import com.nwpengdep.hrms.entity.ServiceGrade2Requirement;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceSpecialRequirement;
import com.nwpengdep.hrms.entity.ServiceSupraRequirement;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import com.nwpengdep.hrms.util.DefaultServiceRequirements;
import com.nwpengdep.hrms.util.DefaultServiceRequirements.RequirementMigration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceRequirementsMigrationInitializer {

    private final ServiceTypeRepository serviceTypeRepository;
    private final EmployeeRepository employeeRepository;

    @Order(15)
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrateServiceRequirements() {
        try {
            List<ServiceType> services = serviceTypeRepository.findAll();
            if (services.isEmpty()) {
                return;
            }

            int seededServices = 0;
            for (ServiceType service : services) {
                if (seedMissingDefaults(service)) {
                    seededServices++;
                }
            }

            if (seededServices > 0) {
                serviceTypeRepository.saveAll(services);
                log.info(
                        "Seeded default service requirements for {} service(s)",
                        seededServices
                );
            }

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

    private boolean seedMissingDefaults(ServiceType service) {
        boolean changed = false;
        changed |= appendMissingPermanent(service);
        changed |= appendMissingGrade2(service);
        changed |= appendMissingGrade1(service);
        changed |= appendMissingSupra(service);
        changed |= appendMissingSpecial(service);
        return changed;
    }

    private boolean appendMissingPermanent(ServiceType service) {
        if (service.getPermanentRequirements() == null) {
            service.setPermanentRequirements(new HashSet<>());
        }

        Set<String> existingNames = existingNames(
                service.getPermanentRequirements(),
                ServicePermanentRequirement::getRequirementName
        );

        boolean changed = false;
        for (String defaultName : DefaultServiceRequirements.permanentNamesFor(service)) {
            if (existingNames.contains(defaultName.trim().toLowerCase())) {
                continue;
            }

            ServicePermanentRequirement requirement = new ServicePermanentRequirement();
            requirement.setService(service);
            requirement.setRequirementName(defaultName.trim());
            service.getPermanentRequirements().add(requirement);
            existingNames.add(defaultName.trim().toLowerCase());
            changed = true;
        }
        return changed;
    }

    private boolean appendMissingGrade2(ServiceType service) {
        if (service.getGrade2Requirements() == null) {
            service.setGrade2Requirements(new HashSet<>());
        }

        Set<String> existingNames = existingNames(
                service.getGrade2Requirements(),
                ServiceGrade2Requirement::getRequirementName
        );

        boolean changed = false;
        for (String defaultName : DefaultServiceRequirements.grade2NamesFor(service)) {
            if (existingNames.contains(defaultName.trim().toLowerCase())) {
                continue;
            }

            ServiceGrade2Requirement requirement = new ServiceGrade2Requirement();
            requirement.setService(service);
            requirement.setRequirementName(defaultName.trim());
            service.getGrade2Requirements().add(requirement);
            existingNames.add(defaultName.trim().toLowerCase());
            changed = true;
        }
        return changed;
    }

    private boolean appendMissingGrade1(ServiceType service) {
        if (service.getGrade1Requirements() == null) {
            service.setGrade1Requirements(new HashSet<>());
        }

        Set<String> existingNames = existingNames(
                service.getGrade1Requirements(),
                ServiceGrade1Requirement::getRequirementName
        );

        boolean changed = false;
        for (String defaultName : DefaultServiceRequirements.grade1NamesFor(service)) {
            if (existingNames.contains(defaultName.trim().toLowerCase())) {
                continue;
            }

            ServiceGrade1Requirement requirement = new ServiceGrade1Requirement();
            requirement.setService(service);
            requirement.setRequirementName(defaultName.trim());
            service.getGrade1Requirements().add(requirement);
            existingNames.add(defaultName.trim().toLowerCase());
            changed = true;
        }
        return changed;
    }

    private boolean appendMissingSupra(ServiceType service) {
        List<String> defaultNames = DefaultServiceRequirements.supraNamesFor(service);
        if (defaultNames.isEmpty()) {
            return false;
        }

        if (service.getSupraRequirements() == null) {
            service.setSupraRequirements(new HashSet<>());
        }

        Set<String> existingNames = existingNames(
                service.getSupraRequirements(),
                ServiceSupraRequirement::getRequirementName
        );

        boolean changed = false;
        for (String defaultName : defaultNames) {
            if (existingNames.contains(defaultName.trim().toLowerCase())) {
                continue;
            }

            ServiceSupraRequirement requirement = new ServiceSupraRequirement();
            requirement.setService(service);
            requirement.setRequirementName(defaultName.trim());
            service.getSupraRequirements().add(requirement);
            existingNames.add(defaultName.trim().toLowerCase());
            changed = true;
        }
        return changed;
    }

    private boolean appendMissingSpecial(ServiceType service) {
        List<String> defaultNames = DefaultServiceRequirements.specialNamesFor(service);
        if (defaultNames.isEmpty()) {
            return false;
        }

        if (service.getSpecialRequirements() == null) {
            service.setSpecialRequirements(new HashSet<>());
        }

        Set<String> existingNames = existingNames(
                service.getSpecialRequirements(),
                ServiceSpecialRequirement::getRequirementName
        );

        boolean changed = false;
        for (String defaultName : defaultNames) {
            if (existingNames.contains(defaultName.trim().toLowerCase())) {
                continue;
            }

            ServiceSpecialRequirement requirement = new ServiceSpecialRequirement();
            requirement.setService(service);
            requirement.setRequirementName(defaultName.trim());
            service.getSpecialRequirements().add(requirement);
            existingNames.add(defaultName.trim().toLowerCase());
            changed = true;
        }
        return changed;
    }

    private <T> Set<String> existingNames(
            Set<T> requirements,
            Function<T, String> nameExtractor
    ) {
        Set<String> names = new HashSet<>();
        if (requirements == null) {
            return names;
        }

        for (T requirement : requirements) {
            String name = nameExtractor.apply(requirement);
            if (name != null && !name.isBlank()) {
                names.add(name.trim().toLowerCase());
            }
        }
        return names;
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
