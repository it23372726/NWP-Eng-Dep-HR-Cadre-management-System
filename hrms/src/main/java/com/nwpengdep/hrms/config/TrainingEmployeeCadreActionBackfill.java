package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.service.EmployeeActionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TrainingEmployeeCadreActionBackfill {

    private final EmployeeRepository employeeRepository;
    private final EmployeeActionService employeeActionService;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillTrainingEmployeeCadreActions() {
        try {
            List<Employee> trainees = employeeRepository
                    .findActiveTrainingEmployeesWithoutNewAppointment(
                            EmployeeStatus.ACTIVE
                    );

            if (trainees.isEmpty()) {
                return;
            }

            int backfilled = 0;
            for (Employee employee : trainees) {
                if (employee.getDesignation() == null) {
                    log.warn(
                            "Skipped training employee cadre backfill (no designation): id={}",
                            employee.getId()
                    );
                    continue;
                }

                LocalDate actionDate = resolveActionDate(employee);
                if (actionDate == null) {
                    log.warn(
                            "Skipped training employee cadre backfill (no action date): id={}",
                            employee.getId()
                    );
                    continue;
                }

                String office = resolveOffice(employee);
                if (office == null || office.isBlank()) {
                    log.warn(
                            "Skipped training employee cadre backfill (no workplace): id={}",
                            employee.getId()
                    );
                    continue;
                }

                EmployeeAction trainingAction = employeeActionService.recordAction(
                        employee,
                        EmployeeActionType.NEW_APPOINTMENT,
                        actionDate,
                        null,
                        employee.getDesignation(),
                        null,
                        null,
                        null,
                        "Backfilled trainee appointment",
                        ActionWorkplaceFields.of(
                                DepartmentConstants.NWP_ENGINEERING,
                                office.trim(),
                                employee.getCurrentDistrictOfWorking()
                        )
                );
                trainingAction.setTrainingAppointment(true);
                employeeActionService.saveAction(trainingAction);
                backfilled++;
            }

            if (backfilled > 0) {
                log.info(
                        "Backfilled trainee appointment for {} training employee(s)",
                        backfilled
                );
            }
        } catch (Exception e) {
            log.warn(
                    "Training employee cadre action backfill skipped: {}",
                    e.getMessage()
            );
        }
    }

    private LocalDate resolveActionDate(Employee employee) {
        if (employee.getReportedDateToPresentWorkingPlace() != null) {
            return employee.getReportedDateToPresentWorkingPlace();
        }
        if (employee.getDateOfFirstAppointment() != null) {
            return employee.getDateOfFirstAppointment();
        }
        if (employee.getCreatedAt() != null) {
            return employee.getCreatedAt().toLocalDate();
        }
        return null;
    }

    private String resolveOffice(Employee employee) {
        if (employee.getCurrentOffice() != null
                && !employee.getCurrentOffice().isBlank()) {
            return employee.getCurrentOffice();
        }
        return employee.getCurrentWorkingPlace();
    }
}
