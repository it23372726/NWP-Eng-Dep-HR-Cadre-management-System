package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.BirthdayDto;
import com.nwpengdep.hrms.dto.EmployeeDistributionDto;
import com.nwpengdep.hrms.dto.RecentEmployeeDto;
import com.nwpengdep.hrms.dto.RetirementForecastDto;
import com.nwpengdep.hrms.dto.RetirementWatchDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DashboardServiceTest {

    private static final String PRIMARY_DEPARTMENT = "NWP Engineering Department";
    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 15);

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock dashboardTestClock() {
            return Clock.fixed(TODAY.atStartOfDay(ZONE).toInstant(), ZONE);
        }
    }

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EmployeeActionRepository employeeActionRepository;

    private final AtomicInteger sequence = new AtomicInteger(1);

    @BeforeEach
    void setUp() {
        DepartmentConstants.setPrimaryDepartmentName(PRIMARY_DEPARTMENT);
    }

    @AfterEach
    void tearDown() {
        DepartmentConstants.setPrimaryDepartmentName("");
    }

    @Test
    void systemPendingEmployeeIsExcludedFromNearRetirementCount() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(6),
                false,
                false
        );

        assertEquals(0, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void nonPendingEmployeeIsIncludedInNearRetirementCount() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(6),
                true,
                false
        );

        assertEquals(1, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void nonPermanentEmployeeWithoutCareerActionIsNotIncorrectlyExcluded() {
        saveNwpEmployee(
                EmploymentType.CONTRACT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(3),
                false,
                false
        );

        assertEquals(1, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void deletedActionsDoNotMakeEmployeeDashboardEligible() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(4),
                true,
                true
        );

        assertEquals(0, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void nearRetirementIncludesExactlyTwelveMonthBoundary() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(12),
                true,
                false
        );

        assertEquals(1, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void nearRetirementExcludesTwelveMonthsPlusOneDay() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(12).plusDays(1),
                true,
                false
        );

        assertEquals(0, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void nearRetirementExcludesPastRetirementDate() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).minusDays(1),
                true,
                false
        );

        assertEquals(0, dashboardService.getDashboardSummary().getRetirementWatch());
    }

    @Test
    void retirementForecastUsesRollingOneYear() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(11),
                true,
                false
        );

        RetirementForecastDto forecast = dashboardService.getRetirementForecast();
        assertEquals(1, forecast.getRetiringWithinOneYear());
        assertEquals(1, forecast.getRetiringWithinFiveYears());
    }

    @Test
    void retiringThisYearUsesCalendarYear() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1966, 12, 1),
                true,
                false
        );
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1967, 3, 1),
                true,
                false
        );

        RetirementForecastDto forecast = dashboardService.getRetirementForecast();
        assertEquals(1, forecast.getRetiringThisYear());
        assertEquals(2, forecast.getRetiringWithinOneYear());
    }

    @Test
    void systemPendingEmployeeIsExcludedFromRetirementForecast() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1966, 12, 1),
                false,
                false
        );

        RetirementForecastDto forecast = dashboardService.getRetirementForecast();
        assertEquals(0, forecast.getRetiringThisYear());
        assertEquals(0, forecast.getRetiringWithinOneYear());
        assertEquals(0, forecast.getRetiringWithinFiveYears());
    }

    @Test
    void systemPendingEmployeeIsExcludedFromRetirementWatchList() {
        Employee pending = saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(2),
                false,
                false
        );
        Employee eligible = saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                TODAY.minusYears(60).plusMonths(2),
                true,
                false
        );

        List<RetirementWatchDto> watch = dashboardService.getRetirementWatchList();
        Set<Long> ids = watch.stream()
                .map(RetirementWatchDto::getEmployeeId)
                .collect(Collectors.toSet());
        assertFalse(ids.contains(pending.getId()));
        assertTrue(ids.contains(eligible.getId()));
    }

    @Test
    void systemPendingEmployeeIsExcludedFromBirthdayAndRecentEmployeeWidgets() {
        Employee pending = saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1990, 9, 20),
                false,
                false
        );
        Employee eligible = saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1991, 9, 8),
                true,
                false
        );

        Set<Long> birthdayIds = dashboardService.getBirthdaysThisMonth().stream()
                .map(BirthdayDto::getEmployeeId)
                .collect(Collectors.toSet());
        assertFalse(birthdayIds.contains(pending.getId()));
        assertTrue(birthdayIds.contains(eligible.getId()));

        Set<Long> recentIds = dashboardService.getRecentlyAddedEmployees().stream()
                .map(RecentEmployeeDto::getEmployeeId)
                .collect(Collectors.toSet());
        assertFalse(recentIds.contains(pending.getId()));
        assertTrue(recentIds.contains(eligible.getId()));
    }

    @Test
    void dashboardEmployeeDistributionsExcludeSystemPendingEmployees() {
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1980, 1, 1),
                false,
                false,
                Grade.II
        );
        saveNwpEmployee(
                EmploymentType.PERMANENT,
                EmployeeStatus.ACTIVE,
                LocalDate.of(1980, 1, 1),
                true,
                false,
                Grade.III
        );

        List<EmployeeDistributionDto> grades = dashboardService.getGradeDistribution();
        long gradeTwo = grades.stream()
                .filter(dto -> "Grade II".equals(dto.getCategory()))
                .mapToLong(EmployeeDistributionDto::getCount)
                .sum();
        long gradeThree = grades.stream()
                .filter(dto -> "Grade III".equals(dto.getCategory()))
                .mapToLong(EmployeeDistributionDto::getCount)
                .sum();

        assertEquals(0, gradeTwo);
        assertEquals(1, gradeThree);
        assertEquals(1, dashboardService.getDashboardSummary().getActiveEmployees());
    }

    private Employee saveNwpEmployee(
            EmploymentType type,
            EmployeeStatus status,
            LocalDate dateOfBirth,
            boolean withAction,
            boolean deletedAction
    ) {
        return saveNwpEmployee(type, status, dateOfBirth, withAction, deletedAction, Grade.III);
    }

    private Employee saveNwpEmployee(
            EmploymentType type,
            EmployeeStatus status,
            LocalDate dateOfBirth,
            boolean withAction,
            boolean deletedAction,
            Grade grade
    ) {
        int n = sequence.getAndIncrement();
        Employee employee = employeeRepository.saveAndFlush(Employee.builder()
                .employeeNo("DASH-S-" + n)
                .fullName("Dashboard Person " + n)
                .nic("DASH" + String.format("%07d", n) + "V")
                .grade(grade)
                .status(status)
                .employmentType(type)
                .dateOfBirth(dateOfBirth)
                .currentDepartment(PRIMARY_DEPARTMENT)
                .build());

        if (withAction) {
            employeeActionRepository.saveAndFlush(EmployeeAction.builder()
                    .employee(employee)
                    .actionType(EmployeeActionType.NEW_APPOINTMENT)
                    .actionDate(LocalDate.of(2000, 1, 1))
                    .deleted(deletedAction)
                    .trainingGraduation(false)
                    .trainingAppointment(false)
                    .build());
        }
        return employee;
    }
}
