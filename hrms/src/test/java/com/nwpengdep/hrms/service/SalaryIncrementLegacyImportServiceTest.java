package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;

class SalaryIncrementLegacyImportServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private SalaryIncrementRecordRepository recordRepository;

    @Mock
    private CurrentUserService currentUserService;

    private final List<SalaryIncrementRecord> store = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(1);
    private SalaryIncrementLegacyImportService importService;
    private Employee employee;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        Clock clock = Clock.fixed(
                LocalDate.of(2025, 6, 1).atStartOfDay(ZoneId.systemDefault()).toInstant(),
                ZoneId.systemDefault()
        );
        SalaryIncrementService salaryIncrementService = new SalaryIncrementService(
                employeeRepository,
                recordRepository,
                currentUserService,
                clock
        );
        importService = new SalaryIncrementLegacyImportService(
                employeeRepository,
                recordRepository,
                salaryIncrementService
        );

        employee = Employee.builder()
                .id(9L)
                .fullName("Legacy Person")
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .dateOfFirstAppointment(LocalDate.of(2021, 1, 1))
                .build();
        employee.setIncremantDate("03-15");

        when(recordRepository.saveAll(any())).thenAnswer(invocation -> {
            Iterable<SalaryIncrementRecord> records = invocation.getArgument(0);
            List<SalaryIncrementRecord> saved = new ArrayList<>();
            records.forEach(record -> {
                if (record.getId() == null) {
                    record.setId(ids.getAndIncrement());
                }
                store.add(record);
                saved.add(record);
            });
            return saved;
        });
        when(recordRepository.existsByLegacyImportKey(any())).thenAnswer(invocation ->
                store.stream().anyMatch(record ->
                        invocation.getArgument(0).equals(record.getLegacyImportKey()))
        );
        when(recordRepository.existsByEmployeeIdAndDueYearAndRecordStatus(any(), any(), any()))
                .thenAnswer(invocation -> store.stream().anyMatch(record ->
                        invocation.getArgument(0).equals(record.getEmployee().getId())
                                && invocation.getArgument(1).equals(record.getDueYear())
                                && record.getRecordStatus() == invocation.getArgument(2)));
        when(recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(any(), any()))
                .thenAnswer(invocation -> store.stream()
                        .filter(record -> record.getRecordStatus()
                                == SalaryIncrementRecordStatus.RECORDED)
                        .toList());
        when(employeeRepository.save(any(Employee.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeRepository.findAll()).thenReturn(List.of(employee));
    }

    @Test
    void backfillsLastAndPriorYearWithoutInventingUnknownDates() {
        employee.setSalaryIncrementLastDueYear(2024);
        employee.setSalaryIncrementPriorDueYear(2022);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2024, 3, 18));

        importService.importLegacySnapshots();

        assertEquals(4, store.size());
        assertTrue(store.stream().allMatch(SalaryIncrementRecord::isLegacyImported));
        assertTrue(store.stream().allMatch(record ->
                record.getOperationType() == SalaryIncrementOperationType.LEGACY_IMPORT));
        assertNull(doneDate(2021));
        assertNull(doneDate(2022));
        assertNull(doneDate(2023));
        assertEquals(LocalDate.of(2024, 3, 18), doneDate(2024));
        long operations = store.stream()
                .map(SalaryIncrementRecord::getOperationId)
                .distinct()
                .count();
        assertEquals(2, operations);
    }

    @Test
    void lastDueYearWithNullDoneDateRemainsRecoverable() {
        employee.setSalaryIncrementLastDueYear(2023);
        employee.setSalaryIncrementPriorDueYear(null);
        employee.setSalaryIncrementDoneDate(null);

        importService.importLegacySnapshots();

        assertEquals(3, store.size());
        assertTrue(store.stream().allMatch(record -> record.getDoneDate() == null));
        assertEquals(2023, employee.getSalaryIncrementLastDueYear());
        assertNull(employee.getSalaryIncrementDoneDate());
    }

    @Test
    void repeatedImportCreatesNoDuplicates() {
        employee.setSalaryIncrementLastDueYear(2023);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2023, 3, 20));

        importService.importLegacySnapshots();
        int first = store.size();
        importService.importLegacySnapshots();

        assertEquals(first, store.size());
        verify(employeeRepository, never()).delete(any());
    }

    @Test
    void unreconstructableYearIsPreservedWithoutFabricatingDueDate() {
        employee.setIncremantDate("invalid");
        employee.setSalaryIncrementLastDueYear(2024);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2024, 3, 18));

        SalaryIncrementLegacyImportService.ImportEmployeeResult result =
                importService.importEmployee(employee, 2024);

        assertEquals(1, result.imported());
        assertEquals(1, result.unreconstructable());
        assertEquals(1, store.size());
        assertEquals(2024, store.get(0).getDueYear());
        assertNull(store.get(0).getDueDate());
        assertEquals(LocalDate.of(2024, 3, 18), store.get(0).getDoneDate());
    }

    private LocalDate doneDate(int year) {
        return store.stream()
                .filter(record -> record.getDueYear() == year)
                .findFirst()
                .orElseThrow()
                .getDoneDate();
    }
}
