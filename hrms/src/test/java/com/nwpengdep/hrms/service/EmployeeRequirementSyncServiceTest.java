package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashSet;

import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.DesignationPermanentRequirement;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;

class EmployeeRequirementSyncServiceTest {

    private final EmployeeRequirementSyncService syncService =
            new EmployeeRequirementSyncService();

    @Test
    void createsMissingCustomPermanentRequirementWithPendingStatus() {
        Designation designation = designationWithCustomPermanent("Field Training");
        Employee employee = employee(Grade.III, designation);

        syncService.syncEmployeeRequirements(employee);

        assertTrue(employee.getRequirements().stream().anyMatch(requirement ->
                requirement.getRequirementType()
                        == RequirementType.CUSTOM_PERMANENT_REQUIREMENT
                        && "Field Training".equals(requirement.getRequirementName())
                        && requirement.getStatus() == RequirementStatus.PENDING
        ));
    }

    @Test
    void preservesExistingCompletionStatusWhenRequirementAlreadyExists() {
        Designation designation = designationWithCustomPermanent("Field Training");
        Employee employee = employee(Grade.III, designation);
        employee.getRequirements().add(completedCustomPermanent("Field Training"));

        syncService.syncEmployeeRequirements(employee);

        long completedCount = employee.getRequirements()
                .stream()
                .filter(requirement ->
                        requirement.getRequirementType()
                                == RequirementType.CUSTOM_PERMANENT_REQUIREMENT
                                && "Field Training".equals(
                                        requirement.getRequirementName()
                                )
                                && requirement.getStatus()
                                        == RequirementStatus.COMPLETED
                )
                .count();

        assertEquals(1, completedCount);
    }

    @Test
    void removesOrphanedCustomRequirementWhenDesignationNoLongerDefinesIt() {
        Designation designation = designationWithCustomPermanent("Current Requirement");
        Employee employee = employee(Grade.III, designation);
        employee.getRequirements().add(pendingCustomPermanent("Retired Requirement"));

        syncService.syncEmployeeRequirements(employee);

        assertTrue(employee.getRequirements().stream().noneMatch(requirement ->
                requirement.getRequirementType()
                        == RequirementType.CUSTOM_PERMANENT_REQUIREMENT
                        && "Retired Requirement".equals(
                                requirement.getRequirementName()
                        )
        ));
    }

    private Employee employee(Grade grade, Designation designation) {
        Employee employee = new Employee();
        employee.setEmploymentType(EmploymentType.PERMANENT);
        employee.setGrade(grade);
        employee.setDesignation(designation);
        employee.setRequirements(new ArrayList<>());
        return employee;
    }

    private Designation designationWithCustomPermanent(String requirementName) {
        Designation designation = new Designation();
        designation.setId(1L);
        designation.setDesignationName("Engineer");

        DesignationPermanentRequirement requirement =
                new DesignationPermanentRequirement();
        requirement.setDesignation(designation);
        requirement.setRequirementName(requirementName);

        designation.setPermanentRequirements(new HashSet<>());
        designation.getPermanentRequirements().add(requirement);
        return designation;
    }

    private com.nwpengdep.hrms.entity.EmployeeRequirement pendingCustomPermanent(
            String requirementName
    ) {
        return com.nwpengdep.hrms.entity.EmployeeRequirement.builder()
                .requirementType(RequirementType.CUSTOM_PERMANENT_REQUIREMENT)
                .requirementName(requirementName)
                .status(RequirementStatus.PENDING)
                .build();
    }

    private com.nwpengdep.hrms.entity.EmployeeRequirement completedCustomPermanent(
            String requirementName
    ) {
        return com.nwpengdep.hrms.entity.EmployeeRequirement.builder()
                .requirementType(RequirementType.CUSTOM_PERMANENT_REQUIREMENT)
                .requirementName(requirementName)
                .status(RequirementStatus.COMPLETED)
                .build();
    }
}
