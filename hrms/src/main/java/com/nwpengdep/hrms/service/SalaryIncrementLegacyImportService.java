package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryIncrementLegacyImportService {

    static final String LEGACY_RECORDED_BY = "legacy-import";
    static final LocalDateTime BASELINE_RECORDED_AT =
            LocalDateTime.of(2000, 1, 1, 0, 0, 0);
    static final LocalDateTime LATEST_RECORDED_AT =
            LocalDateTime.of(2000, 1, 1, 0, 0, 1);

    private final EmployeeRepository employeeRepository;
    private final SalaryIncrementRecordRepository recordRepository;
    private final SalaryIncrementService salaryIncrementService;

    public record ImportStats(
            int employeesScanned,
            int employeesImported,
            int yearsImported,
            int yearsSkipped,
            int unreconstructableYears
    ) {
    }

    @Transactional
    public ImportStats importLegacySnapshots() {
        int scanned = 0;
        int employeesImported = 0;
        int yearsImported = 0;
        int yearsSkipped = 0;
        int unreconstructable = 0;

        for (Employee employee : employeeRepository.findAll()) {
            // Appointment-aware employees already have a ledger; a current snapshot is not legacy evidence.
            if (employee.getCurrentServiceAppointmentKey() != null) continue;
            Integer lastDueYear = employee.getSalaryIncrementLastDueYear();
            if (lastDueYear == null) {
                continue;
            }
            scanned++;

            ImportEmployeeResult result = importEmployee(employee, lastDueYear);
            yearsImported += result.imported();
            yearsSkipped += result.skipped();
            unreconstructable += result.unreconstructable();
            if (result.imported() > 0) {
                employeesImported++;
            }
        }

        log.info(
                "Salary increment legacy import: scanned={}, importedEmployees={}, "
                        + "yearsImported={}, yearsSkipped={}, unreconstructableYears={}",
                scanned,
                employeesImported,
                yearsImported,
                yearsSkipped,
                unreconstructable
        );
        return new ImportStats(
                scanned,
                employeesImported,
                yearsImported,
                yearsSkipped,
                unreconstructable
        );
    }

    ImportEmployeeResult importEmployee(Employee employee, int lastDueYear) {
        Integer priorDueYear = employee.getSalaryIncrementPriorDueYear();
        LocalDate snapshotDoneDate = employee.getSalaryIncrementDoneDate();

        List<Integer> reconstructed = SalaryIncrementSchedule.eligibleYearsThrough(
                employee,
                lastDueYear
        );

        List<YearPlan> plans = new ArrayList<>();
        if (reconstructed.isEmpty()) {
            plans.add(new YearPlan(
                    lastDueYear,
                    null,
                    true,
                    snapshotDoneDate,
                    LATEST_RECORDED_AT
            ));
        } else if (priorDueYear != null && priorDueYear < lastDueYear) {
            for (Integer year : reconstructed) {
                LocalDate dueDate = SalaryIncrementSchedule.resolveDueDate(
                        employee.getIncremantDate(),
                        year
                );
                if (year <= priorDueYear) {
                    plans.add(new YearPlan(
                            year,
                            dueDate,
                            dueDate == null,
                            null,
                            BASELINE_RECORDED_AT
                    ));
                } else {
                    boolean latestYear = year == lastDueYear;
                    plans.add(new YearPlan(
                            year,
                            dueDate,
                            dueDate == null,
                            latestYear ? snapshotDoneDate : null,
                            LATEST_RECORDED_AT
                    ));
                }
            }
        } else {
            for (Integer year : reconstructed) {
                LocalDate dueDate = SalaryIncrementSchedule.resolveDueDate(
                        employee.getIncremantDate(),
                        year
                );
                boolean latestYear = year == lastDueYear;
                plans.add(new YearPlan(
                        year,
                        dueDate,
                        dueDate == null,
                        latestYear ? snapshotDoneDate : null,
                        LATEST_RECORDED_AT
                ));
            }
        }

        UUID baselineOperationId = UUID.randomUUID();
        UUID latestOperationId = UUID.randomUUID();
        int imported = 0;
        int skipped = 0;
        int unreconstructable = 0;
        List<SalaryIncrementRecord> created = new ArrayList<>();

        for (YearPlan plan : plans) {
            String importKey = legacyImportKey(employee.getId(), plan.dueYear());
            if (recordRepository.existsByLegacyImportKey(importKey)
                    || recordRepository.existsByEmployeeIdAndDueYearAndRecordStatus(
                            employee.getId(),
                            plan.dueYear(),
                            SalaryIncrementRecordStatus.RECORDED
                    )) {
                skipped++;
                continue;
            }

            boolean baseline = BASELINE_RECORDED_AT.equals(plan.recordedAt());
            created.add(SalaryIncrementRecord.builder()
                    .employee(employee)
                    .dueYear(plan.dueYear())
                    .dueDate(plan.dueDate())
                    .doneDate(plan.doneDate())
                    .operationId(baseline ? baselineOperationId : latestOperationId)
                    .operationType(SalaryIncrementOperationType.LEGACY_IMPORT)
                    .recordStatus(SalaryIncrementRecordStatus.RECORDED)
                    .recordedAt(plan.recordedAt())
                    .recordedBy(LEGACY_RECORDED_BY)
                    .updatedAt(plan.recordedAt())
                    .updatedBy(LEGACY_RECORDED_BY)
                    .legacyImported(true)
                    .legacyImportKey(importKey)
                    .build());

            if (plan.unreconstructable()) {
                unreconstructable++;
            }
            imported++;
        }

        if (!created.isEmpty()) {
            recordRepository.saveAll(created);
            List<SalaryIncrementRecord> active =
                    recordRepository.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                            employee.getId(),
                            SalaryIncrementRecordStatus.RECORDED
                    );
            salaryIncrementService.syncSnapshot(employee, active);
            employeeRepository.save(employee);
        }

        return new ImportEmployeeResult(imported, skipped, unreconstructable);
    }

    public static String legacyImportKey(Long employeeId, int dueYear) {
        return "legacy:" + employeeId + ":" + dueYear;
    }

    record ImportEmployeeResult(int imported, int skipped, int unreconstructable) {
    }

    private record YearPlan(
            int dueYear,
            LocalDate dueDate,
            boolean unreconstructable,
            LocalDate doneDate,
            LocalDateTime recordedAt
    ) {
    }
}
