package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class SupraDesignationPromotionIT {
    @Autowired EntityManager em;
    @Autowired EmployeeRepository employees;
    @Autowired EmployeeActionRepository actions;
    @Autowired EmployeeLifecycleService lifecycle;
    @Autowired EmployeeService employeeService;
    @Autowired EmployeeActionService actionService;
    Employee employee; Designation mso; Designation ao; ServiceLevel level;
    final LocalDate date = LocalDate.of(2021, 7, 1);
    @BeforeEach void setup() {
        level = ServiceLevel.builder().levelName("Supra test " + UUID.randomUUID()).build(); em.persist(level);
        ServiceType service = ServiceType.builder().serviceCode("PPMAS-" + UUID.randomUUID())
                .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I, Grade.SUPRA, Grade.SPECIAL)))
                .grade2RequiredYears(0).grade1RequiredYears(0).supraRequiredYears(99).build(); em.persist(service);
        mso = designation("MSO", service, Set.of(Grade.III, Grade.II, Grade.I));
        ao = designation("AO", service, Set.of(Grade.SUPRA));
        employee = Employee.builder().employeeNo(UUID.randomUUID().toString()).nic(UUID.randomUUID().toString())
                .fullName("Synthetic Supra test").grade(Grade.III).employmentType(EmploymentType.PERMANENT)
                .status(EmployeeStatus.ACTIVE).service(service).designation(mso).serviceLevel(level)
                .dateOfFirstAppointment(LocalDate.of(2010,1,1)).currentDepartment("Test Department")
                .currentOffice("Test Office").build(); employees.saveAndFlush(employee);
        actionService.recordActionWithGrades(employee, EmployeeActionType.NEW_APPOINTMENT, LocalDate.of(2010,1,1),
                null,mso,null,Grade.III,null,null,null,null,ActionWorkplaceFields.of("Test Department","Test Office"));
        actionService.recordAction(employee,EmployeeActionType.PERMANENT_CONFIRMATION,LocalDate.of(2013,1,1),
                null,mso,null,null,null,null,ActionWorkplaceFields.of("Test Department","Test Office"));
        actionService.recalculateEmployeeState(employee.getId());
    }
    private Designation designation(String name, ServiceType service, Set<Grade> grades) {
        Designation d=Designation.builder().designationName(name).service(service).serviceLevel(level)
                .allowedGrades(new HashSet<>(grades)).createdAt(LocalDateTime.now()).build();em.persist(d);return d;
    }
    private void enterGrade(Grade grade) {
        if (grade != Grade.III) actionService.recordActionWithGrades(employee,EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                LocalDate.of(2015,1,1),mso,mso,Grade.III,Grade.II,null,null,null,null,ActionWorkplaceFields.of("Test Department","Test Office"));
        if (grade == Grade.I) actionService.recordActionWithGrades(employee,EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                LocalDate.of(2020,1,1),mso,mso,Grade.II,Grade.I,null,null,null,null,ActionWorkplaceFields.of("Test Department","Test Office"));
        actionService.recalculateEmployeeState(employee.getId());
    }
    @Test void externalPromotionTransferDoesNotCountAsMainDepartmentPromotion() {
        PromotionRequest request = request();
        request.setTransferringOut(true);
        request.setToDepartment("Another External Department");
        request.setToOffice("External Office");
        lifecycle.promoteEmployee(employee.getId(), request);
        em.flush(); em.clear();
        assertEquals("Another External Department", employees.findById(employee.getId()).orElseThrow().getCurrentDepartment());
        actionService.validateFullTimeline(employee.getId());
        String main = com.nwpengdep.hrms.constants.DepartmentConstants.getPrimaryDepartmentName();
        assertTrue(actions.countPromotionOutByDepartment(EmployeeActionType.PROMOTION, main, date, date).isEmpty());
        assertTrue(actions.countPromotionInByDepartment(EmployeeActionType.PROMOTION, main, date, date).isEmpty());
        var promotion = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> a.getActionType() == EmployeeActionType.PROMOTION).findFirst().orElseThrow();
        promotion.setDepartment(main); promotion.setToDepartment(main); actions.saveAndFlush(promotion);
        assertTrue(actions.countPromotionOutByDepartment(EmployeeActionType.PROMOTION, main, date, date).isEmpty());
        assertTrue(actions.countPromotionInByDepartment(EmployeeActionType.PROMOTION, main, date, date).isEmpty());
        assertEquals(1L, count(actions.countPromotionTransfersIn(main, date, date), ao.getId()));
    }

    private PromotionRequest request() {
        PromotionRequest r=new PromotionRequest();r.setNewDesignationId(ao.getId());r.setGrade(Grade.SUPRA);
        r.setServiceLevelId(level.getId());r.setPromotionDate(date);r.setAppointmentBasis("AO competitive examination 2021");return r;
    }
    @ParameterizedTest @EnumSource(value=Grade.class,names={"III","II","I"})
    void promotesToSupraAndPreservesExamAndCadreCounts(Grade grade) {
        enterGrade(grade); lifecycle.promoteEmployee(employee.getId(),request()); em.flush(); em.clear();
        Employee saved=employees.findById(employee.getId()).orElseThrow();
        assertEquals(Grade.SUPRA,saved.getGrade()); assertEquals(ao.getId(),saved.getDesignation().getId());
        assertEquals(date,saved.getCareerProgression().getSupraAchievedDate());
        List<EmployeeAction> events=actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a->date.equals(a.getActionDate())).toList();
        assertEquals(1,events.size()); EmployeeAction promotion=events.getFirst();
        assertEquals(EmployeeActionType.PROMOTION,promotion.getActionType()); assertEquals(grade,promotion.getOldGrade());
        assertEquals("AO competitive examination 2021",promotion.getAppointmentBasis());
        assertEquals(1L,count(actions.countPromotionOutByDepartment(EmployeeActionType.PROMOTION,"Test Department",date,date),mso.getId()));
        assertEquals(1L,count(actions.countPromotionInByDepartment(EmployeeActionType.PROMOTION,"Test Department",date,date),ao.getId()));
        actionService.validateFullTimeline(employee.getId());
        EmployeeActionUpdateRequest update=EmployeeActionUpdateRequest.builder().actionDate(date).newDesignationId(ao.getId())
                .grade("Supra").serviceLevelId(level.getId()).appointmentBasis("Corrected exam reference").build();
        actionService.updateEmployeeAction(promotion.getId(),update);em.flush();em.clear();
        assertEquals("Corrected exam reference",actions.findById(promotion.getId()).orElseThrow().getAppointmentBasis());
        List<CareerHistoryEventRequest> history = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId())
                .stream().filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .sorted(Comparator.comparing(EmployeeAction::getActionDate).thenComparing(EmployeeAction::getId))
                .map(a -> {
                    CareerHistoryEventRequest e = new CareerHistoryEventRequest();
                    e.setActionType(a.getActionType());e.setActionDate(a.getActionDate());e.setGrade(a.getNewGrade());
                    e.setDesignationId(a.getNewDesignation() == null ? mso.getId() : a.getNewDesignation().getId());
                    e.setServiceLevelId(level.getId());e.setDepartment(a.getDepartment());e.setOffice(a.getOffice());
                    e.setAppointmentBasis(a.getAppointmentBasis());return e;
                }).toList();
        EmployeeUpdateRequest rewrite = new EmployeeUpdateRequest();
        rewrite.setEmployeeNo(saved.getEmployeeNo());rewrite.setNic(saved.getNic());rewrite.setFullName(saved.getFullName());
        rewrite.setEmploymentType(EmploymentType.PERMANENT);rewrite.setServiceLevelId(level.getId());
        rewrite.setContactNo("0000000000");rewrite.setIncremantDate("01-01");
        rewrite.setPermanentAddress("Synthetic address");rewrite.setWidowsOrphansPensionNo("TEST-PENSION");
        rewrite.setPrivateVehicleUsedForGovWork(false);rewrite.setCareerHistory(history);
        rewrite.setExpectedHistoryRevision(actionService.historyRevision(employee.getId()));
        employeeService.updateEmployee(employee.getId(),rewrite);em.flush();em.clear();
        EmployeeAction rebuilt = actions.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employee.getId()).stream()
                .filter(a -> a.getActionType()==EmployeeActionType.PROMOTION && !Boolean.TRUE.equals(a.getDeleted()))
                .findFirst().orElseThrow();
        assertEquals("Corrected exam reference",rebuilt.getAppointmentBasis());
        assertEquals(1L,count(actions.countPromotionOutByDepartment(EmployeeActionType.PROMOTION,"Test Department",date,date),mso.getId()));
        assertEquals(1L,count(actions.countPromotionInByDepartment(EmployeeActionType.PROMOTION,"Test Department",date,date),ao.getId()));
    }
    private long count(List<Object[]> rows,Long id) {
        return rows.stream().filter(r->id.equals(((Number)r[0]).longValue())).mapToLong(r->((Number)r[1]).longValue()).sum();
    }
    @Test void requiresExam() { PromotionRequest r=request();r.setAppointmentBasis(" ");assertThrows(IllegalArgumentException.class,()->lifecycle.promoteEmployee(employee.getId(),r)); }
    @Test void rejectsAnotherService() {
        ServiceType other=ServiceType.builder().serviceCode("OTHER-"+UUID.randomUUID()).allowedGrades(new HashSet<>(Set.of(Grade.SUPRA))).build();em.persist(other);
        Designation foreign=designation("Foreign AO",other,Set.of(Grade.SUPRA));PromotionRequest r=request();r.setNewDesignationId(foreign.getId());
        assertThrows(RuntimeException.class,()->lifecycle.promoteEmployee(employee.getId(),r));
    }
}
