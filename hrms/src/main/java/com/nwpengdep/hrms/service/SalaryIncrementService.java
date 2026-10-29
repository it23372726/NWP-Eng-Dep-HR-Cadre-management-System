package com.nwpengdep.hrms.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.SalaryIncrementHistoryItemDto;
import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.dto.SalaryIncrementWatchDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeBenefits;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;
import com.nwpengdep.hrms.exception.ConflictException;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SalaryIncrementService {

    public static final int UPCOMING_WINDOW_DAYS = 30;
    public static final int CATCH_UP_MIN_OVERDUE_YEARS = 2;
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_UPCOMING = "UPCOMING";

    private final EmployeeRepository employeeRepository;
    private final SalaryIncrementRecordRepository recordRepository;
    private final CurrentUserService currentUserService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public SalaryIncrementStatusDto getStatus(Long employeeId) {
        return getStatus(employeeId, null);
    }

    @Transactional(readOnly = true)
    public SalaryIncrementStatusDto getStatus(Long employeeId, String appointmentKey) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return buildStatus(scheduleView(employee, appointmentKey), activeRecords(employeeId));
    }

    @Transactional(readOnly = true)
    public List<SalaryIncrementHistoryItemDto> getHistory(Long employeeId) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new RuntimeException("Employee not found");
        }
        return toHistory(allRecords(employeeId));
    }

    @Transactional
    public SalaryIncrementStatusDto recordIncrement(
            Long employeeId,
            SalaryIncrementRecordRequest request
    ) {
        Employee owner = lockEmployee(employeeId);
        Employee employee = scheduleView(owner, request.getServiceAppointmentKey());
        validateActiveEligibleEmployee(employee);

        List<SalaryIncrementRecord> active = scopedRecords(employee, activeRecords(employeeId));
        SalaryIncrementStatusDto status = buildStatus(employee, active);
        if (!status.isApplicable()) {
            throw new IllegalArgumentException(
                    "Salary increment tracking does not apply to this employee"
            );
        }
        if (!status.isCanRecordNow()) {
            throw new IllegalArgumentException("Salary increment is not yet due");
        }

        assertExpectedOperation(request.getExpectedLastOperationId(), latestOperation(active));

        LocalDate today = today();
        validateNotFuture(request.getDoneDate(), today);

        List<Integer> years;
        SalaryIncrementOperationType operationType;
        if (request.isCatchUpToCurrentYear() || request.getCatchUpThroughYear() != null) {
            if (!status.isCanCatchUpToCurrentYear()) {
                throw new IllegalArgumentException(
                        "Catch-up is only available when multiple years are overdue"
                );
            }
            int targetYear = request.getCatchUpThroughYear() != null ? request.getCatchUpThroughYear() : status.getCatchUpTargetYear();
            if (targetYear < status.getNextDueYear() || targetYear > status.getCatchUpTargetYear()) {
                throw new IllegalArgumentException("Catch-up year must be between the next overdue year and the latest due year");
            }
            years = missingYearsThrough(
                    employee,
                    active,
                    targetYear,
                    today
            );
            if (years.isEmpty()) {
                throw new IllegalArgumentException(
                        "Catch-up is only available when multiple years are overdue"
                );
            }
            validateDoneDateNotBefore(request.getDoneDate(), SalaryIncrementSchedule.resolveDueDate(employee.getIncremantDate(), targetYear));
            operationType = SalaryIncrementOperationType.CATCH_UP;
        } else {
            years = List.of(status.getNextDueYear());
            validateDoneDateNotBefore(request.getDoneDate(), status.getNextDueDate());
            operationType = SalaryIncrementOperationType.SINGLE;
        }

        UUID operationId = UUID.randomUUID();
        LocalDateTime recordedAt = now();
        String recordedBy = currentUsername();
        List<SalaryIncrementRecord> created = new ArrayList<>();

        for (Integer year : years) {
            if (active.stream().anyMatch(r -> year.equals(r.getDueYear()))
                    || (employee.getCurrentServiceAppointmentKey() == null
                        && recordRepository.existsByEmployeeIdAndDueYearAndRecordStatus(employeeId, year, SalaryIncrementRecordStatus.RECORDED))) {
                throw new ConflictException(
                        "An active salary increment already exists for " + year
                );
            }

            created.add(SalaryIncrementRecord.builder()
                    .employee(owner)
                    .dueYear(year)
                    .serviceAppointmentKey(ServiceAppointmentService.INITIAL.equals(employee.getCurrentServiceAppointmentKey())
                            ? null : employee.getCurrentServiceAppointmentKey())
                    .dueDate(SalaryIncrementSchedule.resolveDueDate(
                            employee.getIncremantDate(),
                            year
                    ))
                    .doneDate(request.getDoneDate())
                    .operationId(operationId)
                    .operationType(operationType)
                    .recordStatus(SalaryIncrementRecordStatus.RECORDED)
                    .recordedAt(recordedAt)
                    .recordedBy(recordedBy)
                    .updatedAt(recordedAt)
                    .updatedBy(recordedBy)
                    .legacyImported(false)
                    .build());
        }

        try {
            recordRepository.saveAll(created);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    "An active salary increment already exists for one of the selected years"
            );
        }

        List<SalaryIncrementRecord> nextActive = new ArrayList<>(active);
        nextActive.addAll(created);
        saveCurrentSnapshot(owner, employee, nextActive);

        return buildStatus(employee, nextActive);
    }

    @Transactional
    public SalaryIncrementStatusDto updateIncrement(
            Long employeeId,
            SalaryIncrementRecordRequest request
    ) {
        Employee owner = lockEmployee(employeeId);
        Employee employee = scheduleView(owner, request.getServiceAppointmentKey());
        validateActiveEligibleEmployee(employee);

        List<SalaryIncrementRecord> active = scopedRecords(employee, activeRecords(employeeId));
        List<SalaryIncrementRecord> latest = latestOperationRecords(active);
        if (latest.isEmpty()) {
            throw new IllegalArgumentException("No salary increment record to update");
        }

        assertExpectedOperation(request.getExpectedLastOperationId(), latest.get(0));
        validateNotFuture(request.getDoneDate(), today());

        LocalDate latestDueDate = latest.stream()
                .map(SalaryIncrementRecord::getDueDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
        validateDoneDateNotBefore(request.getDoneDate(), latestDueDate);

        LocalDateTime updatedAt = now();
        String updatedBy = currentUsername();
        for (SalaryIncrementRecord record : latest) {
            record.setDoneDate(request.getDoneDate());
            record.setUpdatedAt(updatedAt);
            record.setUpdatedBy(updatedBy);
        }

        try {
            recordRepository.saveAll(latest);
        } catch (OptimisticLockingFailureException ex) {
            throw new ConflictException(
                    "A newer salary increment change was saved. Refresh and try again."
            );
        }

        saveCurrentSnapshot(owner, employee, active);
        return buildStatus(employee, active);
    }

    @Transactional
    public SalaryIncrementStatusDto undoIncrement(Long employeeId, UUID expectedLastOperationId) {
        return undoIncrement(employeeId, expectedLastOperationId, null);
    }

    @Transactional
    public SalaryIncrementStatusDto undoIncrement(Long employeeId, UUID expectedLastOperationId, String appointmentKey) {
        Employee owner = lockEmployee(employeeId);
        Employee employee = scheduleView(owner, appointmentKey);
        validateActiveEligibleEmployee(employee);

        List<SalaryIncrementRecord> active = scopedRecords(employee, activeRecords(employeeId));
        List<SalaryIncrementRecord> latest = latestOperationRecords(active);
        if (latest.isEmpty()) {
            throw new IllegalArgumentException("No salary increment record to undo");
        }

        assertExpectedOperation(expectedLastOperationId, latest.get(0));

        LocalDateTime reversedAt = now();
        String reversedBy = currentUsername();
        UUID operationId = latest.get(0).getOperationId();

        for (SalaryIncrementRecord record : latest) {
            record.setRecordStatus(SalaryIncrementRecordStatus.REVERSED);
            record.setReversedAt(reversedAt);
            record.setReversedBy(reversedBy);
            record.setUpdatedAt(reversedAt);
            record.setUpdatedBy(reversedBy);
        }

        try {
            recordRepository.saveAll(latest);
        } catch (OptimisticLockingFailureException ex) {
            throw new ConflictException(
                    "A newer salary increment change was saved. Refresh and try again."
            );
        }

        UUID remainingOperation = operationId;
        List<SalaryIncrementRecord> remaining = active.stream()
                .filter(record -> !remainingOperation.equals(record.getOperationId()))
                .toList();
        saveCurrentSnapshot(owner, employee, remaining);
        SalaryIncrementStatusDto status = buildStatus(employee, remaining);
        status.setReversedOperationId(operationId);
        return status;
    }

    @Transactional(readOnly = true)
    public List<SalaryIncrementWatchDto> getPendingIncrements(List<Employee> employees) {
        return watchDtos(employees, STATUS_PENDING);
    }

    @Transactional(readOnly = true)
    public List<SalaryIncrementWatchDto> getUpcomingIncrements(List<Employee> employees) {
        return watchDtos(employees, STATUS_UPCOMING);
    }

    LocalDate resolveDueDate(String incremantDate, int year) {
        return SalaryIncrementSchedule.resolveDueDate(incremantDate, year);
    }

    private List<SalaryIncrementWatchDto> watchDtos(List<Employee> employees, String status) {
        LocalDate today = today();
        Map<Long, List<SalaryIncrementRecord>> byEmployee = loadActiveByEmployee(employees);
        return employees.stream()
                .map(employee -> toWatchDto(
                        employee,
                        today,
                        byEmployee.getOrDefault(employee.getId(), List.of())
                ))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(dto -> status.equals(dto.getStatus()))
                .sorted(Comparator
                        .comparing(SalaryIncrementWatchDto::getDueDate)
                        .thenComparing(SalaryIncrementWatchDto::getEmployeeName))
                .toList();
    }

    private Map<Long, List<SalaryIncrementRecord>> loadActiveByEmployee(
            List<Employee> employees
    ) {
        List<Long> ids = employees.stream()
                .map(Employee::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }

        Map<Long, List<SalaryIncrementRecord>> byEmployee = new HashMap<>();
        for (SalaryIncrementRecord record : recordRepository.findByEmployeeIdInAndRecordStatus(
                ids,
                SalaryIncrementRecordStatus.RECORDED
        )) {
            Long employeeId = record.getEmployee().getId();
            byEmployee.computeIfAbsent(employeeId, key -> new ArrayList<>()).add(record);
        }
        return byEmployee;
    }

    private Optional<SalaryIncrementWatchDto> toWatchDto(
            Employee employee,
            LocalDate today,
            List<SalaryIncrementRecord> active
    ) {
        if (!SalaryIncrementSchedule.isEligibleEmployee(employee)) {
            return Optional.empty();
        }

        active = scopedRecords(employee, active);
        Optional<NextDue> nextDue = resolveNextDue(employee, active, today);
        if (nextDue.isEmpty()) {
            return Optional.empty();
        }

        String dashboardStatus = classifyDashboardStatus(nextDue.get().dueDate(), today);
        if (dashboardStatus == null) {
            return Optional.empty();
        }

        return Optional.of(SalaryIncrementWatchDto.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .designation(employee.getDesignation() != null
                        ? employee.getDesignation().getDesignationName()
                        : "Unknown")
                .incrementDate(employee.getIncremantDate())
                .dueDate(nextDue.get().dueDate())
                .dueYear(nextDue.get().year())
                .overdueYears(countOverdueYears(employee, active, today))
                .status(dashboardStatus)
                .build());
    }

    private SalaryIncrementStatusDto buildStatus(
            Employee employee,
            List<SalaryIncrementRecord> active
    ) {
        active = scopedRecords(employee, active);
        if (!SalaryIncrementSchedule.isEligibleEmployee(employee)) {
            return SalaryIncrementStatusDto.builder()
                    .applicable(false)
                    .canRecordNow(false)
                    .overdueYears(0)
                    .hasRecordedIncrement(false)
                    .canEdit(false)
                    .canUndo(false)
                    .build();
        }

        LocalDate today = today();
        Optional<NextDue> nextDue = resolveNextDue(employee, active, today);
        NextDue due = nextDue.orElse(null);
        int overdueYears = countOverdueYears(employee, active, today);
        boolean canRecordNow = due != null && !due.dueDate().isAfter(today);
        String dashboardStatus = due == null ? null : classifyDashboardStatus(due.dueDate(), today);
        Optional<CatchUpTarget> catchUpTarget = resolveCatchUpTarget(employee, today);
        boolean canCatchUp = canRecordNow && overdueYears >= CATCH_UP_MIN_OVERDUE_YEARS && catchUpTarget.isPresent();

        List<SalaryIncrementRecord> latest = latestOperationRecords(active);
        SalaryIncrementRecord lastCompleted = active.stream()
                .max(Comparator
                        .comparing(SalaryIncrementRecord::getDueYear)
                        .thenComparing(SalaryIncrementRecord::getRecordedAt)
                        .thenComparing(SalaryIncrementRecord::getId))
                .orElse(null);

        Integer priorDueYear = null;
        if (!latest.isEmpty()) {
            UUID latestOperationId = latest.get(0).getOperationId();
            priorDueYear = active.stream()
                    .filter(record -> !latestOperationId.equals(record.getOperationId()))
                    .map(SalaryIncrementRecord::getDueYear)
                    .max(Integer::compareTo)
                    .orElse(null);
        }

        Integer lastOperationFromYear = latest.stream()
                .map(SalaryIncrementRecord::getDueYear)
                .min(Integer::compareTo)
                .orElse(null);
        Integer lastOperationToYear = latest.stream()
                .map(SalaryIncrementRecord::getDueYear)
                .max(Integer::compareTo)
                .orElse(null);
        LocalDate lastOperationDueDate = latest.stream()
                .map(SalaryIncrementRecord::getDueDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);

        return SalaryIncrementStatusDto.builder()
                .applicable(due != null || employee.getIncrementScheduleEndDate() != null)
                .incrementDate(employee.getIncremantDate())
                .nextDueDate(due == null ? null : due.dueDate())
                .nextDueYear(due == null ? null : due.year())
                .overdueYears(overdueYears)
                .canRecordNow(canRecordNow)
                .lastDueYear(lastCompleted != null ? lastCompleted.getDueYear() : null)
                .lastDueDate(lastOperationDueDate)
                .lastDoneDate(lastCompleted != null ? lastCompleted.getDoneDate() : null)
                .priorDueYear(priorDueYear)
                .canCatchUpToCurrentYear(canCatchUp)
                .catchUpTargetYear(catchUpTarget.map(CatchUpTarget::year).orElse(null))
                .catchUpTargetDueDate(catchUpTarget.map(CatchUpTarget::dueDate).orElse(null))
                .catchUpYearsCount(canCatchUp ? overdueYears : 0)
                .statusLabel(due == null ? (employee.getIncrementScheduleEndDate() != null ? "Previous appointment schedule complete" : "Schedule unavailable") : resolveStatusLabel(
                        dashboardStatus,
                        overdueYears,
                        due.dueDate(),
                        today
                ))
                .hasRecordedIncrement(!active.isEmpty())
                .canEdit(!active.isEmpty())
                .canUndo(!active.isEmpty())
                .lastOperationId(latest.isEmpty() ? null : latest.get(0).getOperationId())
                .lastOperationType(latest.isEmpty() ? null : latest.get(0).getOperationType())
                .lastOperationFromYear(lastOperationFromYear)
                .lastOperationToYear(lastOperationToYear)
                .lastOperationRecordCount(latest.size())
                .build();
    }

    void syncSnapshot(Employee employee, List<SalaryIncrementRecord> active) {
        active = scopedRecords(employee, active);
        EmployeeBenefits benefits = employee.ensureBenefits();
        if (active == null || active.isEmpty()) {
            benefits.setSalaryIncrementLastDueYear(null);
            benefits.setSalaryIncrementPriorDueYear(null);
            benefits.setSalaryIncrementDoneDate(null);
            return;
        }

        SalaryIncrementRecord lastCompleted = active.stream()
                .max(Comparator
                        .comparing(SalaryIncrementRecord::getDueYear)
                        .thenComparing(SalaryIncrementRecord::getRecordedAt)
                        .thenComparing(SalaryIncrementRecord::getId))
                .orElseThrow();
        List<SalaryIncrementRecord> latest = latestOperationRecords(active);
        UUID latestOperationId = latest.get(0).getOperationId();
        Integer priorDueYear = active.stream()
                .filter(record -> !latestOperationId.equals(record.getOperationId()))
                .map(SalaryIncrementRecord::getDueYear)
                .max(Integer::compareTo)
                .orElse(null);

        benefits.setSalaryIncrementLastDueYear(lastCompleted.getDueYear());
        benefits.setSalaryIncrementDoneDate(lastCompleted.getDoneDate());
        benefits.setSalaryIncrementPriorDueYear(priorDueYear);
    }

    private List<SalaryIncrementHistoryItemDto> toHistory(
            List<SalaryIncrementRecord> records
    ) {
        if (records == null || records.isEmpty()) {
            return List.of();
        }

        Map<UUID, LocalDateTime> operationTime = records.stream()
                .collect(Collectors.toMap(
                        SalaryIncrementRecord::getOperationId,
                        SalaryIncrementRecord::getRecordedAt,
                        (left, right) -> left.isAfter(right) ? left : right
                ));

        return records.stream()
                .sorted(Comparator
                        .comparing((SalaryIncrementRecord record) ->
                                operationTime.get(record.getOperationId()),
                                Comparator.reverseOrder())
                        .thenComparing(SalaryIncrementRecord::getDueYear, Comparator.reverseOrder())
                        .thenComparing(SalaryIncrementRecord::getId, Comparator.reverseOrder()))
                .map(record -> SalaryIncrementHistoryItemDto.builder()
                        .id(record.getId())
                        .operationId(record.getOperationId())
                        .operationType(record.getOperationType())
                        .serviceAppointmentKey(record.getServiceAppointmentKey())
                        .dueYear(record.getDueYear())
                        .dueDate(record.getDueDate())
                        .doneDate(record.getDoneDate())
                        .status(record.getRecordStatus())
                        .recordedAt(record.getRecordedAt())
                        .recordedBy(record.getRecordedBy())
                        .updatedAt(record.getUpdatedAt())
                        .updatedBy(record.getUpdatedBy())
                        .reversedAt(record.getReversedAt())
                        .reversedBy(record.getReversedBy())
                        .legacyImported(record.isLegacyImported())
                        .build())
                .toList();
    }

    private String resolveStatusLabel(
            String dashboardStatus,
            int overdueYears,
            LocalDate nextDueDate,
            LocalDate today
    ) {
        if (STATUS_PENDING.equals(dashboardStatus)) {
            if (nextDueDate != null && nextDueDate.isEqual(today)) {
                return "Due today";
            }

            if (nextDueDate != null && nextDueDate.isBefore(today)) {
                if (overdueYears == 1) {
                    return "1 year overdue";
                }
                if (overdueYears > 1) {
                    return overdueYears + " years overdue";
                }
            }

            return "Pending";
        }

        if (STATUS_UPCOMING.equals(dashboardStatus)) {
            return "Upcoming";
        }

        if (nextDueDate.isAfter(today)) {
            if (nextDueDate.getYear() > today.getYear()) {
                return "Completed for this year";
            }
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(
                    "d MMM yyyy",
                    Locale.ENGLISH
            );
            return "Next due " + nextDueDate.format(formatter);
        }

        return "Pending";
    }

    private Employee lockEmployee(Long employeeId) {
        return employeeRepository.findByIdForUpdate(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    private void validateActiveEligibleEmployee(Employee employee) {
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Only active employees can record salary increments"
            );
        }
        if (!SalaryIncrementSchedule.isEligibleEmployee(employee)) {
            throw new IllegalArgumentException(
                    "Salary increment tracking does not apply to this employee"
            );
        }
    }

    private void validateNotFuture(LocalDate doneDate, LocalDate today) {
        if (doneDate == null) {
            throw new IllegalArgumentException("Increment done date is required");
        }
        if (doneDate.isAfter(today)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be in the future"
            );
        }
    }

    private void validateDoneDateNotBefore(LocalDate doneDate, LocalDate dueDate) {
        if (dueDate != null && doneDate.isBefore(dueDate)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be before the due date"
            );
        }
    }

    private void assertExpectedOperation(
            UUID expectedLastOperationId,
            SalaryIncrementRecord latest
    ) {
        if (expectedLastOperationId == null) {
            return;
        }
        UUID actual = latest == null ? null : latest.getOperationId();
        if (!expectedLastOperationId.equals(actual)) {
            throw new ConflictException(
                    "A newer salary increment operation was recorded. Refresh and try again."
            );
        }
    }

    private SalaryIncrementRecord latestOperation(List<SalaryIncrementRecord> active) {
        List<SalaryIncrementRecord> latest = latestOperationRecords(active);
        return latest.isEmpty() ? null : latest.get(0);
    }

    private List<SalaryIncrementRecord> latestOperationRecords(
            List<SalaryIncrementRecord> active
    ) {
        if (active == null || active.isEmpty()) {
            return List.of();
        }
        SalaryIncrementRecord latest = active.stream()
                .max(Comparator
                        .comparing(SalaryIncrementRecord::getRecordedAt)
                        .thenComparing(SalaryIncrementRecord::getId))
                .orElseThrow();
        UUID operationId = latest.getOperationId();
        return active.stream()
                .filter(record -> operationId.equals(record.getOperationId()))
                .sorted(Comparator.comparing(SalaryIncrementRecord::getDueYear))
                .toList();
    }

    private Employee scheduleView(Employee owner, String appointmentKey) {
        if (appointmentKey == null || appointmentKey.isBlank()
                || appointmentKey.equals(owner.getCurrentServiceAppointmentKey())) return owner;
        var period = owner.getServiceAppointments().stream()
                .filter(p -> !p.isSuperseded() && appointmentKey.equals(p.getAppointmentKey())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Service appointment not found for this employee"));
        Employee view = Employee.builder().id(owner.getId()).status(owner.getStatus()).employmentType(owner.getEmploymentType())
                .dateOfFirstAppointment(period.getStartDate()).firstIncrementDueDate(period.getFirstIncrementDueDate())
                .currentServiceAppointmentKey(period.getAppointmentKey()).incrementScheduleEndDate(period.getEndDate()).build();
        view.setIncremantDate(period.getIncrementDate());
        return view;
    }

    private void saveCurrentSnapshot(Employee owner, Employee schedule, List<SalaryIncrementRecord> records) {
        if (owner == schedule) {
            syncSnapshot(owner, records); employeeRepository.save(owner);
        }
    }

    private List<SalaryIncrementRecord> scopedRecords(Employee employee, List<SalaryIncrementRecord> records) {
        String key = employee.getCurrentServiceAppointmentKey();
        String scope = key == null ? ServiceAppointmentService.INITIAL : key;
        return records.stream().filter(r -> scope.equals(r.getServiceAppointmentKey() == null
                ? ServiceAppointmentService.INITIAL : r.getServiceAppointmentKey())).toList();
    }

    private List<SalaryIncrementRecord> activeRecords(Long employeeId) {
        return recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                employeeId,
                SalaryIncrementRecordStatus.RECORDED
        );
    }

    private List<SalaryIncrementRecord> allRecords(Long employeeId) {
        return recordRepository.findByEmployeeIdOrderByRecordedAtDescIdDesc(employeeId);
    }

    private String classifyDashboardStatus(LocalDate nextDueDate, LocalDate today) {
        if (!nextDueDate.isAfter(today)) {
            return STATUS_PENDING;
        }
        if (!nextDueDate.isAfter(today.plusDays(UPCOMING_WINDOW_DAYS))) {
            return STATUS_UPCOMING;
        }
        return null;
    }

    private int countOverdueYears(
            Employee employee,
            List<SalaryIncrementRecord> active,
            LocalDate today
    ) {
        return missingYearsThrough(employee, active, today.getYear(), today).size();
    }

    private List<Integer> missingYearsThrough(
            Employee employee,
            List<SalaryIncrementRecord> active,
            int endYear,
            LocalDate today
    ) {
        Set<Integer> completed = completedYears(active);
        LocalDate firstAppt = SalaryIncrementSchedule.firstDueBoundary(employee);
        List<Integer> missing = new ArrayList<>();
        for (int year : SalaryIncrementSchedule.eligibleYearsThrough(employee, endYear)) {
            LocalDate due = SalaryIncrementSchedule.resolveDueDate(
                    employee.getIncremantDate(),
                    year
            );
            if (due == null || due.isAfter(today) || due.isBefore(firstAppt)) {
                continue;
            }
            if (!completed.contains(year)) {
                missing.add(year);
            }
        }
        return missing;
    }

    private Optional<NextDue> resolveNextDue(
            Employee employee,
            List<SalaryIncrementRecord> active,
            LocalDate today
    ) {
        LocalDate firstAppt = SalaryIncrementSchedule.firstDueBoundary(employee);
        if (firstAppt == null) {
            return Optional.empty();
        }

        Set<Integer> completed = completedYears(active);
        String incrementDate = employee.getIncremantDate();

        for (int year = firstAppt.getYear(); year <= Math.max(firstAppt.getYear(), today.getYear() + 1); year++) {
            LocalDate due = SalaryIncrementSchedule.resolveDueDate(incrementDate, year);
            if (!SalaryIncrementSchedule.isEligibleDueDate(employee, due, firstAppt)) {
                continue;
            }
            if (completed.contains(year)) {
                continue;
            }
            return Optional.of(new NextDue(year, due));
        }

        return Optional.empty();
    }

    private Optional<CatchUpTarget> resolveCatchUpTarget(Employee employee, LocalDate today) {
        LocalDate firstAppt = SalaryIncrementSchedule.firstDueBoundary(employee);
        if (firstAppt == null) {
            return Optional.empty();
        }

        Integer targetYear = null;
        LocalDate targetDueDate = null;
        for (int year = firstAppt.getYear(); year <= today.getYear(); year++) {
            LocalDate due = SalaryIncrementSchedule.resolveDueDate(
                    employee.getIncremantDate(),
                    year
            );
            if (!SalaryIncrementSchedule.isEligibleDueDate(employee, due, firstAppt) || due.isAfter(today)) {
                continue;
            }
            targetYear = year;
            targetDueDate = due;
        }

        if (targetYear == null) {
            return Optional.empty();
        }
        return Optional.of(new CatchUpTarget(targetYear, targetDueDate));
    }

    private Set<Integer> completedYears(List<SalaryIncrementRecord> active) {
        if (active == null || active.isEmpty()) {
            return Set.of();
        }
        Set<Integer> years = new HashSet<>();
        for (SalaryIncrementRecord record : active) {
            years.add(record.getDueYear());
        }
        return years;
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    private String currentUsername() {
        return currentUserService.getCurrentUsernameOrDefault("system");
    }

    private record NextDue(int year, LocalDate dueDate) {
    }

    private record CatchUpTarget(int year, LocalDate dueDate) {
    }
}
