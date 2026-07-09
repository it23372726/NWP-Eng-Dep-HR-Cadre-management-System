package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceGrade1Requirement;
import com.nwpengdep.hrms.entity.ServiceGrade2Requirement;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceSpecialRequirement;
import com.nwpengdep.hrms.entity.ServiceSupraRequirement;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.util.DefaultServiceRequirements;
import com.nwpengdep.hrms.util.EmployeeTrainingUtil;
import com.nwpengdep.hrms.util.TrainingGraduationRequirements;

@Service
public class EmployeeRequirementSyncService {

    private static final Set<RequirementType> LEGACY_REQUIREMENT_TYPES =
            EnumSet.of(
                    RequirementType.OTHER_CERTIFICATE,
                    RequirementType.OTHER_GRADE_2_REQUIREMENT
            );

    public void syncEmployeeRequirements(Employee employee) {
        if (employee == null) {
            return;
        }

        if (EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            syncTrainingEmployeeRequirements(employee);
            return;
        }

        ServiceType service = resolveService(employee);
        if (service == null) {
            return;
        }

        removeLegacyRequirements(employee);

        if (employee.getEmploymentType() != EmploymentType.PERMANENT) {
            removeOrphanedCustomRequirements(employee);
            return;
        }

        ensureRequirementsList(employee);

        for (ExpectedRequirement expected : buildExpectedRequirements(employee)) {
            ensureRequirementExists(employee, expected);
        }

        removeOrphanedCustomRequirements(employee);
        removeLegacyRequirements(employee);
    }

    public void completeRequirementsForGradePromotion(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate completedDate
    ) {
        if (employee == null
                || employee.getEmploymentType() != EmploymentType.PERMANENT
                || oldGrade == null
                || newGrade == null) {
            return;
        }

        LocalDate effectiveDate = completedDate != null
                ? completedDate
                : LocalDate.now();

        if (oldGrade == Grade.III && newGrade == Grade.II) {
            markGrade2RequirementsCompleted(employee, effectiveDate);
        }
        if (oldGrade == Grade.II && newGrade == Grade.I) {
            markGrade1RequirementsCompleted(employee, effectiveDate);
        }
        if (oldGrade == Grade.I && newGrade == Grade.SUPRA) {
            markSupraRequirementsCompleted(employee, effectiveDate);
        }
        if (oldGrade == Grade.I && newGrade == Grade.SPECIAL) {
            markSpecialRequirementsCompleted(employee, effectiveDate);
        }
    }

    public void completeRequirementsForAchievedGrade(Employee employee) {
        if (employee == null
                || employee.getEmploymentType() != EmploymentType.PERMANENT) {
            return;
        }

        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;
        boolean confirmedPermanent = employee.getCareerProgression() != null
                && employee.getCareerProgression().getPermanentConfirmationDate() != null;
        LocalDate completedDate = LocalDate.now();

        if (confirmedPermanent || isHigherPermanentGrade(grade)) {
            markPermanentRequirementsCompleted(employee, completedDate);
        }
        if (isHigherPermanentGrade(grade)) {
            markGrade2RequirementsCompleted(employee, completedDate);
        }
        if (grade == Grade.I || grade == Grade.SUPRA || grade == Grade.SPECIAL) {
            markGrade1RequirementsCompleted(employee, completedDate);
        }
        if (grade == Grade.SUPRA) {
            markSupraRequirementsCompleted(employee, completedDate);
        }
        if (grade == Grade.SPECIAL) {
            markSpecialRequirementsCompleted(employee, completedDate);
        }
    }

    public void markPermanentRequirementsCompleted(
            Employee employee,
            LocalDate completedDate
    ) {
        ServiceType service = resolveService(employee);
        if (service != null && service.getPermanentRequirements() != null) {
            service.getPermanentRequirements()
                    .forEach(requirement -> setRequirementCompleted(
                            employee,
                            RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                            requirement.getRequirementName(),
                            completedDate
                    ));
        }
    }

