package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.time.DateTimeException;
import java.time.MonthDay;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.dto.EmployeeChildRequest;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeRequirementRequest;
import com.nwpengdep.hrms.dto.EmployeeSpouseRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.ChildRelationship;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.EmployeePrivateVehicle;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;
    private final CareerHistoryValidator careerHistoryValidator;
    private final OfficeService officeService;
    private final EmployeeServiceResolver employeeServiceResolver;
    private final TrainingGraduationService trainingGraduationService;

    @Transactional
    public Employee createEmployee(EmployeeRequest request) {
        if (isContract(request.getEmploymentType())) {
            return createContractEmployee(request);
        }

        if (isTrainingCreateRequest(request)) {
            return createTrainingEmployee(request);
        }

        validateNonContractCreateRequest(request);
        validateUniqueEmployeeIdentifiers(request.getEmployeeNo(), request.getNic(), null);

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
        return finalizeNonPermanentAppointmentDates(employee.getId(), request);
    }

    private Employee finalizeNonPermanentAppointmentDates(
            Long employeeId,
            EmployeeRequest request
    ) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (request.getEmploymentType() == EmploymentType.PERMANENT
                || isContract(request.getEmploymentType())) {
            return employee;
        }

        boolean changed = false;
        if (request.getDateOfFirstAppointment() != null) {
            employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
            changed = true;
        }
        if (request.getAppointmentDateToPresentClassGrade() != null) {
            employee.setAppointmentDateToPresentClassGrade(
                    request.getAppointmentDateToPresentClassGrade()
            );
            changed = true;
        }

        return changed ? employeeRepository.save(employee) : employee;
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
        FinalAssignmentState finalAssignment = resolveFinalAssignmentState(events);
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(resolveFinalServiceLevelId(request, events));

        Employee employee = mapRequestToEmployee(
                new Employee(),
                request,
                finalAssignment.designation(),
                serviceLevel
        );
        applyFinalAssignmentState(employee, finalAssignment);

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
        } else if (result.getRecordedDesignationName() != null
                && result.getService() != null) {
            designationAssignmentValidator.validateCustomAssignment(
                    result.getGrade(),
                    result.getServiceLevel().getId(),
                    result.getService()
            );
        }

        return result;
    }

    private record FinalAssignmentState(
            Designation designation,
            String recordedDesignationName,
            ServiceType service
    ) {
    }

    private void recordCareerHistoryActions(
            Employee employee,
            List<CareerHistoryEventRequest> events
    ) {
        Designation currentDesignation = null;
        String currentRecordedName = null;
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
                    currentGrade = event.getGrade() != null
                            ? event.getGrade()
                            : Grade.III;
                    currentDepartment = workplace.getDepartment();
                    currentOffice = workplace.getOffice();
                    if (isCustomDesignationEvent(event)) {
                        currentDesignation = null;
                        currentRecordedName = event.getRecordedDesignationName().trim();
                        if (event.getServiceId() != null) {
                            ServiceType service = serviceTypeRepository.findById(event.getServiceId())
                                    .orElseThrow(() -> new RuntimeException("Service not found"));
                            employee.setService(service);
                        }
                        employeeActionService.recordActionWithGrades(
                                employee,
                                EmployeeActionType.NEW_APPOINTMENT,
                                event.getActionDate(),
                                null,
                                null,
                                currentRecordedName,
                                null,
                                currentGrade,
                                null,
                                null,
                                null,
                                event.getRemarks(),
                                workplace
                        );
                    } else {
                        currentDesignation = resolveDesignation(event.getDesignationId());
                        currentRecordedName = null;
                        employeeActionService.recordActionWithGrades(
                                employee,
                                EmployeeActionType.NEW_APPOINTMENT,
                                event.getActionDate(),
                                null,
                                currentDesignation,
                                null,
                                null,
                                currentGrade,
                                null,
                                null,
                                null,
                                event.getRemarks(),
                                workplace
                        );
                    }
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
                    String oldRecordedName = currentRecordedName;
                    Designation newDesignation = null;
                    String newRecordedName = null;

                    if (isCustomDesignationEvent(event)) {
                        newRecordedName = event.getRecordedDesignationName().trim();
                    } else if (event.getDesignationId() != null) {
                        newDesignation = resolveDesignation(event.getDesignationId());
                    } else {
                        newDesignation = currentDesignation;
                        newRecordedName = currentRecordedName;
                    }

                    Grade newGrade = event.getGrade() != null
                            ? event.getGrade()
                            : currentGrade;

                    boolean designationChanged = isCustomDesignationEvent(event)
                            || (newDesignation != null
                                    && (oldDesignation == null
                                            || !oldDesignation.getId().equals(newDesignation.getId())))
                            || (newRecordedName != null
                                    && (oldRecordedName == null
                                            || !oldRecordedName.equalsIgnoreCase(newRecordedName)));
                    boolean gradeChanged = event.getGrade() != null
                            && (oldGrade == null || !oldGrade.equals(newGrade));

                    if (event.getActionType() == EmployeeActionType.PROMOTION
                            && designationChanged
                            && gradeChanged) {
                        ActionWorkplaceFields gradeUpdateWorkplace =
                                buildTimelineWorkplace(currentDepartment, currentOffice);

                        employeeActionService.recordActionWithGrades(
                                employee,
                                EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                                event.getActionDate(),
                                oldDesignation,
                                oldDesignation,
                                oldRecordedName,
                                oldGrade,
                                newGrade,
                                null,
                                null,
                                null,
                                null,
                                gradeUpdateWorkplace
                        );

                        employeeActionService.recordActionWithGrades(
                                employee,
                                EmployeeActionType.PROMOTION,
                                event.getActionDate(),
                                oldDesignation,
                                newDesignation,
                                newRecordedName,
                                newGrade,
                                newGrade,
                                null,
                                null,
                                null,
                                event.getRemarks(),
                                workplace
                        );
                    } else {
                        employeeActionService.recordActionWithGrades(
                                employee,
                                designationChanged
                                        ? EmployeeActionType.PROMOTION
                                        : EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                                event.getActionDate(),
                                oldDesignation,
                                newDesignation,
                                newRecordedName,
                                oldGrade,
                                newGrade,
                                null,
                                null,
                                null,
                                event.getRemarks(),
                                workplace
                        );
                    }

                    currentDesignation = newDesignation;
                    currentRecordedName = newRecordedName;
                    currentGrade = newGrade;
                    currentDepartment = workplace.getDepartment();
                    currentOffice = workplace.getOffice();
                }

                case TRANSFER_OUT -> {
                    Designation oldDesignation = currentDesignation;
                    Designation newDesignation = null;
                    String newRecordedName = null;

                    if (isCustomDesignationEvent(event)) {
                        newRecordedName = event.getRecordedDesignationName().trim();
                    } else if (event.getDesignationId() != null) {
                        newDesignation = resolveDesignation(event.getDesignationId());
                    } else {
                        throw new RuntimeException(
                                "Transfer out must include the destination designation"
                        );
                    }

                    if (event.getServiceLevelId() == null) {
                        throw new RuntimeException(
                                "Transfer out must include the destination service level"
                        );
                    }
                    ServiceLevel newServiceLevel =
                            serviceLevelService.resolve(event.getServiceLevelId());

                    employeeActionService.recordPairedTransferOut(
                            employee,
                            event.getActionDate(),
                            oldDesignation,
                            newDesignation,
                            newRecordedName,
                            newServiceLevel,
                            currentDepartment,
                            currentOffice,
                            event.getToDepartment(),
                            event.getToOffice(),
                            event.getToDistrict(),
                            event.getRemarks()
                    );
                    currentDesignation = newDesignation;
                    currentRecordedName = newRecordedName;
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

                case VACATION_OF_POST -> employeeActionService.recordAction(
                        employee,
                        EmployeeActionType.VACATION_OF_POST,
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

    private ActionWorkplaceFields buildTimelineWorkplace(
            String department,
            String office
    ) {
        if (department == null || department.isBlank()) {
            throw new RuntimeException("Current department is not set");
        }
        if (office == null || office.isBlank()) {
            throw new RuntimeException("Current office is not set");
        }
        return ActionWorkplaceFields.of(
                DepartmentConstants.normalize(department),
                office.trim()
        );
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

        if (event.getActionType() == EmployeeActionType.PROMOTION
                && Boolean.TRUE.equals(event.getTransferringOut())) {
            if (currentDepartment == null || currentDepartment.isBlank()) {
                throw new RuntimeException("Promotion requires a current department");
            }
            if (currentOffice == null || currentOffice.isBlank()) {
                throw new RuntimeException("Promotion requires a current office");
            }
            if (!DepartmentConstants.isNwpEngineering(currentDepartment)) {
                throw new RuntimeException(
                        "Transfer out on promotion is only available for employees "
                                + "in N.W.P. Engineering Department"
                );
            }
            if (event.getToDepartment() == null || event.getToDepartment().isBlank()) {
                throw new RuntimeException(
                        "Destination department is required when transferring out on promotion"
                );
            }
            if (event.getToOffice() == null || event.getToOffice().isBlank()) {
                throw new RuntimeException(
                        "Destination office is required when transferring out on promotion"
                );
            }

            String normalizedDestination = DepartmentConstants.normalize(
                    event.getToDepartment().trim()
            );
            if (DepartmentConstants.isNwpEngineering(normalizedDestination)) {
                throw new RuntimeException(
                        "Use a staying promotion when the employee remains in "
                                + DepartmentConstants.NWP_ENGINEERING
                );
            }

            officeService.validateNwpWorkplaceIfNwp(
                    normalizedDestination,
                    event.getToOffice(),
                    event.getToDistrict()
            );

            return ActionWorkplaceFields.builder()
                    .fromDepartment(DepartmentConstants.normalize(currentDepartment))
                    .fromOffice(currentOffice.trim())
                    .department(normalizedDestination)
                    .office(event.getToOffice().trim())
                    .toDepartment(normalizedDestination)
                    .toOffice(event.getToOffice().trim())
                    .district(
                            DepartmentConstants.isNwpEngineering(normalizedDestination)
                                    ? event.getToDistrict()
                                    : null
                    )
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

    private FinalAssignmentState resolveFinalAssignmentState(
            List<CareerHistoryEventRequest> events
    ) {
        Designation finalDesignation = null;
        String finalRecordedName = null;
        Long finalServiceId = null;

        for (CareerHistoryEventRequest event : events) {
            if (isCustomDesignationEvent(event)) {
                finalDesignation = null;
                finalRecordedName = event.getRecordedDesignationName().trim();
                if (event.getServiceId() != null) {
                    finalServiceId = event.getServiceId();
                }
            } else if (event.getDesignationId() != null) {
                finalDesignation = resolveDesignation(event.getDesignationId());
                finalRecordedName = null;
                if (finalDesignation.getService() != null) {
                    finalServiceId = finalDesignation.getService().getId();
                }
            }
        }

        if (finalDesignation == null
                && (finalRecordedName == null || finalRecordedName.isBlank())) {
            throw new RuntimeException(
                    "Career history must include at least one designation assignment"
            );
        }

        ServiceType service = null;
        if (finalServiceId != null) {
            service = serviceTypeRepository.findById(finalServiceId)
                    .orElseThrow(() -> new RuntimeException("Service not found"));
        } else if (finalDesignation != null) {
            service = finalDesignation.getService();
        }

        return new FinalAssignmentState(finalDesignation, finalRecordedName, service);
    }

    private void applyFinalAssignmentState(
            Employee employee,
            FinalAssignmentState state
    ) {
        employee.setDesignation(state.designation());
        employee.setRecordedDesignationName(state.recordedDesignationName());
        if (state.service() != null) {
            employee.setService(state.service());
        } else if (state.designation() != null
                && state.designation().getService() != null) {
            employee.setService(state.designation().getService());
        }
    }

    private boolean isCustomDesignationEvent(CareerHistoryEventRequest event) {
        return event.getDesignationId() == null
                && event.getRecordedDesignationName() != null
                && !event.getRecordedDesignationName().isBlank();
    }

    private Designation resolveFinalDesignation(
            List<CareerHistoryEventRequest> events
    ) {
        return resolveFinalAssignmentState(events).designation();
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

    private boolean isMarried(String maritalStatus) {
        return maritalStatus != null
                && "married".equalsIgnoreCase(maritalStatus.trim());
    }

    private void applyDependentDetails(
            Employee employee,
            EmployeeSpouseRequest spouseRequest,
            List<EmployeeChildRequest> childrenRequest,
            String maritalStatus
    ) {
        if (!isMarried(maritalStatus)) {
            clearDependentDetails(employee);
            return;
        }

        validateDependentDetails(spouseRequest, childrenRequest);

        EmployeeSpouse spouse = employee.getSpouse();
        if (spouse == null) {
            spouse = EmployeeSpouse.builder().employee(employee).build();
            employee.setSpouse(spouse);
        }

        spouse.setNic(trimToNull(spouseRequest.getNic()));
        spouse.setFullName(spouseRequest.getFullName().trim());
        spouse.setDateOfBirth(spouseRequest.getDateOfBirth());

        List<EmployeeChildRequest> childRequests = filterChildRequests(childrenRequest);
        if (employee.getChildren() == null) {
            employee.setChildren(new ArrayList<>());
        }
        employee.getChildren().clear();

        for (EmployeeChildRequest childRequest : childRequests) {
            EmployeeChild child = EmployeeChild.builder()
                    .employee(employee)
                    .nic(trimToNull(childRequest.getNic()))
                    .birthCertificateNo(childRequest.getBirthCertificateNo().trim())
                    .fullName(childRequest.getFullName().trim())
                    .dateOfBirth(childRequest.getDateOfBirth())
                    .relationship(childRequest.getRelationship())
                    .build();
            employee.getChildren().add(child);
        }
    }

    private void clearDependentDetails(Employee employee) {
        if (employee.getSpouse() != null) {
            employee.setSpouse(null);
        }
        if (employee.getChildren() != null) {
            employee.getChildren().clear();
        }
    }

    private List<EmployeeChildRequest> filterChildRequests(
            List<EmployeeChildRequest> childrenRequest
    ) {
        if (childrenRequest == null || childrenRequest.isEmpty()) {
            return List.of();
        }

        List<EmployeeChildRequest> filtered = new ArrayList<>();
        for (EmployeeChildRequest childRequest : childrenRequest) {
            if (childRequest == null || isBlankChildRequest(childRequest)) {
                continue;
            }
            filtered.add(childRequest);
        }
        return filtered;
    }

    private boolean isBlankChildRequest(EmployeeChildRequest childRequest) {
        return trimToNull(childRequest.getNic()) == null
                && trimToNull(childRequest.getBirthCertificateNo()) == null
                && trimToNull(childRequest.getFullName()) == null
                && childRequest.getDateOfBirth() == null
                && childRequest.getRelationship() == null;
    }

    private void validateDependentDetails(
            EmployeeSpouseRequest spouseRequest,
            List<EmployeeChildRequest> childrenRequest
    ) {
        if (spouseRequest == null
                || trimToNull(spouseRequest.getFullName()) == null) {
            throw new IllegalArgumentException(
                    "Spouse name is required for married employees"
            );
        }
        if (trimToNull(spouseRequest.getNic()) == null) {
            throw new IllegalArgumentException(
                    "Spouse NIC is required for married employees"
            );
        }
        if (spouseRequest.getDateOfBirth() == null) {
            throw new IllegalArgumentException(
                    "Spouse date of birth is required for married employees"
            );
        }

        for (EmployeeChildRequest childRequest : filterChildRequests(childrenRequest)) {
            if (trimToNull(childRequest.getBirthCertificateNo()) == null) {
                throw new IllegalArgumentException(
                        "Birth certificate number is required for each child"
                );
            }
            if (trimToNull(childRequest.getFullName()) == null) {
                throw new IllegalArgumentException(
                        "Child name is required for each child"
                );
            }
            if (childRequest.getDateOfBirth() == null) {
                throw new IllegalArgumentException(
                        "Child date of birth is required for each child"
                );
            }
            if (childRequest.getRelationship() == null) {
                throw new IllegalArgumentException(
                        "Child relationship is required for each child"
                );
            }
            if (childRequest.getRelationship() != ChildRelationship.SON
                    && childRequest.getRelationship() != ChildRelationship.DAUGHTER) {
                throw new IllegalArgumentException(
                        "Child relationship must be SON or DAUGHTER"
                );
            }
        }
    }

    private void applyPrivateVehicleFields(
            Employee employee,
            Boolean usedForGovWork,
            String description,
            LocalDate permissionDate,
            LocalDate expireDate,
            String insuranceNumber,
            String licensePlateNumber,
            Boolean rented,
            String rentedFrom
    ) {
        EmployeePrivateVehicle vehicle = employee.ensurePrivateVehicle();

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
            String trimmedInsuranceNumber = trimToNull(insuranceNumber);
            if (trimmedInsuranceNumber == null) {
                throw new IllegalArgumentException(
                        "Private vehicle insurance number is required when the employee "
                                + "uses a private vehicle for government work"
                );
            }
            String trimmedLicensePlateNumber = trimToNull(licensePlateNumber);
            if (trimmedLicensePlateNumber == null) {
                throw new IllegalArgumentException(
                        "Private vehicle license plate number is required when the employee "
                                + "uses a private vehicle for government work"
                );
            }

            boolean isRented = Boolean.TRUE.equals(rented);
            LocalDate resolvedExpireDate;
            if (isRented) {
                String trimmedRentedFrom = trimToNull(rentedFrom);
                if (trimmedRentedFrom == null) {
                    throw new IllegalArgumentException(
                            "Rented vehicle owner is required when the vehicle is rented"
                    );
                }
                vehicle.setRented(true);
                vehicle.setRentedFrom(trimmedRentedFrom);
                resolvedExpireDate = permissionDate.plusYears(2);
            } else {
                vehicle.setRented(false);
                vehicle.setRentedFrom(null);
                if (expireDate == null) {
                    throw new IllegalArgumentException(
                            "Private vehicle expire date is required when the employee "
                                    + "uses a private vehicle for government work"
                    );
                }
                resolvedExpireDate = expireDate;
            }

            vehicle.setUsedForGovWork(true);
            vehicle.setDescription(trimmedDescription);
            vehicle.setPermissionDate(permissionDate);
            vehicle.setExpireDate(resolvedExpireDate);
            vehicle.setInsuranceNumber(trimmedInsuranceNumber);
            vehicle.setLicensePlateNumber(trimmedLicensePlateNumber);
            return;
        }

        vehicle.setUsedForGovWork(false);
        vehicle.setDescription(null);
        vehicle.setPermissionDate(null);
        vehicle.setExpireDate(null);
        vehicle.setInsuranceNumber(null);
        vehicle.setLicensePlateNumber(null);
        vehicle.setRented(false);
        vehicle.setRentedFrom(null);
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

        trainingGraduationService.populateLifecycleFlags(employee);

        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            requirementSyncService.syncTrainingEmployeeRequirements(employee);
            return employeeRepository.save(employee);
        }

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);
        employee = employeeRepository.save(employee);
        trainingGraduationService.populateLifecycleFlags(employee);
        return employee;
    }

    public void deleteEmployee(Long id) {
        throw new RuntimeException(
                "Employees cannot be deleted. Use lifecycle actions instead."
        );
    }

    @Transactional
    public Employee updateEmployee(Long id, EmployeeUpdateRequest request) {
        validateUniqueEmployeeIdentifiers(
                request.getEmployeeNo(),
                request.getNic(),
                id
        );

        if (isContract(request.getEmploymentType())) {
            return updateContractEmployee(id, request);
        }

        Employee existing = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(existing)) {
            if (Boolean.TRUE.equals(request.getQualificationUpdateOnly())) {
                return updateTrainingQualificationsOnly(id, request);
            }
            return updateTrainingEmployee(id, request);
        }

        if (request.getCareerHistory() != null
                && !request.getCareerHistory().isEmpty()) {
            return updateEmployeeWithHistory(id, request);
        }

        if (Boolean.TRUE.equals(request.getQualificationUpdateOnly())) {
            return updateQualificationsOnly(id, request);
        }

        validateNonContractUpdateRequest(request);

        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        Designation designation = resolveUpdateDesignation(employee, request);

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

        validateEmployeeAssignment(employee, designation);

        return employeeRepository.save(employee);
    }

    private Employee updateQualificationsOnly(
            Long id,
            EmployeeUpdateRequest request
    ) {
        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        if (employee.getEmploymentType() != EmploymentType.PERMANENT) {
            throw new RuntimeException(
                    "Qualification tracking applies to permanent employees only"
            );
        }

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
        careerProgressionService.recalculateEmployeeCareer(employee);
        validateEmployeeAssignment(employee, employee.getDesignation());

        return employeeRepository.save(employee);
    }

    private Designation resolveUpdateDesignation(
            Employee employee,
            EmployeeUpdateRequest request
    ) {
        if (employee.getDesignation() != null) {
            if (request.getDesignationId() == null || request.getDesignationId() <= 0) {
                throw new RuntimeException("Designation is required");
            }

            Designation designation = resolveDesignation(request.getDesignationId());
            if (!designation.getId().equals(employee.getDesignation().getId())) {
                throw new RuntimeException(
                        "Designation changes must be done through promotion"
                );
            }
            return designation;
        }

        if (request.getDesignationId() != null && request.getDesignationId() > 0) {
            throw new RuntimeException(
                    "Designation changes must be done through promotion"
            );
        }

        return null;
    }

    private void validateEmployeeAssignment(
            Employee employee,
            Designation designation
    ) {
        if (designation != null) {
            designationAssignmentValidator.validate(employee, designation);
            return;
        }

        if (employee.getRecordedDesignationName() != null
                && employee.getService() != null
                && employee.getServiceLevel() != null) {
            designationAssignmentValidator.validateCustomAssignment(
                    employee.getGrade(),
                    employee.getServiceLevel().getId(),
                    employee.getService()
            );
        }
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
        } else if (result.getRecordedDesignationName() != null
                && result.getService() != null) {
            designationAssignmentValidator.validateCustomAssignment(
                    result.getGrade(),
                    result.getServiceLevel().getId(),
                    result.getService()
            );
        }

        return employeeRepository.save(result);
    }

    private void rejectTerminalHistoryForActiveEmployee(
            List<CareerHistoryEventRequest> events
    ) {
        CareerHistoryEventRequest lastEvent = events.getLast();
        switch (lastEvent.getActionType()) {
            case RETIREMENT_OR_RESIGNATION, DEATH, DISMISSAL, VACATION_OF_POST ->
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
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        applyIncremantDate(employee, request.getIncremantDate());
        applyWidowsOrphansPensionNo(employee, request.getWidowsOrphansPensionNo(), true);
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate(),
                request.getPrivateVehicleExpireDate(),
                request.getPrivateVehicleInsuranceNumber(),
                request.getPrivateVehicleLicensePlateNumber(),
                request.getPrivateVehicleRented(),
                request.getPrivateVehicleRentedFrom()
        );
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
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
        applyDependentDetails(
                employee,
                request.getSpouse(),
                request.getChildren(),
                request.getMaritalStatus()
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
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        applyIncremantDate(employee, request.getIncremantDate());
        applyWidowsOrphansPensionNo(
                employee,
                request.getWidowsOrphansPensionNo(),
                request.getEmploymentType() == EmploymentType.PERMANENT
        );
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
        employee.setContractStartDate(request.getContractStartDate());
        employee.setContractEndDate(request.getContractEndDate());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate(),
                request.getPrivateVehicleExpireDate(),
                request.getPrivateVehicleInsuranceNumber(),
                request.getPrivateVehicleLicensePlateNumber(),
                request.getPrivateVehicleRented(),
                request.getPrivateVehicleRentedFrom()
        );
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
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
        applyDependentDetails(
                employee,
                request.getSpouse(),
                request.getChildren(),
                request.getMaritalStatus()
        );
    }

    private Employee createContractEmployee(EmployeeRequest request) {
        validateContractRequest(request);
        validateUniqueEmployeeIdentifiers(request.getEmployeeNo(), request.getNic(), null);

        Designation designation = resolveDesignation(request.getDesignationId());
        Employee employee = mapContractRequestToEmployee(
                new Employee(),
                request,
                designation
        );

        employee.setStatus(EmployeeStatus.ACTIVE);
        employee = employeeRepository.save(employee);

        EmployeePosting initialPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(designation)
                .startDate(request.getReportedDateToPresentWorkingPlace())
                .currentPosting(true)
                .build();
        postingRepository.save(initialPosting);

        String officeName = resolveOfficeNameForValidation(request);
        officeService.validateNwpWorkplace(
                officeName,
                request.getCurrentDistrictOfWorking()
        );

        return employee;
    }

    private Employee createTrainingEmployee(EmployeeRequest request) {
        validateTrainingRequest(request);
        validateUniqueEmployeeIdentifiers(request.getEmployeeNo(), request.getNic(), null);

        Designation designation = resolveDesignation(request.getDesignationId());
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());
        if (!com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingServiceLevel(serviceLevel)) {
            throw new RuntimeException("Training employees must use the Training service level");
        }

        Employee employee = mapTrainingRequestToEmployee(
                new Employee(),
                request,
                designation,
                serviceLevel
        );

        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setTrainingOrigin(true);
        employee = employeeRepository.save(employee);
        requirementSyncService.syncTrainingEmployeeRequirements(employee);
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

        return employee;
    }

    private Employee updateTrainingEmployee(Long id, EmployeeUpdateRequest request) {
        validateTrainingUpdateRequest(request);

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException("Only active employees can be updated");
        }
        if (!com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            throw new RuntimeException(
                    "Training update is only supported for training employees"
            );
        }

        Designation designation = resolveDesignation(request.getDesignationId());
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());
        if (!com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingServiceLevel(serviceLevel)) {
            throw new RuntimeException("Training employees must use the Training service level");
        }

        mapTrainingUpdateRequestToEmployee(employee, request, designation, serviceLevel);

        officeService.validateNwpWorkplace(
                request.getCurrentWorkingPlace().trim(),
                request.getCurrentDistrictOfWorking()
        );

        return employeeRepository.save(employee);
    }

    private Employee updateTrainingQualificationsOnly(
            Long id,
            EmployeeUpdateRequest request
    ) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }
        if (!com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            throw new RuntimeException(
                    "Training qualification tracking applies to training employees only"
            );
        }

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
                true
        );

        return employeeRepository.save(employee);
    }

    private void validateTrainingRequest(EmployeeRequest request) {
        if (request.getDesignationId() == null || request.getDesignationId() <= 0) {
            throw new RuntimeException("Designation is required");
        }
        if (request.getServiceLevelId() == null) {
            throw new RuntimeException("Service level is required");
        }
        validateTrainingPeriodYears(request.getTrainingPeriodYears());
        if (request.getDateOfFirstAppointment() == null) {
            throw new RuntimeException("First appointment date is required");
        }
        if (request.getEnteredDateToNWPCouncil() == null) {
            throw new RuntimeException("Entered date to N.W.P. Council is required");
        }
        if (request.getReportedDateToPresentWorkingPlace() == null) {
            throw new RuntimeException(
                    "Reported date to present working place is required"
            );
        }
        if (request.getCurrentWorkingPlace() == null
                || request.getCurrentWorkingPlace().isBlank()) {
            throw new RuntimeException("Current working place is required");
        }
    }

    private void validateTrainingUpdateRequest(EmployeeUpdateRequest request) {
        if (request.getDesignationId() == null || request.getDesignationId() <= 0) {
            throw new RuntimeException("Designation is required");
        }
        if (request.getServiceLevelId() == null) {
            throw new RuntimeException("Service level is required");
        }
        validateTrainingPeriodYears(request.getTrainingPeriodYears());
        if (request.getDateOfFirstAppointment() == null) {
            throw new RuntimeException("First appointment date is required");
        }
        if (request.getEnteredDateToNWPCouncil() == null) {
            throw new RuntimeException("Entered date to N.W.P. Council is required");
        }
        if (request.getReportedDateToPresentWorkingPlace() == null) {
            throw new RuntimeException(
                    "Reported date to present working place is required"
            );
        }
        if (request.getCurrentWorkingPlace() == null
                || request.getCurrentWorkingPlace().isBlank()) {
            throw new RuntimeException("Current working place is required");
        }
    }

    private void validateTrainingPeriodYears(Integer trainingPeriodYears) {
        if (trainingPeriodYears == null
                || (trainingPeriodYears != 1 && trainingPeriodYears != 2)) {
            throw new RuntimeException("Training period must be 1 or 2 years");
        }
    }

    private Employee mapTrainingRequestToEmployee(
            Employee employee,
            EmployeeRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        applyTrainingCommonFields(employee, request, designation, serviceLevel);
        return employee;
    }

    private void mapTrainingUpdateRequestToEmployee(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        applyTrainingCommonFields(employee, request, designation, serviceLevel);
    }

    private void applyTrainingCommonFields(
            Employee employee,
            EmployeeRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setService(null);
        employee.setNic(request.getNic().trim());
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(Grade.NONE);
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        applyIncremantDate(employee, request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(null);
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setContractStartDate(null);
        employee.setContractEndDate(null);
        applyTrainingWorkplaceFields(employee, request);
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setPrivateVehicleUsedForGovWork(false);
        employee.setPrivateVehicleDescription(null);
        employee.setPrivateVehiclePermissionDate(null);
        employee.setPrivateVehicleExpireDate(null);
        employee.setPrivateVehicleInsuranceNumber(null);
        employee.setPrivateVehicleLicensePlateNumber(null);
        employee.setPrivateVehicleRented(false);
        employee.setPrivateVehicleRentedFrom(null);
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(null);
        employee.setPermanentStatus(null);
        employee.setTrainingPeriodYears(request.getTrainingPeriodYears());
    }

    private void applyTrainingCommonFields(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setService(null);
        employee.setNic(request.getNic().trim());
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(Grade.NONE);
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        applyIncremantDate(employee, request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(null);
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setContractStartDate(null);
        employee.setContractEndDate(null);
        applyTrainingWorkplaceFields(employee, request);
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setPrivateVehicleUsedForGovWork(false);
        employee.setPrivateVehicleDescription(null);
        employee.setPrivateVehiclePermissionDate(null);
        employee.setPrivateVehicleExpireDate(null);
        employee.setPrivateVehicleInsuranceNumber(null);
        employee.setPrivateVehicleLicensePlateNumber(null);
        employee.setPrivateVehicleRented(false);
        employee.setPrivateVehicleRentedFrom(null);
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(null);
        employee.setPermanentStatus(null);
        employee.setTrainingPeriodYears(request.getTrainingPeriodYears());
    }

    private void applyTrainingWorkplaceFields(Employee employee, EmployeeRequest request) {
        String department = DepartmentConstants.NWP_ENGINEERING;
        String office = resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
        employee.setCurrentDepartment(department);
        employee.setCurrentOffice(office);
        employee.setCurrentWorkingPlace(formatWorkingPlace(department, office));
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
    }

    private void applyTrainingWorkplaceFields(
            Employee employee,
            EmployeeUpdateRequest request
    ) {
        String department = DepartmentConstants.NWP_ENGINEERING;
        String office = resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
        employee.setCurrentDepartment(department);
        employee.setCurrentOffice(office);
        employee.setCurrentWorkingPlace(formatWorkingPlace(department, office));
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
    }

    private boolean isTrainingCreateRequest(EmployeeRequest request) {
        if (request.getEmploymentType() != null || request.getServiceLevelId() == null) {
            return false;
        }

        ServiceLevel serviceLevel = serviceLevelService.resolve(request.getServiceLevelId());
        return com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingServiceLevel(serviceLevel);
    }

    private Employee updateContractEmployee(Long id, EmployeeUpdateRequest request) {
        validateContractRequest(request);

        Employee employee = getEmployeeById(id);
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException("Only active employees can be updated");
        }
        if (employee.getEmploymentType() != EmploymentType.CONTRACT) {
            throw new RuntimeException(
                    "Contract update is only supported for contract employees"
            );
        }

        Designation designation = resolveDesignation(request.getDesignationId());
        mapContractUpdateRequestToEmployee(employee, request, designation);

        String officeName = resolveOfficeNameForValidation(request);
        officeService.validateNwpWorkplace(
                officeName,
                request.getCurrentDistrictOfWorking()
        );

        return employeeRepository.save(employee);
    }

    private void validateContractRequest(EmployeeRequest request) {
        if (request.getContractStartDate() == null) {
            throw new RuntimeException("Contract start date is required");
        }
        if (request.getContractEndDate() == null) {
            throw new RuntimeException("Contract end date is required");
        }
        if (request.getContractEndDate().isBefore(request.getContractStartDate())) {
            throw new RuntimeException(
                    "Contract end date cannot be before contract start date"
            );
        }
        if (request.getEnteredDateToNWPCouncil() == null) {
            throw new RuntimeException("Entered date to N.W.P. Council is required");
        }
        if (request.getReportedDateToPresentWorkingPlace() == null) {
            throw new RuntimeException(
                    "Reported date to present working place is required"
            );
        }
        if (request.getCurrentDepartment() == null
                || request.getCurrentDepartment().isBlank()) {
            throw new RuntimeException("Current department is required");
        }
    }

    private void validateContractRequest(EmployeeUpdateRequest request) {
        if (request.getContractStartDate() == null) {
            throw new RuntimeException("Contract start date is required");
        }
        if (request.getContractEndDate() == null) {
            throw new RuntimeException("Contract end date is required");
        }
        if (request.getContractEndDate().isBefore(request.getContractStartDate())) {
            throw new RuntimeException(
                    "Contract end date cannot be before contract start date"
            );
        }
        if (request.getEnteredDateToNWPCouncil() == null) {
            throw new RuntimeException("Entered date to N.W.P. Council is required");
        }
        if (request.getReportedDateToPresentWorkingPlace() == null) {
            throw new RuntimeException(
                    "Reported date to present working place is required"
            );
        }
        if (request.getCurrentDepartment() == null
                || request.getCurrentDepartment().isBlank()) {
            throw new RuntimeException("Current department is required");
        }
    }

    private void validateNonContractCreateRequest(EmployeeRequest request) {
        boolean hasCareerHistory = request.getCareerHistory() != null
                && !request.getCareerHistory().isEmpty();
        if (!hasCareerHistory
                && (request.getDesignationId() == null || request.getDesignationId() <= 0)) {
            throw new RuntimeException("Designation is required");
        }
        if (request.getServiceLevelId() == null) {
            throw new RuntimeException("Service level is required");
        }
        if (request.getDateOfFirstAppointment() == null) {
            throw new RuntimeException("Date of first appointment is required");
        }
    }

    private void validateUniqueEmployeeIdentifiers(
            String employeeNo,
            String nic,
            Long excludeEmployeeId
    ) {
        String normalizedEmployeeNo = employeeNo != null ? employeeNo.trim() : "";
        String normalizedNic = nic != null ? nic.trim() : "";

        if (!normalizedEmployeeNo.isEmpty()) {
            boolean employeeNoExists = excludeEmployeeId == null
                    ? employeeRepository.existsByEmployeeNo(normalizedEmployeeNo)
                    : employeeRepository.existsByEmployeeNoAndIdNot(
                            normalizedEmployeeNo,
                            excludeEmployeeId
                    );
            if (employeeNoExists) {
                throw new RuntimeException(
                        "Employee number '" + normalizedEmployeeNo + "' is already in use"
                );
            }
        }

        if (!normalizedNic.isEmpty()) {
            boolean nicExists = excludeEmployeeId == null
                    ? employeeRepository.existsByNic(normalizedNic)
                    : employeeRepository.existsByNicAndIdNot(normalizedNic, excludeEmployeeId);
            if (nicExists) {
                throw new RuntimeException(
                        "NIC '" + normalizedNic + "' is already registered to another employee"
                );
            }
        }
    }

    private void validateNonContractUpdateRequest(EmployeeUpdateRequest request) {
        if (request.getServiceLevelId() == null) {
            throw new RuntimeException("Service level is required");
        }
        if (request.getDateOfFirstAppointment() == null) {
            throw new RuntimeException("Date of first appointment is required");
        }
    }

    private Employee mapContractRequestToEmployee(
            Employee employee,
            EmployeeRequest request,
            Designation designation
    ) {
        applyContractCommonFields(employee, request, designation);
        return employee;
    }

    private void mapContractUpdateRequestToEmployee(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation
    ) {
        applyContractCommonFields(employee, request, designation);
    }

    private void applyContractCommonFields(
            Employee employee,
            EmployeeRequest request,
            Designation designation
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(Grade.NONE);
        employee.setDateOfFirstAppointment(null);
        employee.setAppointmentDateToPresentClassGrade(null);
        employee.setIncremantDate(null);
        employee.setEnteredDateToAllIslandService(null);
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setContractStartDate(request.getContractStartDate());
        employee.setContractEndDate(request.getContractEndDate());
        applyContractWorkplaceFields(employee, request);
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate(),
                request.getPrivateVehicleExpireDate(),
                request.getPrivateVehicleInsuranceNumber(),
                request.getPrivateVehicleLicensePlateNumber(),
                request.getPrivateVehicleRented(),
                request.getPrivateVehicleRentedFrom()
        );
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
        employee.setServiceLevel(null);
        employee.setEmploymentType(EmploymentType.CONTRACT);
        applyDependentDetails(
                employee,
                request.getSpouse(),
                request.getChildren(),
                request.getMaritalStatus()
        );
    }

    private void applyContractCommonFields(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(Grade.NONE);
        employee.setDateOfFirstAppointment(null);
        employee.setAppointmentDateToPresentClassGrade(null);
        employee.setIncremantDate(null);
        employee.setEnteredDateToAllIslandService(null);
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setContractStartDate(request.getContractStartDate());
        employee.setContractEndDate(request.getContractEndDate());
        applyContractWorkplaceFields(employee, request);
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        applyPrivateVehicleFields(
                employee,
                request.getPrivateVehicleUsedForGovWork(),
                request.getPrivateVehicleDescription(),
                request.getPrivateVehiclePermissionDate(),
                request.getPrivateVehicleExpireDate(),
                request.getPrivateVehicleInsuranceNumber(),
                request.getPrivateVehicleLicensePlateNumber(),
                request.getPrivateVehicleRented(),
                request.getPrivateVehicleRentedFrom()
        );
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
        employee.setServiceLevel(null);
        employee.setEmploymentType(EmploymentType.CONTRACT);
        applyDependentDetails(
                employee,
                request.getSpouse(),
                request.getChildren(),
                request.getMaritalStatus()
        );
    }

    private void applyContractWorkplaceFields(Employee employee, EmployeeRequest request) {
        String department = DepartmentConstants.normalize(request.getCurrentDepartment());
        String office = resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
        employee.setCurrentDepartment(department);
        employee.setCurrentOffice(office);
        employee.setCurrentWorkingPlace(formatWorkingPlace(department, office));
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
    }

    private void applyContractWorkplaceFields(
            Employee employee,
            EmployeeUpdateRequest request
    ) {
        String department = DepartmentConstants.normalize(request.getCurrentDepartment());
        String office = resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
        employee.setCurrentDepartment(department);
        employee.setCurrentOffice(office);
        employee.setCurrentWorkingPlace(formatWorkingPlace(department, office));
        if (request.getCurrentDistrictOfWorking() != null) {
            employee.setCurrentDistrictOfWorking(request.getCurrentDistrictOfWorking());
        }
    }

    private String resolveOfficeNameForValidation(EmployeeRequest request) {
        String department = DepartmentConstants.normalize(request.getCurrentDepartment());
        return resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
    }

    private String resolveOfficeNameForValidation(EmployeeUpdateRequest request) {
        String department = DepartmentConstants.normalize(request.getCurrentDepartment());
        return resolveOfficeFromWorkingPlace(
                request.getCurrentWorkingPlace(),
                department
        );
    }

    private String resolveOfficeFromWorkingPlace(String workingPlace, String department) {
        if (workingPlace == null || workingPlace.isBlank()) {
            throw new RuntimeException("Office is required");
        }

        String trimmed = workingPlace.trim();
        String prefix = department + " — ";
        if (trimmed.startsWith(prefix)) {
            return trimmed.substring(prefix.length()).trim();
        }

        return trimmed;
    }

    private String formatWorkingPlace(String department, String office) {
        return department + " — " + office;
    }

    private boolean isContract(EmploymentType employmentType) {
        return employmentType == EmploymentType.CONTRACT;
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
        applyTin(employee, request.getTin());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        applyMaritalStatusIfProvided(employee, request.getMaritalStatus());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        applyIncremantDate(employee, request.getIncremantDate());
        applyWidowsOrphansPensionNo(
                employee,
                request.getWidowsOrphansPensionNo(),
                request.getEmploymentType() == EmploymentType.PERMANENT
        );
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
                request.getPrivateVehiclePermissionDate(),
                request.getPrivateVehicleExpireDate(),
                request.getPrivateVehicleInsuranceNumber(),
                request.getPrivateVehicleLicensePlateNumber(),
                request.getPrivateVehicleRented(),
                request.getPrivateVehicleRentedFrom()
        );
        employee.setContactNo(request.getContactNo().trim());
        applyEmailAddress(employee, request.getEmailAddress());
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
        applyDependentDetails(
                employee,
                request.getSpouse(),
                request.getChildren(),
                request.getMaritalStatus()
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
                requirementSyncService.markPermanentRequirementsCompleted(
                        employee,
                        permanentConfirmationDate != null
                                ? permanentConfirmationDate
                                : employee.getAppointmentDateToPresentClassGrade()
                );
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
                requirementSyncService.markGrade2RequirementsCompleted(
                        employee,
                        LocalDate.now()
                );
            }
            if (employee.getGrade() == Grade.I
                    || employee.getGrade() == Grade.SUPRA
                    || employee.getGrade() == Grade.SPECIAL) {
                requirementSyncService.markGrade1RequirementsCompleted(
                        employee,
                        LocalDate.now()
                );
            }
            if (employee.getGrade() == Grade.SUPRA) {
                requirementSyncService.markSupraRequirementsCompleted(
                        employee,
                        LocalDate.now()
                );
            }
            if (employee.getGrade() == Grade.SPECIAL) {
                requirementSyncService.markSpecialRequirementsCompleted(
                        employee,
                        LocalDate.now()
                );
            }
        }
        ServiceType service = employeeServiceResolver.resolve(employee);
        careerProgression.setGrade2RequiredYears(
                service != null
                        ? service.getGrade2RequiredYears()
                        : grade2RequiredYears
        );
        careerProgression.setGrade1RequiredYears(
                service != null
                        ? service.getGrade1RequiredYears()
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
        requirementSyncService.completeRequirementsForAchievedGrade(employee);
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
                .orElse(null);

        if (!isRequirementEditable(employee, type)
                && status != RequirementStatus.COMPLETED) {
            if (requirement != null) {
                return;
            }

            EmployeeRequirement created = new EmployeeRequirement();
            created.setEmployee(employee);
            created.setRequirementType(type);
            created.setRequirementName(
                    requirementName != null && !requirementName.isBlank()
                            ? requirementName.trim()
                            : null
            );
            created.setStatus(RequirementStatus.PENDING);
            employee.getRequirements().add(created);
            return;
        }

        if (requirement == null) {
            requirement = new EmployeeRequirement();
            requirement.setEmployee(employee);
            requirement.setRequirementType(type);
            employee.getRequirements().add(requirement);
        }

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

    private boolean isRequirementEditable(Employee employee, RequirementType type) {
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return type == RequirementType.TRAINING_EXAM;
        }

        if (employee.getEmploymentType() != EmploymentType.PERMANENT) {
            return false;
        }

        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;
        boolean confirmedPermanent = employee.getCareerProgression() != null
                && employee.getCareerProgression().getPermanentConfirmationDate()
                        != null;

        if (isPermanentRequirementType(type)) {
            return grade == Grade.III && !confirmedPermanent;
        }

        if (isGrade2RequirementType(type)) {
            return grade == Grade.III && confirmedPermanent;
        }

        if (isGrade1RequirementType(type)) {
            return grade == Grade.II;
        }

        if (isSupraRequirementType(type)) {
            return grade == Grade.I;
        }

        if (isSpecialRequirementType(type)) {
            return grade == Grade.I;
        }

        return false;
    }

    private boolean allowsRequirementDowngrade(
            Employee employee,
            RequirementType type
    ) {
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return type == RequirementType.TRAINING_EXAM;
        }

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

        if (isSupraRequirementType(type)) {
            return grade == Grade.I || grade == Grade.SUPRA;
        }

        if (isSpecialRequirementType(type)) {
            return grade == Grade.I || grade == Grade.SPECIAL;
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

    private boolean isSupraRequirementType(RequirementType type) {
        return type == RequirementType.SUPRA_REQUIREMENT
                || type == RequirementType.CUSTOM_SUPRA_REQUIREMENT;
    }

    private boolean isSpecialRequirementType(RequirementType type) {
        return type == RequirementType.MASTERS_DEGREE
                || type == RequirementType.CUSTOM_SPECIAL_REQUIREMENT;
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

    private void applyWidowsOrphansPensionNo(
            Employee employee,
            String widowsOrphansPensionNo,
            boolean required
    ) {
        if (widowsOrphansPensionNo == null || widowsOrphansPensionNo.isBlank()) {
            if (required) {
                throw new IllegalArgumentException(
                        "Widows' and Orphans' Pension No. is required."
                );
            }
            employee.setWidowsOrphansPensionNo(null);
            return;
        }
        employee.setWidowsOrphansPensionNo(widowsOrphansPensionNo.trim());
    }

    private void applyTin(Employee employee, String tin) {
        if (tin == null || tin.isBlank()) {
            employee.setTin(null);
            return;
        }

        employee.setTin(tin.trim());
    }

    private void applyEmailAddress(Employee employee, String emailAddress) {
        if (emailAddress == null || emailAddress.isBlank()) {
            employee.setEmailAddress(null);
            return;
        }

        String trimmed = emailAddress.trim();
        if (!trimmed.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Email address must be valid.");
        }

        employee.setEmailAddress(trimmed);
    }

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
