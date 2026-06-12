package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.DesignationRepository;

import lombok.RequiredArgsConstructor;

/**
 * Lenient validation for career history entered at employee creation.
 * The history already happened, so eligibility-years and exam-requirement
 * checks are intentionally skipped. Only structural sanity is enforced:
 * chronology, sequential grade steps, same-service promotions and
 * sensible ordering around terminal events.
 */
@Component
@RequiredArgsConstructor
public class CareerHistoryValidator {

    private final DesignationRepository designationRepository;
    private final DesignationAssignmentValidator designationAssignmentValidator;

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
        Designation currentDesignation = null;
        Grade currentGrade = null;
        Long currentServiceLevelId = null;
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
                    currentDesignation = resolveDesignation(event.getDesignationId(), position);
                    currentGrade = event.getGrade() != null ? event.getGrade() : Grade.III;
                    currentServiceLevelId = event.getServiceLevelId();
                    validateAssignmentState(
                            currentDesignation,
                            currentGrade,
                            currentServiceLevelId,
                            position
                    );
                    active = true;
                }

                case PERMANENT_CONFIRMATION -> {
                    requireActive(active, position, "Permanent confirmation");
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
                    permanentConfirmed = true;
                }

                case PROMOTION -> {
                    requireActive(active, position, "Promotion");
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
                    currentDesignation = target;
                    currentGrade = event.getGrade();
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
                    currentGrade = event.getGrade();
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

                case TRANSFER_IN -> {
                    if (active) {
                        throw new RuntimeException(
                                "Transfer in (event #" + position + ") is only valid after "
                                        + "the employee has left service (e.g. after a transfer out)"
                        );
                    }
                    if (event.getDesignationId() != null) {
                        currentDesignation =
                                resolveDesignation(event.getDesignationId(), position);
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
                    active = true;
                }

                case TRANSFER_OUT -> {
                    requireActive(active, position, "Transfer out");
                    if (event.getTransferredTo() == null
                            || event.getTransferredTo().isBlank()) {
                        throw new RuntimeException(
                                "Transfer out (event #" + position + ") must include "
                                        + "where the employee was transferred to"
                        );
                    }
                    active = false;
                }

                case RETIREMENT_OR_RESIGNATION -> {
                    requireActive(active, position, "Retirement/Resignation");
                    active = false;
                }

                case DISMISSAL -> {
                    requireActive(active, position, "Dismissal");
                    if (event.getReason() == null || event.getReason().isBlank()) {
                        throw new RuntimeException(
                                "Dismissal (event #" + position + ") must include a reason"
                        );
                    }
                    active = false;
                }

                case DEATH -> {
                    requireActive(active, position, "Death");
                    active = false;
                    deathRecorded = true;
                }
            }

            previousDate = event.getActionDate();
        }
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
