package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.dto.SalaryIncrementWatchDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.repository.EmployeeRepository;

class SalaryIncrementServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    private SalaryIncrementService salaryIncrementService;

    private Employee employee;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        salaryIncrementService = new SalaryIncrementService(employeeRepository);

        employee = Employee.builder()
                .id(1L)
                .fullName("Test Employee")
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .dateOfFirstAppointment(LocalDate.of(2020, 1, 1))
                .designation(Designation.builder().designationName("Engineer").build())
                .build();
        employee.setIncremantDate("03-15");

        lenient().when(employeeRepository.findById(1L))
                .thenReturn(Optional.of(employee));
        lenient().when(employeeRepository.save(any(Employee.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void employeeWithoutIncrementDateIsNotApplicable() {
        employee.setIncremantDate(null);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isApplicable());
        assertFalse(status.isCanRecordNow());
    }

    @Test
    void contractEmployeeIsNotApplicable() {
        employee.setEmploymentType(EmploymentType.CONTRACT);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isApplicable());
    }

    @Test
    void pendingWhenDueDatePassedAndNeverRecorded() {
        LocalDate today = LocalDate.now();
        employee.setIncremantDate(formatMonthDay(today.minusDays(10)));

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertTrue(status.isApplicable());
        assertTrue(status.isCanRecordNow());
        assertTrue(status.getOverdueYears() >= 1);
    }

    @Test
    void upcomingWhenDueDateWithinThirtyDays() {
        LocalDate today = LocalDate.now();
        LocalDate upcomingDue = today.plusDays(15);
        employee.setIncremantDate(formatMonthDay(upcomingDue));
        employee.setSalaryIncrementLastDueYear(upcomingDue.getYear() - 1);
        employee.setSalaryIncrementDoneDate(
                resolveDueDate(upcomingDue.getYear() - 1).plusDays(1)
        );

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertTrue(status.isApplicable());
        assertFalse(status.isCanRecordNow());
        assertEquals("Upcoming", status.getStatusLabel());
    }

    @Test
    void cannotRecordBeforeDueDate() {
        LocalDate today = LocalDate.now();
        LocalDate upcomingDue = today.plusDays(10);
        employee.setIncremantDate(formatMonthDay(upcomingDue));
        employee.setSalaryIncrementLastDueYear(upcomingDue.getYear() - 1);
        employee.setSalaryIncrementDoneDate(
                resolveDueDate(upcomingDue.getYear() - 1).plusDays(1)
        );

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(today);

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request)
        );
    }

    @Test
    void recordIncrementAdvancesDueYear() {
        LocalDate today = LocalDate.now();
        LocalDate due = today.withMonth(3).withDayOfMonth(15);
        if (!due.isBefore(today)) {
            due = due.minusYears(1);
        }
        employee.setIncremantDate(formatMonthDay(due));
        employee.setSalaryIncrementLastDueYear(due.getYear() - 1);
        employee.setSalaryIncrementDoneDate(LocalDate.of(due.getYear() - 1, 3, 20));

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(today);

        SalaryIncrementStatusDto status = salaryIncrementService.recordIncrement(1L, request);

        assertEquals(due.getYear(), employee.getSalaryIncrementLastDueYear());
        assertEquals(due.getYear() - 1, employee.getSalaryIncrementPriorDueYear());
        assertEquals(today, employee.getSalaryIncrementDoneDate());
        assertFalse(status.isCanRecordNow());
        verify(employeeRepository).save(employee);
    }

    @Test
    void multiYearOverdueCount() {
        LocalDate today = LocalDate.now();
        employee.setIncremantDate("03-15");
        employee.setSalaryIncrementLastDueYear(2023);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2023, 3, 20));

        List<SalaryIncrementWatchDto> pending = salaryIncrementService.getPendingIncrements(
                List.of(employee)
        );

        if (today.getYear() > 2023) {
            SalaryIncrementWatchDto watch = pending.stream()
                    .filter(item -> item.getEmployeeId().equals(1L))
                    .findFirst()
                    .orElse(null);
            assertTrue(watch != null);
            assertTrue(watch.getOverdueYears() >= 2);
        }
    }

    @Test
    void updateRequiresExistingRecord() {
        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(LocalDate.now());

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.updateIncrement(1L, request)
        );
    }

    @Test
    void undoRevertsLastCompletedCycle() {
        employee.setSalaryIncrementLastDueYear(2025);
        employee.setSalaryIncrementPriorDueYear(2024);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2025, 3, 20));

        salaryIncrementService.undoIncrement(1L);

        assertEquals(2024, employee.getSalaryIncrementLastDueYear());
        assertEquals(null, employee.getSalaryIncrementDoneDate());
    }

    @Test
    void catchUpClearsMultiYearOverdueInOneStep() {
        LocalDate today = LocalDate.now();
        employee.setDateOfFirstAppointment(LocalDate.of(1990, 1, 1));
        employee.setIncremantDate("03-15");

        SalaryIncrementStatusDto before = salaryIncrementService.getStatus(1L);
        assertTrue(before.getOverdueYears() >= 2);
        assertTrue(before.isCanCatchUpToCurrentYear());

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(today);
        request.setCatchUpToCurrentYear(true);

        SalaryIncrementStatusDto after = salaryIncrementService.recordIncrement(1L, request);

        assertEquals(before.getCatchUpTargetYear(), employee.getSalaryIncrementLastDueYear());
        assertEquals(null, employee.getSalaryIncrementPriorDueYear());
        assertEquals(0, after.getOverdueYears());
        assertFalse(after.isCanRecordNow());
    }

    @Test
    void catchUpRejectedWhenOnlyOneYearOverdue() {
        LocalDate today = LocalDate.now();
        LocalDate due = today.withMonth(3).withDayOfMonth(15);
        if (!due.isBefore(today)) {
            due = due.minusYears(1);
        }
        employee.setIncremantDate(formatMonthDay(due));
        employee.setSalaryIncrementLastDueYear(due.getYear() - 1);
        employee.setSalaryIncrementDoneDate(LocalDate.of(due.getYear() - 1, 3, 20));

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);
        assertEquals(1, status.getOverdueYears());
        assertFalse(status.isCanCatchUpToCurrentYear());

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(today);
        request.setCatchUpToCurrentYear(true);

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request)
        );
    }

    @Test
    void catchUpRejectsDoneDateBeforeTargetDue() {
        LocalDate today = LocalDate.now();
        employee.setDateOfFirstAppointment(LocalDate.of(1990, 1, 1));
        employee.setIncremantDate("03-15");

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);
        assertTrue(status.isCanCatchUpToCurrentYear());

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(status.getCatchUpTargetDueDate().minusDays(1));
        request.setCatchUpToCurrentYear(true);

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request)
        );
    }

    @Test
    void undoAfterCatchUpRestoresPriorState() {
        LocalDate today = LocalDate.now();
        employee.setDateOfFirstAppointment(LocalDate.of(1990, 1, 1));
        employee.setIncremantDate("03-15");

        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(today);
        request.setCatchUpToCurrentYear(true);
        salaryIncrementService.recordIncrement(1L, request);

        assertNotNull(employee.getSalaryIncrementLastDueYear());

        salaryIncrementService.undoIncrement(1L);

        assertEquals(null, employee.getSalaryIncrementLastDueYear());
        assertEquals(null, employee.getSalaryIncrementDoneDate());
    }

    @Test
    void caughtUpThroughPriorYearShowsNextDueNotCompleted() {
        LocalDate today = LocalDate.now();
        LocalDate incrementDueThisYear = LocalDate.of(today.getYear(), 9, 9);
        if (!today.isBefore(incrementDueThisYear)) {
            return;
        }

        employee.setIncremantDate("09-09");
        employee.setSalaryIncrementLastDueYear(today.getYear() - 1);
        employee.setSalaryIncrementDoneDate(today);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertEquals(0, status.getOverdueYears());
        assertFalse(status.isCanRecordNow());
        assertNotEquals("Completed for this year", status.getStatusLabel());
        assertTrue(status.getStatusLabel().startsWith("Next due"));
    }

    @Test
    void resolveDueDateParsesMonthDay() {
        LocalDate due = salaryIncrementService.resolveDueDate("07-15", 2026);

        assertEquals(LocalDate.of(2026, 7, 15), due);
    }

    private String formatMonthDay(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("MM-dd"));
    }

    private LocalDate resolveDueDate(int year) {
        return salaryIncrementService.resolveDueDate("03-15", year);
    }
}
