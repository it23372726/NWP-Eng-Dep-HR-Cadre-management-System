package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
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
        if (employee.getGrade() == null) {
            throw new RuntimeException("Employee grade is required");
        }
        if (employee.getServiceLevel() == null) {
            throw new RuntimeException("Employee service level is required");
        }

        if (employee.getEmploymentType() == EmploymentType.PERMANENT
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
}