    public void markGrade2RequirementsCompleted(
            Employee employee,
            LocalDate completedDate
    ) {
        ServiceType service = resolveService(employee);
        if (service == null || service.getGrade2Requirements() == null) {
            return;
        }

        service.getGrade2Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        requirement.getRequirementName(),
                        completedDate
                ));
    }

    public void markGrade1RequirementsCompleted(
            Employee employee,
            LocalDate completedDate
    ) {
        ServiceType service = resolveService(employee);
        if (service == null || service.getGrade1Requirements() == null) {
            return;
        }

        service.getGrade1Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        requirement.getRequirementName(),
                        completedDate
                ));
    }

    public void markSupraRequirementsCompleted(
            Employee employee,
            LocalDate completedDate
    ) {
        ServiceType service = resolveService(employee);
        if (service == null || service.getSupraRequirements() == null) {
            return;
        }

        service.getSupraRequirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_SUPRA_REQUIREMENT,
                        requirement.getRequirementName(),
                        completedDate
                ));
    }

    public void markSpecialRequirementsCompleted(
            Employee employee,
            LocalDate completedDate
    ) {
        ServiceType service = resolveService(employee);
        if (service == null || service.getSpecialRequirements() == null) {
            return;
        }

        service.getSpecialRequirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_SPECIAL_REQUIREMENT,
                        requirement.getRequirementName(),
                        completedDate
                ));
    }

    public void syncTrainingEmployeeRequirements(Employee employee) {
        if (employee == null || !EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return;
        }

        ensureRequirementsList(employee);
        removeLegacyRequirements(employee);

        for (RequirementType type : TrainingGraduationRequirements.fixedTypes()) {
            ensureRequirementExists(employee, new ExpectedRequirement(type, null));
        }

        removeOrphanedTrainingRequirements(employee);
    }

    private void removeOrphanedTrainingRequirements(Employee employee) {
        if (employee.getRequirements() == null) {
            return;
        }

        employee.getRequirements().removeIf(requirement ->
                !TrainingGraduationRequirements.fixedTypes()
                        .contains(requirement.getRequirementType())
        );
    }

    private void removeLegacyRequirements(Employee employee) {
        if (employee.getRequirements() == null) {
            return;
        }

        employee.getRequirements()
                .removeIf(requirement ->
                        LEGACY_REQUIREMENT_TYPES.contains(
                                requirement.getRequirementType()
                        )
                );
    }

    private void ensureRequirementsList(Employee employee) {
        if (employee.getRequirements() == null) {
            employee.setRequirements(new ArrayList<>());
        }
    }

    private List<ExpectedRequirement> buildExpectedRequirements(Employee employee) {
        ServiceType service = resolveService(employee);
        List<ExpectedRequirement> expected = new ArrayList<>();
        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;

        if (grade == Grade.III || isHigherPermanentGrade(grade)) {
            appendConfiguredRequirements(
                    expected,
                    service != null ? service.getPermanentRequirements() : null,
                    ServicePermanentRequirement::getRequirementName,
                    RequirementType.CUSTOM_PERMANENT_REQUIREMENT
            );
        }

        if (grade == Grade.II || grade == Grade.I || grade == Grade.SUPRA || grade == Grade.SPECIAL) {
            appendConfiguredRequirements(
                    expected,
                    service != null ? service.getGrade2Requirements() : null,
                    ServiceGrade2Requirement::getRequirementName,
                    RequirementType.CUSTOM_GRADE_2_REQUIREMENT
            );
        }

        if (grade == Grade.II
                || grade == Grade.I
                || grade == Grade.SUPRA
                || grade == Grade.SPECIAL) {
            appendConfiguredRequirements(
                    expected,
                    service != null ? service.getGrade1Requirements() : null,
                    ServiceGrade1Requirement::getRequirementName,
                    RequirementType.CUSTOM_GRADE_1_REQUIREMENT
            );
        }

        if (grade == Grade.I || grade == Grade.SUPRA) {
            if (service != null && serviceAllowsSupra(service)) {
                appendConfiguredRequirements(
                        expected,
                        service.getSupraRequirements(),
                        ServiceSupraRequirement::getRequirementName,
                        RequirementType.CUSTOM_SUPRA_REQUIREMENT
                );
            }
        }

        if (grade == Grade.I || grade == Grade.SPECIAL) {
            if (service != null && serviceAllowsSpecial(service)) {
                appendConfiguredRequirements(
                        expected,
                        service.getSpecialRequirements(),
                        ServiceSpecialRequirement::getRequirementName,
                        RequirementType.CUSTOM_SPECIAL_REQUIREMENT
                );
            }
        }

        return expected;
    }

    private boolean isHigherPermanentGrade(Grade grade) {
        return grade == Grade.II
                || grade == Grade.I
                || grade == Grade.SUPRA
                || grade == Grade.SPECIAL;
    }

    private void ensureRequirementExists(
            Employee employee,
            ExpectedRequirement expected
    ) {
        boolean exists = employee.getRequirements()
                .stream()
                .anyMatch(requirement ->
                        requirement.getRequirementType() == expected.type()
                                && sameRequirementName(
                                        requirement.getRequirementName(),
                                        expected.name()
                                )
                );

        if (exists) {
            return;
        }

        EmployeeRequirement requirement = new EmployeeRequirement();
        requirement.setEmployee(employee);
        requirement.setRequirementType(expected.type());
        requirement.setRequirementName(normalizeName(expected.name()));
        requirement.setStatus(RequirementStatus.PENDING);
        employee.getRequirements().add(requirement);
    }

    private void removeOrphanedCustomRequirements(Employee employee) {
        ServiceType service = resolveService(employee);
        if (service == null || employee.getRequirements() == null) {
            return;
        }

        Set<String> permanentNames = requirementNames(
                service.getPermanentRequirements(),
                ServicePermanentRequirement::getRequirementName
        );
        Set<String> grade2Names = requirementNames(
                service.getGrade2Requirements(),
                ServiceGrade2Requirement::getRequirementName
        );
        Set<String> grade1Names = requirementNames(
                service.getGrade1Requirements(),
                ServiceGrade1Requirement::getRequirementName
        );
        Set<String> supraNames = requirementNames(
                service.getSupraRequirements(),
                ServiceSupraRequirement::getRequirementName
        );
        Set<String> specialNames = requirementNames(
                service.getSpecialRequirements(),
                ServiceSpecialRequirement::getRequirementName
        );

        employee.getRequirements().removeIf(requirement -> {
            RequirementType type = requirement.getRequirementType();
            if (type == RequirementType.CUSTOM_PERMANENT_REQUIREMENT) {
                return !containsName(permanentNames, requirement.getRequirementName());
            }
            if (type == RequirementType.CUSTOM_GRADE_2_REQUIREMENT) {
                return !containsName(grade2Names, requirement.getRequirementName());
            }
            if (type == RequirementType.CUSTOM_GRADE_1_REQUIREMENT) {
                return !containsName(grade1Names, requirement.getRequirementName());
            }
            if (type == RequirementType.CUSTOM_SUPRA_REQUIREMENT) {
                return !containsName(supraNames, requirement.getRequirementName());
            }
            if (type == RequirementType.CUSTOM_SPECIAL_REQUIREMENT) {
                return !containsName(specialNames, requirement.getRequirementName());
            }
            return DefaultServiceRequirements.legacyFixedTypes().contains(type);
        });
    }

    private <T> void appendConfiguredRequirements(
            List<ExpectedRequirement> expected,
            Set<T> requirements,
            java.util.function.Function<T, String> nameExtractor,
            RequirementType customType
    ) {
        if (requirements == null) {
            return;
        }

        requirements.stream()
                .map(nameExtractor)
                .filter(this::hasText)
                .forEach(name -> expected.add(new ExpectedRequirement(customType, name)));
    }

    private <T> Set<String> requirementNames(
            Set<T> requirements,
            java.util.function.Function<T, String> nameExtractor
    ) {
        Set<String> names = new HashSet<>();
        if (requirements == null) {
            return names;
        }

        requirements.stream()
                .map(nameExtractor)
                .filter(this::hasText)
                .map(String::trim)
                .forEach(names::add);
        return names;
    }

    private boolean containsName(Set<String> names, String candidate) {
        if (names.isEmpty()) {
            return false;
        }

        String normalized = candidate != null ? candidate.trim() : "";
        return names.stream()
                .anyMatch(name -> name.equalsIgnoreCase(normalized));
    }

    private boolean sameRequirementName(String left, String right) {
        String leftValue = left != null ? left.trim() : "";
        String rightValue = right != null ? right.trim() : "";
        return leftValue.equalsIgnoreCase(rightValue);
    }

    private String normalizeName(String name) {
        return hasText(name) ? name.trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private ServiceType resolveService(Employee employee) {
        if (employee.getDesignation() != null
                && employee.getDesignation().getService() != null) {
            return employee.getDesignation().getService();
        }
        return employee.getService();
    }

    private boolean serviceAllowsSupra(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SUPRA);
    }

    private boolean serviceAllowsSpecial(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SPECIAL);
    }

    private void setRequirementCompleted(
            Employee employee,
            RequirementType type,
            String requirementName,
            LocalDate completedDate
    ) {
        ensureRequirementsList(employee);

        EmployeeRequirement requirement = employee.getRequirements()
                .stream()
                .filter(existing -> existing.getRequirementType() == type
                        && sameRequirementName(
                                existing.getRequirementName(),
                                requirementName
                        ))
                .findFirst()
                .orElseGet(() -> {
                    EmployeeRequirement created = new EmployeeRequirement();
                    created.setEmployee(employee);
                    created.setRequirementType(type);
                    created.setRequirementName(normalizeName(requirementName));
                    created.setStatus(RequirementStatus.PENDING);
                    employee.getRequirements().add(created);
                    return created;
                });

        requirement.setStatus(RequirementStatus.COMPLETED);
        requirement.setRequirementName(normalizeName(requirementName));
        requirement.setCompletedDate(
                completedDate != null ? completedDate : LocalDate.now()
        );
    }

    private record ExpectedRequirement(
            RequirementType type,
            String name
    ) {
        ExpectedRequirement {
            Objects.requireNonNull(type, "Requirement type is required");
        }
    }
}
