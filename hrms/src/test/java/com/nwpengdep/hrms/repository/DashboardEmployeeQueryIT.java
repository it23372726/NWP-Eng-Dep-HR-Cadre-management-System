package com.nwpengdep.hrms.repository;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DashboardEmployeeQueryIT {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EmployeeActionRepository employeeActionRepository;

    @Test
    void activeExcludingSystemPendingUsesCareerActionRule() {
        Employee pendingPermanent = saveEmployee("DASH-Q-PENDING", EmploymentType.PERMANENT, EmployeeStatus.ACTIVE);
        Employee eligiblePermanent = saveEmployee("DASH-Q-ACTIVE", EmploymentType.PERMANENT, EmployeeStatus.ACTIVE);
        saveAction(eligiblePermanent, false);

        Employee deletedOnly = saveEmployee("DASH-Q-DELETED", EmploymentType.PERMANENT, EmployeeStatus.ACTIVE);
        saveAction(deletedOnly, true);

        Employee contractNoAction = saveEmployee("DASH-Q-CONTRACT", EmploymentType.CONTRACT, EmployeeStatus.ACTIVE);
        Employee inactive = saveEmployee("DASH-Q-INACTIVE", EmploymentType.PERMANENT, EmployeeStatus.INACTIVE);
        saveAction(inactive, false);

        Set<String> included = employeeRepository
                .findActiveExcludingSystemPending(EmployeeStatus.ACTIVE)
                .stream()
                .map(Employee::getEmployeeNo)
                .collect(Collectors.toSet());

        assertFalse(included.contains(pendingPermanent.getEmployeeNo()));
        assertTrue(included.contains(eligiblePermanent.getEmployeeNo()));
        assertFalse(included.contains(deletedOnly.getEmployeeNo()));
        assertTrue(included.contains(contractNoAction.getEmployeeNo()));
        assertFalse(included.contains(inactive.getEmployeeNo()));
    }

    private Employee saveEmployee(String employeeNo, EmploymentType type, EmployeeStatus status) {
        return employeeRepository.saveAndFlush(Employee.builder()
                .employeeNo(employeeNo)
                .fullName(employeeNo + " Person")
                .nic(employeeNo + "V")
                .grade(Grade.III)
                .status(status)
                .employmentType(type)
                .dateOfBirth(LocalDate.of(1966, 9, 15))
                .currentDepartment("NWP Engineering Department")
                .build());
    }

    private void saveAction(Employee employee, boolean deleted) {
        employeeActionRepository.saveAndFlush(EmployeeAction.builder()
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(LocalDate.of(2020, 1, 1))
                .deleted(deleted)
                .trainingGraduation(false)
                .trainingAppointment(false)
                .build());
    }
}
