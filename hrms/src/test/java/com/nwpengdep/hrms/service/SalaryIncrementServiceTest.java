package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.nwpengdep.hrms.dto.SalaryIncrementHistoryItemDto;
import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.dto.SalaryIncrementWatchDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;
import com.nwpengdep.hrms.exception.ConflictException;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;

class SalaryIncrementServiceTest {

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final LocalDate TODAY = LocalDate.of(2025, 6, 1);

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private SalaryIncrementRecordRepository recordRepository;

    @Mock
    private CurrentUserService currentUserService;

    private final List<SalaryIncrementRecord> store = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(1);

    private SalaryIncrementService salaryIncrementService;
    private Employee employee;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        Clock clock = Clock.fixed(TODAY.atStartOfDay(ZONE).toInstant(), ZONE);
        salaryIncrementService = new SalaryIncrementService(
                employeeRepository,
                recordRepository,
                currentUserService,
                clock
        );

        employee = Employee.builder()
                .id(1L)
                .fullName("Test Employee")
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .dateOfFirstAppointment(LocalDate.of(2023, 1, 1))
                .designation(Designation.builder().designationName("Engineer").build())
                .build();
        employee.setIncremantDate("03-15");

        lenient().when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        lenient().when(employeeRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(employee));
        lenient().when(employeeRepository.existsById(1L)).thenReturn(true);
        lenient().when(employeeRepository.save(any(Employee.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(currentUserService.getCurrentUsernameOrDefault(anyString()))
                .thenReturn("tester");

        lenient().when(recordRepository.save(any(SalaryIncrementRecord.class)))
                .thenAnswer(invocation -> persist(invocation.getArgument(0)));
        lenient().when(recordRepository.saveAll(any()))
                .thenAnswer(invocation -> {
                    Iterable<SalaryIncrementRecord> records = invocation.getArgument(0);
                    List<SalaryIncrementRecord> saved = new ArrayList<>();
                    records.forEach(record -> saved.add(persist(record)));
                    return saved;
                });
        lenient().when(recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                any(),
                any()
        )).thenAnswer(invocation -> {
            Long employeeId = invocation.getArgument(0);
            SalaryIncrementRecordStatus status = invocation.getArgument(1);
            return store.stream()
                    .filter(record -> employeeId.equals(record.getEmployee().getId()))
                    .filter(record -> record.getRecordStatus() == status)
                    .sorted((left, right) -> {
                        int year = Integer.compare(left.getDueYear(), right.getDueYear());
                        return year != 0 ? year : Long.compare(left.getId(), right.getId());
                    })
                    .toList();
        });
        lenient().when(recordRepository.findByEmployeeIdOrderByRecordedAtDescIdDesc(any()))
                .thenAnswer(invocation -> {
                    Long employeeId = invocation.getArgument(0);
                    return store.stream()
                            .filter(record -> employeeId.equals(record.getEmployee().getId()))
                            .sorted((left, right) -> {
                                int recorded = right.getRecordedAt()
                                        .compareTo(left.getRecordedAt());
                                return recorded != 0
                                        ? recorded
                                        : Long.compare(right.getId(), left.getId());
                            })
                            .toList();
                });
        lenient().when(recordRepository.existsByEmployeeIdAndDueYearAndRecordStatus(
                any(),
                any(),
                any()
        )).thenAnswer(invocation -> {
            Long employeeId = invocation.getArgument(0);
            Integer year = invocation.getArgument(1);
            SalaryIncrementRecordStatus status = invocation.getArgument(2);
            return store.stream().anyMatch(record ->
                    employeeId.equals(record.getEmployee().getId())
                            && year.equals(record.getDueYear())
                            && record.getRecordStatus() == status);
        });
        lenient().when(recordRepository.findByEmployeeIdInAndRecordStatus(any(), any()))
                .thenAnswer(invocation -> {
                    Collection<Long> ids = invocation.getArgument(0);
                    SalaryIncrementRecordStatus status = invocation.getArgument(1);
                    return store.stream()
                            .filter(record -> ids.contains(record.getEmployee().getId()))
                            .filter(record -> record.getRecordStatus() == status)
                            .toList();
                });
    }

    @Test
    void employeeWithoutIncrementDateIsNotApplicable() {
        employee.setIncremantDate(null);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isApplicable());
        assertFalse(status.isCanRecordNow());
        assertFalse(status.isHasRecordedIncrement());
    }

