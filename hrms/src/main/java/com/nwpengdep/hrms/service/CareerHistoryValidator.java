package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CareerHistoryValidator {

    private final DesignationRepository designationRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final CareerProgressionService careerProgressionService;
    private final OfficeService officeService;

    public void validate(List<CareerHistoryEventRequest> events) {
        if (events == null || events.isEmpty()) {
            return;
        }

        CareerHistoryEventRequest first = events.getFirst();
        if (first.getActionType() != EmployeeActionType.NEW_APPOINTMENT) {
            throw new RuntimeException(
                    "Career history must start with the first appointment"
            );
        }

        LocalDate today = LocalDate.now();
        LocalDate previousDate = null;
        LocalDate firstAppointmentDate = null;
        LocalDate grade2AchievedDate = null;
        LocalDate grade1AchievedDate = null;
        Designation currentDesignation = null;
        String currentRecordedDesignationName = null;
        Long currentServiceId = null;
        Grade currentGrade = null;
        Long currentServiceLevelId = null;
        String currentDepartment = null;
        String currentOffice = null;
        String currentDistrict = null;
        boolean active = false;
        boolean permanentConfirmed = false;
        boolean deathRecorded = false;

        for (int index = 0; index < events.size(); index++) {
            CareerHistoryEventRequest event = events.get(index);
            int position = index + 1;

            if (event.getActionType() == null) {
                throw new RuntimeException(
                        "Career history event #" + position + " is missing an action type"
                );
            }
            if (event.getActionDate() == null) {
                throw new RuntimeException(
                        "Career history event #" + position + " is missing a date"
                );
            }
            if (event.getActionDate().isAfter(today)) {
                throw new RuntimeException(
                        "Career history event #" + position + " cannot have a future date"
                );
            }
            if (previousDate != null && event.getActionDate().isBefore(previousDate)) {
                throw new RuntimeException(
                        "Career history events must be in chronological order "
                                + "(event #" + position + " is dated before the previous event)"
                );
            }
            if (deathRecorded) {
                throw new RuntimeException(
                        "No career events can follow a death record"
                );
            }
            if (index > 0 && event.getActionType() == EmployeeActionType.NEW_APPOINTMENT) {
                throw new RuntimeException(
                        "First appointment can only be the first event in the career history"
                );
            }
            if (event.getActionType() == EmployeeActionType.TRANSFER_IN) {
                throw new RuntimeException(
                        "Transfer in (event #" + position + ") is created automatically "
                                + "when recording a transfer out"
                );
            }

            switch (event.getActionType()) {
                case NEW_APPOINTMENT -> {
                    if (!hasCatalogDesignation(event) && !isCustomDesignationEvent(event)) {
                        throw new RuntimeException(
                                "First appointment must include a designation or a custom title"
                        );
                    }
                    if (event.getServiceLevelId() == null) {
                        throw new RuntimeException(
                                "First appointment must include a service level"
                        );
                    }
                    requireDepartmentAndOffice(event, position);
                    validateNwpWorkplaceFields(
                            event.getDepartment(),
                            event.getOffice(),
                            event.getDistrict(),
                            position
                    );
                    currentGrade = event.getGrade() != null ? event.getGrade() : Grade.III;
                    currentServiceLevelId = event.getServiceLevelId();
                    currentDepartment = DepartmentConstants.normalize(event.getDepartment());
                    currentOffice = event.getOffice().trim();
                    currentDistrict = DepartmentConstants.isNwpEngineering(currentDepartment)
                            ? event.getDistrict()
                            : null;

                    if (hasCatalogDesignation(event)) {
                        currentDesignation = resolveDesignation(event.getDesignationId(), position);
                        currentRecordedDesignationName = null;
                        currentServiceId = currentDesignation.getService() != null
                                ? currentDesignation.getService().getId()
                                : null;
                        validateAssignmentState(
                                currentDesignation,
                                currentGrade,
                                currentServiceLevelId,
                                position
                        );
                    } else {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                event.getRecordedDesignationName().trim();
                        if (event.getServiceId() != null) {
                            currentServiceId = event.getServiceId();
                        } else if (currentServiceId == null) {
                            throw new RuntimeException(
                                    "First appointment with a custom title must include the service"
                            );
                        }
                        ServiceType service = resolveService(currentServiceId, position);
                        validateCustomAssignmentState(
                                currentGrade,
                                currentServiceLevelId,
                                service,
                                position
                        );
                    }
                    firstAppointmentDate = event.getActionDate();
                    active = true;
                }

                case PERMANENT_CONFIRMATION -> {
                    requireActive(active, position, "Permanent confirmation");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (permanentConfirmed) {
                        throw new RuntimeException(
                                "Permanent confirmation can only be recorded once"
                        );
                    }
                    if (currentGrade != Grade.III) {
                        throw new RuntimeException(
                                "Permanent confirmation is only valid while the employee is at Grade III"
                        );
                    }
                    validatePermanentConfirmationDate(
                            event.getActionDate(),
                            firstAppointmentDate,
                            position
                    );
                    permanentConfirmed = true;
                }

                case PROMOTION -> {
                    requireActive(active, position, "Promotion");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (!hasCatalogDesignation(event) && !isCustomDesignationEvent(event)) {
                        throw new RuntimeException(
                                "Promotion (event #" + position
                                        + ") must include the new designation or a custom title"
                        );
                    }
                    if (event.getGrade() == null) {
                        throw new RuntimeException(
                                "Promotion (event #" + position + ") must include the grade"
                        );
                    }
                    validateGradeStep(
                            currentGrade,
                            event.getGrade(),
                            resolveService(currentServiceId, position),
                            position
                    );

                    ServiceType currentService = resolveService(currentServiceId, position);
                    if (hasCatalogDesignation(event)) {
                        Designation target = resolveDesignation(event.getDesignationId(), position);
                        validateSameServiceId(
                                currentServiceId,
                                target.getService() != null ? target.getService().getId() : null,
                                position
                        );
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                target,
                                position
                        );
                        currentDesignation = target;
                        currentRecordedDesignationName = null;
                        currentServiceId = target.getService() != null
                                ? target.getService().getId()
                                : currentServiceId;
                    } else {
                        if (event.getServiceLevelId() == null) {
                            throw new RuntimeException(
                                    "Promotion (event #" + position
                                            + ") with a custom title must include a service level"
                            );
                        }
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                currentService,
                                position
                        );
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                event.getRecordedDesignationName().trim();
                    }

                    currentGrade = event.getGrade();
                    if (currentGrade == Grade.II && grade2AchievedDate == null) {
                        grade2AchievedDate = event.getActionDate();
                    }
                    if (currentGrade == Grade.I && grade1AchievedDate == null) {
                        grade1AchievedDate = event.getActionDate();
                    }
                    if (event.getServiceLevelId() != null) {
                        currentServiceLevelId = event.getServiceLevelId();
                    }

                    if (hasCatalogDesignation(event)) {
                        validateAssignmentState(
                                currentDesignation,
                                currentGrade,
                                currentServiceLevelId,
                                position
                        );
                    } else {
                        validateCustomAssignmentState(
                                currentGrade,
                                currentServiceLevelId,
                                currentService,
                                position
                        );
                    }

                    if (Boolean.TRUE.equals(event.getTransferringOut())) {
                        if (!DepartmentConstants.isNwpEngineering(currentDepartment)) {
                            throw new RuntimeException(
                                    "Transfer out on promotion (event #" + position
                                            + ") is only available from "
                                            + DepartmentConstants.NWP_ENGINEERING
                            );
                        }
                        if (event.getToDepartment() == null || event.getToDepartment().isBlank()) {
                            throw new RuntimeException(
                                    "Transfer out on promotion (event #" + position
                                            + ") requires a destination department"
                            );
                        }
                        if (event.getToOffice() == null || event.getToOffice().isBlank()) {
                            throw new RuntimeException(
                                    "Transfer out on promotion (event #" + position
                                            + ") requires a destination office"
                            );
                        }
                        String destination = DepartmentConstants.normalize(
                                event.getToDepartment().trim()
                        );
                        if (DepartmentConstants.isNwpEngineering(destination)) {
                            throw new RuntimeException(
                                    "Promotion (event #" + position
                                            + ") cannot transfer out to "
                                            + DepartmentConstants.NWP_ENGINEERING
                            );
                        }
                        currentDepartment = destination;
                        currentOffice = event.getToOffice().trim();
                    }
                }

                case ASSIGNMENT_GRADE_UPDATE -> {
                    requireActive(active, position, "Grade update");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getGrade() == null) {
                        throw new RuntimeException(
                                "Grade update (event #" + position + ") must include the new grade"
                        );
                    }
                    ServiceType currentService = resolveService(currentServiceId, position);
                    if (hasCatalogDesignation(event)) {
                        Designation target =
                                resolveDesignation(event.getDesignationId(), position);
                        validateSameServiceId(
                                currentServiceId,
                                target.getService() != null ? target.getService().getId() : null,
                                position
                        );
                        currentDesignation = target;
                        currentRecordedDesignationName = null;
                        currentServiceId = target.getService() != null
                                ? target.getService().getId()
                                : currentServiceId;
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                target,
                                position
                        );
                    } else if (isCustomDesignationEvent(event)) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                event.getRecordedDesignationName().trim();
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                currentService,
                                position
                        );
                    } else if (currentDesignation != null) {
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                currentDesignation,
                                position
                        );
                    } else {
                        validateGradePromotionDate(
                                currentGrade,
                                event.getGrade(),
                                event.getActionDate(),
                                firstAppointmentDate,
                                grade2AchievedDate,
                                grade1AchievedDate,
                                currentService,
                                position
                        );
                    }
                    validateGradeStep(
                            currentGrade,
                            event.getGrade(),
                            currentService,
                            position
                    );
                    currentGrade = event.getGrade();
                    if (currentGrade == Grade.II && grade2AchievedDate == null) {
                        grade2AchievedDate = event.getActionDate();
                    }
                    if (currentGrade == Grade.I && grade1AchievedDate == null) {
                        grade1AchievedDate = event.getActionDate();
                    }
                    if (event.getServiceLevelId() != null) {
                        currentServiceLevelId = event.getServiceLevelId();
                    }
                    if (hasCatalogDesignation(event)) {
                        validateAssignmentState(
                                currentDesignation,
                                currentGrade,
                                currentServiceLevelId,
                                position
                        );
                    } else if (isCustomDesignationEvent(event)
                            || currentRecordedDesignationName != null) {
                        validateCustomAssignmentState(
                                currentGrade,
                                currentServiceLevelId,
                                currentService,
                                position
                        );
                    } else {
                        validateAssignmentState(
                                currentDesignation,
                                currentGrade,
                                currentServiceLevelId,
                                position
                        );
                    }
                }

                case TRANSFER_OUT -> {
                    requireActive(active, position, "Transfer out");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getToDepartment() == null
                            || event.getToDepartment().isBlank()) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position + ") must include "
                                        + "the destination department"
                        );
                    }
                    if (event.getToOffice() == null || event.getToOffice().isBlank()) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position + ") must include "
                                        + "the destination office"
                        );
                    }
                    String toDepartment = DepartmentConstants.normalize(event.getToDepartment());
                    if (currentDepartment != null && currentDepartment.equals(toDepartment)) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position + ") requires a different "
                                        + "department. Use Office Change for same-department moves."
                        );
                    }
                    validateNwpWorkplaceFields(
                            toDepartment,
                            event.getToOffice(),
                            event.getToDistrict(),
                            position
                    );
                    if (!hasCatalogDesignation(event) && !isCustomDesignationEvent(event)) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position
                                        + ") must include the destination designation"
                        );
                    }
                    if (event.getServiceLevelId() == null) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position
                                        + ") must include the destination service level"
                        );
                    }
                    ServiceType currentService = resolveService(currentServiceId, position);
                    Long targetServiceLevelId = event.getServiceLevelId();
                    if (hasCatalogDesignation(event)) {
                        Designation target =
                                resolveDesignation(event.getDesignationId(), position);
                        validateSameServiceId(
                                currentServiceId,
                                target.getService() != null ? target.getService().getId() : null,
                                position
                        );
                        validateAssignmentState(
                                target,
                                currentGrade,
                                targetServiceLevelId,
                                position
                        );
                        currentDesignation = target;
                        currentRecordedDesignationName = null;
                    } else {
                        validateCustomAssignmentState(
                                currentGrade,
                                targetServiceLevelId,
                                currentService,
                                position
                        );
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                event.getRecordedDesignationName().trim();
                    }
                    currentServiceLevelId = targetServiceLevelId;
                    currentDepartment = toDepartment;
                    currentOffice = event.getToOffice().trim();
                    if (DepartmentConstants.isNwpEngineering(toDepartment)) {
                        currentDistrict = event.getToDistrict() != null
                                ? event.getToDistrict()
                                : officeService
                                        .findDistrictByOfficeName(currentOffice)
                                        .orElse(currentDistrict);
                    } else {
                        currentDistrict = null;
                    }
                }

                case OFFICE_CHANGE -> {
                    requireActive(active, position, "Office change");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getOffice() == null || event.getOffice().isBlank()) {
                        throw new RuntimeException(
                                "Office change (event #" + position + ") must include the new office"
                        );
                    }
                    if (DepartmentConstants.isNwpEngineering(currentDepartment)) {
                        if (event.getDistrict() == null) {
                            throw new RuntimeException(
                                    "Office change (event #" + position
                                            + ") must include the working district"
                            );
                        }
                        officeService.validateNwpWorkplace(
                                event.getOffice().trim(),
                                event.getDistrict()
                        );
                        boolean sameOffice = currentOffice != null
                                && currentOffice.equalsIgnoreCase(event.getOffice().trim());
                        boolean sameDistrict = currentDistrict != null
                                && currentDistrict.equalsIgnoreCase(event.getDistrict());
                        if (sameOffice && sameDistrict) {
                            throw new RuntimeException(
                                    "Office change (event #" + position
                                            + ") must change the office, district, or both"
                            );
                        }
                        currentDistrict = event.getDistrict();
                    } else if (currentOffice != null
                            && currentOffice.equalsIgnoreCase(event.getOffice().trim())) {
                        throw new RuntimeException(
                                "Office change (event #" + position
                                        + ") must specify a different office"
                        );
                    }
                    currentOffice = event.getOffice().trim();
                }

                case RETIREMENT_OR_RESIGNATION -> {
                    requireActive(active, position, "Retirement/Resignation");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    active = false;
                }

                case DISMISSAL -> {
                    requireActive(active, position, "Dismissal");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getReason() == null || event.getReason().isBlank()) {
                        throw new RuntimeException(
                                "Dismissal (event #" + position + ") must include a reason"
                        );
                    }
                    active = false;
                }

                case VACATION_OF_POST -> {
                    requireActive(active, position, "Vacation of Post");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getReason() == null || event.getReason().isBlank()) {
                        throw new RuntimeException(
                                "Vacation of Post (event #" + position + ") must include a reason"
                        );
                    }
                    active = false;
                }

                case DEATH -> {
                    requireActive(active, position, "Death");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    active = false;
                    deathRecorded = true;
                }

                default -> {
                }
            }

            previousDate = event.getActionDate();
        }
    }

    private void validatePermanentConfirmationDate(
            LocalDate confirmationDate,
            LocalDate firstAppointmentDate,
            int position
    ) {
        LocalDate minimumDate = careerProgressionService
                .getMinimumPermanentConfirmationDate(firstAppointmentDate);
        if (minimumDate != null && confirmationDate.isBefore(minimumDate)) {
            throw new RuntimeException(
                    "Permanent confirmation (event #" + position
                            + ") cannot be earlier than "
                            + minimumDate
                            + ". The employee must complete the "
                            + CareerProgressionService.PROBATION_YEARS
                            + "-year probation period from the first appointment date."
            );
        }
    }

    private void validateGradePromotionDate(
            Grade currentGrade,
            Grade newGrade,
            LocalDate actionDate,
            LocalDate firstAppointmentDate,
            LocalDate grade2AchievedDate,
            LocalDate grade1AchievedDate,
            Designation designation,
            int position
    ) {
        validateGradePromotionDate(
                currentGrade,
                newGrade,
                actionDate,
                firstAppointmentDate,
                grade2AchievedDate,
                grade1AchievedDate,
                designation != null ? designation.getService() : null,
                position
        );
    }

    private void validateGradePromotionDate(
            Grade currentGrade,
            Grade newGrade,
            LocalDate actionDate,
            LocalDate firstAppointmentDate,
            LocalDate grade2AchievedDate,
            LocalDate grade1AchievedDate,
            ServiceType service,
            int position
    ) {
        if (currentGrade == Grade.III && newGrade == Grade.II) {
            LocalDate minimumDate = careerProgressionService
                    .getMinimumGrade2PromotionDate(firstAppointmentDate, service);
            if (minimumDate != null && actionDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " cannot be earlier than "
                                + minimumDate
                                + ". Grade II promotion requires the service period "
                                + "counted from the first appointment date."
                );
            }
            return;
        }

        if (currentGrade == Grade.II && newGrade == Grade.I) {
            if (grade2AchievedDate == null) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " requires a prior Grade II achievement date"
                );
            }
            LocalDate minimumDate = careerProgressionService
                    .getMinimumGrade1PromotionDate(grade2AchievedDate, service);
            if (minimumDate != null && actionDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " cannot be earlier than "
                                + minimumDate
                                + ". Grade I promotion requires the service period "
                                + "from Grade II achievement."
                );
            }
            return;
        }

        if (currentGrade == Grade.I && newGrade == Grade.SUPRA) {
            if (grade1AchievedDate == null) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " requires a prior Grade I achievement date"
                );
            }
            LocalDate minimumDate = careerProgressionService
                    .getMinimumSupraPromotionDate(grade1AchievedDate, service);
            if (minimumDate != null && actionDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " cannot be earlier than "
                                + minimumDate
                                + ". Supra promotion requires the service period "
                                + "from Grade I achievement."
                );
            }
            return;
        }

        if (currentGrade == Grade.I && newGrade == Grade.SPECIAL) {
            if (grade1AchievedDate == null) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " requires a prior Grade I achievement date"
                );
            }
            LocalDate minimumDate = careerProgressionService
                    .getMinimumSpecialPromotionDate(grade1AchievedDate, service);
            if (minimumDate != null && actionDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " cannot be earlier than "
                                + minimumDate
                                + ". Special promotion requires the service period "
                                + "from Grade I achievement."
                );
            }
        }
    }

    private void requireTimelineWorkplace(
            String department,
            String office,
            int position
    ) {
        if (department == null || department.isBlank()) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " requires a current department from prior events"
            );
        }
        if (office != null && office.isBlank()) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " requires a current office from prior events"
            );
        }
        if (office == null) {
            return;
        }
    }

    private void requireDepartmentAndOffice(CareerHistoryEventRequest event, int position) {
        if (event.getDepartment() == null || event.getDepartment().isBlank()) {
            throw new RuntimeException(
                    "Career history event #" + position + " requires a department"
            );
        }
        if (event.getOffice() == null || event.getOffice().isBlank()) {
            throw new RuntimeException(
                    "Career history event #" + position + " requires an office"
            );
        }
    }

    private void validateNwpWorkplaceFields(
            String department,
            String office,
            String district,
            int position
    ) {
        if (!DepartmentConstants.isNwpEngineering(department)) {
            return;
        }
        String effectiveDistrict = district != null && !district.isBlank()
                ? district
                : officeService.findDistrictByOfficeName(office).orElse(null);
        if (effectiveDistrict == null || effectiveDistrict.isBlank()) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " requires a working district for "
                            + DepartmentConstants.getPrimaryDepartmentName()
            );
        }
        officeService.validateNwpWorkplace(office, effectiveDistrict);
    }

    private void validateAssignmentState(
            Designation designation,
            Grade grade,
            Long serviceLevelId,
            int position
    ) {
        if (designation == null || grade == null) {
            return;
        }

        designationAssignmentValidator.validateGrade(grade, designation);
        validateServiceLevelForEvent(serviceLevelId, designation, position);
    }

    private void validateCustomAssignmentState(
            Grade grade,
            Long serviceLevelId,
            ServiceType service,
            int position
    ) {
        if (grade == null || service == null) {
            return;
        }

        try {
            designationAssignmentValidator.validateCustomAssignment(
                    grade,
                    serviceLevelId,
                    service
            );
        } catch (RuntimeException ex) {
            throw new RuntimeException(
                    "Career history event #" + position + ": " + ex.getMessage(),
                    ex
            );
        }
    }

    private boolean hasCatalogDesignation(CareerHistoryEventRequest event) {
        return event.getDesignationId() != null;
    }

    private boolean isCustomDesignationEvent(CareerHistoryEventRequest event) {
        return event.getDesignationId() == null
                && event.getRecordedDesignationName() != null
                && !event.getRecordedDesignationName().isBlank();
    }

    private ServiceType resolveService(Long serviceId, int position) {
        if (serviceId == null) {
            throw new RuntimeException(
                    "Career history event #" + position + " requires a service"
            );
        }
        return serviceTypeRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException(
                        "Service not found for career history event #" + position
                ));
    }

    private void validateSameServiceId(
            Long currentServiceId,
            Long targetServiceId,
            int position
    ) {
        if (currentServiceId == null
                || targetServiceId == null
                || !currentServiceId.equals(targetServiceId)) {
            throw new RuntimeException(
                    "Career history event #" + position + ": promotions can only be made "
                            + "within the same service"
            );
        }
    }

    private void validateServiceLevelForEvent(
            Long serviceLevelId,
            Designation designation,
            int position
    ) {
        if (designation.getServiceLevel() == null) {
            throw new RuntimeException(
                    "Designation service level is not configured for career history event #"
                            + position
            );
        }

        if (serviceLevelId == null) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " requires a service level for "
                            + designation.getDesignationName()
            );
        }

        if (!designation.getServiceLevel().getId().equals(serviceLevelId)) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + ": service level must be '"
                            + designation.getServiceLevel().getLevelName()
                            + "' for '"
                            + designation.getDesignationName()
                            + "'"
            );
        }
    }

    private void requireActive(boolean active, int position, String actionLabel) {
        if (!active) {
            throw new RuntimeException(
                    actionLabel + " (event #" + position + ") is not valid while "
                            + "the employee is out of service"
            );
        }
    }

    private void validateGradeStep(
            Grade currentGrade,
            Grade newGrade,
            ServiceType service,
            int position
    ) {
        if (newGrade == null || newGrade == Grade.NONE) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " has an invalid grade for a permanent employee"
            );
        }

        if (currentGrade == newGrade) {
            return;
        }

        boolean allowed = switch (currentGrade) {
            case III -> newGrade == Grade.II;
            case II -> newGrade == Grade.I;
            case I -> (newGrade == Grade.SUPRA
                    && careerProgressionService.serviceAllowsSupra(service))
                    || (newGrade == Grade.SPECIAL
                    && careerProgressionService.serviceAllowsSpecial(service));
            default -> false;
        };

        if (!allowed) {
            throw new RuntimeException(
                    "Career history event #" + position + " has an invalid grade step ("
                            + label(currentGrade) + " to " + label(newGrade) + " is not allowed)"
            );
        }
    }

    private void validateSameService(
            Designation currentDesignation,
            Designation targetDesignation,
            int position
    ) {
        validateSameServiceId(
                currentDesignation != null && currentDesignation.getService() != null
                        ? currentDesignation.getService().getId()
                        : null,
                targetDesignation != null && targetDesignation.getService() != null
                        ? targetDesignation.getService().getId()
                        : null,
                position
        );
    }

    private Designation resolveDesignation(Long designationId, int position) {
        return designationRepository.findById(designationId)
                .orElseThrow(() -> new RuntimeException(
                        "Designation not found for career history event #" + position
                ));
    }

    private int rank(Grade grade) {
        if (grade == null) {
            return 0;
        }
        return switch (grade) {
            case NONE -> 0;
            case III -> 1;
            case II -> 2;
            case I -> 3;
            case SUPRA -> 4;
            case SPECIAL -> 5;
        };
    }

    private String label(Grade grade) {
        return grade != null ? grade.getLabel() : "None";
    }
}
