package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class EmployeeLifecycleService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final ServiceLevelService serviceLevelService;
    private final QualificationEvaluatorService qualificationEvaluatorService;

    @Transactional
    public Employee transferOut(Long employeeId, TransferOutRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        closeCurrentPostings(employee, request.getTransferDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.TRANSFER_OUT,
                request.getTransferDate(),
                employee.getDesignation(),
                employee.getDesignation(),
                null,
                request.getTransferredTo().trim(),
                null,
                request.getRemarks()
        );

        return employee;
    }

    @Transactional
    public Employee transferIn(Long employeeId, TransferInRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employee.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.TRANSFER_IN,
                request.getEffectiveDate(),
                null,
                employee.getDesignation(),
                request.getTransferredFrom(),
                null,
                null,
                request.getRemarks()
        );

        return employee;
    }

    @Transactional
    public Employee appointNewEmployee(Long employeeId, NewAppointmentRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employee.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(employee);

        EmployeePosting newPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(employee.getDesignation())
                .startDate(request.getAppointmentDate())
                .currentPosting(true)
                .build();

        postingRepository.save(newPosting);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.NEW_APPOINTMENT,
                request.getAppointmentDate(),
                null,
                employee.getDesignation(),
                null,
                null,
                null,
                request.getRemarks()
        );

        return employee;
    }

    @Transactional
    public Employee promoteEmployee(Long employeeId, PromotionRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        Designation targetDesignation = designationRepository.findById(
                        request.getNewDesignationId()
                )
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));

        ServiceLevel targetServiceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        employee.setGrade(request.getGrade());
        employee.setServiceLevel(targetServiceLevel);

        designationAssignmentValidator.validate(employee, targetDesignation);

        boolean designationChanged = employee.getDesignation() == null
                || !employee.getDesignation()
                        .getId()
                        .equals(targetDesignation.getId());

        if (!designationChanged) {
            return employeeRepository.save(employee);
        }

        Designation oldDesignation = employee.getDesignation();

        closeCurrentPostings(employee, request.getPromotionDate());

        employee.setDesignation(targetDesignation);
        employeeRepository.save(employee);

        EmployeePosting newPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(targetDesignation)
                .startDate(request.getPromotionDate())
                .currentPosting(true)
                .build();

        postingRepository.save(newPosting);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.PROMOTION,
                request.getPromotionDate(),
                oldDesignation,
                targetDesignation,
                null,
                null,
                null,
                request.getRemarks()
        );

        return employee;
    }

    @Transactional
    public Employee retireEmployee(Long employeeId, LifecycleActionRequest request) {
        return deactivateEmployee(
                employeeId,
                request,
                EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                null
        );
    }

    @Transactional
    public Employee markDeath(Long employeeId, LifecycleActionRequest request) {
        return deactivateEmployee(
                employeeId,
                request,
                EmployeeActionType.DEATH,
                null
        );
    }

    @Transactional
    public Employee dismissEmployee(Long employeeId, DismissalRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        closeCurrentPostings(employee, request.getActionDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.DISMISSAL,
                request.getActionDate(),
                employee.getDesignation(),
                null,
                null,
                null,
                request.getReason().trim(),
                request.getRemarks()
        );

        return employee;
    }

    @Transactional
    public Employee makePermanent(Long employeeId, MakePermanentRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        qualificationEvaluatorService.evaluatePermanentQualification(employee);
        if (!Boolean.TRUE.equals(employee.getQualifiedForPermanent())) {
            throw new RuntimeException(
                    "Employee is not qualified for permanent confirmation"
            );
        }

        employee.setPermanentConfirmationDate(request.getConfirmationDate());
        qualificationEvaluatorService.evaluatePermanentQualification(employee);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.PERMANENT_CONFIRMATION,
                request.getConfirmationDate(),
                null,
                employee.getDesignation(),
                null,
                null,
                null,
                request.getRemarks()
        );

        return employee;
    }

    private Employee deactivateEmployee(
            Long employeeId,
            LifecycleActionRequest request,
            EmployeeActionType actionType,
            String reason
    ) {
        Employee employee = requireActiveEmployee(employeeId);

        closeCurrentPostings(employee, request.getActionDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                actionType,
                request.getActionDate(),
                employee.getDesignation(),
                null,
                null,
                null,
                reason,
                request.getRemarks()
        );

        return employee;
    }

    private Employee requireActiveEmployee(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Action is only allowed for active employees"
            );
        }

        return employee;
    }

    private void closeCurrentPostings(Employee employee, LocalDate endDate) {
        postingRepository.findByEmployeeId(employee.getId())
                .stream()
                .filter(posting -> Boolean.TRUE.equals(posting.getCurrentPosting()))
                .forEach(posting -> {
                    posting.setCurrentPosting(false);
                    posting.setEndDate(endDate);
                    postingRepository.save(posting);
                });
    }
}
