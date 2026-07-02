package com.nwpengdep.hrms.util;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.RequirementType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class TrainingGraduationRequirements {

    private static final List<RequirementType> FIXED_TYPES = List.of(
            RequirementType.TRAINING_EXAM
    );

    private TrainingGraduationRequirements() {
    }

    public static boolean areSatisfied(Employee employee) {
        return areSatisfied(employee, LocalDate.now());
    }

    public static boolean areSatisfied(Employee employee, LocalDate asOfDate) {
        if (!EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return false;
        }

        for (RequirementType type : FIXED_TYPES) {
            if (!isRequirementCompleted(employee, type, null)) {
                return false;
            }
        }

        return hasTrainingPeriodCompleted(employee, asOfDate);
    }

    public static LocalDate getTrainingPeriodEndDate(Employee employee) {
        if (employee == null || employee.getDateOfFirstAppointment() == null) {
            return null;
        }

        int years = resolveTrainingPeriodYears(employee);
        return employee.getDateOfFirstAppointment().plusYears(years);
    }

    public static boolean hasTrainingPeriodCompleted(Employee employee) {
        return hasTrainingPeriodCompleted(employee, LocalDate.now());
    }

    public static boolean hasTrainingPeriodCompleted(
            Employee employee,
            LocalDate asOfDate
    ) {
        LocalDate endDate = getTrainingPeriodEndDate(employee);
        if (endDate == null || asOfDate == null) {
            return false;
        }

        return !asOfDate.isBefore(endDate);
    }

    public static String graduationBlockMessage(Employee employee) {
        if (!EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return "This action is only available for training employees";
        }

        List<String> parts = new ArrayList<>();

        if (!isRequirementCompleted(employee, RequirementType.TRAINING_EXAM, null)) {
            parts.add("pass the training examination");
        }

        if (!hasTrainingPeriodCompleted(employee)) {
            int years = resolveTrainingPeriodYears(employee);
            LocalDate endDate = getTrainingPeriodEndDate(employee);
            if (endDate != null) {
                parts.add(String.format(
                        "complete the %d-year training period (eligible from %s)",
                        years,
                        endDate
                ));
            } else {
                parts.add(String.format(
                        "complete the %d-year training period from first appointment date",
                        years
                ));
            }
        }

        if (parts.isEmpty()) {
            return null;
        }

        return "Must " + String.join(" and ", parts)
                + " before appointment as permanent";
    }

    public static List<RequirementType> fixedTypes() {
        return FIXED_TYPES;
    }

    private static int resolveTrainingPeriodYears(Employee employee) {
        Integer years = employee.getTrainingPeriodYears();
        return years != null ? years : 1;
    }

    private static boolean isRequirementCompleted(
            Employee employee,
            RequirementType type,
            String name
    ) {
        if (employee.getRequirements() == null) {
            return false;
        }

        return employee.getRequirements()
                .stream()
                .anyMatch(requirement ->
                        requirement.getRequirementType() == type
                                && requirement.getStatus()
                                        == com.nwpengdep.hrms.entity.RequirementStatus.COMPLETED
                                && sameRequirementName(
                                        requirement.getRequirementName(),
                                        name
                                )
                );
    }

    private static boolean sameRequirementName(String left, String right) {
        String leftValue = left != null ? left.trim() : "";
        String rightValue = right != null ? right.trim() : "";
        if (rightValue.isEmpty()) {
            return leftValue.isEmpty();
        }
        return leftValue.equalsIgnoreCase(rightValue);
    }
}
