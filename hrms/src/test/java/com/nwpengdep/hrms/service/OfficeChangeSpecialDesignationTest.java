package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
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
import com.nwpengdep.hrms.dto.OfficeChangeRequest;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.EmployeeRepository;

/** An office may use a different local title for the same declared designation, service and grade. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OfficeChangeSpecialDesignationTest {
    @Autowired EntityManager em;
    @Autowired EmployeeRepository employees;
    @Autowired EmployeeLifecycleService lifecycle;
    @Autowired EmployeeActionService actionService;
    @Autowired EmployeeService employeeService;
    Employee employee;
    Designation technicalOfficer;

    @BeforeEach void setup() {
        ServiceLevel level = ServiceLevel.builder().levelName("Office change test " + UUID.randomUUID()).build();
        em.persist(level);
        ServiceType service = ServiceType.builder().serviceCode("OCT-" + UUID.randomUUID())
                .description("Office change test service")
                .allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .grade2RequiredYears(10).grade1RequiredYears(10).build();
        em.persist(service);
        technicalOfficer = Designation.builder().designationName("Technical Officer").service(service)
                .serviceLevel(level).allowedGrades(new HashSet<>(Set.of(Grade.III, Grade.II, Grade.I)))
                .createdAt(LocalDateTime.now()).build();
        em.persist(technicalOfficer);
        employee = Employee.builder().employeeNo(UUID.randomUUID().toString()).nic(UUID.randomUUID().toString())
                .fullName("Office change test").grade(Grade.III).status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT).designation(technicalOfficer).service(service)
                .serviceLevel(level).dateOfFirstAppointment(LocalDate.of(2015, 1, 1))
                .currentDepartment("Other Department").currentOffice("Office A").build();
        employee.setIncremantDate("01-01");
        employees.saveAndFlush(employee);
        actionService.recordActionWithGrades(employee, EmployeeActionType.NEW_APPOINTMENT, LocalDate.of(2015, 1, 1),
                null, technicalOfficer, null, Grade.III, null, null, null, null,
                ActionWorkplaceFields.of("Other Department", "Office A"));
        actionService.recalculateEmployeeState(employee.getId());
        em.flush();
        reload();
    }

    @Test void officeChangeCanSetALocalTitleWithoutTouchingTheDeclaredDesignation() {
        lifecycle.officeChange(employee.getId(), request("Office B", "District Engineer")); reload();
        assertEquals("District Engineer", employee.getSpecialDesignationName());
        assertEquals("Office B", employee.getCurrentOffice());
        assertEquals(technicalOfficer.getId(), employee.getDesignation().getId());
        assertEquals(Grade.III, employee.getGrade());
    }

    @Test void aLaterOfficeChangeCanClearTheLocalTitle() {
        lifecycle.officeChange(employee.getId(), request("Office B", "District Engineer")); reload();
        lifecycle.officeChange(employee.getId(), request("Office C", "")); reload();
        assertNull(employee.getSpecialDesignationName());
        assertEquals("Office C", employee.getCurrentOffice());
    }

    @Test void anOfficeChangeRecordedBeforeTheFieldExistedLeavesTheLocalTitleAlone() {
        lifecycle.officeChange(employee.getId(), request("Office B", "District Engineer")); reload();

        // A legacy action carries no special designation and no "updated" marker.
        actionService.recordAction(employee, EmployeeActionType.OFFICE_CHANGE, LocalDate.of(2020, 1, 1),
                employee.getDesignation(), employee.getDesignation(), null, null, null, null,
                ActionWorkplaceFields.builder().department("Other Department").office("Office D")
                        .fromDepartment("Other Department").fromOffice("Office B")
                        .toDepartment("Other Department").toOffice("Office D").build());
        actionService.recalculateEmployeeState(employee.getId()); reload();

        assertEquals("District Engineer", employee.getSpecialDesignationName());
        assertEquals("Office D", employee.getCurrentOffice());
    }

    @Test void aCustomDesignationTitleCannotAlsoCarryALocalTitle() {
        employee.setDesignation(null);
        employee.setRecordedDesignationName("Custom recorded title");
        employees.saveAndFlush(employee);
        assertThrows(RuntimeException.class,
                () -> lifecycle.officeChange(employee.getId(), request("Office B", "District Engineer")));
    }

    private OfficeChangeRequest request(String office, String specialDesignationName) {
        OfficeChangeRequest r = new OfficeChangeRequest();
        r.setEffectiveDate(LocalDate.of(2019, 1, 1));
        r.setOffice(office);
        r.setSpecialDesignationName(specialDesignationName);
        return r;
    }

    private void reload() {
        Long id = employee.getId();
        em.flush(); em.clear();
        employee = employeeService.getEmployeeById(id);
    }
}
