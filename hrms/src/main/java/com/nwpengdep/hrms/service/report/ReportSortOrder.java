package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ReportSortOrder {

    public static final List<String> SERVICE_LEVEL_ORDER = List.of(
            "Senior",
            "Tertiary",
            "Secondary",
            "Primary"
    );

    public static final List<Grade> GRADE_ORDER = List.of(
            Grade.SUPRA,
            Grade.SPECIAL,
            Grade.I,
            Grade.II,
            Grade.III,
            Grade.NONE
    );

    private ReportSortOrder() {
    }

    public static int compareServiceLevelNames(String left, String right) {
        return Integer.compare(
                serviceLevelRank(left),
                serviceLevelRank(right)
        );
    }

    public static int compareGrades(Grade left, Grade right) {
        return Integer.compare(gradeRank(left), gradeRank(right));
    }

    public static int compareGradeNames(String left, String right) {
        return Integer.compare(gradeNameRank(left), gradeNameRank(right));
    }

    public static int compareDesignations(Designation left, Designation right) {
        int byServiceLevel = compareServiceLevelNames(
                serviceLevelName(left),
                serviceLevelName(right)
        );
        if (byServiceLevel != 0) {
            return byServiceLevel;
        }

        int byGrade = Integer.compare(
                bestAllowedGradeRank(left != null ? left.getAllowedGrades() : null),
                bestAllowedGradeRank(right != null ? right.getAllowedGrades() : null)
        );
        if (byGrade != 0) {
            return byGrade;
        }

        int byCreatedAt = compareNullableDateTime(
                left != null ? left.getCreatedAt() : null,
                right != null ? right.getCreatedAt() : null
        );
        if (byCreatedAt != 0) {
            return byCreatedAt;
        }

        return compareNullableStrings(
                left != null ? left.getDesignationName() : null,
                right != null ? right.getDesignationName() : null
        );
    }

    public static int compareEmployeesForReport(Employee left, Employee right) {
        int byContract = compareContractEmployees(left, right);
        if (byContract != 0) {
            return byContract;
        }

        if (isContractEmployee(left) && isContractEmployee(right)) {
            return compareNullableStrings(
                    left != null ? left.getFullName() : null,
                    right != null ? right.getFullName() : null
            );
        }

        int byServiceLevel = compareServiceLevelNames(
                serviceLevelName(left),
                serviceLevelName(right)
        );
        if (byServiceLevel != 0) {
            return byServiceLevel;
        }

        int byGrade = compareGrades(
                left != null ? left.getGrade() : null,
                right != null ? right.getGrade() : null
        );
        if (byGrade != 0) {
            return byGrade;
        }

        int byFirstAppointment = compareNullableDates(
                left != null ? left.getDateOfFirstAppointment() : null,
                right != null ? right.getDateOfFirstAppointment() : null
        );
        if (byFirstAppointment != 0) {
            return byFirstAppointment;
        }

        return compareNullableStrings(
                left != null ? left.getFullName() : null,
                right != null ? right.getFullName() : null
        );
    }

    public static Comparator<Designation> designationComparator() {
        return ReportSortOrder::compareDesignations;
    }

    public static Comparator<Employee> employeeReportComparator() {
        return ReportSortOrder::compareEmployeesForReport;
    }

    public static boolean isContractEmployee(Employee employee) {
        return employee != null && employee.getEmploymentType() == EmploymentType.CONTRACT;
    }

    private static int compareContractEmployees(Employee left, Employee right) {
        boolean leftContract = isContractEmployee(left);
        boolean rightContract = isContractEmployee(right);
        if (leftContract == rightContract) {
            return 0;
        }
        return leftContract ? 1 : -1;
    }

    public static int serviceLevelRank(String levelName) {
        if (levelName == null || levelName.isBlank()) {
            return Integer.MAX_VALUE;
        }

        String normalized = levelName.trim();
        for (int index = 0; index < SERVICE_LEVEL_ORDER.size(); index++) {
            if (SERVICE_LEVEL_ORDER.get(index).equalsIgnoreCase(normalized)) {
                return index;
            }
        }

        return Integer.MAX_VALUE;
    }

    public static int gradeRank(Grade grade) {
        if (grade == null) {
            return Integer.MAX_VALUE;
        }

        int index = GRADE_ORDER.indexOf(grade);
        return index >= 0 ? index : Integer.MAX_VALUE;
    }

    public static int gradeNameRank(String gradeName) {
        if (gradeName == null || gradeName.isBlank() || "—".equals(gradeName)) {
            return Integer.MAX_VALUE;
        }

        try {
            return gradeRank(Grade.valueOf(gradeName.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            for (Grade grade : Grade.values()) {
                if (grade.getLabel().equalsIgnoreCase(gradeName.trim())) {
                    return gradeRank(grade);
                }
            }
        }

        return Integer.MAX_VALUE;
    }

    public static int bestAllowedGradeRank(Set<Grade> allowedGrades) {
        if (allowedGrades == null || allowedGrades.isEmpty()) {
            return Integer.MAX_VALUE;
        }

        return allowedGrades.stream()
                .mapToInt(ReportSortOrder::gradeRank)
                .min()
                .orElse(Integer.MAX_VALUE);
    }

    private static String serviceLevelName(Designation designation) {
        if (designation == null || designation.getServiceLevel() == null) {
            return null;
        }

        return designation.getServiceLevel().getLevelName();
    }

    private static String serviceLevelName(Employee employee) {
        if (employee == null) {
            return null;
        }

        ServiceLevel serviceLevel = employee.getServiceLevel();
        if (serviceLevel != null && serviceLevel.getLevelName() != null) {
            return serviceLevel.getLevelName();
        }

        if (employee.getDesignation() != null
                && employee.getDesignation().getServiceLevel() != null) {
            return employee.getDesignation().getServiceLevel().getLevelName();
        }

        return null;
    }

    private static int compareNullableDateTime(LocalDateTime left, LocalDateTime right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return 1;
        }
        if (right == null) {
            return -1;
        }
        return left.compareTo(right);
    }

    private static int compareNullableDates(LocalDate left, LocalDate right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return 1;
        }
        if (right == null) {
            return -1;
        }
        return left.compareTo(right);
    }

    private static int compareNullableStrings(String left, String right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return 1;
        }
        if (right == null) {
            return -1;
        }
        return left.compareToIgnoreCase(right);
    }
}
