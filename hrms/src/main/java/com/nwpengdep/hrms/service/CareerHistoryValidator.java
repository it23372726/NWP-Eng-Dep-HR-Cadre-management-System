package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.DesignationRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CareerHistoryValidator {

    private final DesignationRepository designationRepository;
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
        Designation currentDesignation = null;
        Grade currentGrade = null;
        Long currentServiceLevelId = null;
        String currentDepartment = null;
        String currentOffice = null;
        District currentDistrict = null;
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
                    if (event.getDesignationId() == null) {
                        throw new RuntimeException(
                                "First appointment must include a designation"
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
                    currentDesignation = resolveDesignation(event.getDesignationId(), position);
                    currentGrade = event.getGrade() != null ? event.getGrade() : Grade.III;
                    currentServiceLevelId = event.getServiceLevelId();
                    currentDepartment = DepartmentConstants.normalize(event.getDepartment());
                    currentOffice = event.getOffice().trim();
                    currentDistrict = DepartmentConstants.isNwpEngineering(currentDepartment)
                            ? event.getDistrict()
                            : null;
                    validateAssignmentState(
                            currentDesignation,
                            currentGrade,
                            currentServiceLevelId,
                            position
                    );
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
                    if (event.getDesignationId() == null) {
                        throw new RuntimeException(
                                "Promotion (event #" + position + ") must include the new designation"
                        );
                    }
                    Designation target = resolveDesignation(event.getDesignationId(), position);
                    validateSameService(currentDesignation, target, position);
                    if (event.getGrade() == null) {
                        throw new RuntimeException(
                                "Promotion (event #" + position + ") must include the grade"
                        );
                    }
                    validateGradeStep(currentGrade, event.getGrade(), position);
                    validateGradePromotionDate(
                            currentGrade,
                            event.getGrade(),
                            event.getActionDate(),
                            firstAppointmentDate,
                            grade2AchievedDate,
                            currentDesignation,
                            position
                    );
                    currentDesignation = target;
                    currentGrade = event.getGrade();
                    if (currentGrade == Grade.II && grade2AchievedDate == null) {
                        grade2AchievedDate = event.getActionDate();
                    }
                    if (event.getServiceLevelId() != null) {
                        currentServiceLevelId = event.getServiceLevelId();
                    }
                    validateAssignmentState(
                            currentDesignation,
                            currentGrade,
                            currentServiceLevelId,
                            position
                    );
                }

                case ASSIGNMENT_GRADE_UPDATE -> {
                    requireActive(active, position, "Grade update");
                    requireTimelineWorkplace(currentDepartment, currentOffice, position);
                    if (event.getGrade() == null) {
                        throw new RuntimeException(
                                "Grade update (event #" + position + ") must include the new grade"
                        );
                    }
                    if (event.getDesignationId() != null) {
                        Designation target =
                                resolveDesignation(event.getDesignationId(), position);
                        validateSameService(currentDesignation, target, position);
                        currentDesignation = target;
                    }
                    validateGradeStep(currentGrade, event.getGrade(), position);
                    validateGradePromotionDate(
                            currentGrade,
                            event.getGrade(),
                            event.getActionDate(),
                            firstAppointmentDate,
                            grade2AchievedDate,
                            currentDesignation,
                            position
                    );
                    currentGrade = event.getGrade();
                    if (currentGrade == Grade.II && grade2AchievedDate == null) {
                        grade2AchievedDate = event.getActionDate();
                    }
                    if (event.getServiceLevelId() != null) {
                        currentServiceLevelId = event.getServiceLevelId();
                    }
                    validateAssignmentState(
                            currentDesignation,
                            currentGrade,
                            currentServiceLevelId,
                            position
                    );
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
                                && currentDistrict == event.getDistrict();
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
            Designation designation,
            int position
    ) {
        if (currentGrade == Grade.III && newGrade == Grade.II) {
            LocalDate minimumDate = careerProgressionService
                    .getMinimumGrade2PromotionDate(firstAppointmentDate, designation);
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
                    .getMinimumGrade1PromotionDate(grade2AchievedDate, designation);
            if (minimumDate != null && actionDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Career history event #" + position
                                + " cannot be earlier than "
                                + minimumDate
                                + ". Grade I promotion requires the service period "
                                + "from Grade II achievement."
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
            District district,
            int position
    ) {
        if (!DepartmentConstants.isNwpEngineering(department)) {
            return;
        }
        District effectiveDistrict = district != null
                ? district
                : officeService.findDistrictByOfficeName(office).orElse(null);
        if (effectiveDistrict == null) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " requires a working district for N.W.P. Engineering Department"
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

    private void validateGradeStep(Grade currentGrade, Grade newGrade, int position) {
        int currentRank = rank(currentGrade);
        int newRank = rank(newGrade);

        if (newRank == 0) {
            throw new RuntimeException(
                    "Career history event #" + position
                            + " has an invalid grade for a permanent employee"
            );
        }

        if (newRank != currentRank && newRank != currentRank + 1) {
            throw new RuntimeException(
                    "Career history event #" + position + " skips grade steps: "
                            + "grades must progress one step at a time ("
                            + label(currentGrade) + " to " + label(newGrade) + " is not allowed)"
            );
        }
    }

    private void validateSameService(
            Designation currentDesignation,
            Designation targetDesignation,
            int position
    ) {
        if (currentDesignation == null
                || currentDesignation.getService() == null
                || targetDesignation == null
                || targetDesignation.getService() == null
                || !currentDesignation.getService().getId()
                        .equals(targetDesignation.getService().getId())) {
            throw new RuntimeException(
                    "Career history event #" + position + ": promotions can only be made "
                            + "to a designation within the same service"
            );
        }
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
