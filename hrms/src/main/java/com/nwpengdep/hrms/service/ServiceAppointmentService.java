package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.repository.SalaryIncrementRecordRepository;
import lombok.RequiredArgsConstructor;

/** Appointment boundaries are lifecycle facts; the Employee fields are the current-period projection. */
@Service
@RequiredArgsConstructor
public class ServiceAppointmentService {
    public static final String INITIAL = "INITIAL";
    private final SalaryIncrementRecordRepository salaryRecords;
    private final SalaryIncrementService salaryIncrementService;
    private final com.nwpengdep.hrms.repository.ServiceTypeRepository serviceTypes;
    @Value("${hrms.service-appointments.enabled:false}")
    private boolean enabled;

    public boolean isEnabled() { return enabled; }

    public void requireEnabled() {
        if (!enabled) throw new IllegalArgumentException("Appointments to another service have not been enabled by the administrator");
    }

    public void populateCapability(Employee employee) {
        employee.setCanAppointToAnotherService(enabled
                && employee.getStatus() == EmployeeStatus.ACTIVE
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && !com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)
                && employee.getDateOfFirstAppointment() != null
                && (employee.getService() != null || employee.getDesignation() != null));
    }

    public static void validateSchedule(LocalDate start, String incrementDate, LocalDate firstDue, String basis) {
        if (start == null || start.isAfter(LocalDate.now()))
            throw new IllegalArgumentException("Appointment date is required and cannot be in the future");
        if (basis == null || basis.isBlank())
            throw new IllegalArgumentException("The examination or other basis for the appointment is required");
        if (basis.length() > 255)
            throw new IllegalArgumentException("The examination or basis must be at most 255 characters");
        if (firstDue == null || firstDue.isBefore(start)
                || !firstDue.equals(SalaryIncrementSchedule.resolveDueDate(incrementDate, firstDue.getYear())))
            throw new IllegalArgumentException("First increment due date must match the annual increment date and cannot precede the appointment");
    }

    public static String validKey(String key) {
        try { return UUID.fromString(key).toString(); }
        catch (RuntimeException ex) { throw new IllegalArgumentException("A valid service appointment reference is required"); }
    }

    public void begin(Employee employee) {
        if (employee.getServiceAppointments() == null) employee.setServiceAppointments(new ArrayList<>());
        if (employee.getServiceAppointments().isEmpty()) {
            EmployeeServiceAppointment initial = new EmployeeServiceAppointment();
            initial.setEmployee(employee);
            initial.setAppointmentKey(INITIAL);
            initial.setStartDate(employee.getDateOfFirstAppointment());
            initial.setIncrementDate(employee.getIncremantDate());
            initial.setFirstIncrementDueDate(employee.getFirstIncrementDueDate());
            setAssignment(initial, employee.getDesignation(), employee.getService(), employee.getServiceLevel() != null ? employee.getServiceLevel().getId() : null);
            if (initial.getEntryDesignationName() == null) initial.setEntryDesignationName(employee.getRecordedDesignationName());
            initial.setCurrentAppointment(true);
            employee.getServiceAppointments().add(initial);
            employee.setCurrentServiceAppointmentKey(INITIAL);
            employee.setOriginalFirstAppointmentDate(employee.getDateOfFirstAppointment());
        }
        captureCurrent(employee);
    }

    public void captureCurrent(Employee employee) {
        if (employee.getCurrentServiceAppointmentKey() == null || employee.getServiceAppointments() == null) return;
        employee.getServiceAppointments().stream()
                .filter(p -> p.getAppointmentKey().equals(employee.getCurrentServiceAppointmentKey()))
                .findFirst().ifPresent(p -> {
                    p.getRequirements().clear();
                    if (employee.getRequirements() != null) employee.getRequirements().forEach(r -> p.getRequirements().add(
                            ServiceAppointmentRequirement.builder().requirementType(r.getRequirementType())
                                    .requirementName(r.getRequirementName()).status(r.getStatus())
                                    .completedDate(r.getCompletedDate()).remarks(r.getRemarks()).build()));
                    EmployeeCareerProgression c = employee.getCareerProgression();
                    if (c != null) {
                        p.setPermanentConfirmationDate(c.getPermanentConfirmationDate());
                        p.setGrade2AchievedDate(c.getGrade2AchievedDate());
                        p.setGrade1AchievedDate(c.getGrade1AchievedDate());
                        p.setSupraAchievedDate(c.getSupraAchievedDate());
                        p.setSpecialAchievedDate(c.getSpecialAchievedDate());
                    }
                });
    }

    public boolean hasPeriods(Employee employee) {
        return employee.getServiceAppointments() != null && !employee.getServiceAppointments().isEmpty();
    }

    /** Rebuild metadata from the edited timeline without deleting archived requirement results. */
    public void rebuild(Employee employee, List<EmployeeAction> actions) {
        if (!hasPeriods(employee) && actions.stream().noneMatch(a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)) return;
        begin(employee);
        EmployeeServiceAppointment initialBaseline = employee.getServiceAppointments().stream()
                .filter(p -> INITIAL.equals(p.getAppointmentKey())).findFirst().orElseThrow();
        EmployeeServiceAppointment importedSnapshot = null;
        EmployeeAction first = actions.stream().filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT
                && !Boolean.TRUE.equals(a.getTrainingAppointment())).findFirst().orElse(null);
        if (employee.getServiceAppointments().size() == 1 && first != null
                && (actions.stream().anyMatch(a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT && Objects.equals(initialBaseline.getStartDate(), a.getActionDate()) && a.getNewDesignation() != null && Objects.equals(initialBaseline.getServiceId(), a.getNewDesignation().getService().getId()))
                || (first.getNewDesignation() != null && !Objects.equals(initialBaseline.getServiceId(), first.getNewDesignation().getService().getId())))) {
            importedSnapshot = archiveRequirements(employee, initialBaseline);
            initialBaseline.getRequirements().clear();
            initialBaseline.setIncrementDate(null);
            initialBaseline.setFirstIncrementDueDate(null);
        }
        Map<String, EmployeeServiceAppointment> periods = new LinkedHashMap<>();
        employee.getServiceAppointments().forEach(p -> { p.setCurrentAppointment(false); p.setSuperseded(true); periods.put(p.getAppointmentKey(), p); });
        EmployeeServiceAppointment current = periods.get(INITIAL);
        current.setSuperseded(false);
        current.setEndDate(null);
        clearAchievements(current);
        Set<String> seen = new HashSet<>();
        seen.add(INITIAL);
        boolean completedInitialProbation = false;
        for (EmployeeAction action : actions) {
            if (action.getActionType() == EmployeeActionType.NEW_APPOINTMENT && !Boolean.TRUE.equals(action.getTrainingAppointment())) {
                current.setStartDate(action.getActionDate());
                // A custom original designation carries no catalog service; the service recorded on the action
                // is the original one, while employee.getService() has already moved to the latest appointment.
                setAssignment(current, action.getNewDesignation(), recordedService(action), action.getServiceLevelId());
                if (action.getRecordedNewDesignationName() != null) current.setEntryDesignationName(action.getRecordedNewDesignationName());
            }
            if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT) {
                String key = validKey(action.getServiceAppointmentKey());
                if (!seen.add(key)) throw new IllegalArgumentException("A service appointment reference occurs more than once in the history");
                current.setEndDate(action.getActionDate());
                EmployeeServiceAppointment next = periods.get(key);
                if (next == null) {
                    next = new EmployeeServiceAppointment(); next.setEmployee(employee); next.setAppointmentKey(key);
                    employee.getServiceAppointments().add(next); periods.put(key, next);
                }
                Long targetService = action.getNewDesignation().getService().getId();
                if (next.getServiceId() != null && !next.getServiceId().equals(targetService)) {
                    archiveRequirements(employee, next);
                    next.getRequirements().clear();
                }
                next.setSuperseded(false); next.setEndDate(null); next.setStartDate(action.getActionDate());
                next.setProbationEndDate(action.getActionDate().plusYears(completedInitialProbation
                        ? ProbationPolicy.SUBSEQUENT_YEARS : ProbationPolicy.INITIAL_YEARS));
                setAssignment(next, action.getNewDesignation(), null, action.getServiceLevelId());
                next.setAppointmentBasis(action.getAppointmentBasis());
                next.setIncrementDate(action.getIncrementDate());
                next.setFirstIncrementDueDate(action.getFirstIncrementDueDate());
                if (importedSnapshot != null && Objects.equals(importedSnapshot.getServiceId(), targetService)
                        && Objects.equals(importedSnapshot.getStartDate(), action.getActionDate())) {
                    for (ServiceAppointmentRequirement r : importedSnapshot.getRequirements()) next.getRequirements().add(copyRequirement(r));
                }
                clearAchievements(next); current = next;
            }
            if (action.getActionType() == EmployeeActionType.PERMANENT_CONFIRMATION) {
                current.setPermanentConfirmationDate(action.getActionDate());
                completedInitialProbation |= ProbationPolicy.completedInitialProbation(current.getStartDate(), action.getActionDate());
            }
            if (action.getActionType() == EmployeeActionType.PROMOTION || action.getActionType() == EmployeeActionType.ASSIGNMENT_GRADE_UPDATE) {
                if (action.getOldGrade() == Grade.III && action.getNewGrade() == Grade.II) current.setGrade2AchievedDate(action.getActionDate());
                if (action.getOldGrade() == Grade.II && action.getNewGrade() == Grade.I) current.setGrade1AchievedDate(action.getActionDate());
                if (SupraPromotionPolicy.isEntryGrade(action.getOldGrade()) && action.getNewGrade() == Grade.SUPRA) current.setSupraAchievedDate(action.getActionDate());
                if (action.getOldGrade() == Grade.I && action.getNewGrade() == Grade.SPECIAL) current.setSpecialAchievedDate(action.getActionDate());
            }
        }
        current.setCurrentAppointment(true);
        employee.setCurrentServiceAppointmentKey(current.getAppointmentKey());
        employee.setOriginalFirstAppointmentDate(periods.get(INITIAL).getStartDate());
        employee.setDateOfFirstAppointment(current.getStartDate());
        employee.setIncremantDate(current.getIncrementDate());
        employee.setFirstIncrementDueDate(current.getFirstIncrementDueDate());
        salaryIncrementService.syncSnapshot(employee, salaryRecords.findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
                employee.getId(), SalaryIncrementRecordStatus.RECORDED));
        employee.getRequirements().clear();
        for (ServiceAppointmentRequirement r : current.getRequirements()) employee.getRequirements().add(
                EmployeeRequirement.builder().employee(employee).requirementType(r.getRequirementType())
                        .requirementName(r.getRequirementName()).status(r.getStatus())
                        .completedDate(r.getCompletedDate()).remarks(r.getRemarks()).build());
        discardOrphanedPeriods(employee, seen.size() > 1);
    }

    /**
     * Periods are a projection of the timeline. When an appointment is removed from lifecycle history
     * its period is no longer something the employee held, so it is deleted rather than left behind as
     * a phantom entry. Preserved requirement snapshots and periods a salary record still points at stay.
     */
    private void discardOrphanedPeriods(Employee employee, boolean hasAppointments) {
        Set<String> referencedByPayroll = salaryRecords.findByEmployeeIdOrderByRecordedAtDescIdDesc(employee.getId())
                .stream().map(SalaryIncrementRecord::getServiceAppointmentKey)
                .filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());

        if (!hasAppointments && referencedByPayroll.isEmpty()
                && employee.getServiceAppointments().stream().noneMatch(EmployeeServiceAppointment::isArchivedSnapshot)) {
            // Nothing refers to a service period any more: restore the plain single-service projection.
            employee.getServiceAppointments().clear();
            employee.setCurrentServiceAppointmentKey(null);
            employee.setOriginalFirstAppointmentDate(null);
            return;
        }

        employee.getServiceAppointments().removeIf(p -> p.isSuperseded()
                && !p.isArchivedSnapshot()
                && !INITIAL.equals(p.getAppointmentKey())
                && !referencedByPayroll.contains(p.getAppointmentKey()));
    }

    private EmployeeServiceAppointment archiveRequirements(Employee employee, EmployeeServiceAppointment source) {
        EmployeeServiceAppointment archive = new EmployeeServiceAppointment();
        archive.setEmployee(employee); archive.setAppointmentKey(UUID.randomUUID().toString());
        archive.setServiceId(source.getServiceId()); archive.setServiceCode(source.getServiceCode());
        archive.setEntryDesignationName(source.getEntryDesignationName()); archive.setStartDate(source.getStartDate());
        archive.setEndDate(source.getEndDate()); archive.setSuperseded(true); archive.setArchivedSnapshot(true);
        archive.setEntryDesignationId(source.getEntryDesignationId()); archive.setServiceLevelId(source.getServiceLevelId());
        archive.setProbationEndDate(source.getProbationEndDate()); archive.setPermanentConfirmationDate(source.getPermanentConfirmationDate());
        archive.setGrade2AchievedDate(source.getGrade2AchievedDate()); archive.setGrade1AchievedDate(source.getGrade1AchievedDate());
        archive.setSupraAchievedDate(source.getSupraAchievedDate()); archive.setSpecialAchievedDate(source.getSpecialAchievedDate());
        archive.setIncrementDate(source.getIncrementDate()); archive.setFirstIncrementDueDate(source.getFirstIncrementDueDate());
        archive.setAppointmentBasis(source.getAppointmentBasis() == null ? "Preserved before lifecycle revision" : source.getAppointmentBasis());
        source.getRequirements().forEach(r -> archive.getRequirements().add(ServiceAppointmentRequirement.builder()
                .requirementType(r.getRequirementType()).requirementName(r.getRequirementName()).status(r.getStatus())
                .completedDate(r.getCompletedDate()).remarks(r.getRemarks()).build()));
        employee.getServiceAppointments().add(archive);
        return archive;
    }

    private ServiceAppointmentRequirement copyRequirement(ServiceAppointmentRequirement r) {
        return ServiceAppointmentRequirement.builder().requirementType(r.getRequirementType()).requirementName(r.getRequirementName())
                .status(r.getStatus()).completedDate(r.getCompletedDate()).remarks(r.getRemarks()).build();
    }

    /** Null keeps whatever the period already stores, which legacy actions without a service id rely on. */
    private ServiceType recordedService(EmployeeAction action) {
        return action.getServiceId() == null ? null : serviceTypes.findById(action.getServiceId()).orElse(null);
    }

    private void setAssignment(EmployeeServiceAppointment period, Designation designation, ServiceType fallback, Long level) {
        ServiceType service = designation != null ? designation.getService() : fallback;
        if (service != null) { period.setServiceId(service.getId()); period.setServiceCode(service.getServiceCode()); }
        if (designation != null) {
            period.setEntryDesignationId(designation.getId()); period.setEntryDesignationName(designation.getDesignationName());
            if (level == null && designation.getServiceLevel() != null) level = designation.getServiceLevel().getId();
        }
        if (level != null) period.setServiceLevelId(level);
    }

    private void clearAchievements(EmployeeServiceAppointment period) {
        period.setPermanentConfirmationDate(null); period.setGrade2AchievedDate(null); period.setGrade1AchievedDate(null);
        period.setSupraAchievedDate(null); period.setSpecialAchievedDate(null);
    }

    /**
     * Only increments that are still active can block a lifecycle change. A reversed increment was
     * undone, so it no longer asserts that the employee was paid inside that period; its row stays in
     * the ledger as an audit record either way. Counting reversals here would leave no correction path.
     */
    public void validateHistoryRevision(Employee employee, List<CareerHistoryEventRequest> events) {
        List<SalaryIncrementRecord> records = salaryRecords.findByEmployeeIdOrderByRecordedAtDescIdDesc(employee.getId())
                .stream().filter(r -> r.getRecordStatus() == SalaryIncrementRecordStatus.RECORDED).toList();
        if (records.isEmpty()) return;
        Map<String, CareerHistoryEventRequest> appointments = new HashMap<>();
        for (CareerHistoryEventRequest e : events) if (e.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)
            appointments.put(validKey(e.getServiceAppointmentKey()), e);
        if (!hasPeriods(employee)) {
            LocalDate earliest = events.stream().filter(e -> e.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)
                    .map(CareerHistoryEventRequest::getActionDate).min(LocalDate::compareTo).orElse(null);
            if (earliest != null) requireNoOverlap(records, earliest, "the previous service");
            return;
        }
        List<CareerHistoryEventRequest> ordered = events.stream().filter(e -> e.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT).toList();
        String previousKey = INITIAL;
        for (CareerHistoryEventRequest e : ordered) {
            final String scope = previousKey;
            requireNoOverlap(records.stream().filter(r -> scope.equals(r.getServiceAppointmentKey() == null
                    ? INITIAL : r.getServiceAppointmentKey())).toList(), e.getActionDate(), "the previous appointment");
            previousKey = e.getServiceAppointmentKey();
        }
        for (EmployeeServiceAppointment p : employee.getServiceAppointments()) {
            if (INITIAL.equals(p.getAppointmentKey()) || p.isSuperseded()) continue;
            List<SalaryIncrementRecord> owned = records.stream()
                    .filter(r -> p.getAppointmentKey().equals(r.getServiceAppointmentKey())).toList();
            if (owned.isEmpty()) continue;
            CareerHistoryEventRequest e = appointments.get(p.getAppointmentKey());
            if (e == null || !Objects.equals(e.getActionDate(), p.getStartDate())
                    || !Objects.equals(e.getDesignationId(), p.getEntryDesignationId())
                    || !Objects.equals(e.getIncrementDate(), p.getIncrementDate())
                    || !Objects.equals(e.getFirstIncrementDueDate(), p.getFirstIncrementDueDate()))
                throw new IllegalArgumentException("This appointment still has active salary increments for "
                        + describeYears(owned) + ". Its date, designation and increment schedule cannot be changed or"
                        + " removed while they stand. Undo those increments in the appointment's salary history first;"
                        + " the reversal is kept as an audit record.");
        }
    }

    private void requireNoOverlap(List<SalaryIncrementRecord> scoped, LocalDate boundary, String periodLabel) {
        if (scoped.stream().anyMatch(r -> r.getDueDate() == null))
            throw new IllegalArgumentException("An imported salary increment in " + periodLabel + " has no due date, so it"
                    + " cannot be placed before or after " + boundary + ". Correct that record's due date in salary history first.");
        List<SalaryIncrementRecord> overlapping = scoped.stream().filter(r -> !r.getDueDate().isBefore(boundary)).toList();
        if (overlapping.isEmpty()) return;
        throw new IllegalArgumentException("Salary increments for " + describeYears(overlapping) + " are recorded in "
                + periodLabel + " but fall on or after " + boundary + ", so they belong to the new appointment instead."
                + " Undo them in that appointment's salary history, save this appointment, then record them again on the"
                + " new increment schedule. Undoing keeps the original entries as audit records.");
    }

    private String describeYears(List<SalaryIncrementRecord> records) {
        return records.stream().map(SalaryIncrementRecord::getDueYear).filter(Objects::nonNull).distinct().sorted()
                .map(String::valueOf).collect(java.util.stream.Collectors.joining(", "));
    }
}
