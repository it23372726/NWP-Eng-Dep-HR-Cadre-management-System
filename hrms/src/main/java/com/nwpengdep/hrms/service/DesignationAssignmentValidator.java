package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import org.springframework.stereotype.Component;

@Component
public class DesignationAssignmentValidator {

    public void validate(Employee employee, Designation designation) {
        if (employee == null) {
            throw new RuntimeException("Employee is required");
        }
        if (designation == null) {
            throw new RuntimeException("Designation is required");
        }
        if (employee.getEmploymentType() == com.nwpengdep.hrms.entity.EmploymentType.CONTRACT) {
            return;
        }
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return;
        }
        if (employee.getGrade() == null) {
            throw new RuntimeException("Employee grade is required");
        }
        if (employee.getServiceLevel() == null) {
            throw new RuntimeException("Employee service level is required");
        }

        if (employee.getEmploymentType() == com.nwpengdep.hrms.entity.EmploymentType.PERMANENT
                && employee.getGrade() != Grade.NONE) {
            validateGrade(employee.getGrade(), designation);
        }
        validateServiceLevel(employee.getServiceLevel(), designation);
    }

    public void validateGrade(Grade employeeGrade, Designation designation) {
        if (designation.getAllowedGrades() == null
                || designation.getAllowedGrades().isEmpty()) {
            throw new RuntimeException(
                    "Designation has no allowed grades configured"
            );
        }

        if (!designation.getAllowedGrades().contains(employeeGrade)) {
            throw new RuntimeException(
                    "Employee grade '"
                            + employeeGrade.getLabel()
                            + "' is not allowed for designation '"
                            + designation.getDesignationName()
                            + "'. Allowed grades: "
                            + designation.getAllowedGrades()
                                    .stream()
                                    .map(Grade::getLabel)
                                    .sorted()
                                    .toList()
            );
        }

        ServiceType service = designation.getService();
        if (service == null) {
            throw new RuntimeException(
                    "Designation service is not configured"
            );
        }

        validateGradeAgainstService(employeeGrade, service);
    }

    public void validateServiceLevel(
            ServiceLevel employeeServiceLevel,
            Designation designation
    ) {
        if (designation.getServiceLevel() == null) {
            throw new RuntimeException(
                    "Designation service level is not configured"
            );
        }

        if (!designation.getServiceLevel()
                .getId()
                .equals(employeeServiceLevel.getId())) {
            throw new RuntimeException(
                    "Employee service level '"
                            + employeeServiceLevel.getLevelName()
                            + "' does not match designation requirement '"
                            + designation.getServiceLevel().getLevelName()
                            + "' for '"
                            + designation.getDesignationName()
                            + "'"
            );
        }
    }

    public void validateCustomAssignment(
            Grade grade,
            Long serviceLevelId,
            ServiceType service
    ) {
        if (grade == null) {
            throw new RuntimeException("Employee grade is required");
        }
        if (serviceLevelId == null) {
            throw new RuntimeException("Service level is required");
        }
        if (service == null) {
            throw new RuntimeException("Employee service is required");
        }
        validateGradeAgainstService(grade, service);
    }

    public void validateGradeAgainstService(Grade employeeGrade, ServiceType service) {
        if (service.getAllowedGrades() == null
                || service.getAllowedGrades().isEmpty()) {
            throw new RuntimeException(
                    "Service '"
                            + service.getServiceCode()
                            + "' has no maximum achievable grades configured"
            );
        }

        if (!service.getAllowedGrades().contains(employeeGrade)) {
            throw new RuntimeException(
                    "Employee grade '"
                            + employeeGrade.getLabel()
                            + "' exceeds the maximum achievable grade for service '"
                            + service.getServiceCode()
                            + "'. Service maximum grades: "
                            + service.getAllowedGrades()
                                    .stream()
                                    .map(Grade::getLabel)
                                    .sorted()
                                    .toList()
            );
        }
    }
}
