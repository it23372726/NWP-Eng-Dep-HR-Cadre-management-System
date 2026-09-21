package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.DismissalRequest;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.dto.OfficeChangeRequest;
import com.nwpengdep.hrms.dto.PromotionRequest;
import com.nwpengdep.hrms.dto.TransferOutRequest;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

/**
 * Latest-action edit must persist the same fields the create forms collect, then rebuild state.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeActionUpdateTest {
    @Autowired EntityManager em;
    @Autowired EmployeeRepository employees;
    @Autowired EmployeeActionRepository actions;
    @Autowired EmployeeLifecycleService lifecycle;
    @Autowired EmployeeActionService actionService;
    @Autowired EmployeeService employeeService;

    Employee employee;
    Designation technicalOfficer;
    Designation seniorTechnicalOfficer;
    ServiceLevel level;

    @BeforeEach
    void setup() {
        level = ServiceLevel.builder().levelName("Update test " + UUID.randomUUID()).build();
        em.persist(level);
        ServiceType service = ServiceType.builder()
                .serviceCode("UPD-" + UUID.randomUUID())
                .description("Lifecycle update test service")
                .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .grade2RequiredYears(0)
                .grade1RequiredYears(10)
                .build();
        em.persist(service);
        technicalOfficer = Designation.builder()
                .designationName("Technical Officer")
                .service(service)
                .serviceLevel(level)
                .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .createdAt(LocalDateTime.now())
                .build();
        em.persist(technicalOfficer);
        seniorTechnicalOfficer = Designation.builder()
                .designationName("Senior Technical Officer")
                .service(service)
                .serviceLevel(level)
                .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .createdAt(LocalDateTime.now())
                .build();
        em.persist(seniorTechnicalOfficer);

        employee = Employee.builder()
                .employeeNo(UUID.randomUUID().toString())
                .nic(UUID.randomUUID().toString())
                .fullName("Lifecycle update test")
                .grade(Grade.III)
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .designation(technicalOfficer)
                .service(service)
                .serviceLevel(level)
                .dateOfFirstAppointment(LocalDate.of(2015, 1, 1))
                .currentDepartment("Other Department")
                .currentOffice("Office A")
                .build();
        employee.setIncremantDate("01-01");
        employees.saveAndFlush(employee);

        actionService.recordActionWithGrades(
                employee,
                EmployeeActionType.NEW_APPOINTMENT,
                LocalDate.of(2015, 1, 1),
                null,
                technicalOfficer,
                null,
                Grade.III,
                null,
                null,
                null,
                null,
                ActionWorkplaceFields.of("Other Department", "Office A")
        );
        actionService.recalculateEmployeeState(employee.getId());
        em.flush();
        reload();
    }

    @Test
    void editingLatestOfficeChangePersistsOfficeAndSpecialDesignation() {
        OfficeChangeRequest create = new OfficeChangeRequest();
        create.setEffectiveDate(LocalDate.of(2019, 1, 1));
        create.setOffice("Office B");
        create.setSpecialDesignationName("District Engineer");
        lifecycle.officeChange(employee.getId(), create);
        reload();

        EmployeeAction latest = latest();
        assertEquals(EmployeeActionType.OFFICE_CHANGE, latest.getActionType());

        EmployeeActionUpdateRequest update = EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2019, 6, 1))
                .department("Other Department")
                .office("Office C")
                .specialDesignationName("Acting DE")
                .remarks("Corrected office")
                .build();
        actionService.updateEmployeeAction(latest.getId(), update);
        reload();

        assertEquals("Office C", employee.getCurrentOffice());
        assertEquals("Acting DE", employee.getSpecialDesignationName());
        assertEquals(LocalDate.of(2019, 6, 1), latest().getActionDate());
        assertEquals("Office C", latest().getOffice());
        assertEquals("Acting DE", latest().getRecordedSpecialDesignationName());
    }

    @Test
    void editingLatestDismissalPersistsReasonAndRejectsBlankReason() {
        DismissalRequest dismiss = new DismissalRequest();
        dismiss.setActionDate(LocalDate.of(2020, 3, 1));
        dismiss.setReason("Misconduct");
        dismiss.setRemarks("Initial");
        lifecycle.dismissEmployee(employee.getId(), dismiss);
        reload();

        Long actionId = latest().getId();

        assertThrows(RuntimeException.class, () ->
                actionService.updateEmployeeAction(actionId, EmployeeActionUpdateRequest.builder()
                        .actionDate(LocalDate.of(2020, 3, 1))
                        .reason("  ")
                        .remarks("oops")
                        .build()));

        actionService.updateEmployeeAction(actionId, EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2020, 4, 1))
                .reason("Gross misconduct")
                .remarks("Corrected")
                .build());
        reload();

        EmployeeAction updated = latest();
        assertEquals("Gross misconduct", updated.getReason());
        assertEquals(LocalDate.of(2020, 4, 1), updated.getActionDate());
        assertEquals("Corrected", updated.getRemarks());
        assertEquals(EmployeeStatus.INACTIVE, employee.getStatus());
    }

    @Test
    void editingLatestTransferOutSyncsLinkedTransferIn() {
        TransferOutRequest transfer = new TransferOutRequest();
        transfer.setTransferDate(LocalDate.of(2019, 5, 1));
        transfer.setToDepartment("Irrigation Department");
        transfer.setToOffice("Regional Office");
        transfer.setNewDesignationId(technicalOfficer.getId());
        transfer.setServiceLevelId(level.getId());
        lifecycle.transferOut(employee.getId(), transfer);
        reload();

        EmployeeAction transferOut = latestModifiable();
        assertEquals(EmployeeActionType.TRANSFER_OUT, transferOut.getActionType());
        assertNotNull(transferOut.getLinkedActionId());

        actionService.updateEmployeeAction(transferOut.getId(), EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2019, 8, 1))
                .newDesignationId(seniorTechnicalOfficer.getId())
                .serviceLevelId(level.getId())
                .toDepartment("Health Department")
                .toOffice("District Hospital")
                .district(null)
                .toDistrict(null)
                .remarks("Corrected destination")
                .build());
        reload();

        EmployeeAction updatedOut = actions.findById(transferOut.getId()).orElseThrow();
        EmployeeAction linkedIn = actions.findById(updatedOut.getLinkedActionId()).orElseThrow();

        assertEquals(LocalDate.of(2019, 8, 1), updatedOut.getActionDate());
        assertEquals("Health Department", updatedOut.getToDepartment());
        assertEquals("District Hospital", updatedOut.getToOffice());
        assertEquals(seniorTechnicalOfficer.getId(), updatedOut.getNewDesignation().getId());

        assertEquals(LocalDate.of(2019, 8, 1), linkedIn.getActionDate());
        assertEquals("Health Department", linkedIn.getDepartment());
        assertEquals("District Hospital", linkedIn.getOffice());
        assertEquals(seniorTechnicalOfficer.getId(), linkedIn.getNewDesignation().getId());
        assertEquals("Health Department", employee.getCurrentDepartment());
        assertEquals("District Hospital", employee.getCurrentOffice());
        assertEquals(seniorTechnicalOfficer.getId(), employee.getDesignation().getId());
    }

    @Test
    void editingLatestPromotionPersistsDesignationAndGrade() {
        PromotionRequest promotion = new PromotionRequest();
        promotion.setNewDesignationId(seniorTechnicalOfficer.getId());
        promotion.setGrade(Grade.II);
        promotion.setServiceLevelId(level.getId());
        promotion.setPromotionDate(LocalDate.of(2018, 6, 1));
        promotion.setRequirements(List.of());
        lifecycle.promoteEmployee(employee.getId(), promotion);
        reload();

        EmployeeAction latest = latestModifiable();
        assertTrue(
                latest.getActionType() == EmployeeActionType.PROMOTION
                        || latest.getActionType() == EmployeeActionType.ASSIGNMENT_GRADE_UPDATE
        );

        actionService.updateEmployeeAction(latest.getId(), EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2018, 9, 1))
                .newDesignationId(seniorTechnicalOfficer.getId())
                .grade("II")
                .serviceLevelId(level.getId())
                .specialDesignationName("Acting STO")
                .remarks("Date corrected")
                .build());
        reload();

        assertEquals(LocalDate.of(2018, 9, 1), latestModifiable().getActionDate());
        assertEquals(Grade.II, employee.getGrade());
        assertEquals(seniorTechnicalOfficer.getId(), employee.getDesignation().getId());
        assertEquals("Acting STO", employee.getSpecialDesignationName());
    }

    @Test
    void nonLatestActionCanBeEditedButNotDeleted() {
        OfficeChangeRequest first = new OfficeChangeRequest();
        first.setEffectiveDate(LocalDate.of(2018, 1, 1));
        first.setOffice("Office B");
        lifecycle.officeChange(employee.getId(), first);
        reload();
        Long olderId = latest().getId();

        OfficeChangeRequest second = new OfficeChangeRequest();
        second.setEffectiveDate(LocalDate.of(2019, 1, 1));
        second.setOffice("Office C");
        lifecycle.officeChange(employee.getId(), second);
        reload();

        actionService.updateEmployeeAction(olderId, EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2018, 6, 1))
                .department("Other Department")
                .office("Office B-Revised")
                .remarks("Corrected mid-history office change")
                .build());
        reload();

        EmployeeAction older = actions.findById(olderId).orElseThrow();
        assertEquals(LocalDate.of(2018, 6, 1), older.getActionDate());
        assertEquals("Office B-Revised", older.getOffice());

        assertThrows(RuntimeException.class, () ->
                actionService.deleteEmployeeAction(olderId));
    }

    @Test
    void movingGradeTwoLaterThanGradeOneAllowsIsBlockedUntilGradeOneMoves() {
        ServiceType service = employee.getService();
        service.setGrade2RequiredYears(10);
        service.setGrade1RequiredYears(10);
        em.merge(service);
        em.flush();

        // First appointment 2000, confirmation 2003, Grade II 2010, Grade I 2020.
        employee.setDateOfFirstAppointment(LocalDate.of(2000, 1, 1));
        employees.saveAndFlush(employee);
        EmployeeAction appointment = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId())
                .stream()
                .filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT)
                .findFirst()
                .orElseThrow();
        appointment.setActionDate(LocalDate.of(2000, 1, 1));
        actions.saveAndFlush(appointment);
        actionService.recalculateEmployeeState(employee.getId());
        reload();

        actionService.recordAction(
                employee,
                EmployeeActionType.PERMANENT_CONFIRMATION,
                LocalDate.of(2003, 1, 1),
                technicalOfficer,
                technicalOfficer,
                null,
                null,
                null,
                null,
                ActionWorkplaceFields.of("Other Department", "Office A")
        );

        PromotionRequest grade2 = new PromotionRequest();
        grade2.setNewDesignationId(technicalOfficer.getId());
        grade2.setGrade(Grade.II);
        grade2.setServiceLevelId(level.getId());
        grade2.setPromotionDate(LocalDate.of(2010, 1, 1));
        grade2.setRequirements(List.of());
        lifecycle.promoteEmployee(employee.getId(), grade2);
        reload();

        Long grade2Id = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId())
                .stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .filter(a -> a.getNewGrade() == Grade.II)
                .findFirst()
                .orElseThrow()
                .getId();

        PromotionRequest grade1 = new PromotionRequest();
        grade1.setNewDesignationId(technicalOfficer.getId());
        grade1.setGrade(Grade.I);
        grade1.setServiceLevelId(level.getId());
        grade1.setPromotionDate(LocalDate.of(2020, 1, 1));
        grade1.setRequirements(List.of());
        lifecycle.promoteEmployee(employee.getId(), grade1);
        reload();

        Long grade1Id = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId())
                .stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .filter(a -> a.getNewGrade() == Grade.I)
                .findFirst()
                .orElseThrow()
                .getId();

        RuntimeException blocked = assertThrows(RuntimeException.class, () ->
                actionService.updateEmployeeAction(grade2Id, EmployeeActionUpdateRequest.builder()
                        .actionDate(LocalDate.of(2015, 1, 1))
                        .newDesignationId(technicalOfficer.getId())
                        .grade("II")
                        .serviceLevelId(level.getId())
                        .build()));
        assertTrue(
                blocked.getMessage().contains("cannot be earlier")
                        || blocked.getMessage().contains("service period")
                        || blocked.getMessage().toLowerCase().contains("grade"),
                () -> "Unexpected message: " + blocked.getMessage()
        );

        actionService.updateEmployeeAction(grade1Id, EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2025, 1, 1))
                .newDesignationId(technicalOfficer.getId())
                .grade("I")
                .serviceLevelId(level.getId())
                .build());
        reload();

        actionService.updateEmployeeAction(grade2Id, EmployeeActionUpdateRequest.builder()
                .actionDate(LocalDate.of(2015, 1, 1))
                .newDesignationId(technicalOfficer.getId())
                .grade("II")
                .serviceLevelId(level.getId())
                .build());
        reload();

        assertEquals(LocalDate.of(2015, 1, 1), actions.findById(grade2Id).orElseThrow().getActionDate());
        assertEquals(LocalDate.of(2025, 1, 1), actions.findById(grade1Id).orElseThrow().getActionDate());
        assertEquals(Grade.I, employee.getGrade());
    }

    @Test
    void movingFirstAppointmentLaterThanConfirmationAllowsIsBlocked() {
        actionService.recordAction(
                employee,
                EmployeeActionType.PERMANENT_CONFIRMATION,
                LocalDate.of(2018, 1, 1),
                technicalOfficer,
                technicalOfficer,
                null,
                null,
                null,
                null,
                ActionWorkplaceFields.of("Other Department", "Office A")
        );
        actionService.recalculateEmployeeState(employee.getId());
        reload();

        Long appointmentId = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId())
                .stream()
                .filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT)
                .findFirst()
                .orElseThrow()
                .getId();

        RuntimeException blocked = assertThrows(RuntimeException.class, () ->
                actionService.updateEmployeeAction(appointmentId, EmployeeActionUpdateRequest.builder()
                        .actionDate(LocalDate.of(2017, 1, 1))
                        .department("Other Department")
                        .office("Office A")
                        .build()));
        assertTrue(
                blocked.getMessage().contains("probation")
                        || blocked.getMessage().contains("cannot be earlier")
                        || blocked.getMessage().contains("Permanent confirmation"),
                () -> "Unexpected message: " + blocked.getMessage()
        );
    }

    @Test
    void cannotMoveEventDatePastTheNextEvent() {
        OfficeChangeRequest first = new OfficeChangeRequest();
        first.setEffectiveDate(LocalDate.of(2018, 1, 1));
        first.setOffice("Office B");
        lifecycle.officeChange(employee.getId(), first);
        reload();
        Long olderId = latest().getId();

        OfficeChangeRequest second = new OfficeChangeRequest();
        second.setEffectiveDate(LocalDate.of(2019, 1, 1));
        second.setOffice("Office C");
        lifecycle.officeChange(employee.getId(), second);
        reload();

        RuntimeException blocked = assertThrows(RuntimeException.class, () ->
                actionService.updateEmployeeAction(olderId, EmployeeActionUpdateRequest.builder()
                        .actionDate(LocalDate.of(2019, 6, 1))
                        .department("Other Department")
                        .office("Office B")
                        .build()));
        assertTrue(blocked.getMessage().contains("next event"));
    }

    private EmployeeAction latest() {
        return actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .findFirst()
                .orElseThrow();
    }

    private EmployeeAction latestModifiable() {
        return actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .filter(a -> !(a.getActionType() == EmployeeActionType.TRANSFER_IN && a.getLinkedActionId() != null))
                .findFirst()
                .orElseThrow();
    }

    private void reload() {
        Long id = employee.getId();
        em.flush();
        em.clear();
        employee = employeeService.getEmployeeById(id);
    }
}
