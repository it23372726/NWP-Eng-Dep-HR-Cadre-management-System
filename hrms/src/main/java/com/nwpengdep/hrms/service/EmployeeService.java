package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.time.DateTimeException;
import java.time.MonthDay;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeRequirementRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;
    private final CareerHistoryValidator careerHistoryValidator;
    private final OfficeService officeService;

    @Transactional
    public Employee createEmployee(EmployeeRequest request) {
        if (request.getCareerHistory() != null
                && !request.getCareerHistory().isEmpty()) {
            return createEmployeeWithHistory(request);
        }

        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            if (request.getTransferredFrom() == null
                    || request.getTransferredFrom().isBlank()) {
                throw new RuntimeException(
                        "Transferred from is required for transfer-in employees"
                );
            }
        }

        Designation designation = resolveDesignation(request.getDesignationId());
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        Employee employee = mapRequestToEmployee(
                new Employee(),
                request,
                designation,
                serviceLevel
        );

        employee.setStatus(EmployeeStatus.ACTIVE);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        designationAssignmentValidator.validate(employee, designation);

        employee = employeeRepository.save(employee);

        EmployeePosting initialPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(designation)
                .startDate(request.getReportedDateToPresentWorkingPlace())
                .currentPosting(true)
                .build();

        postingRepository.save(initialPosting);

        officeService.validateNwpWorkplace(
                request.getCurrentWorkingPlace().trim(),
                request.getCurrentDistrictOfWorking()
        );

        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            employee.setTransferredFrom(request.getTransferredFrom().trim());
            employeeRepository.save(employee);

            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.TRANSFER_IN,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    request.getTransferredFrom().trim(),
                    null,
                    null,
                    request.getRemarks(),
                    ActionWorkplaceFields.of(
                            DepartmentConstants.NWP_ENGINEERING,
                            request.getCurrentWorkingPlace().trim(),
                            request.getCurrentDistrictOfWorking()
                    )
            );
        } else {
            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.NEW_APPOINTMENT,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    null,
                    null,
                    null,
                    request.getRemarks(),
                    ActionWorkplaceFields.of(
                            DepartmentConstants.NWP_ENGINEERING,
                            request.getCurrentWorkingPlace().trim(),
                            request.getCurrentDistrictOfWorking()
                    )
            );
        }

        employeeActionService.recalculateEmployeeState(employee.getId());

        return employee;
    }

    private Employee createEmployeeWithHistory(EmployeeRequest request) {
        if (request.getEmploymentType() != EmploymentType.PERMANENT) {
            throw new RuntimeException(
                    "Career history entry is only supported for permanent employees"
            );
        }

        List<CareerHistoryEventRequest> events = request.getCareerHistory();
        careerHistoryValidator.validate(events);

        CareerHistoryEventRequest firstEvent = events.getFirst();
        Designation finalDesignation = resolveFinalDesignation(events);
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(resolveFinalServiceLevelId(request, events));

        Employee employee = mapRequestToEmployee(
                new Employee(),
                request,
                finalDesignation,
                serviceLevel
        );

        employee.setDateOfFirstAppointment(firstEvent.getActionDate());
        employee.setStatus(EmployeeStatus.ACTIVE);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        employee = employeeRepository.save(employee);

        recordCareerHistoryActions(employee, events);

        employeeActionService.recalculateEmployeeState(employee.getId());

        Employee result = employeeRepository.findById(employee.getId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        syncRequirementsFromCareerHistory(result, events);
        requirementSyncService.syncEmployeeRequirements(result);
        careerProgressionService.recalculateEmployeeCareer(result);
        result = employeeRepository.save(result);

        if (result.getDesignation() != null) {
            designationAssignmentValidator.validate(result, result.getDesignation());
        }

        return result;
    }

    private void recordCareerHistoryActions(
            Employee employee,
            List<CareerHistoryEventRequest> events
    ) {
        Designation currentDesignation = null;
        Grade currentGrade = null;
        String currentDepartment = null;
        String currentOffice = null;

        for (CareerHistoryEventRequest event : events) {
            ActionWorkplaceFields workplace = resolveEventWorkplace(
                    event,
                    currentDepartment,
                    currentOffice
            );

            switch (event.getActionType()) {
                case NEW_APPOINTMENT -> {
                    currentDesignation = resolveDesignation(event.getDesignationId());
                    currentGrade = event.getGrade() != null
                            ? event.getGrade()
                            : Grade.III;
                    currentDepartment = workplace.getDepartment();
                    currentOffice = workplace.getOffice();
                    employeeActionService.recordActionWithGrades(
                            employee,
                            EmployeeActionType.NEW_APPOINTMENT,
                            event.getActionDate(),
                            null,
                            currentDesignation,
                            null,
                            currentGrade,
                            null,
                            null,
                            null,
                            event.getRemarks(),
                            workplace
                    );
                }

                case PERMANENT_CONFIRMATION -> {
                    employeeActionService.recordAction(
                            employee,
                            EmployeeActionType.PERMANENT_CONFIRMATION,
                            event.getActionDate(),
                            null,
                            currentDesignation,
                            null,
                            null,
                            null,
                            event.getRemarks(),
                            workplace
                    );
                    currentDepartment = workplace.getDepartment();
                    currentOffice = workplace.getOffice();
                }

                case PROMOTION, ASSIGNMENT_GRADE_UPDATE -> {
                    Designation oldDesignation = currentDesignation;
                    Grade oldGrade = currentGrade;
                    Designation newDesignation = event.getDesignationId() != null
                            ? resolveDesignation(event.getDesignationId())
                            : currentDesignation;
                    Grade newGrade = event.getGrade() != null
                            ? event.getGrade()
                            : currentGrade;

                    boolean designationChanged = oldDesignation == null
                            || newDesignation == null
                            || !oldDesignation.getId().equals(newDesignation.getId());

                    employeeActionService.recordActionWithGrades(
                            employee,
                            designationChanged
                                    ? EmployeeActionType.PROMOTION
                                    : EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                            event.getActionDate(),
                            oldDesignation,
                            newDesignation,
                            oldGrade,
                            newGrade,
                            null,
                            null,
                            null,
                            event.getRemarks(),
                            workplace
                    );

                    currentDesignation = newDesignation;
                    currentGrade = newGrade;
                    currentDepartment = workplace.getDepartment();
                    currentOffice = workplace.getOffice();
                }

                case TRANSFER_OUT -> {
                    employeeActionService.recordPairedTransferOut(
                            employee,
                            event.getActionDate(),
                            currentDesignation,
                            currentDepartment,
                            currentOffice,
                            event.getToDepartment(),
                            event.getToOffice(),
                            event.getToDistrict(),
                            event.getRemarks()
                    );
                    currentDepartment = DepartmentConstants.normalize(event.getToDepartment());
                    currentOffice = event.getToOffice().trim();
                }

                case OFFICE_CHANGE -> {
                    employeeActionService.recordAction(
                            employee,
                            EmployeeActionType.OFFICE_CHANGE,
                            event.getActionDate(),
                            currentDesignation,
                            currentDesignation,
                            null,
                            null,
                            null,
                            event.getRemarks(),
                            workplace
                    );
                    currentOffice = workplace.getOffice();
                }

                case RETIREMENT_OR_RESIGNATION, DEATH ->
                        employeeActionService.recordAction(
                                employee,
                                event.getActionType(),
                                event.getActionDate(),
                                currentDesignation,
                                null,
                                null,
                                null,
                                null,
                                event.getRemarks(),
                                workplace
                        );

                case DISMISSAL -> employeeActionService.recordAction(
                        employee,
                        EmployeeActionType.DISMISSAL,
                        event.getActionDate(),
                        currentDesignation,
                        null,
                        null,
                        null,
                        trimToNull(event.getReason()),
                        event.getRemarks(),
                        workplace
                );

                case TRANSFER_IN -> throw new RuntimeException(
                        "Transfer in is created automatically when recording a transfer out"
                );
            }
        }
    }

    private ActionWorkplaceFields resolveEventWorkplace(
            CareerHistoryEventRequest event,
            String currentDepartment,
            String currentOffice
    ) {
        if (event.getActionType() == EmployeeActionType.TRANSFER_OUT) {
            String toDepartment = DepartmentConstants.normalize(event.getToDepartment());
            officeService.validateNwpWorkplaceIfNwp(
                    toDepartment,
                    event.getToOffice(),
                    event.getToDistrict()
            );
            District district = DepartmentConstants.isNwpEngineering(toDepartment)
                    ? event.getToDistrict()
                    : null;
            return ActionWorkplaceFields.builder()
                    .department(toDepartment)
                    .office(event.getToOffice().trim())
                    .fromDepartment(currentDepartment)
                    .fromOffice(currentOffice)
                    .toDepartment(toDepartment)
                    .toOffice(event.getToOffice().trim())
                    .district(district)
                    .build();
        }

        if (event.getActionType() == EmployeeActionType.OFFICE_CHANGE) {
            if (currentDepartment == null) {
                throw new RuntimeException("Office change requires a current department");
            }
            if (DepartmentConstants.isNwpEngineering(currentDepartment)) {
                officeService.validateNwpWorkplace(
                        event.getOffice().trim(),
                        event.getDistrict()
                );
            }
            return ActionWorkplaceFields.builder()
                    .department(currentDepartment)
                    .office(event.getOffice().trim())
                    .fromDepartment(currentDepartment)
                    .fromOffice(currentOffice)
                    .toDepartment(currentDepartment)
                    .toOffice(event.getOffice().trim())
                    .district(
                            DepartmentConstants.isNwpEngineering(currentDepartment)
                                    ? event.getDistrict()
                                    : null
                    )
                    .build();
        }

        if (event.getDepartment() == null || event.getDepartment().isBlank()) {
            if (currentDepartment == null || currentDepartment.isBlank()) {
                throw new RuntimeException(
                        event.getActionType() + " requires a department"
                );
            }
            if (currentOffice == null || currentOffice.isBlank()) {
                throw new RuntimeException(
                        event.getActionType() + " requires an office"
                );
            }
            return ActionWorkplaceFields.of(
                    DepartmentConstants.normalize(currentDepartment),
                    currentOffice.trim()
            );
        }
        if (event.getOffice() == null || event.getOffice().isBlank()) {
            throw new RuntimeException(
                    event.getActionType() + " requires an office"
            );
        }

        String department = DepartmentConstants.normalize(event.getDepartment());
        District effectiveDistrict = event.getDistrict();
        if (DepartmentConstants.isNwpEngineering(department) && effectiveDistrict == null) {
            effectiveDistrict = officeService
                    .findDistrictByOfficeName(event.getOffice())
                    .orElse(null);
        }
        officeService.validateNwpWorkplaceIfNwp(
                department,
                event.getOffice(),
                effectiveDistrict
        );
        District district = DepartmentConstants.isNwpEngineering(department)
                ? effectiveDistrict
                : null;

        return ActionWorkplaceFields.of(
                department,
                event.getOffice().trim(),
                district
        );
    }

    private Designation resolveFinalDesignation(
            List<CareerHistoryEventRequest> events
    ) {
        Long designationId = null;
        for (CareerHistoryEventRequest event : events) {
            if (event.getDesignationId() != null) {
                designationId = event.getDesignationId();
            }
        }
        if (designationId == null) {
            throw new RuntimeException(
                    "Career history must include at least one designation"
            );
        }
        return resolveDesignation(designationId);
    }

    private Long resolveFinalServiceLevelId(
            EmployeeRequest request,
            List<CareerHistoryEventRequest> events
    ) {
        return resolveFinalServiceLevelId(request.getServiceLevelId(), events);
    }

    private Long resolveFinalServiceLevelId(
            Long requestServiceLevelId,
            List<CareerHistoryEventRequest> events
    ) {
        Long serviceLevelId = requestServiceLevelId;
        for (CareerHistoryEventRequest event : events) {
            if (event.getServiceLevelId() != null) {
                serviceLevelId = event.getServiceLevelId();
            }
        }
        if (serviceLevelId == null) {
            throw new RuntimeException("Service level is required");
        }
        return serviceLevelId;
    }

    private String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private void applyMaritalStatusIfProvided(
            Employee employee,
            String maritalStatus
    ) {
        if (maritalStatus != null && !maritalStatus.isBlank()) {
            employee.setMaritalStatus(maritalStatus.trim());
        }
    }

    private void applyPrivateVehicleFields(
            Employee employee,
            Boolean usedForGovWork,
            String description,
            LocalDate permissionDate
    ) {
        if (usedForGovWork == null) {
            usedForGovWork = false;
        }

        if (Boolean.TRUE.equals(usedForGovWork)) {
            String trimmedDescription = trimToNull(description);
            if (trimmedDescription == null) {
                throw new IllegalArgumentException(
                        "Private vehicle description is required when the employee "
                                + "uses a private vehicle for government work"
                );
            }
            if (permissionDate == null) {
                throw new IllegalArgumentException(
                        "Private vehicle permission date is required when the employee "
                                + "uses a private vehicle for government work"
                );
            }
            employee.setPrivateVehicleUsedForGovWork(true);
            employee.setPrivateVehicleDescription(trimmedDescription);
            employee.setPrivateVehiclePermissionDate(permissionDate);
            return;
        }

        employee.setPrivateVehicleUsedForGovWork(false);
        employee.setPrivateVehicleDescription(null);
        employee.setPrivateVehiclePermissionDate(null);
    }

    public List<Employee> getActiveEmployees() {
        return getActiveEmployeesByScope("NWP");
    }

    public List<Employee> getActiveEmployeesByScope(String departmentScope) {
        List<Employee> active = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        return filterByDepartmentScope(active, departmentScope);
    }

    private List<Employee> filterByDepartmentScope(
            List<Employee> employees,
            String departmentScope
    ) {
        if (departmentScope == null
                || departmentScope.isBlank()
                || "ALL".equalsIgnoreCase(departmentScope)) {
            return employees;
        }
        if ("NWP".equalsIgnoreCase(departmentScope)) {
            return employees.stream()
                    .filter(employee -> DepartmentConstants.isNwpEngineering(
                            employee.getCurrentDepartment()
                    ))
                    .toList();
        }
        if ("OTHER".equalsIgnoreCase(departmentScope)) {
            return employees.stream()
                    .filter(employee -> employee.getCurrentDepartment() != null
                            && !DepartmentConstants.isNwpEngineering(
                                    employee.getCurrentDepartment()
                            ))
                    .toList();
        }
        return employees;
    }

    public List<Employee> getInactiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.INACTIVE);
    }

    public List<Employee> getAllEmployees() {
        return getActiveEmployees();
    }

    @Transactional
    public Employee getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);
        return employeeRepository.save(employee);
    }

    public void deleteEmployee(Long id) {
        throw new RuntimeException(
                "Employees cannot be deleted. Use lifecycle actions instead."
        );
    }

    @Transactional
    public Employee updateEmployee(Long id, EmployeeUpdateRequest request) {
        if (request.getCareerHistory() != null
                && !request.getCareerHistory().isEmpty()) {
            return updateEmployeeWithHistory(id, request);
        }

        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        Designation designation = resolveDesignation(request.getDesignationId());

        if (employee.getDesignation() == null
                || !designation.getId().equals(employee.getDesignation().getId())) {
            throw new RuntimeException(
                    "Designation changes must be done through promotion"
            );
        }

        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        mapUpdateRequestToEmployee(
                employee,
                request,
                designation,
                serviceLevel
        );

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        designationAssignmentValidator.validate(employee, designation);

        return employeeRepository.save(employee);
    }

    private Employee updateEmployeeWithHistory(
            Long id,
            EmployeeUpdateRequest request
    ) {
        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        if (request.getEmploymentType() != EmploymentType.PERMANENT) {
            throw new RuntimeException(
                    "Career history updates are only supported for permanent employees"
            );
        }

        List<CareerHistoryEventRequest> events = request.getCareerHistory();
        careerHistoryValidator.validate(events);
        rejectTerminalHistoryForActiveEmployee(events);

        CareerHistoryEventRequest firstEvent = events.getFirst();
        ServiceLevel serviceLevel = serviceLevelService.resolve(
                resolveFinalServiceLevelId(request.getServiceLevelId(), events)
        );

        applyNonCareerFieldsFromUpdate(employee, request, serviceLevel);
        employee.setDateOfFirstAppointment(firstEvent.getActionDate());
        employeeRepository.save(employee);

        employeeActionRepository.deleteByEmployeeId(id);
        postingRepository.deleteByEmployeeId(id);

        recordCareerHistoryActions(employee, events);
        employeeActionService.recalculateEmployeeState(id);

        Employee result = getEmployeeById(id);
        applyNonCareerFieldsFromUpdate(result, request, serviceLevel);
        syncRequirementsFromCareerHistory(result, events);
        requirementSyncService.syncEmployeeRequirements(result);
        careerProgressionService.recalculateEmployeeCareer(result);

        if (result.getDesignation() != null) {
            designationAssignmentValidator.validate(
                    result,
                    result.getDesignation()
            );
        }

        return employeeRepository.save(result);
    }

    private void rejectTerminalHistoryForActiveEmployee(
            List<CareerHistoryEventRequest> events
    ) {
        CareerHistoryEventRequest lastEvent = events.getLast();
        switch (lastEvent.getActionType()) {
            case RETIREMENT_OR_RESIGNATION, DEATH, DISMISSAL ->
                    throw new RuntimeException(
                            "Active employees cannot have a terminal event "
                                    + "as the last career history entry"
                    );
            default -> {
            }
        }
    }

    private void applyNonCareerFieldsFromUpdate(
            Employee employee,
            EmployeeUpdateRequest request,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        applyIncremantDate(employee, request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate()
        );
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(EmploymentType.PERMANENT);
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved(),
                request.getAlreadyConfirmedPermanent(),
                request.getPermanentConfirmationDate(),
                request.getEbGrade2Passed(),
                request.getOtherGrade2RequirementCompleted(),
                request.getGrade2RequiredYears(),
                request.getGrade1RequiredYears(),
                request.getRequirements(),
                request.getQualificationUpdateOnly()
        );
    }

    public List<Employee> searchActiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.ACTIVE
                );
    }

    public List<Employee> searchInactiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.INACTIVE
                );
    }

    public List<Employee> searchEmployees(String keyword) {
        return searchActiveEmployees(keyword);
    }

    public Page<Employee> getEmployeesPaginated(int page, int size) {
        return employeeRepository.findAll(PageRequest.of(page, size));
    }

    private void mapUpdateRequestToEmployee(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        applyIncremantDate(employee, request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate()
        );
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved(),
                request.getAlreadyConfirmedPermanent(),
                request.getPermanentConfirmationDate(),
                request.getEbGrade2Passed(),
                request.getOtherGrade2RequirementCompleted(),
                request.getGrade2RequiredYears(),
                request.getGrade1RequiredYears(),
                request.getRequirements(),
                request.getQualificationUpdateOnly()
        );
    }

    private Employee mapRequestToEmployee(
            Employee employee,
            EmployeeRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        applyIncremantDate(employee, request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate()
        );
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved(),
                request.getAlreadyConfirmedPermanent(),
                request.getPermanentConfirmationDate(),
                request.getEbGrade2Passed(),
                request.getOtherGrade2RequirementCompleted(),
                request.getGrade2RequiredYears(),
                request.getGrade1RequiredYears(),
                request.getRequirements(),
                null
        );

        return employee;
    }

    private Grade resolveGrade(EmploymentType employmentType, Grade grade) {
        if (employmentType != EmploymentType.PERMANENT) {
            return Grade.NONE;
        }
        return grade != null ? grade : Grade.NONE;
    }

    private void applyQualificationFields(
            Employee employee,
            Boolean ebGrade3Passed,
            Boolean languageQualificationPassed,
            Boolean medicalReportCompleted,
            Boolean olApproved,
            Boolean alApproved,
            Boolean degreeApproved,
            String otherQualificationName,
            Boolean otherQualificationApproved,
            Boolean birthCertificateApproved,
            Boolean alreadyConfirmedPermanent,
            LocalDate permanentConfirmationDate,
            Boolean ebGrade2Passed,
            Boolean otherGrade2RequirementCompleted,
            Integer grade2RequiredYears,
            Integer grade1RequiredYears,
            List<EmployeeRequirementRequest> requirements,
            Boolean qualificationUpdateOnly
    ) {
        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);

        if (requirements != null) {
            applyRequirementRequests(employee, requirements);
        } else {
            applyLegacyRequirementFields(
                    employee,
                    ebGrade3Passed,
                    languageQualificationPassed,
                    medicalReportCompleted,
                    olApproved,
                    alApproved,
                    degreeApproved,
                    otherQualificationName,
                    otherQualificationApproved,
                    birthCertificateApproved,
                    ebGrade2Passed,
                    otherGrade2RequirementCompleted
            );
        }

        requirementSyncService.syncEmployeeRequirements(employee);

        if (!Boolean.TRUE.equals(qualificationUpdateOnly)) {
            boolean permanentGradeThreeAlreadyConfirmed =
                    employee.getEmploymentType() == EmploymentType.PERMANENT
                            && employee.getGrade() == Grade.III
                            && Boolean.TRUE.equals(alreadyConfirmedPermanent);
            boolean permanentGradeTwoOrAbove =
                    employee.getEmploymentType() == EmploymentType.PERMANENT
                            && (employee.getGrade() == Grade.II
                                || employee.getGrade() == Grade.I
                                || employee.getGrade() == Grade.SUPRA
                                || employee.getGrade() == Grade.SPECIAL);

            if (permanentGradeThreeAlreadyConfirmed || permanentGradeTwoOrAbove) {
                markPermanentRequirementsCompleted(employee);
            }

            if (permanentGradeThreeAlreadyConfirmed || permanentGradeTwoOrAbove) {
                LocalDate confirmedDate = permanentConfirmationDate != null
                        ? permanentConfirmationDate
                        : employee.getAppointmentDateToPresentClassGrade();
                careerProgression.setPermanentConfirmationDate(confirmedDate);
                careerProgression.setGrade3AchievedDate(confirmedDate);
            } else if (careerProgression.getPermanentConfirmationDate() != null
                    && employee.getPermanentStatus() == PermanentStatus.PERMANENT) {
                careerProgression.setPermanentConfirmationDate(null);
            }

            if (permanentGradeTwoOrAbove) {
                setRequirementCompleted(employee, RequirementType.EB_GRADE_2);
                markCustomGrade2RequirementsCompleted(employee);
            }
            if (employee.getGrade() == Grade.I
                    || employee.getGrade() == Grade.SUPRA
                    || employee.getGrade() == Grade.SPECIAL) {
                setRequirementCompleted(employee, RequirementType.EB_GRADE_1);
                markCustomGrade1RequirementsCompleted(employee);
            }
        }
        careerProgression.setGrade2RequiredYears(
                employee.getDesignation() != null
                        ? employee.getDesignation().getGrade2RequiredYears()
                        : grade2RequiredYears
        );
        careerProgression.setGrade1RequiredYears(
                employee.getDesignation() != null
                        ? employee.getDesignation().getGrade1RequiredYears()
                        : grade1RequiredYears
        );
    }

    private void syncRequirementsFromCareerHistory(
            Employee employee,
            List<CareerHistoryEventRequest> events
    ) {
        if (events == null || events.isEmpty()) {
            return;
        }

        requirementSyncService.syncEmployeeRequirements(employee);

        Grade currentGrade = null;
        boolean permanentConfirmed = false;
        boolean grade2Achieved = false;
        boolean grade1Achieved = false;

        for (CareerHistoryEventRequest event : events) {
            switch (event.getActionType()) {
                case NEW_APPOINTMENT ->
                        currentGrade = event.getGrade() != null
                                ? event.getGrade()
                                : Grade.III;
                case PERMANENT_CONFIRMATION -> permanentConfirmed = true;
                case PROMOTION, ASSIGNMENT_GRADE_UPDATE -> {
                    Grade oldGrade = currentGrade;
                    if (event.getGrade() != null) {
                        if (oldGrade == Grade.III && event.getGrade() == Grade.II) {
                            grade2Achieved = true;
                        }
                        if (oldGrade == Grade.II && event.getGrade() == Grade.I) {
                            grade1Achieved = true;
                        }
                        currentGrade = event.getGrade();
                    }
                }
                default -> {
                }
            }
        }

        if (permanentConfirmed) {
            markPermanentRequirementsCompleted(employee);
        }
        if (grade2Achieved) {
            setRequirementCompleted(employee, RequirementType.EB_GRADE_2);
            markCustomGrade2RequirementsCompleted(employee);
        }
        if (grade1Achieved) {
            setRequirementCompleted(employee, RequirementType.EB_GRADE_1);
            markCustomGrade1RequirementsCompleted(employee);
        }
    }

    private void markPermanentRequirementsCompleted(Employee employee) {
        setRequirementCompleted(employee, RequirementType.EB_GRADE_3);
        setRequirementCompleted(
                employee,
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
        );
        setRequirementCompleted(employee, RequirementType.MEDICAL_REPORT);
        setRequirementCompleted(employee, RequirementType.OL_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.AL_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.DEGREE_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.BIRTH_CERTIFICATE);
        if (employee.getDesignation() != null
                && employee.getDesignation().getPermanentRequirements() != null) {
            employee.getDesignation()
                    .getPermanentRequirements()
                    .forEach(requirement -> setRequirementCompleted(
                            employee,
                            RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                            requirement.getRequirementName()
                    ));
        }
    }

    private void markCustomGrade2RequirementsCompleted(Employee employee) {
        if (employee.getDesignation() == null
                || employee.getDesignation().getGrade2Requirements() == null) {
            return;
        }

        employee.getDesignation()
                .getGrade2Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        requirement.getRequirementName()
                ));
    }

    private void markCustomGrade1RequirementsCompleted(Employee employee) {
        if (employee.getDesignation() == null
                || employee.getDesignation().getGrade1Requirements() == null) {
            return;
        }

        employee.getDesignation()
                .getGrade1Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        requirement.getRequirementName()
                ));
    }

    private void applyLegacyRequirementFields(
            Employee employee,
            Boolean ebGrade3Passed,
            Boolean languageQualificationPassed,
            Boolean medicalReportCompleted,
            Boolean olApproved,
            Boolean alApproved,
            Boolean degreeApproved,
            String otherQualificationName,
            Boolean otherQualificationApproved,
            Boolean birthCertificateApproved,
            Boolean ebGrade2Passed,
            Boolean otherGrade2RequirementCompleted
    ) {
        setRequirementStatus(
                employee,
                RequirementType.EB_GRADE_3,
                ebGrade3Passed,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
                languageQualificationPassed,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.MEDICAL_REPORT,
                medicalReportCompleted,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.OL_CERTIFICATE,
                olApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.AL_CERTIFICATE,
                alApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.DEGREE_CERTIFICATE,
                degreeApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.BIRTH_CERTIFICATE,
                birthCertificateApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.EB_GRADE_2,
                ebGrade2Passed,
                null
        );
    }

    private void applyRequirementRequests(
            Employee employee,
            List<EmployeeRequirementRequest> requirements
    ) {
        requirements.stream()
                .filter(request -> request.getRequirementType() != null)
                .forEach(request -> upsertRequirement(
                        employee,
                        request.getRequirementType(),
                        request.getStatus() != null
                                ? request.getStatus()
                                : RequirementStatus.PENDING,
                        request.getRequirementName(),
                        request.getCompletedDate(),
                        request.getRemarks()
                ));
    }

    private void setRequirementStatus(
            Employee employee,
            RequirementType type,
            Boolean completed,
            String requirementName
    ) {
        upsertRequirement(
                employee,
                type,
                Boolean.TRUE.equals(completed)
                        ? RequirementStatus.COMPLETED
                        : RequirementStatus.PENDING,
                requirementName,
                Boolean.TRUE.equals(completed) ? LocalDate.now() : null,
                null
        );
    }

    private void setRequirementCompleted(Employee employee, RequirementType type) {
        setRequirementCompleted(employee, type, null);
    }

    private void setRequirementCompleted(
            Employee employee,
            RequirementType type,
            String requirementName
    ) {
        upsertRequirement(
                employee,
                type,
                RequirementStatus.COMPLETED,
                requirementName,
                LocalDate.now(),
                null
        );
    }

    private void upsertRequirement(
            Employee employee,
            RequirementType type,
            RequirementStatus status,
            String requirementName,
            LocalDate completedDate,
            String remarks
    ) {
        if (employee.getRequirements() == null) {
            employee.setRequirements(new java.util.ArrayList<>());
        }

        EmployeeRequirement requirement = employee.getRequirements()
                .stream()
                .filter(existing -> existing.getRequirementType() == type
                        && sameRequirementName(
                                existing.getRequirementName(),
                                requirementName
                        ))
                .findFirst()
                .orElseGet(() -> {
                    EmployeeRequirement created = new EmployeeRequirement();
                    created.setEmployee(employee);
                    created.setRequirementType(type);
                    employee.getRequirements().add(created);
                    return created;
                });

        if (requirement.getStatus() == RequirementStatus.COMPLETED
                && status == RequirementStatus.PENDING
                && !allowsRequirementDowngrade(employee, type)) {
            return;
        }

        requirement.setStatus(status);
        requirement.setRequirementName(
                requirementName != null && !requirementName.isBlank()
                        ? requirementName.trim()
                        : null
        );
        requirement.setCompletedDate(
                status == RequirementStatus.COMPLETED
                        ? (completedDate != null ? completedDate : LocalDate.now())
                        : null
        );
        requirement.setRemarks(
                remarks != null && !remarks.isBlank() ? remarks.trim() : null
        );
    }

    private boolean sameRequirementName(String left, String right) {
        String leftValue = left != null ? left.trim() : "";
        String rightValue = right != null ? right.trim() : "";
        return leftValue.equalsIgnoreCase(rightValue);
    }

    private boolean allowsRequirementDowngrade(
            Employee employee,
            RequirementType type
    ) {
        if (employee.getEmploymentType() != EmploymentType.PERMANENT) {
            return false;
        }

        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;
        boolean confirmedPermanent = employee.getCareerProgression() != null
                && employee.getCareerProgression().getPermanentConfirmationDate()
                        != null;

        if (isGrade1RequirementType(type)) {
            return grade == Grade.II
                    || grade == Grade.I
                    || grade == Grade.SUPRA
                    || grade == Grade.SPECIAL;
        }

        if (isGrade2RequirementType(type)) {
            return grade == Grade.III && confirmedPermanent;
        }

        if (isPermanentRequirementType(type)) {
            return grade == Grade.III && !confirmedPermanent;
        }

        return false;
    }

    private boolean isPermanentRequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_3
                || type == RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
                || type == RequirementType.MEDICAL_REPORT
                || type == RequirementType.OL_CERTIFICATE
                || type == RequirementType.AL_CERTIFICATE
                || type == RequirementType.DEGREE_CERTIFICATE
                || type == RequirementType.BIRTH_CERTIFICATE
                || type == RequirementType.CUSTOM_PERMANENT_REQUIREMENT;
    }

    private boolean isGrade2RequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_2
                || type == RequirementType.CUSTOM_GRADE_2_REQUIREMENT;
    }

    private boolean isGrade1RequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_1
                || type == RequirementType.CUSTOM_GRADE_1_REQUIREMENT;
    }

    private void applyIncremantDate(Employee employee, String incremantDate) {
        if (incremantDate == null || incremantDate.isBlank()) {
            employee.setIncremantDate(null);
            return;
        }

        if (!incremantDate.matches("\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException(
                    "Increment date must use MM-DD format with a valid month and day."
            );
        }

        String[] parts = incremantDate.split("-");
        int month = Integer.parseInt(parts[0]);
        int day = Integer.parseInt(parts[1]);

        try {
            MonthDay.of(month, day);
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException(
                    "Increment date must use MM-DD format with a valid month and day."
            );
        }

        employee.setIncremantDate(incremantDate);
    }

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
