package com.nwpengdep.hrms.service;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.DesignationGrade1Requirement;
import com.nwpengdep.hrms.entity.DesignationGrade2Requirement;
import com.nwpengdep.hrms.entity.DesignationPermanentRequirement;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;

@Service
public class EmployeeRequirementSyncService {

    private static final Set<RequirementType> LEGACY_REQUIREMENT_TYPES =
            EnumSet.of(
                    RequirementType.OTHER_CERTIFICATE,
                    RequirementType.OTHER_GRADE_2_REQUIREMENT
            );

    private static final List<RequirementType> PERMANENT_FIXED_TYPES = List.of(
            RequirementType.EB_GRADE_3,
            RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
            RequirementType.MEDICAL_REPORT,
            RequirementType.OL_CERTIFICATE,
            RequirementType.AL_CERTIFICATE,
            RequirementType.DEGREE_CERTIFICATE,
            RequirementType.BIRTH_CERTIFICATE
    );

    public void syncEmployeeRequirements(Employee employee) {
        if (employee == null || employee.getDesignation() == null) {
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
        Designation designation = employee.getDesignation();
        List<ExpectedRequirement> expected = new ArrayList<>();
        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;

        if (grade == Grade.III || isHigherPermanentGrade(grade)) {
            PERMANENT_FIXED_TYPES.forEach(type ->
                    expected.add(new ExpectedRequirement(type, null))
            );

            if (designation.getPermanentRequirements() != null) {
                designation.getPermanentRequirements()
                        .stream()
                        .map(DesignationPermanentRequirement::getRequirementName)
                        .filter(this::hasText)
                        .forEach(name -> expected.add(new ExpectedRequirement(
                                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                                name
                        )));
            }
        }

        if (grade == Grade.II || grade == Grade.I || grade == Grade.SUPRA || grade == Grade.SPECIAL) {
            expected.add(new ExpectedRequirement(RequirementType.EB_GRADE_2, null));

            if (designation.getGrade2Requirements() != null) {
                designation.getGrade2Requirements()
                        .stream()
                        .map(DesignationGrade2Requirement::getRequirementName)
                        .filter(this::hasText)
                        .forEach(name -> expected.add(new ExpectedRequirement(
                                RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                                name
                        )));
            }
        }

        if (grade == Grade.II
                || grade == Grade.I
                || grade == Grade.SUPRA
                || grade == Grade.SPECIAL) {
            expected.add(new ExpectedRequirement(RequirementType.EB_GRADE_1, null));

            if (designation.getGrade1Requirements() != null) {
                designation.getGrade1Requirements()
                        .stream()
                        .map(DesignationGrade1Requirement::getRequirementName)
                        .filter(this::hasText)
                        .forEach(name -> expected.add(new ExpectedRequirement(
                                RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                                name
                        )));
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
        Designation designation = employee.getDesignation();
        if (designation == null || employee.getRequirements() == null) {
            return;
        }

        Set<String> permanentNames = requirementNames(
                designation.getPermanentRequirements(),
                DesignationPermanentRequirement::getRequirementName
        );
        Set<String> grade2Names = requirementNames(
                designation.getGrade2Requirements(),
                DesignationGrade2Requirement::getRequirementName
        );
        Set<String> grade1Names = requirementNames(
                designation.getGrade1Requirements(),
                DesignationGrade1Requirement::getRequirementName
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
            return false;
        });
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

    private record ExpectedRequirement(
            RequirementType type,
            String name
    ) {
        ExpectedRequirement {
            Objects.requireNonNull(type, "Requirement type is required");
        }
    }
}
