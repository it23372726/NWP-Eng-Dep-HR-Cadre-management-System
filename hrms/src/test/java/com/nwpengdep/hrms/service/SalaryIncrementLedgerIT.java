package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SalaryIncrementLedgerIT {

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            ZoneId zone = ZoneId.systemDefault();
            return Clock.fixed(LocalDate.of(2025, 6, 1).atStartOfDay(zone).toInstant(), zone);
        }
    }

    @Autowired
    private SalaryIncrementService salaryIncrementService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private SalaryIncrementRecordRepository recordRepository;

    @Test
    void recordUndoAndHistoryPersistAcrossOperations() {
        Employee employee = employeeRepository.saveAndFlush(Employee.builder()
                .employeeNo("SIR-IT-001")
                .fullName("IT Ledger Employee")
                .nic("922222222V")
                .grade(Grade.III)
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .dateOfFirstAppointment(LocalDate.of(2023, 1, 1))
                .build());
        employee.setIncremantDate("03-15");
        employeeRepository.saveAndFlush(employee);

        salaryIncrementService.recordIncrement(employee.getId(), request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(employee.getId(), request(LocalDate.of(2024, 3, 18)));
        salaryIncrementService.recordIncrement(employee.getId(), request(LocalDate.of(2025, 3, 21)));

        SalaryIncrementStatusDto afterUndo = salaryIncrementService.undoIncrement(
                employee.getId(),
                null
        );

        assertEquals(2024, afterUndo.getLastDueYear());
        assertEquals(LocalDate.of(2024, 3, 18), afterUndo.getLastDoneDate());
        assertTrue(afterUndo.isCanUndo());
        assertEquals(3, salaryIncrementService.getHistory(employee.getId()).size());
        assertTrue(salaryIncrementService.getHistory(employee.getId()).stream().anyMatch(item ->
                item.getDueYear() == 2025
                        && item.getStatus() == SalaryIncrementRecordStatus.REVERSED));

        assertEquals(2, recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                employee.getId(),
                SalaryIncrementRecordStatus.RECORDED
        ).size());
        assertEquals(3, recordRepository.findByEmployeeIdOrderByRecordedAtDescIdDesc(
                employee.getId()
        ).size());

        SalaryIncrementStatusDto stale = salaryIncrementService.getStatus(employee.getId());
        UUID currentOperation = stale.getLastOperationId();
        SalaryIncrementStatusDto afterSecondUndo = salaryIncrementService.undoIncrement(
                employee.getId(),
                currentOperation
        );
        assertEquals(2023, afterSecondUndo.getLastDueYear());
        assertEquals(LocalDate.of(2023, 3, 20), afterSecondUndo.getLastDoneDate());
    }

    private SalaryIncrementRecordRequest request(LocalDate doneDate) {
        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(doneDate);
        return request;
    }
}
