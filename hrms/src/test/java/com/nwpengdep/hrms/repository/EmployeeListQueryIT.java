package com.nwpengdep.hrms.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.EmployeeListItemResponse;
import com.nwpengdep.hrms.entity.ChildRelationship;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.mapper.EmployeeListItemMapper;

import jakarta.persistence.EntityManager;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeListQueryIT {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void listQueryDoesNotDuplicateEmployeesWhenRequirementsAreFetched() {
        Employee employee = Employee.builder()
                .employeeNo("LIST-IT-001")
                .fullName("List Query Person")
                .nic("900000001V")
                .grade(Grade.III)
                .status(EmployeeStatus.ACTIVE)
                .employmentType(EmploymentType.PERMANENT)
                .transferredFrom("Previous Department")
                .requirements(new ArrayList<>())
                .children(new ArrayList<>())
                .build();

        EmployeeRequirement first = EmployeeRequirement.builder()
                .employee(employee)
                .requirementType(RequirementType.CUSTOM_PERMANENT_REQUIREMENT)
                .requirementName("First")
                .status(RequirementStatus.PENDING)
                .build();
        EmployeeRequirement second = EmployeeRequirement.builder()
                .employee(employee)
                .requirementType(RequirementType.CUSTOM_GRADE_2_REQUIREMENT)
                .requirementName("Second")
                .status(RequirementStatus.COMPLETED)
                .build();
        employee.getRequirements().add(first);
        employee.getRequirements().add(second);

        EmployeeSpouse spouse = EmployeeSpouse.builder()
                .employee(employee)
                .fullName("Spouse Name")
                .build();
        employee.setSpouse(spouse);

        EmployeeChild child = EmployeeChild.builder()
                .employee(employee)
                .fullName("Child Name")
                .birthCertificateNo("BC-IT-1")
                .dateOfBirth(LocalDate.of(2018, 4, 1))
                .relationship(ChildRelationship.SON)
                .build();
        employee.getChildren().add(child);

        employeeRepository.saveAndFlush(employee);
        entityManager.clear();

        List<Employee> loaded = employeeRepository.findForListByStatus(
                EmployeeStatus.ACTIVE
        ).stream()
                .filter(item -> "LIST-IT-001".equals(item.getEmployeeNo()))
                .toList();

        assertEquals(1, loaded.size());
        assertEquals(2, loaded.get(0).getRequirements().size());

        EmployeeListItemResponse dto = EmployeeListItemMapper.toListItem(loaded.get(0));
        assertEquals("Previous Department", dto.getTransferredFrom());
        assertEquals(2, dto.getRequirements().size());
        assertNull(dto.getDesignation());
        assertNotNull(dto.getId());
    }
}
