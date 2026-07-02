package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;

import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceSupraRequirement;
import com.nwpengdep.hrms.entity.ServiceType;

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
    void removesOrphanedCustomRequirementWhenServiceNoLongerDefinesIt() {
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

    @Test
    void completesSupraRequirementsAfterPromotionFromGradeOne() {
        Designation designation = designationWithSupraRequirement("Board Interview");
        Employee employee = employee(Grade.SUPRA, designation);
        employee.getRequirements().add(
                pendingRequirement(RequirementType.SUPRA_REQUIREMENT, null)
        );
        employee.getRequirements().add(
                pendingRequirement(
                        RequirementType.CUSTOM_SUPRA_REQUIREMENT,
                        "Board Interview"
                )
        );

        syncService.completeRequirementsForGradePromotion(
                employee,
                Grade.I,
                Grade.SUPRA,
                null
        );

        assertTrue(employee.getRequirements().stream().allMatch(requirement ->
                requirement.getStatus() == RequirementStatus.COMPLETED
        ));
    }

    @Test
    void completesRequirementsForAchievedSupraGrade() {
        Designation designation = designationWithSupraRequirement("Board Interview");
        Employee employee = employee(Grade.SUPRA, designation);

        syncService.syncEmployeeRequirements(employee);
        syncService.completeRequirementsForAchievedGrade(employee);

        assertTrue(employee.getRequirements().stream().anyMatch(requirement ->
                requirement.getRequirementType() == RequirementType.SUPRA_REQUIREMENT
                        && requirement.getStatus() == RequirementStatus.COMPLETED
        ));
        assertTrue(employee.getRequirements().stream().anyMatch(requirement ->
                requirement.getRequirementType()
                        == RequirementType.CUSTOM_SUPRA_REQUIREMENT
                        && "Board Interview".equals(requirement.getRequirementName())
                        && requirement.getStatus() == RequirementStatus.COMPLETED
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
        ServiceType service = new ServiceType();
        service.setId(1L);
        service.setServiceCode("SLEgS");

        ServicePermanentRequirement requirement =
                new ServicePermanentRequirement();
        requirement.setService(service);
        requirement.setRequirementName(requirementName);

        service.setPermanentRequirements(new HashSet<>());
        service.getPermanentRequirements().add(requirement);

        Designation designation = new Designation();
        designation.setId(1L);
        designation.setDesignationName("Engineer");
        designation.setService(service);
        return designation;
    }

    private Designation designationWithSupraRequirement(String requirementName) {
        ServiceType service = new ServiceType();
        service.setId(1L);
        service.setServiceCode("SLEgS");
        service.setAllowedGrades(EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I,
                Grade.SUPRA
        ));

        ServiceSupraRequirement requirement = new ServiceSupraRequirement();
        requirement.setService(service);
        requirement.setRequirementName(requirementName);

        service.setSupraRequirements(new HashSet<>());
        service.getSupraRequirements().add(requirement);

        Designation designation = new Designation();
        designation.setId(1L);
        designation.setDesignationName("Engineer");
        designation.setService(service);
        return designation;
    }

    private com.nwpengdep.hrms.entity.EmployeeRequirement pendingRequirement(
            RequirementType type,
            String requirementName
    ) {
        return com.nwpengdep.hrms.entity.EmployeeRequirement.builder()
                .requirementType(type)
                .requirementName(requirementName)
                .status(RequirementStatus.PENDING)
                .build();
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
