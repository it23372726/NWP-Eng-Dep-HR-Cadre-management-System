package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.*;

@SpringBootTest(properties = "hrms.service-appointments.enabled=true")
@ActiveProfiles("test")
@Transactional
class ServiceAppointmentIntegrationTest {
    @Autowired EntityManager em;
    @Autowired EmployeeRepository employees;
    @Autowired EmployeeActionRepository actions;
    @Autowired EmployeeLifecycleService lifecycle;
    @Autowired EmployeeActionService actionService;
    @Autowired EmployeeService employeeService;
    @Autowired SalaryIncrementService increments;
    @Autowired CareerHistoryValidator validator;
    @Autowired ServiceAppointmentService appointments;
    Employee employee;
    Designation labourer, mso;
    ServiceLevel level;
    ServiceType oes;

    @BeforeEach void setup() {
        level = ServiceLevel.builder().levelName("Appointment test " + UUID.randomUUID()).build(); em.persist(level);
        oes = service("OES-" + UUID.randomUUID());
        ServiceType ppmas = service("PPMAS-" + UUID.randomUUID());
        labourer = designation("Labourer", oes); mso = designation("MSO", ppmas);
        employee = Employee.builder().employeeNo(UUID.randomUUID().toString()).nic(UUID.randomUUID().toString())
                .fullName("Synthetic service appointment test").grade(Grade.III).status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT).designation(labourer).service(oes).serviceLevel(level)
                .dateOfFirstAppointment(LocalDate.of(2010, 1, 1)).currentDepartment("Test Department")
                .currentOffice("Test Office").build();
        employee.setIncremantDate("01-01"); employees.saveAndFlush(employee);
        actionService.recordActionWithGrades(employee, EmployeeActionType.NEW_APPOINTMENT, LocalDate.of(2010, 1, 1),
                null, labourer, null, Grade.III, null, null, null, null, ActionWorkplaceFields.of("Test Department", "Test Office"));
        actionService.recordAction(employee, EmployeeActionType.PERMANENT_CONFIRMATION, LocalDate.of(2013, 1, 1),
                null, labourer, null, null, null, null, ActionWorkplaceFields.of("Test Department", "Test Office"));
        actionService.recalculateEmployeeState(employee.getId()); em.flush();
    }

    @Test void newAppointmentPreservesOldConfirmationAndRequirementsAndSurvivesReload() {
        ServiceAppointmentRequest request = appointment(LocalDate.of(2020, 7, 1));
        lifecycle.appointToAnotherService(employee.getId(), request); reload();
        assertEquals(mso.getId(), employee.getDesignation().getId());
        assertEquals(Grade.III, employee.getGrade());
        assertEquals(PermanentStatus.PROBATION, employee.getPermanentStatus());
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getOriginalFirstAppointmentDate());
        assertEquals(request.getAppointmentDate(), employee.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getReportedDateToPresentWorkingPlace());
        assertEquals(2, employee.getServiceAppointments().size());
        EmployeeServiceAppointment previous = employee.getServiceAppointments().stream().filter(p -> !p.isCurrentAppointment()).findFirst().orElseThrow();
        assertEquals(LocalDate.of(2013, 1, 1), previous.getPermanentConfirmationDate());
        assertEquals(RequirementStatus.COMPLETED, previous.getRequirements().getFirst().getStatus());
        assertTrue(employee.getRequirements().stream().allMatch(r -> r.getStatus() == RequirementStatus.PENDING));
        employeeService.getEmployeeById(employee.getId()); actionService.recalculateEmployeeState(employee.getId()); reload();
        assertEquals(PermanentStatus.PROBATION, employee.getPermanentStatus());
        assertEquals(request.getAppointmentDate(), employee.getDateOfFirstAppointment());
    }

    @Test void latestRevisionRecalculatesDateAndDeletionRestoresPriorService() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        Long actionId = latest().getId();
        EmployeeActionUpdateRequest change = revision(LocalDate.of(2021, 7, 1));
        actionService.updateEmployeeAction(actionId, change); reload();
        assertEquals(LocalDate.of(2021, 7, 1), employee.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2024, 7, 1), employee.getServiceAppointments().stream().filter(EmployeeServiceAppointment::isCurrentAppointment).findFirst().orElseThrow().getProbationEndDate());
        actionService.deleteEmployeeAction(actionId, actionService.historyRevision(employee.getId())); reload();
        assertEquals(labourer.getId(), employee.getDesignation().getId());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getDateOfFirstAppointment());
        assertEquals(PermanentStatus.PERMANENT, employee.getPermanentStatus());
        assertEquals("01-01", employee.getIncremantDate());
        assertTrue(actions.findById(actionId).orElseThrow().getDeleted());
    }

    @Test void newConfirmationBelongsOnlyToNewPeriod() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        for (EmployeeRequirement r : employee.getRequirements()) { r.setStatus(RequirementStatus.COMPLETED); r.setCompletedDate(LocalDate.of(2023, 7, 1)); }
        MakePermanentRequest confirmation = new MakePermanentRequest(); confirmation.setConfirmationDate(LocalDate.of(2023, 7, 1));
        lifecycle.makePermanent(employee.getId(), confirmation); reload();
        assertEquals(LocalDate.of(2023, 7, 1), employee.getCareerProgression().getPermanentConfirmationDate());
        assertEquals(LocalDate.of(2013, 1, 1), employee.getServiceAppointments().stream().filter(p -> "INITIAL".equals(p.getAppointmentKey())).findFirst().orElseThrow().getPermanentConfirmationDate());
        actionService.deleteEmployeeAction(latest().getId(), actionService.historyRevision(employee.getId())); reload();
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
        assertNotEquals(PermanentStatus.PERMANENT, employee.getPermanentStatus());
    }

    @Test void deletionFromAStaleHistoryScreenIsRejected() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        Long actionId = latest().getId();
        String stale = actionService.historyRevision(employee.getId());
        EmployeeAction changed = latest(); changed.setRemarks("Another HR user's correction"); actions.saveAndFlush(changed);
        assertThrows(com.nwpengdep.hrms.exception.ConflictException.class,
                () -> actionService.deleteEmployeeAction(actionId, stale));
        assertFalse(Boolean.TRUE.equals(actions.findById(actionId).orElseThrow().getDeleted()));
        actionService.deleteEmployeeAction(actionId, actionService.historyRevision(employee.getId())); reload();
        assertEquals(labourer.getId(), employee.getDesignation().getId());
    }

    @Test void anAccidentalAppointmentLeavesNoPeriodBehindOnceItIsDeleted() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2019, 7, 1)));
        Long mistake = latest().getId();
        reload();
        assertEquals(2, employee.getServiceAppointments().size());

        actionService.deleteEmployeeAction(mistake, actionService.historyRevision(employee.getId())); reload();
        // The employee is back to a plain single-service career; only the soft-deleted action remains.
        assertTrue(employee.getServiceAppointments().isEmpty());
        assertNull(employee.getCurrentServiceAppointmentKey());
        assertNull(employee.getOriginalFirstAppointmentDate());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getDateOfFirstAppointment());
        assertEquals("01-01", employee.getIncremantDate());
        assertEquals(labourer.getId(), employee.getDesignation().getId());
        assertTrue(actions.findById(mistake).orElseThrow().getDeleted());

        // Recording the appointment that was actually intended gives exactly two periods.
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1))); reload();
        assertEquals(2, employee.getServiceAppointments().size());
        assertEquals(1, employee.getServiceAppointments().stream().filter(EmployeeServiceAppointment::isCurrentAppointment).count());
        assertEquals(0, employee.getServiceAppointments().stream().filter(EmployeeServiceAppointment::isSuperseded).count());
        assertEquals(LocalDate.of(2020, 7, 1), employee.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getOriginalFirstAppointmentDate());
        assertEquals(1, actionService.getEmployeeActionHistory(employee.getId()).stream()
                .filter(a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT).count());
    }

    @Test void aDeletedAppointmentIsKeptWhenSalaryHistoryStillPointsAtIt() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2019, 7, 1)));
        reload();
        String key = employee.getCurrentServiceAppointmentKey();
        SalaryIncrementRecordRequest r = new SalaryIncrementRecordRequest(); r.setDoneDate(LocalDate.of(2019, 9, 2));
        increments.recordIncrement(employee.getId(), r);
        SalaryIncrementStatusDto status = increments.getStatus(employee.getId());
        increments.undoIncrement(employee.getId(), status.getLastOperationId(), null);
        reload();

        actionService.deleteEmployeeAction(latest().getId(), actionService.historyRevision(employee.getId())); reload();
        assertTrue(employee.getServiceAppointments().stream()
                        .anyMatch(p -> key.equals(p.getAppointmentKey()) && p.isSuperseded()),
                "a reversed increment still references this period, so its row must survive");
        assertEquals(key, increments.getHistory(employee.getId()).getFirst().getServiceAppointmentKey());
    }

    @Test void disabledFeatureStillRevisesRecordedHistoryButRefusesAFurtherAppointment() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2018, 7, 1)));
        String key = employee.getCurrentServiceAppointmentKey();
        setFeatureEnabled(false);
        try {
            List<CareerHistoryEventRequest> revised = new ArrayList<>(history());
            CareerHistoryEventRequest recorded = revised.getLast();
            recorded.setActionDate(LocalDate.of(2019, 7, 1)); recorded.setFirstIncrementDueDate(LocalDate.of(2019, 9, 1));
            employeeService.updateEmployee(employee.getId(), historyUpdate(revised)); reload();
            assertEquals(key, employee.getCurrentServiceAppointmentKey());
            assertEquals(LocalDate.of(2019, 7, 1), employee.getDateOfFirstAppointment());

            List<CareerHistoryEventRequest> withExtra = new ArrayList<>(history());
            CareerHistoryEventRequest added = new CareerHistoryEventRequest();
            added.setActionType(EmployeeActionType.SERVICE_APPOINTMENT); added.setActionDate(LocalDate.of(2022, 7, 1));
            added.setDesignationId(labourer.getId()); added.setGrade(Grade.III); added.setServiceId(labourer.getService().getId());
            added.setServiceLevelId(level.getId()); added.setDepartment("Test Department"); added.setOffice("Test Office");
            added.setServiceAppointmentKey(UUID.randomUUID().toString()); added.setAppointmentBasis("Competitive examination");
            added.setIncrementDate("09-01");
            added.setFirstIncrementDueDate(LocalDate.of(2022, 9, 1)); withExtra.add(added);
            EmployeeUpdateRequest blocked = historyUpdate(withExtra);
            assertThrows(IllegalArgumentException.class, () -> employeeService.updateEmployee(employee.getId(), blocked));
        } finally {
            setFeatureEnabled(true);
        }
        reload();
        assertEquals(1, actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .filter(a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT).count());
    }

    @Test void overlappingIncrementsAreRefusedWithAnActionableMessage() {
        recordIncrementsThrough(2015);
        // 2014 and 2015 are due on or after the proposed boundary, so they belong to the new appointment.
        IllegalArgumentException blocked = assertThrows(IllegalArgumentException.class,
                () -> lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2014, 1, 1))));
        assertTrue(blocked.getMessage().contains("2014, 2015"), blocked.getMessage());
        assertTrue(blocked.getMessage().contains("Undo them"), blocked.getMessage());
    }

    @Test void reversedIncrementsNoLongerBlockTheBoundaryAndStayInTheLedger() {
        recordIncrementsThrough(2015);
        // The correction the error message asks for: undo the overlapping increments, newest first.
        for (int i = 0; i < 2; i++) {
            increments.undoIncrement(employee.getId(), increments.getStatus(employee.getId()).getLastOperationId(), null);
        }
        reload();
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2014, 1, 1))); reload();
        assertEquals(mso.getId(), employee.getDesignation().getId());
        assertEquals(LocalDate.of(2014, 1, 1), employee.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getOriginalFirstAppointmentDate());

        // Nothing financial was deleted: the reversed entries remain in the ledger for audit.
        List<SalaryIncrementHistoryItemDto> history = increments.getHistory(employee.getId());
        assertEquals(6, history.size());
        assertEquals(2, history.stream().filter(h -> h.getStatus() == SalaryIncrementRecordStatus.REVERSED).count());
        assertEquals(4, history.stream().filter(h -> h.getStatus() == SalaryIncrementRecordStatus.RECORDED).count());
        assertEquals(2014, increments.getStatus(employee.getId()).getNextDueYear());
        // The original schedule now closes at the new boundary, with 2010-2013 paid inside it.
        SalaryIncrementStatusDto original = increments.getStatus(employee.getId(), "INITIAL");
        assertNull(original.getNextDueYear());
        assertEquals(2013, original.getLastDueYear());
        assertTrue(original.getStatusLabel().contains("complete"), original.getStatusLabel());
    }

    private void recordIncrementsThrough(int lastYear) {
        for (int year = 2010; year <= lastYear; year++) {
            SalaryIncrementRecordRequest r = new SalaryIncrementRecordRequest(); r.setDoneDate(LocalDate.of(year, 1, 2));
            increments.recordIncrement(employee.getId(), r);
        }
        reload();
    }

    @Test void ordinaryPromotionAfterAServiceChangeUsesTheNewServiceAndItsAppointmentDate() {
        ServiceType quick = service("QUICK-" + UUID.randomUUID());
        quick.setGrade2RequiredYears(1); em.persist(quick);
        Designation quickEntry = designation("Quick Grade Officer", quick);
        ServiceAppointmentRequest request = appointment(LocalDate.of(2018, 7, 1));
        request.setNewDesignationId(quickEntry.getId());
        lifecycle.appointToAnotherService(employee.getId(), request);

        List<CareerHistoryEventRequest> promoted = new ArrayList<>(history());
        promoted.add(promotion(LocalDate.of(2020, 7, 1), quickEntry.getId(), Grade.II));
        validator.validate(promoted);

        List<CareerHistoryEventRequest> crossService = new ArrayList<>(history());
        crossService.add(promotion(LocalDate.of(2020, 7, 1), labourer.getId(), Grade.II));
        assertThrows(RuntimeException.class, () -> validator.validate(crossService));

        List<CareerHistoryEventRequest> tooEarly = new ArrayList<>(history());
        tooEarly.add(promotion(LocalDate.of(2018, 8, 1), quickEntry.getId(), Grade.II));
        assertThrows(RuntimeException.class, () -> validator.validate(tooEarly));
    }

    @Test void aCustomOriginalDesignationKeepsItsOwnServiceOnTheOriginalPeriod() {
        EmployeeAction appointmentAction = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT).findFirst().orElseThrow();
        appointmentAction.setNewDesignation(null);
        appointmentAction.setRecordedNewDesignationName("Original custom title");
        appointmentAction.setServiceId(oes.getId());
        actions.saveAndFlush(appointmentAction);
        employee.setDesignation(null); employee.setRecordedDesignationName("Original custom title");
        employees.saveAndFlush(employee);

        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1))); reload();
        EmployeeServiceAppointment original = employee.getServiceAppointments().stream()
                .filter(p -> "INITIAL".equals(p.getAppointmentKey())).findFirst().orElseThrow();
        assertEquals(oes.getId(), original.getServiceId());
        assertEquals(oes.getServiceCode(), original.getServiceCode());
        assertEquals("Original custom title", original.getEntryDesignationName());
        assertEquals(mso.getService().getId(), employee.getServiceAppointments().stream()
                .filter(EmployeeServiceAppointment::isCurrentAppointment).findFirst().orElseThrow().getServiceId());
    }

    private CareerHistoryEventRequest promotion(LocalDate date, Long designationId, Grade grade) {
        CareerHistoryEventRequest e = new CareerHistoryEventRequest();
        e.setActionType(EmployeeActionType.PROMOTION); e.setActionDate(date); e.setDesignationId(designationId);
        e.setGrade(grade); e.setServiceLevelId(level.getId());
        e.setDepartment("Test Department"); e.setOffice("Test Office");
        return e;
    }

    private void setFeatureEnabled(boolean enabled) {
        org.springframework.test.util.ReflectionTestUtils.setField(
                appointments, "enabled", enabled);
    }

    @Test void salaryHistoryIsScopedAndPreviousOutstandingIncrementsRemainRecordable() {
        SalaryIncrementRecordRequest old = new SalaryIncrementRecordRequest(); old.setDoneDate(LocalDate.of(2010, 1, 1));
        increments.recordIncrement(employee.getId(), old);
        ServiceAppointmentRequest appointment = appointment(LocalDate.of(2020, 7, 1));
        lifecycle.appointToAnotherService(employee.getId(), appointment); reload();
        assertEquals(LocalDate.of(2020, 9, 1), increments.getStatus(employee.getId()).getNextDueDate());
        assertEquals(2011, increments.getStatus(employee.getId(), "INITIAL").getNextDueYear());
        SalaryIncrementRecordRequest historical = new SalaryIncrementRecordRequest(); historical.setDoneDate(LocalDate.of(2011, 1, 2)); historical.setServiceAppointmentKey("INITIAL");
        increments.recordIncrement(employee.getId(), historical);
        SalaryIncrementRecordRequest current = new SalaryIncrementRecordRequest(); current.setDoneDate(LocalDate.of(2020, 9, 2));
        increments.recordIncrement(employee.getId(), current);
        assertEquals(3, increments.getHistory(employee.getId()).size());
        assertEquals(2021, increments.getStatus(employee.getId()).getNextDueYear());
        assertEquals(2012, increments.getStatus(employee.getId(), "INITIAL").getNextDueYear());
        assertThrows(IllegalArgumentException.class, () -> actionService.updateEmployeeAction(latest().getId(), revision(LocalDate.of(2021, 7, 1))));
    }

    @Test void ordinaryPromotionStillCannotChangeService() {
        PromotionRequest p = new PromotionRequest(); p.setNewDesignationId(mso.getId()); p.setGrade(Grade.III);
        p.setServiceLevelId(level.getId()); p.setPromotionDate(LocalDate.of(2020, 7, 1));
        assertThrows(RuntimeException.class, () -> lifecycle.promoteEmployee(employee.getId(), p));
    }

    @Test void completeHistoryRevisionKeepsKeysArchivesOldActionsAndRecalculatesCurrentPeriod() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        String key = employee.getCurrentServiceAppointmentKey();
        List<Long> oldIds = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream().map(EmployeeAction::getId).toList();
        List<CareerHistoryEventRequest> history = history();
        CareerHistoryEventRequest change = history.getLast();
        change.setActionDate(LocalDate.of(2021, 7, 1)); change.setFirstIncrementDueDate(LocalDate.of(2021, 9, 1));
        employeeService.updateEmployee(employee.getId(), historyUpdate(history)); reload();
        assertEquals(key, employee.getCurrentServiceAppointmentKey());
        assertEquals(LocalDate.of(2021, 7, 1), employee.getDateOfFirstAppointment());
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
        assertEquals("09-01", employee.getIncremantDate());
        assertTrue(oldIds.stream().allMatch(id -> Boolean.TRUE.equals(actions.findById(id).orElseThrow().getDeleted())));
        assertEquals(3, actionService.getEmployeeActionHistory(employee.getId()).size());
        // A second save must not duplicate periods or leak the first service's confirmation.
        employeeService.updateEmployee(employee.getId(), historyUpdate(history())); reload();
        assertEquals(2, employee.getServiceAppointments().stream().filter(p -> !p.isSuperseded()).count());
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
    }

    @Test void earlierAppointmentRevisionValidatesLaterConfirmation() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        for (EmployeeRequirement r : employee.getRequirements()) r.setStatus(RequirementStatus.COMPLETED);
        MakePermanentRequest confirmation = new MakePermanentRequest(); confirmation.setConfirmationDate(LocalDate.of(2023, 7, 1));
        lifecycle.makePermanent(employee.getId(), confirmation);
        List<CareerHistoryEventRequest> history = history();
        CareerHistoryEventRequest boundary = history.stream().filter(e -> e.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT).findFirst().orElseThrow();
        boundary.setActionDate(LocalDate.of(2021, 7, 1)); boundary.setFirstIncrementDueDate(LocalDate.of(2021, 9, 1));
        assertThrows(RuntimeException.class, () -> validator.validate(history));
        boundary.setActionDate(LocalDate.of(2019, 7, 1)); boundary.setFirstIncrementDueDate(LocalDate.of(2019, 9, 1));
        employeeService.updateEmployee(employee.getId(), historyUpdate(history)); reload();
        assertEquals(LocalDate.of(2019, 7, 1), employee.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2023, 7, 1), employee.getCareerProgression().getPermanentConfirmationDate());
    }

    @Test void anotherServiceChangeStartsAThirdIndependentPeriod() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2018, 7, 1)));
        ServiceAppointmentRequest back = appointment(LocalDate.of(2022, 7, 1)); back.setNewDesignationId(labourer.getId());
        lifecycle.appointToAnotherService(employee.getId(), back); reload();
        assertEquals(3, employee.getServiceAppointments().size());
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
        assertEquals(PermanentStatus.PROBATION, employee.getPermanentStatus());
        assertTrue(employee.getRequirements().stream().allMatch(r -> r.getStatus() == RequirementStatus.PENDING));
    }

    @Test void rejectsAStaleAppointmentFormBeforeWritingHistory() {
        ServiceAppointmentRequest stale = appointment(LocalDate.of(2020, 7, 1));
        EmployeeAction changed = latest(); changed.setRemarks("Another HR user's correction"); actions.saveAndFlush(changed);
        assertThrows(com.nwpengdep.hrms.exception.ConflictException.class,
                () -> lifecycle.appointToAnotherService(employee.getId(), stale));
        assertNull(employee.getCurrentServiceAppointmentKey());
        assertEquals(2, actionService.getEmployeeActionHistory(employee.getId()).size());
    }

    @Test void sameCalendarYearCanContainIncrementsForBothAppointmentsAndClosedScheduleCanBeUndone() {
        for (int year = 2010; year <= 2020; year++) {
            SalaryIncrementRecordRequest r = new SalaryIncrementRecordRequest(); r.setDoneDate(LocalDate.of(year, 1, 2));
            increments.recordIncrement(employee.getId(), r);
        }
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1))); reload();
        SalaryIncrementRecordRequest next = new SalaryIncrementRecordRequest(); next.setDoneDate(LocalDate.of(2020, 9, 2));
        increments.recordIncrement(employee.getId(), next);
        assertEquals(2, increments.getHistory(employee.getId()).stream().filter(r -> r.getDueYear() == 2020).count());
        SalaryIncrementStatusDto closed = increments.getStatus(employee.getId(), "INITIAL");
        assertNull(closed.getNextDueYear()); assertTrue(closed.isCanUndo()); assertNotNull(closed.getLastOperationId());
        increments.undoIncrement(employee.getId(), closed.getLastOperationId(), "INITIAL");
        assertEquals(2020, increments.getStatus(employee.getId(), "INITIAL").getNextDueYear());
        assertEquals(2021, increments.getStatus(employee.getId()).getNextDueYear());
    }

    @Test void importingAnOlderServiceBoundaryDoesNotAssignCurrentRequirementsToOriginalService() {
        employee.setDesignation(mso); employee.setService(mso.getService()); employee.setDateOfFirstAppointment(LocalDate.of(2020, 7, 1));
        employee.setIncremantDate("09-01");
        employee.getRequirements().forEach(r -> { r.setStatus(RequirementStatus.COMPLETED); r.setCompletedDate(LocalDate.of(2023, 7, 1)); });
        employees.saveAndFlush(employee);
        List<CareerHistoryEventRequest> events = new ArrayList<>(history());
        CareerHistoryEventRequest boundary = new CareerHistoryEventRequest(); boundary.setActionType(EmployeeActionType.SERVICE_APPOINTMENT);
        boundary.setActionDate(LocalDate.of(2020, 7, 1)); boundary.setDesignationId(mso.getId()); boundary.setGrade(Grade.III);
        boundary.setServiceId(mso.getService().getId()); boundary.setServiceLevelId(level.getId()); boundary.setDepartment("Test Department"); boundary.setOffice("Test Office");
        boundary.setServiceAppointmentKey(UUID.randomUUID().toString()); boundary.setAppointmentBasis("Historical exam appointment");
        boundary.setIncrementDate("09-01"); boundary.setFirstIncrementDueDate(LocalDate.of(2020, 9, 1)); events.add(boundary);
        employeeService.updateEmployee(employee.getId(), historyUpdate(events)); reload();
        var original = employee.getServiceAppointments().stream().filter(p -> "INITIAL".equals(p.getAppointmentKey())).findFirst().orElseThrow();
        assertTrue(original.getRequirements().isEmpty());
        assertNull(original.getIncrementDate());
        assertEquals(LocalDate.of(2010, 1, 1), employee.getOriginalFirstAppointmentDate());
        assertTrue(employee.getServiceAppointments().stream().anyMatch(EmployeeServiceAppointment::isSuperseded));
        assertTrue(employee.getRequirements().stream().anyMatch(r -> r.getStatus() == RequirementStatus.COMPLETED));
        assertNull(employee.getCareerProgression().getPermanentConfirmationDate());
    }

    private List<CareerHistoryEventRequest> history() {
        return actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted())).sorted(Comparator.comparing(EmployeeAction::getActionDate).thenComparing(EmployeeAction::getId))
                .map(a -> {
                    CareerHistoryEventRequest e = new CareerHistoryEventRequest(); e.setActionType(a.getActionType()); e.setActionDate(a.getActionDate());
                    e.setDesignationId(a.getNewDesignation() != null ? a.getNewDesignation().getId() : null); e.setGrade(a.getNewGrade());
                    e.setServiceLevelId(level.getId()); e.setServiceId(a.getServiceId()); e.setDepartment(a.getDepartment()); e.setOffice(a.getOffice());
                    e.setServiceAppointmentKey(a.getServiceAppointmentKey()); e.setAppointmentBasis(a.getAppointmentBasis());
                    e.setIncrementDate(a.getIncrementDate()); e.setFirstIncrementDueDate(a.getFirstIncrementDueDate()); return e;
                }).toList();
    }

    private EmployeeUpdateRequest historyUpdate(List<CareerHistoryEventRequest> history) {
        EmployeeUpdateRequest r = new EmployeeUpdateRequest(); r.setEmployeeNo(employee.getEmployeeNo()); r.setNic(employee.getNic());
        r.setFullName(employee.getFullName()); r.setEmploymentType(EmploymentType.PERMANENT); r.setServiceLevelId(level.getId());
        r.setIncremantDate(employee.getIncremantDate()); r.setPermanentAddress("Synthetic test address"); r.setContactNo("TEST");
        r.setWidowsOrphansPensionNo("TEST-PENSION"); r.setPrivateVehicleUsedForGovWork(false); r.setExpectedHistoryRevision(actionService.historyRevision(employee.getId())); r.setCareerHistory(history); return r;
    }

    @Test void confirmationBeforeNewThreeYearBoundaryIsRejected() {
        lifecycle.appointToAnotherService(employee.getId(), appointment(LocalDate.of(2020, 7, 1)));
        for (EmployeeRequirement r : employee.getRequirements()) r.setStatus(RequirementStatus.COMPLETED);
        MakePermanentRequest p = new MakePermanentRequest(); p.setConfirmationDate(LocalDate.of(2023, 6, 30));
        assertThrows(RuntimeException.class, () -> lifecycle.makePermanent(employee.getId(), p));
    }

    private void reload() { Long id = employee.getId(); em.flush(); em.clear(); employee = employeeService.getEmployeeById(id); }
    private EmployeeAction latest() { return actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream().filter(a -> !Boolean.TRUE.equals(a.getDeleted())).findFirst().orElseThrow(); }
    private ServiceType service(String code) {
        ServiceType s = ServiceType.builder().serviceCode(code).description(code).allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .grade2RequiredYears(10).grade1RequiredYears(10).build();
        ServicePermanentRequirement r = new ServicePermanentRequirement(); r.setService(s); r.setRequirementName("Shared named examination"); s.getPermanentRequirements().add(r); em.persist(s); return s;
    }
    private Designation designation(String name, ServiceType s) { Designation d = Designation.builder().designationName(name).service(s).serviceLevel(level)
            .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I))).createdAt(LocalDateTime.now()).build(); em.persist(d); return d; }
    private ServiceAppointmentRequest appointment(LocalDate date) {
        ServiceAppointmentRequest r = new ServiceAppointmentRequest(); r.setNewDesignationId(mso.getId()); r.setServiceLevelId(level.getId()); r.setAppointmentDate(date);
        r.setAppointmentBasis("Competitive examination"); r.setIncrementDate("09-01"); r.setFirstIncrementDueDate(LocalDate.of(date.getYear(), 9, 1));
        r.setExpectedHistoryRevision(actionService.historyRevision(employee.getId())); r.setDepartment("Test Department"); r.setOffice("Test Office"); r.setServiceAppointmentKey(UUID.randomUUID().toString()); return r;
    }
    private EmployeeActionUpdateRequest revision(LocalDate date) {
        var r = new EmployeeActionUpdateRequest(); r.setActionDate(date); r.setNewDesignationId(mso.getId()); r.setServiceLevelId(level.getId());
        r.setAppointmentBasis("Competitive examination"); r.setIncrementDate("09-01"); r.setFirstIncrementDueDate(LocalDate.of(date.getYear(), 9, 1));
        r.setExpectedHistoryRevision(actionService.historyRevision(employee.getId())); r.setDepartment("Test Department"); r.setOffice("Test Office"); return r;
    }
}
