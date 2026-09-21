package com.nwpengdep.hrms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;

import jakarta.persistence.EntityManager;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SalaryIncrementRecordRepositoryTest {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private SalaryIncrementRecordRepository recordRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsQueriesAndVersionsYearlyRecords() {
        Employee employee = employeeRepository.saveAndFlush(Employee.builder()
                .employeeNo("SIR-001")
                .fullName("Ledger Employee")
                .nic("911111111V")
                .grade(Grade.III)
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .dateOfFirstAppointment(LocalDate.of(2023, 1, 1))
                .build());

        UUID firstOperation = UUID.randomUUID();
        UUID catchUpOperation = UUID.randomUUID();

        recordRepository.saveAndFlush(record(
                employee,
                2023,
                LocalDate.of(2023, 3, 20),
                firstOperation,
                SalaryIncrementOperationType.SINGLE,
                SalaryIncrementRecordStatus.RECORDED
        ));
        recordRepository.saveAndFlush(record(
                employee,
                2024,
                LocalDate.of(2024, 3, 18),
                catchUpOperation,
                SalaryIncrementOperationType.CATCH_UP,
                SalaryIncrementRecordStatus.RECORDED
        ));
        SalaryIncrementRecord year2025 = recordRepository.saveAndFlush(record(
                employee,
                2025,
                LocalDate.of(2025, 3, 21),
                catchUpOperation,
                SalaryIncrementOperationType.CATCH_UP,
                SalaryIncrementRecordStatus.RECORDED
        ));

        entityManager.clear();

        List<SalaryIncrementRecord> active =
                recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                        employee.getId(),
                        SalaryIncrementRecordStatus.RECORDED
                );
        assertEquals(3, active.size());
        assertEquals(List.of(2023, 2024, 2025), active.stream()
                .map(SalaryIncrementRecord::getDueYear)
                .toList());

        List<SalaryIncrementRecord> catchUp =
                recordRepository.findByEmployeeIdAndOperationIdAndRecordStatus(
                        employee.getId(),
                        catchUpOperation,
                        SalaryIncrementRecordStatus.RECORDED
                );
        assertEquals(2, catchUp.size());

        year2025.setRecordStatus(SalaryIncrementRecordStatus.REVERSED);
        year2025.setReversedAt(LocalDateTime.of(2025, 6, 1, 10, 0));
        recordRepository.saveAndFlush(year2025);
        entityManager.clear();

        List<SalaryIncrementRecord> history =
                recordRepository.findByEmployeeIdOrderByRecordedAtDescIdDesc(employee.getId());
        assertEquals(3, history.size());
        assertTrue(history.stream().anyMatch(record ->
                record.getDueYear() == 2025
                        && record.getRecordStatus() == SalaryIncrementRecordStatus.REVERSED));
        assertEquals(2, recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                employee.getId(),
                SalaryIncrementRecordStatus.RECORDED
        ).size());

        SalaryIncrementRecord managed = recordRepository.findById(active.get(0).getId())
                .orElseThrow();
        Long previousVersion = managed.getVersion();
        managed.setUpdatedBy("tester");
        recordRepository.saveAndFlush(managed);
        entityManager.clear();
        SalaryIncrementRecord reloaded = recordRepository.findById(managed.getId())
                .orElseThrow();
        assertTrue(reloaded.getVersion() > previousVersion);

        entityManager.detach(reloaded);
        reloaded.setVersion(0L);
        reloaded.setUpdatedBy("stale");
        assertThrows(
                ObjectOptimisticLockingFailureException.class,
                () -> recordRepository.saveAndFlush(reloaded)
        );
    }

    private SalaryIncrementRecord record(
            Employee employee,
            int year,
            LocalDate doneDate,
            UUID operationId,
            SalaryIncrementOperationType type,
            SalaryIncrementRecordStatus status
    ) {
        return SalaryIncrementRecord.builder()
                .employee(employee)
                .dueYear(year)
                .dueDate(LocalDate.of(year, 3, 15))
                .doneDate(doneDate)
                .operationId(operationId)
                .operationType(type)
                .recordStatus(status)
                .recordedAt(doneDate.atStartOfDay())
                .recordedBy("tester")
                .legacyImported(false)
                .build();
    }
}
