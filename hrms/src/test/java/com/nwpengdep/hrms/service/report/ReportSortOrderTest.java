package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;

class ReportSortOrderTest {

    @Test
    void serviceLevelsSortSeniorBeforePrimary() {
        assertTrue(
                ReportSortOrder.compareServiceLevelNames("Senior", "Primary") < 0
        );
        assertTrue(
                ReportSortOrder.compareServiceLevelNames("Tertiary", "Secondary") < 0
        );
        assertTrue(
                ReportSortOrder.compareServiceLevelNames("Unknown", "Primary") > 0
        );
    }

    @Test
    void gradesSortSupraBeforeSpecialBeforeOne() {
        assertTrue(ReportSortOrder.compareGrades(Grade.SUPRA, Grade.SPECIAL) < 0);
        assertTrue(ReportSortOrder.compareGrades(Grade.SPECIAL, Grade.I) < 0);
        assertTrue(ReportSortOrder.compareGrades(Grade.I, Grade.II) < 0);
        assertTrue(ReportSortOrder.compareGrades(Grade.II, Grade.III) < 0);
        assertTrue(ReportSortOrder.compareGradeNames("SUPRA", "I") < 0);
    }

    @Test
    void designationsSortByServiceLevelThenBestAllowedGrade() {
        Designation seniorSupra = designation(
                "Senior Supra",
                "Senior",
                Set.of(Grade.SUPRA),
                LocalDateTime.of(2024, 1, 2, 0, 0)
        );
        Designation seniorOne = designation(
                "Senior One",
                "Senior",
                Set.of(Grade.I, Grade.II),
                LocalDateTime.of(2024, 1, 1, 0, 0)
        );
        Designation primarySupra = designation(
                "Primary Supra",
                "Primary",
                Set.of(Grade.SUPRA),
                LocalDateTime.of(2020, 1, 1, 0, 0)
        );

        List<Designation> sorted = List.of(primarySupra, seniorOne, seniorSupra);
        sorted = sorted.stream()
                .sorted(ReportSortOrder.designationComparator())
                .toList();

        assertEquals("Senior Supra", sorted.get(0).getDesignationName());
        assertEquals("Senior One", sorted.get(1).getDesignationName());
        assertEquals("Primary Supra", sorted.get(2).getDesignationName());
    }

    @Test
    void designationsWithSameServiceLevelAndGradeSortByCreatedAt() {
        Designation older = designation(
                "Older",
                "Senior",
                Set.of(Grade.I),
                LocalDateTime.of(2020, 1, 1, 0, 0)
        );
        Designation newer = designation(
                "Newer",
                "Senior",
                Set.of(Grade.I),
                LocalDateTime.of(2021, 1, 1, 0, 0)
        );

        assertTrue(ReportSortOrder.compareDesignations(older, newer) < 0);
    }

    @Test
    void employeesSortByServiceLevelGradeThenFirstAppointmentDate() {
        Employee seniorSupraEarly = employee(
                "Alice",
                "Senior",
                Grade.SUPRA,
                LocalDate.of(2010, 1, 1)
        );
        Employee seniorSupraLate = employee(
                "Bob",
                "Senior",
                Grade.SUPRA,
                LocalDate.of(2015, 1, 1)
        );
        Employee seniorOne = employee(
                "Charlie",
                "Senior",
                Grade.I,
                LocalDate.of(2000, 1, 1)
        );
        Employee primary = employee(
                "Delta",
                "Primary",
                Grade.III,
                LocalDate.of(1990, 1, 1)
        );

        List<Employee> sorted = List.of(primary, seniorOne, seniorSupraLate, seniorSupraEarly);
        sorted = sorted.stream()
                .sorted(ReportSortOrder.employeeReportComparator())
                .toList();

        assertEquals("Alice", sorted.get(0).getFullName());
        assertEquals("Bob", sorted.get(1).getFullName());
        assertEquals("Charlie", sorted.get(2).getFullName());
        assertEquals("Delta", sorted.get(3).getFullName());
    }

    @Test
    void bestAllowedGradeRankUsesHighestGradeInBusinessOrder() {
        assertEquals(
                ReportSortOrder.gradeRank(Grade.I),
                ReportSortOrder.bestAllowedGradeRank(EnumSet.of(Grade.I, Grade.II, Grade.III))
        );
        assertEquals(
                ReportSortOrder.gradeRank(Grade.SUPRA),
                ReportSortOrder.bestAllowedGradeRank(EnumSet.of(Grade.SUPRA, Grade.I))
        );
    }

    @Test
    void contractEmployeesSortAfterPermanentEmployees() {
        Employee permanent = employee(
                "Alice Permanent",
                "Senior",
                Grade.III,
                LocalDate.of(2020, 1, 1)
        );
        Employee contract = employee(
                "Zara Contract",
                "Senior",
                Grade.NONE,
                LocalDate.of(2010, 1, 1)
        );
        contract.setEmploymentType(EmploymentType.CONTRACT);

        assertTrue(ReportSortOrder.compareEmployeesForReport(permanent, contract) < 0);
        assertTrue(ReportSortOrder.compareEmployeesForReport(contract, permanent) > 0);
    }

    @Test
    void contractEmployeesSortByNameAmongThemselves() {
        Employee first = employee(
                "Alice Contract",
                null,
                Grade.NONE,
                null
        );
        first.setEmploymentType(EmploymentType.CONTRACT);
        Employee second = employee(
                "Bob Contract",
                null,
                Grade.NONE,
                null
        );
        second.setEmploymentType(EmploymentType.CONTRACT);

        assertTrue(ReportSortOrder.compareEmployeesForReport(first, second) < 0);
    }

    private Designation designation(
            String name,
            String serviceLevelName,
            Set<Grade> allowedGrades,
            LocalDateTime createdAt
    ) {
        return Designation.builder()
                .designationName(name)
                .serviceLevel(serviceLevel(serviceLevelName))
                .allowedGrades(allowedGrades)
                .createdAt(createdAt)
                .build();
    }

    private Employee employee(
            String name,
            String serviceLevelName,
            Grade grade,
            LocalDate firstAppointment
    ) {
        return Employee.builder()
                .fullName(name)
                .serviceLevel(serviceLevel(serviceLevelName))
                .grade(grade)
                .dateOfFirstAppointment(firstAppointment)
                .build();
    }

    private ServiceLevel serviceLevel(String levelName) {
        return ServiceLevel.builder()
                .levelName(levelName)
                .build();
    }
}
