package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.dto.SalaryIncrementWatchDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeBenefits;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SalaryIncrementService {

    public static final int UPCOMING_WINDOW_DAYS = 30;
    public static final int CATCH_UP_MIN_OVERDUE_YEARS = 2;
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_UPCOMING = "UPCOMING";

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public SalaryIncrementStatusDto getStatus(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return buildStatus(employee);
    }

    @Transactional
    public SalaryIncrementStatusDto recordIncrement(
            Long employeeId,
            SalaryIncrementRecordRequest request
    ) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        validateActiveEligibleEmployee(employee);

        SalaryIncrementStatusDto status = buildStatus(employee);
        if (!status.isApplicable()) {
            throw new IllegalArgumentException(
                    "Salary increment tracking does not apply to this employee"
            );
        }

        if (!status.isCanRecordNow()) {
            throw new IllegalArgumentException(
                    "Salary increment is not yet due"
            );
        }

        EmployeeBenefits benefits = employee.ensureBenefits();

        benefits.setSalaryIncrementPriorDueYear(benefits.getSalaryIncrementLastDueYear());

        if (request.isCatchUpToCurrentYear()) {
            if (!status.isCanCatchUpToCurrentYear()) {
                throw new IllegalArgumentException(
                        "Catch-up is only available when multiple years are overdue"
                );
            }

            validateCatchUpDate(request.getDoneDate(), status);
            benefits.setSalaryIncrementLastDueYear(status.getCatchUpTargetYear());
        } else {
            validateRecordDate(request.getDoneDate(), status);
            benefits.setSalaryIncrementLastDueYear(status.getNextDueYear());
        }

        benefits.setSalaryIncrementDoneDate(request.getDoneDate());
        employeeRepository.save(employee);

        return buildStatus(employee);
    }

    @Transactional
    public SalaryIncrementStatusDto updateIncrement(
            Long employeeId,
            SalaryIncrementRecordRequest request
    ) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        validateActiveEligibleEmployee(employee);

        if (employee.getSalaryIncrementLastDueYear() == null) {
            throw new IllegalArgumentException(
                    "No salary increment record to update"
            );
        }

        validateEditDate(request.getDoneDate(), employee);

        employee.ensureBenefits().setSalaryIncrementDoneDate(request.getDoneDate());
        employeeRepository.save(employee);

        return buildStatus(employee);
    }

    @Transactional
    public SalaryIncrementStatusDto undoIncrement(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        validateActiveEligibleEmployee(employee);

        EmployeeBenefits benefits = employee.ensureBenefits();
        Integer lastDueYear = benefits.getSalaryIncrementLastDueYear();
        if (lastDueYear == null) {
            throw new IllegalArgumentException(
                    "No salary increment record to undo"
            );
        }

        Integer restoreYear = benefits.getSalaryIncrementPriorDueYear();
        benefits.setSalaryIncrementLastDueYear(restoreYear);
        benefits.setSalaryIncrementPriorDueYear(
                restoreYear == null
                        ? null
                        : resolvePreviousDueYear(employee, restoreYear)
        );
        benefits.setSalaryIncrementDoneDate(null);
        employeeRepository.save(employee);

        return buildStatus(employee);
    }

    @Transactional(readOnly = true)
    public List<SalaryIncrementWatchDto> getPendingIncrements(List<Employee> employees) {
        LocalDate today = LocalDate.now();
        return employees.stream()
                .map(employee -> toWatchDto(employee, today))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(dto -> STATUS_PENDING.equals(dto.getStatus()))
                .sorted(Comparator
                        .comparing(SalaryIncrementWatchDto::getDueDate)
                        .thenComparing(SalaryIncrementWatchDto::getEmployeeName))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SalaryIncrementWatchDto> getUpcomingIncrements(List<Employee> employees) {
        LocalDate today = LocalDate.now();
        return employees.stream()
                .map(employee -> toWatchDto(employee, today))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(dto -> STATUS_UPCOMING.equals(dto.getStatus()))
                .sorted(Comparator
                        .comparing(SalaryIncrementWatchDto::getDueDate)
                        .thenComparing(SalaryIncrementWatchDto::getEmployeeName))
                .toList();
    }

    private Optional<SalaryIncrementWatchDto> toWatchDto(Employee employee, LocalDate today) {
        if (!isEligibleEmployee(employee)) {
            return Optional.empty();
        }

        Optional<NextDue> nextDue = resolveNextDue(employee, today);
        if (nextDue.isEmpty()) {
            return Optional.empty();
        }

        String dashboardStatus = classifyDashboardStatus(nextDue.get().dueDate(), today);
        if (dashboardStatus == null) {
            return Optional.empty();
        }

        int overdueYears = countOverdueYears(employee, today);

        return Optional.of(SalaryIncrementWatchDto.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .designation(employee.getDesignation() != null
                        ? employee.getDesignation().getDesignationName()
                        : "Unknown")
                .incrementDate(employee.getIncremantDate())
                .dueDate(nextDue.get().dueDate())
                .dueYear(nextDue.get().year())
                .overdueYears(overdueYears)
                .status(dashboardStatus)
                .build());
    }

    private SalaryIncrementStatusDto buildStatus(Employee employee) {
        if (!isEligibleEmployee(employee)) {
            return SalaryIncrementStatusDto.builder()
                    .applicable(false)
                    .canRecordNow(false)
                    .overdueYears(0)
                    .build();
        }

        LocalDate today = LocalDate.now();
        Optional<NextDue> nextDue = resolveNextDue(employee, today);

        if (nextDue.isEmpty()) {
            return SalaryIncrementStatusDto.builder()
                    .applicable(false)
                    .canRecordNow(false)
                    .overdueYears(0)
                    .message("Increment schedule could not be determined")
                    .build();
        }

        NextDue due = nextDue.get();
        int overdueYears = countOverdueYears(employee, today);
        boolean canRecordNow = !due.dueDate().isAfter(today);
        String dashboardStatus = classifyDashboardStatus(due.dueDate(), today);
        String statusLabel = resolveStatusLabel(
                dashboardStatus,
                overdueYears,
                canRecordNow,
                due.dueDate(),
                today
        );
        Optional<CatchUpTarget> catchUpTarget = resolveCatchUpTarget(employee, today);
        boolean canCatchUp = canRecordNow
                && overdueYears >= CATCH_UP_MIN_OVERDUE_YEARS
                && catchUpTarget.isPresent();

        return SalaryIncrementStatusDto.builder()
                .applicable(true)
                .incrementDate(employee.getIncremantDate())
                .nextDueDate(due.dueDate())
                .nextDueYear(due.year())
                .overdueYears(overdueYears)
                .canRecordNow(canRecordNow)
                .lastDueYear(employee.getSalaryIncrementLastDueYear())
                .lastDoneDate(employee.getSalaryIncrementDoneDate())
                .priorDueYear(employee.getSalaryIncrementPriorDueYear())
                .canCatchUpToCurrentYear(canCatchUp)
                .catchUpTargetYear(catchUpTarget.map(CatchUpTarget::year).orElse(null))
                .catchUpTargetDueDate(catchUpTarget.map(CatchUpTarget::dueDate).orElse(null))
                .catchUpYearsCount(canCatchUp ? overdueYears : 0)
                .statusLabel(statusLabel)
                .build();
    }

    private String resolveStatusLabel(
            String dashboardStatus,
            int overdueYears,
            boolean canRecordNow,
            LocalDate nextDueDate,
            LocalDate today
    ) {
        if (STATUS_PENDING.equals(dashboardStatus)) {
            if (overdueYears > 1) {
                return overdueYears + " years overdue";
            }
            if (overdueYears == 1) {
                return "Pending";
            }
            return canRecordNow ? "Due today" : "Pending";
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

    private void validateActiveEligibleEmployee(Employee employee) {
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Only active employees can record salary increments"
            );
        }

        if (!isEligibleEmployee(employee)) {
            throw new IllegalArgumentException(
                    "Salary increment tracking does not apply to this employee"
            );
        }
    }

    private void validateRecordDate(LocalDate doneDate, SalaryIncrementStatusDto status) {
        LocalDate today = LocalDate.now();

        if (doneDate.isAfter(today)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be in the future"
            );
        }

        if (status.getNextDueDate() != null && doneDate.isBefore(status.getNextDueDate())) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be before the due date"
            );
        }
    }

    private void validateCatchUpDate(LocalDate doneDate, SalaryIncrementStatusDto status) {
        LocalDate today = LocalDate.now();

        if (doneDate.isAfter(today)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be in the future"
            );
        }

        if (status.getCatchUpTargetDueDate() != null
                && doneDate.isBefore(status.getCatchUpTargetDueDate())) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be before the due date"
            );
        }
    }

    private void validateEditDate(LocalDate doneDate, Employee employee) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = resolveDueDate(
                employee.getIncremantDate(),
                employee.getSalaryIncrementLastDueYear()
        );

        if (dueDate == null) {
            throw new IllegalArgumentException(
                    "Increment due date could not be determined"
            );
        }

        if (doneDate.isAfter(today)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be in the future"
            );
        }

        if (doneDate.isBefore(dueDate)) {
            throw new IllegalArgumentException(
                    "Increment done date cannot be before the due date"
            );
        }
    }

    private Integer resolvePreviousDueYear(Employee employee, int lastDueYear) {
        LocalDate firstAppt = employee.getDateOfFirstAppointment();
        if (firstAppt == null) {
            return null;
        }

        List<Integer> eligibleYears = new ArrayList<>();
        for (int year = firstAppt.getYear(); year < lastDueYear; year++) {
            LocalDate due = resolveDueDate(employee.getIncremantDate(), year);
            if (due != null && !due.isBefore(firstAppt)) {
                eligibleYears.add(year);
            }
        }

        if (eligibleYears.isEmpty()) {
            return null;
        }

        return eligibleYears.get(eligibleYears.size() - 1);
    }

    private boolean isEligibleEmployee(Employee employee) {
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            return false;
        }

        if (employee.getEmploymentType() == EmploymentType.CONTRACT) {
            return false;
        }

        String incremantDate = employee.getIncremantDate();
        if (incremantDate == null || incremantDate.isBlank()) {
            return false;
        }

        return employee.getDateOfFirstAppointment() != null
                && resolveDueDate(incremantDate, employee.getDateOfFirstAppointment().getYear()) != null;
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

    private int countOverdueYears(Employee employee, LocalDate today) {
        LocalDate firstAppt = employee.getDateOfFirstAppointment();
        if (firstAppt == null) {
            return 0;
        }

        int lastDueYear = employee.getSalaryIncrementLastDueYear() != null
                ? employee.getSalaryIncrementLastDueYear()
                : 0;
        int overdue = 0;

        for (int year = today.getYear(); year >= firstAppt.getYear(); year--) {
            LocalDate due = resolveDueDate(employee.getIncremantDate(), year);
            if (due == null || due.isBefore(firstAppt)) {
                continue;
            }
            if (due.isAfter(today)) {
                continue;
            }
            if (year > lastDueYear) {
                overdue++;
            } else {
                break;
            }
        }

        return overdue;
    }

    private Optional<NextDue> resolveNextDue(Employee employee, LocalDate today) {
        LocalDate firstAppt = employee.getDateOfFirstAppointment();
        if (firstAppt == null) {
            return Optional.empty();
        }

        int lastDueYear = employee.getSalaryIncrementLastDueYear() != null
                ? employee.getSalaryIncrementLastDueYear()
                : 0;

        for (int year = firstAppt.getYear(); year <= today.getYear(); year++) {
            LocalDate due = resolveDueDate(employee.getIncremantDate(), year);
            if (due == null || due.isBefore(firstAppt)) {
                continue;
            }
            if (due.isAfter(today)) {
                continue;
            }
            if (year > lastDueYear) {
                return Optional.of(new NextDue(year, due));
            }
        }

        int nextYear = lastDueYear > 0 ? lastDueYear + 1 : firstAppt.getYear();
        if (lastDueYear == 0) {
            LocalDate firstDue = resolveDueDate(
                    employee.getIncremantDate(),
                    firstAppt.getYear()
            );
            if (firstDue != null && today.isBefore(firstDue)) {
                nextYear = firstAppt.getYear();
            } else {
                nextYear = today.getYear() + 1;
            }
        }

        LocalDate nextDue = resolveDueDate(employee.getIncremantDate(), nextYear);
        if (nextDue == null) {
            return Optional.empty();
        }

        return Optional.of(new NextDue(nextYear, nextDue));
    }

    private Optional<CatchUpTarget> resolveCatchUpTarget(Employee employee, LocalDate today) {
        LocalDate firstAppt = employee.getDateOfFirstAppointment();
        if (firstAppt == null) {
            return Optional.empty();
        }

        Integer targetYear = null;
        LocalDate targetDueDate = null;

        for (int year = firstAppt.getYear(); year <= today.getYear(); year++) {
            LocalDate due = resolveDueDate(employee.getIncremantDate(), year);
            if (due == null || due.isBefore(firstAppt) || due.isAfter(today)) {
                continue;
            }
            targetYear = year;
            targetDueDate = due;
        }

        if (targetYear == null || targetDueDate == null) {
            return Optional.empty();
        }

        return Optional.of(new CatchUpTarget(targetYear, targetDueDate));
    }

    LocalDate resolveDueDate(String incremantDate, int year) {
        if (incremantDate == null || incremantDate.isBlank()) {
            return null;
        }

        if (!incremantDate.matches("\\d{2}-\\d{2}")) {
            return null;
        }

        try {
            MonthDay monthDay = MonthDay.parse("--" + incremantDate);
            return monthDay.atYear(year);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private record NextDue(int year, LocalDate dueDate) {
    }

    private record CatchUpTarget(int year, LocalDate dueDate) {
    }
}