    @Test
    void contractEmployeeIsNotApplicable() {
        employee.setEmploymentType(EmploymentType.CONTRACT);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isApplicable());
    }

    @Test
    void inactiveEmployeeCannotRecord() {
        employee.setStatus(EmployeeStatus.INACTIVE);
        SalaryIncrementRecordRequest request = request(TODAY);

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request)
        );
    }

    @Test
    void pendingWhenDueDatePassedAndNeverRecorded() {
        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertTrue(status.isApplicable());
        assertTrue(status.isCanRecordNow());
        assertEquals(2023, status.getNextDueYear());
        assertEquals(3, status.getOverdueYears());
        assertEquals("3 years overdue", status.getStatusLabel());
    }

    @Test
    void oneOverdueIncrementUsesSingularOverdueLabel() {
        seedRecordedYear(2023, LocalDate.of(2023, 3, 20), SalaryIncrementOperationType.SINGLE);
        seedRecordedYear(2024, LocalDate.of(2024, 3, 18), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertEquals(1, status.getOverdueYears());
        assertTrue(status.isCanRecordNow());
        assertEquals(LocalDate.of(2025, 3, 15), status.getNextDueDate());
        assertEquals("1 year overdue", status.getStatusLabel());
    }

    @Test
    void incrementDueTodayUsesDueTodayLabel() {
        employee.setIncremantDate("06-01");
        seedRecordedYear(2023, LocalDate.of(2023, 6, 2), SalaryIncrementOperationType.SINGLE);
        seedRecordedYear(2024, LocalDate.of(2024, 6, 2), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertTrue(status.isCanRecordNow());
        assertEquals(TODAY, status.getNextDueDate());
        assertEquals("Due today", status.getStatusLabel());
    }

    @Test
    void multipleOverdueIncrementsUsePluralLabel() {
        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertEquals(3, status.getOverdueYears());
        assertTrue(status.isCanRecordNow());
        assertEquals("3 years overdue", status.getStatusLabel());
    }

    @Test
    void upcomingWhenDueDateWithinThirtyDays() {
        employee.setDateOfFirstAppointment(LocalDate.of(2024, 1, 1));
        employee.setIncremantDate("06-20");
        seedRecordedYear(2024, LocalDate.of(2024, 6, 21), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertTrue(status.isApplicable());
        assertFalse(status.isCanRecordNow());
        assertEquals("Upcoming", status.getStatusLabel());
        assertEquals(2025, status.getNextDueYear());
    }

    @Test
    void laterThisYearOutsideUpcomingWindowUsesNextDueLabel() {
        employee.setDateOfFirstAppointment(LocalDate.of(2025, 1, 1));
        employee.setIncremantDate("08-15");

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isCanRecordNow());
        assertEquals(0, status.getOverdueYears());
        assertEquals(LocalDate.of(2025, 8, 15), status.getNextDueDate());
        assertEquals("Next due 15 Aug 2025", status.getStatusLabel());
    }

    @Test
    void completedCurrentYearUsesCompletedLabel() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2025, 3, 21)));

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertFalse(status.isCanRecordNow());
        assertEquals(2026, status.getNextDueYear());
        assertEquals("Completed for this year", status.getStatusLabel());
    }

    @Test
    void cannotRecordBeforeDueDate() {
        employee.setDateOfFirstAppointment(LocalDate.of(2024, 1, 1));
        employee.setIncremantDate("06-20");
        seedRecordedYear(2024, LocalDate.of(2024, 6, 21), SalaryIncrementOperationType.SINGLE);

        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request(TODAY))
        );
    }

    @Test
    void recordingOneDueYearCreatesOneRecordedRow() {
        SalaryIncrementStatusDto status = salaryIncrementService.recordIncrement(
                1L,
                request(LocalDate.of(2023, 3, 20))
        );

        assertEquals(1, recorded().size());
        SalaryIncrementRecord row = recorded().get(0);
        assertEquals(2023, row.getDueYear());
        assertEquals(LocalDate.of(2023, 3, 15), row.getDueDate());
        assertEquals(LocalDate.of(2023, 3, 20), row.getDoneDate());
        assertEquals(SalaryIncrementRecordStatus.RECORDED, row.getRecordStatus());
        assertEquals(SalaryIncrementOperationType.SINGLE, row.getOperationType());
        assertEquals(2023, status.getLastDueYear());
        assertTrue(status.isHasRecordedIncrement());
        assertTrue(status.isCanEdit());
        assertTrue(status.isCanUndo());
    }

    @Test
    void recordingLaterYearPreservesEarlierDoneDate() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));
        SalaryIncrementStatusDto status = salaryIncrementService.recordIncrement(
                1L,
                request(LocalDate.of(2025, 3, 21))
        );

        assertEquals(3, recorded().size());
        assertEquals(LocalDate.of(2023, 3, 20), doneDateFor(2023));
        assertEquals(LocalDate.of(2024, 3, 18), doneDateFor(2024));
        assertEquals(LocalDate.of(2025, 3, 21), doneDateFor(2025));
        assertEquals(2025, status.getLastDueYear());
        assertEquals(LocalDate.of(2025, 3, 21), status.getLastDoneDate());
        assertEquals(SalaryIncrementOperationType.SINGLE, status.getLastOperationType());
        assertEquals(1, status.getLastOperationRecordCount());
    }

    @Test
    void undoLatestYearRestoresPreviousOriginalDoneDate() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2025, 3, 21)));

        SalaryIncrementStatusDto after2025 = salaryIncrementService.undoIncrement(1L, null);

        assertEquals(SalaryIncrementRecordStatus.REVERSED, statusFor(2025));
        assertEquals(SalaryIncrementRecordStatus.RECORDED, statusFor(2024));
        assertEquals(LocalDate.of(2024, 3, 18), doneDateFor(2024));
        assertEquals(LocalDate.of(2025, 3, 21), doneDateFor(2025));
        assertEquals(2024, after2025.getLastDueYear());
        assertEquals(LocalDate.of(2024, 3, 18), after2025.getLastDoneDate());
        assertTrue(after2025.isCanEdit());
        assertTrue(after2025.isCanUndo());
        assertEquals(2025, after2025.getNextDueYear());
        assertEquals(2024, employee.getSalaryIncrementLastDueYear());
        assertEquals(LocalDate.of(2024, 3, 18), employee.getSalaryIncrementDoneDate());

        SalaryIncrementStatusDto after2024 = salaryIncrementService.undoIncrement(1L, null);

        assertEquals(SalaryIncrementRecordStatus.REVERSED, statusFor(2024));
        assertEquals(SalaryIncrementRecordStatus.RECORDED, statusFor(2023));
        assertEquals(LocalDate.of(2023, 3, 20), after2024.getLastDoneDate());
        assertEquals(2023, after2024.getLastDueYear());
        assertEquals(2024, after2024.getNextDueYear());
    }

    @Test
    void getStatusUsesActiveRecordsWhileGetHistoryIncludesReversed() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2025, 3, 21)));
        SalaryIncrementStatusDto afterUndo = salaryIncrementService.undoIncrement(1L, null);
        assertNotNull(afterUndo.getReversedOperationId());

        clearInvocations(recordRepository);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);
        assertEquals(2024, status.getLastDueYear());
        assertEquals(LocalDate.of(2024, 3, 18), status.getLastDoneDate());
        assertTrue(status.isCanEdit());
        assertTrue(status.isCanUndo());
        assertEquals(2025, status.getNextDueYear());
        assertNull(status.getReversedOperationId());
        verify(recordRepository).findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                1L,
                SalaryIncrementRecordStatus.RECORDED
        );
        verify(recordRepository, never()).findByEmployeeIdOrderByRecordedAtDescIdDesc(any());

        List<SalaryIncrementHistoryItemDto> history = salaryIncrementService.getHistory(1L);
        assertEquals(3, history.size());
        assertEquals(
                1,
                history.stream()
                        .filter(item -> item.getDueYear() == 2025
                                && item.getStatus() == SalaryIncrementRecordStatus.REVERSED)
                        .count()
        );
        assertEquals(
                1,
                history.stream()
                        .filter(item -> item.getDueYear() == 2024
                                && item.getStatus() == SalaryIncrementRecordStatus.RECORDED)
                        .count()
        );
    }

    @Test
    void catchUpCreatesOneRowPerMissingYearWithSharedOperationId() {
        employee.setDateOfFirstAppointment(LocalDate.of(2021, 1, 1));
        seedRecordedYear(2021, LocalDate.of(2021, 3, 20), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementRecordRequest request = request(LocalDate.of(2025, 4, 1));
        request.setCatchUpToCurrentYear(true);
        SalaryIncrementStatusDto status = salaryIncrementService.recordIncrement(1L, request);

        List<SalaryIncrementRecord> catchUp = recorded().stream()
                .filter(record -> record.getDueYear() > 2021)
                .toList();
        assertEquals(4, catchUp.size());
        UUID operationId = catchUp.get(0).getOperationId();
        assertTrue(catchUp.stream().allMatch(record ->
                operationId.equals(record.getOperationId())
                        && record.getOperationType() == SalaryIncrementOperationType.CATCH_UP
                        && LocalDate.of(2025, 4, 1).equals(record.getDoneDate())));
        assertEquals(2022, catchUp.stream().mapToInt(SalaryIncrementRecord::getDueYear).min().orElseThrow());
        assertEquals(2025, catchUp.stream().mapToInt(SalaryIncrementRecord::getDueYear).max().orElseThrow());
        assertEquals(SalaryIncrementOperationType.CATCH_UP, status.getLastOperationType());
        assertEquals(4, status.getLastOperationRecordCount());
        assertEquals(2022, status.getLastOperationFromYear());
        assertEquals(2025, status.getLastOperationToYear());
    }

    @Test
    void undoCatchUpReversesOnlyThatBatch() {
        employee.setDateOfFirstAppointment(LocalDate.of(2021, 1, 1));
        seedRecordedYear(2021, LocalDate.of(2021, 3, 20), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementRecordRequest request = request(LocalDate.of(2025, 4, 1));
        request.setCatchUpToCurrentYear(true);
        salaryIncrementService.recordIncrement(1L, request);

        SalaryIncrementStatusDto status = salaryIncrementService.undoIncrement(1L, null);

        assertEquals(SalaryIncrementRecordStatus.RECORDED, statusFor(2021));
        assertEquals(LocalDate.of(2021, 3, 20), doneDateFor(2021));
        assertEquals(SalaryIncrementRecordStatus.REVERSED, statusFor(2022));
        assertEquals(SalaryIncrementRecordStatus.REVERSED, statusFor(2025));
        assertEquals(2021, status.getLastDueYear());
        assertEquals(LocalDate.of(2021, 3, 20), status.getLastDoneDate());
        assertEquals(2022, status.getNextDueYear());
        assertTrue(status.isCanUndo());
    }

    @Test
    void rerecordingReversedYearCreatesNewActiveRow() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        UUID firstOperation = recorded().get(0).getOperationId();
        salaryIncrementService.undoIncrement(1L, null);

        SalaryIncrementStatusDto status = salaryIncrementService.recordIncrement(
                1L,
                request(LocalDate.of(2023, 4, 1))
        );

        List<SalaryIncrementRecord> year2023 = store.stream()
                .filter(record -> record.getDueYear() == 2023)
                .toList();
        assertEquals(2, year2023.size());
        assertEquals(1, recorded().size());
        assertNotEquals(firstOperation, recorded().get(0).getOperationId());
        assertEquals(LocalDate.of(2023, 4, 1), status.getLastDoneDate());
        assertEquals(SalaryIncrementRecordStatus.REVERSED, statusForReversed(2023));
    }

    @Test
    void updateSingleChangesOnlyItsDoneDate() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));

        SalaryIncrementStatusDto status = salaryIncrementService.updateIncrement(
                1L,
                request(LocalDate.of(2024, 5, 1))
        );

        assertEquals(LocalDate.of(2023, 3, 20), doneDateFor(2023));
        assertEquals(LocalDate.of(2024, 5, 1), doneDateFor(2024));
        assertEquals(LocalDate.of(2024, 5, 1), status.getLastDoneDate());
        assertEquals(LocalDate.of(2023, 3, 15), recorded().stream()
                .filter(record -> record.getDueYear() == 2023)
                .findFirst()
                .orElseThrow()
                .getDueDate());
    }

    @Test
    void updateCatchUpChangesEveryRowInThatBatchOnly() {
        employee.setDateOfFirstAppointment(LocalDate.of(2021, 1, 1));
        seedRecordedYear(2021, LocalDate.of(2021, 3, 20), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementRecordRequest catchUp = request(LocalDate.of(2025, 4, 1));
        catchUp.setCatchUpToCurrentYear(true);
        salaryIncrementService.recordIncrement(1L, catchUp);

        salaryIncrementService.updateIncrement(1L, request(LocalDate.of(2025, 5, 10)));

        assertEquals(LocalDate.of(2021, 3, 20), doneDateFor(2021));
        assertEquals(LocalDate.of(2025, 5, 10), doneDateFor(2022));
        assertEquals(LocalDate.of(2025, 5, 10), doneDateFor(2025));
    }

    @Test
    void duplicateActiveYearIsRejected() {
        when(recordRepository.existsByEmployeeIdAndDueYearAndRecordStatus(
                any(),
                any(),
                any()
        )).thenReturn(true);

        assertThrows(
                ConflictException.class,
                () -> salaryIncrementService.recordIncrement(
                        1L,
                        request(LocalDate.of(2023, 3, 20))
                )
        );
    }

    @Test
    void doneDateBeforeDueDateIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(
                        1L,
                        request(LocalDate.of(2023, 3, 1))
                )
        );
    }

    @Test
    void futureDoneDateIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request(TODAY.plusDays(1)))
        );
    }

    @Test
    void undoWithoutActiveRecordIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.undoIncrement(1L, null)
        );
    }

    @Test
    void pendingWatchUsesLedgerRowsNotSnapshotWaterline() {
        seedRecordedYear(2023, LocalDate.of(2023, 3, 20), SalaryIncrementOperationType.SINGLE);
        seedRecordedYear(2025, LocalDate.of(2025, 3, 21), SalaryIncrementOperationType.SINGLE);

        List<SalaryIncrementWatchDto> pending = salaryIncrementService.getPendingIncrements(
                List.of(employee)
        );

        assertEquals(1, pending.size());
        assertEquals(2024, pending.get(0).getDueYear());
        assertEquals(1, pending.get(0).getOverdueYears());
    }

    @Test
    void missingYearGapIsNextDueNotHiddenByMaxYear() {
        seedRecordedYear(2023, LocalDate.of(2023, 3, 20), SalaryIncrementOperationType.SINGLE);
        seedRecordedYear(2025, LocalDate.of(2025, 3, 21), SalaryIncrementOperationType.SINGLE);

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);

        assertEquals(2024, status.getNextDueYear());
        assertEquals(2025, status.getLastDueYear());
        assertEquals(1, status.getOverdueYears());
        assertTrue(status.isCanRecordNow());
    }

    @Test
    void staleExpectedOperationIdIsRejected() {
        SalaryIncrementStatusDto recorded = salaryIncrementService.recordIncrement(
                1L,
                request(LocalDate.of(2023, 3, 20))
        );
        SalaryIncrementRecordRequest update = request(LocalDate.of(2023, 4, 1));
        update.setExpectedLastOperationId(UUID.randomUUID());

        assertThrows(
                ConflictException.class,
                () -> salaryIncrementService.updateIncrement(1L, update)
        );

        assertThrows(
                ConflictException.class,
                () -> salaryIncrementService.undoIncrement(
                        1L,
                        UUID.randomUUID()
                )
        );
        assertEquals(recorded.getLastOperationId(), recorded().get(0).getOperationId());
    }

    @Test
    void catchUpRejectedWhenOnlyOneYearOverdue() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2024, 3, 18)));

        SalaryIncrementStatusDto status = salaryIncrementService.getStatus(1L);
        assertEquals(1, status.getOverdueYears());
        assertFalse(status.isCanCatchUpToCurrentYear());

        SalaryIncrementRecordRequest request = request(TODAY);
        request.setCatchUpToCurrentYear(true);
        assertThrows(
                IllegalArgumentException.class,
                () -> salaryIncrementService.recordIncrement(1L, request)
        );
    }

    @Test
    void snapshotClearsWhenNoActiveRecordsRemain() {
        salaryIncrementService.recordIncrement(1L, request(LocalDate.of(2023, 3, 20)));
        salaryIncrementService.undoIncrement(1L, null);

        assertNull(employee.getSalaryIncrementLastDueYear());
        assertNull(employee.getSalaryIncrementDoneDate());
        assertNull(employee.getSalaryIncrementPriorDueYear());
        assertFalse(salaryIncrementService.getStatus(1L).isHasRecordedIncrement());
    }

    @Test
    void resolveDueDateParsesMonthDay() {
        LocalDate due = salaryIncrementService.resolveDueDate("07-15", 2026);

        assertEquals(LocalDate.of(2026, 7, 15), due);
    }

    private SalaryIncrementRecord persist(SalaryIncrementRecord record) {
        if (record.getId() == null) {
            record.setId(ids.getAndIncrement());
        }
        if (!store.contains(record)) {
            store.add(record);
        }
        if (record.getVersion() == null) {
            record.setVersion(0L);
        }
        return record;
    }

    private SalaryIncrementRecordRequest request(LocalDate doneDate) {
        SalaryIncrementRecordRequest request = new SalaryIncrementRecordRequest();
        request.setDoneDate(doneDate);
        return request;
    }

    private void seedRecordedYear(
            int year,
            LocalDate doneDate,
            SalaryIncrementOperationType type
    ) {
        store.add(SalaryIncrementRecord.builder()
                .id(ids.getAndIncrement())
                .employee(employee)
                .dueYear(year)
                .dueDate(LocalDate.of(year, 3, 15))
                .doneDate(doneDate)
                .operationId(UUID.randomUUID())
                .operationType(type)
                .recordStatus(SalaryIncrementRecordStatus.RECORDED)
                .recordedAt(doneDate.atStartOfDay())
                .recordedBy("tester")
                .version(0L)
                .build());
        salaryIncrementService.syncSnapshot(employee, recorded());
    }

    private List<SalaryIncrementRecord> recorded() {
        return store.stream()
                .filter(record -> record.getRecordStatus() == SalaryIncrementRecordStatus.RECORDED)
                .toList();
    }

    private LocalDate doneDateFor(int year) {
        return store.stream()
                .filter(record -> record.getDueYear() == year)
                .reduce((left, right) -> right)
                .orElseThrow()
                .getDoneDate();
    }

    private SalaryIncrementRecordStatus statusFor(int year) {
        return store.stream()
                .filter(record -> record.getDueYear() == year)
                .reduce((left, right) -> right)
                .orElseThrow()
                .getRecordStatus();
    }

    private SalaryIncrementRecordStatus statusForReversed(int year) {
        return store.stream()
                .filter(record -> record.getDueYear() == year)
                .filter(record -> record.getRecordStatus() == SalaryIncrementRecordStatus.REVERSED)
                .findFirst()
                .orElseThrow()
                .getRecordStatus();
    }
}
