import { deriveTimelineState } from "../components/CareerHistoryBuilder";
import {
    ACTION_TYPE_LABELS,
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    isRequirementCompleted,
    REQUIREMENT_STATUS,
    validateDesignationAssignment
} from "../constants/hrms";

export const emptyForm = {
    employeeNo: "",
    fullName: "",
    designationId: "",
    nic: "",
    dateOfBirth: "",
    gender: "",
    grade: "None",
    dateOfFirstAppointment: "",
    incremantDate: "",
    enteredDateToAllIslandService: "",
    reportedDateToPresentWorkingPlace: "",
    currentWorkingPlace: "",
    currentDistrictOfWorking: "",
    appointmentDateToPresentClassGrade: "",
    enteredDateToNWPCouncil: "",
    permanentAddress: "",
    residentDistrict: "",
    contactNo: "",
    serviceLevelId: "",
    employmentType: "PERMANENT",
    ebGrade3Passed: false,
    languageQualificationPassed: false,
    medicalReportCompleted: false,
    olApproved: false,
    alApproved: false,
    degreeApproved: false,
    birthCertificateApproved: false,
    alreadyConfirmedPermanent: false,
    permanentConfirmationDate: "",
    ebGrade2Passed: false,
    ebGrade1Passed: false
};

export const requirementKey = (type, name) => `${type}:${name}`;

const completedStatus = (checked) =>
    checked ? REQUIREMENT_STATUS.COMPLETED : REQUIREMENT_STATUS.PENDING;

export const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
    );

export const appendCustomRequirementFields = (form, employee, designation) => {
    (designation?.permanentRequirements || []).forEach((requirement) => {
        form[requirementKey(
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        )] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        );
    });

    (designation?.grade2Requirements || []).forEach((requirement) => {
        form[requirementKey(
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        )] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        );
    });

    (designation?.grade1Requirements || []).forEach((requirement) => {
        form[requirementKey(
            "CUSTOM_GRADE_1_REQUIREMENT",
            requirement.requirementName
        )] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_GRADE_1_REQUIREMENT",
            requirement.requirementName
        );
    });
};

export function mapEmployeeToForm(employee) {
    if (!employee) {
        return { ...emptyForm };
    }

    const careerProgression = employee.careerProgression || {};
    const form = {
        employeeNo: employee.employeeNo ?? "",
        fullName: employee.fullName ?? "",
        designationId: employee.designation?.id ?? "",
        nic: employee.nic ?? "",
        dateOfBirth: employee.dateOfBirth ?? "",
        gender: employee.gender ?? "",
        grade: employee.grade ?? "None",
        dateOfFirstAppointment: employee.dateOfFirstAppointment ?? "",
        incremantDate: employee.incremantDate ?? "",
        enteredDateToAllIslandService:
            employee.enteredDateToAllIslandService ?? "",
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace ?? "",
        currentWorkingPlace: employee.currentWorkingPlace ?? "",
        currentDistrictOfWorking: employee.currentDistrictOfWorking ?? "",
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade ?? "",
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil ?? "",
        permanentAddress: employee.permanentAddress ?? "",
        residentDistrict: employee.residentDistrict ?? "",
        contactNo: employee.contactNo ?? "",
        serviceLevelId: employee.serviceLevel?.id ?? "",
        employmentType: employee.employmentType ?? "PERMANENT",
        ebGrade3Passed: isRequirementCompleted(employee, "EB_GRADE_3"),
        languageQualificationPassed: isRequirementCompleted(
            employee,
            "GOVERNMENT_LANGUAGE_QUALIFICATION"
        ),
        medicalReportCompleted: isRequirementCompleted(employee, "MEDICAL_REPORT"),
        olApproved: isRequirementCompleted(employee, "OL_CERTIFICATE"),
        alApproved: isRequirementCompleted(employee, "AL_CERTIFICATE"),
        degreeApproved: isRequirementCompleted(employee, "DEGREE_CERTIFICATE"),
        birthCertificateApproved: isRequirementCompleted(
            employee,
            "BIRTH_CERTIFICATE"
        ),
        alreadyConfirmedPermanent: Boolean(
            careerProgression.permanentConfirmationDate
        ),
        permanentConfirmationDate:
            careerProgression.permanentConfirmationDate ?? "",
        ebGrade2Passed: isRequirementCompleted(employee, "EB_GRADE_2"),
        ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1")
    };

    appendCustomRequirementFields(form, employee, employee.designation);
    return form;
}

export const applyGradeDerivedRequirements = (formData) => {
    const next = { ...formData };
    const isPermanent = next.employmentType === "PERMANENT";
    const gradeImpliesPermanent =
        isPermanent
        && ["II", "I", "Supra", "Special"].includes(next.grade);
    const gradeThreeAlreadyConfirmed =
        isPermanent
        && next.grade === "III"
        && next.alreadyConfirmedPermanent;

    if (gradeImpliesPermanent || gradeThreeAlreadyConfirmed) {
        next.ebGrade3Passed = true;
        next.languageQualificationPassed = true;
        next.medicalReportCompleted = true;
        next.olApproved = true;
        next.alApproved = true;
        next.degreeApproved = true;
        next.birthCertificateApproved = true;
    }

    if (gradeImpliesPermanent) {
        next.alreadyConfirmedPermanent = true;
        next.ebGrade2Passed = true;
        if (!next.permanentConfirmationDate) {
            next.permanentConfirmationDate =
                next.appointmentDateToPresentClassGrade;
        }
    }

    if (gradeThreeAlreadyConfirmed && next.permanentConfirmationDate) {
        next.appointmentDateToPresentClassGrade =
            next.permanentConfirmationDate;
    }

    return next;
};

export const applyTimelineToFormData = (formData, events, designation) => {
    if (!events.length) {
        return formData;
    }

    const state = deriveTimelineState(events);
    let next = {
        ...formData,
        designationId: state.designationId ?? "",
        grade: state.grade ?? "None",
        serviceLevelId: state.serviceLevelId ?? "",
        dateOfFirstAppointment: state.firstAppointmentDate ?? "",
        alreadyConfirmedPermanent: state.permanentConfirmed,
        permanentConfirmationDate: state.permanentConfirmationDate ?? ""
    };

    if (state.firstAppointmentDate && !next.enteredDateToNWPCouncil) {
        next.enteredDateToNWPCouncil = state.firstAppointmentDate;
    }

    next = applyGradeDerivedRequirements(next);
    appendCustomRequirementFields(next, null, designation);
    return next;
};

export const getQualificationSectionConfig = (grade, permanentConfirmed) => {
    if (grade === "III" && !permanentConfirmed) {
        return {
            title: "Permanent requirements",
            description:
                "Grade III permanency requirements and certificate approvals.",
            fixedRequirements: FIXED_PERMANENT_REQUIREMENTS,
            customType: "CUSTOM_PERMANENT_REQUIREMENT",
            customField: "permanentRequirements"
        };
    }

    if (grade === "III" && permanentConfirmed) {
        return {
            title: "Grade II requirements",
            description:
                "Requirements already completed toward future Grade II promotion.",
            fixedRequirements: FIXED_GRADE2_REQUIREMENTS,
            customType: "CUSTOM_GRADE_2_REQUIREMENT",
            customField: "grade2Requirements",
            showGrade2Years: true
        };
    }

    if (grade === "II") {
        return {
            title: "Grade I requirements",
            description:
                "Requirements already completed toward future Grade I promotion.",
            fixedRequirements: FIXED_GRADE1_REQUIREMENTS,
            customType: "CUSTOM_GRADE_1_REQUIREMENT",
            customField: "grade1Requirements",
            showGrade1Years: true
        };
    }

    if (["I", "Supra", "Special"].includes(grade)) {
        return {
            title: "Qualifications",
            description:
                "Prior permanent and grade requirements are assumed completed for this career stage.",
            fixedRequirements: [],
            customType: null,
            customField: null,
            allCompleted: true
        };
    }

    return null;
};

export const buildRequirements = (formData, designation, employee) => {
    const requirements = [
        {
            requirementType: "EB_GRADE_3",
            status: completedStatus(formData.ebGrade3Passed)
        },
        {
            requirementType: "GOVERNMENT_LANGUAGE_QUALIFICATION",
            status: completedStatus(formData.languageQualificationPassed)
        },
        {
            requirementType: "MEDICAL_REPORT",
            status: completedStatus(formData.medicalReportCompleted)
        },
        {
            requirementType: "OL_CERTIFICATE",
            status: completedStatus(formData.olApproved)
        },
        {
            requirementType: "AL_CERTIFICATE",
            status: completedStatus(formData.alApproved)
        },
        {
            requirementType: "DEGREE_CERTIFICATE",
            status: completedStatus(formData.degreeApproved)
        },
        {
            requirementType: "BIRTH_CERTIFICATE",
            status: completedStatus(formData.birthCertificateApproved)
        },
        {
            requirementType: "EB_GRADE_2",
            status: completedStatus(formData.ebGrade2Passed)
        },
        {
            requirementType: "EB_GRADE_1",
            status: completedStatus(formData.ebGrade1Passed)
        }
    ];

    const appendCustomRequirements = (type, designationRequirements) => {
        (designationRequirements || []).forEach((requirement) => {
            const key = requirementKey(type, requirement.requirementName);
            const checked = formData[key] ?? isNamedRequirementCompleted(
                employee,
                type,
                requirement.requirementName
            );
            requirements.push({
                requirementType: type,
                requirementName: requirement.requirementName,
                status: completedStatus(checked)
            });
        });
    };

    appendCustomRequirements(
        "CUSTOM_PERMANENT_REQUIREMENT",
        designation?.permanentRequirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_2_REQUIREMENT",
        designation?.grade2Requirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_1_REQUIREMENT",
        designation?.grade1Requirements
    );

    return requirements;
};

export const buildEmployeePayload = (
    formData,
    designation,
    employee,
    options = {}
) => {
    const {
        showPermanentConfirmationSection = false,
        showQualificationSection = false
    } = options;

    return {
        employeeNo: formData.employeeNo,
        fullName: formData.fullName,
        designationId: Number(formData.designationId),
        nic: formData.nic,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        grade: formData.grade,
        dateOfFirstAppointment: formData.dateOfFirstAppointment,
        incremantDate: formData.incremantDate || null,
        enteredDateToAllIslandService:
            formData.enteredDateToAllIslandService || null,
        reportedDateToPresentWorkingPlace:
            formData.reportedDateToPresentWorkingPlace,
        currentWorkingPlace: formData.currentWorkingPlace,
        currentDistrictOfWorking: formData.currentDistrictOfWorking,
        appointmentDateToPresentClassGrade:
            showPermanentConfirmationSection
                ? formData.permanentConfirmationDate || null
                : showQualificationSection
                    ? null
                    : formData.appointmentDateToPresentClassGrade || null,
        enteredDateToNWPCouncil: formData.enteredDateToNWPCouncil,
        permanentAddress: formData.permanentAddress,
        residentDistrict: formData.residentDistrict || null,
        contactNo: formData.contactNo,
        serviceLevelId: Number(formData.serviceLevelId),
        employmentType: formData.employmentType,
        alreadyConfirmedPermanent: formData.alreadyConfirmedPermanent,
        permanentConfirmationDate: formData.permanentConfirmationDate || null,
        grade2RequiredYears: null,
        grade1RequiredYears: null,
        requirements: buildRequirements(formData, designation, employee)
    };
};

export const buildPermanentCreatePayload = (
    formData,
    historyEvents,
    designation
) => {
    const timelineForm = applyTimelineToFormData(
        formData,
        historyEvents,
        designation
    );
    const state = deriveTimelineState(historyEvents);
    const showQualificationSection =
        timelineForm.grade === "III" && !timelineForm.alreadyConfirmedPermanent;
    const showPermanentConfirmationSection =
        timelineForm.grade === "III" && timelineForm.alreadyConfirmedPermanent;

    const councilDate =
        timelineForm.enteredDateToNWPCouncil
        || state.firstAppointmentDate
        || timelineForm.dateOfFirstAppointment;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            appointmentDateToPresentClassGrade:
                timelineForm.permanentConfirmationDate
                || timelineForm.appointmentDateToPresentClassGrade
                || null
        },
        designation,
        null,
        { showPermanentConfirmationSection, showQualificationSection }
    );

    return {
        ...payload,
        entryType: "NEW_EMPLOYEE",
        transferredFrom: null,
        remarks: null,
        careerHistory: historyEvents
    };
};

export const buildNonPermanentCreatePayload = (
    formData,
    designation,
    employee
) => {
    const firstAppointment =
        formData.dateOfFirstAppointment
        || formData.enteredDateToNWPCouncil
        || formData.reportedDateToPresentWorkingPlace;

    const payload = buildEmployeePayload(
        {
            ...formData,
            grade: "None",
            dateOfFirstAppointment: firstAppointment,
            enteredDateToNWPCouncil:
                formData.enteredDateToNWPCouncil || firstAppointment
        },
        designation,
        employee
    );

    return {
        ...payload,
        entryType: "NEW_EMPLOYEE",
        transferredFrom: null,
        remarks: null
    };
};

const inferServiceLevelId = (designationId, designations, fallbackId) => {
    if (!designationId) {
        return fallbackId ?? "";
    }

    const designation = designations.find(
        (item) => item.id === Number(designationId)
    );

    return designation?.serviceLevel?.id ?? fallbackId ?? "";
};

const mapActionToCareerEvent = (action, designations, serviceLevelFallback) => {
    const base = {
        actionDate: action.actionDate ?? "",
        remarks: action.remarks ?? "",
        reason: action.reason ?? "",
        transferredFrom: action.transferredFrom ?? "",
        transferredTo: action.transferredTo ?? ""
    };

    switch (action.actionType) {
        case "NEW_APPOINTMENT":
            return {
                ...base,
                actionType: "NEW_APPOINTMENT",
                designationId: action.newDesignationId ?? "",
                grade: action.newGrade || "III",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                )
            };

        case "PERMANENT_CONFIRMATION":
            return {
                ...base,
                actionType: "PERMANENT_CONFIRMATION"
            };

        case "PROMOTION":
        case "ASSIGNMENT_GRADE_UPDATE":
            return {
                ...base,
                actionType: "PROMOTION",
                designationId: action.newDesignationId ?? "",
                grade: action.newGrade ?? "",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                )
            };

        case "TRANSFER_IN":
            return {
                ...base,
                actionType: "TRANSFER_IN",
                designationId: action.newDesignationId ?? "",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                )
            };

        case "TRANSFER_OUT":
            return {
                ...base,
                actionType: "TRANSFER_OUT"
            };

        case "RETIREMENT_OR_RESIGNATION":
        case "DEATH":
        case "DISMISSAL":
            return {
                ...base,
                actionType: action.actionType
            };

        default:
            return {
                ...base,
                actionType: action.actionType
            };
    }
};

export const mapActionsToCareerHistory = (actions, designations, employee) => {
    if (!actions?.length) {
        return [
            {
                actionType: "NEW_APPOINTMENT",
                actionDate: employee?.dateOfFirstAppointment ?? "",
                designationId: employee?.designation?.id ?? "",
                grade:
                    employee?.grade && employee.grade !== "None"
                        ? employee.grade
                        : "III",
                serviceLevelId: employee?.serviceLevel?.id ?? "",
                remarks: ""
            }
        ];
    }

    const chronological = [...actions].sort((left, right) => {
        const dateCompare = (left.actionDate || "").localeCompare(
            right.actionDate || ""
        );

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return (left.id ?? 0) - (right.id ?? 0);
    });

    let serviceLevelFallback = employee?.serviceLevel?.id ?? "";

    return chronological.map((action) => {
        const event = mapActionToCareerEvent(
            action,
            designations,
            serviceLevelFallback
        );

        if (event.serviceLevelId) {
            serviceLevelFallback = event.serviceLevelId;
        }

        return event;
    });
};

export const buildPermanentUpdatePayload = (
    formData,
    historyEvents,
    designation,
    employee
) => {
    const timelineForm = applyTimelineToFormData(
        formData,
        historyEvents,
        designation
    );
    const state = deriveTimelineState(historyEvents);
    const showQualificationSection =
        timelineForm.grade === "III" && !timelineForm.alreadyConfirmedPermanent;
    const showPermanentConfirmationSection =
        timelineForm.grade === "III" && timelineForm.alreadyConfirmedPermanent;

    const councilDate =
        timelineForm.enteredDateToNWPCouncil
        || state.firstAppointmentDate
        || timelineForm.dateOfFirstAppointment;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            appointmentDateToPresentClassGrade:
                timelineForm.permanentConfirmationDate
                || timelineForm.appointmentDateToPresentClassGrade
                || null
        },
        designation,
        employee,
        { showPermanentConfirmationSection, showQualificationSection }
    );

    return {
        ...payload,
        careerHistory: historyEvents
    };
};

export const buildNonPermanentUpdatePayload = (
    formData,
    designation,
    employee
) => {
    const firstAppointment =
        formData.dateOfFirstAppointment
        || formData.enteredDateToNWPCouncil
        || formData.reportedDateToPresentWorkingPlace;

    return buildEmployeePayload(
        {
            ...formData,
            grade: "None",
            dateOfFirstAppointment: firstAppointment,
            enteredDateToNWPCouncil:
                formData.enteredDateToNWPCouncil || firstAppointment
        },
        designation,
        employee
    );
};

const resolveServiceLevel = (serviceLevelId, serviceLevels) =>
    serviceLevels.find((level) => level.id === Number(serviceLevelId)) ?? null;

export const getServiceLevelsForDesignation = (designation, serviceLevels) => {
    if (designation?.serviceLevel?.id) {
        return serviceLevels.filter(
            (level) => level.id === designation.serviceLevel.id
        );
    }

    return serviceLevels;
};

export const validateCareerHistoryEventAssignment = ({
    designationId,
    grade,
    serviceLevelId,
    effectiveServiceLevelId,
    designations,
    serviceLevels
}) => {
    if (!designationId) {
        return null;
    }

    const designation = designations.find(
        (item) => item.id === Number(designationId)
    );

    if (!designation) {
        return null;
    }

    const levelId = serviceLevelId ?? effectiveServiceLevelId;

    if (designation.serviceLevel?.id && !levelId) {
        return `Service level is required for ${designation.designationName}`;
    }

    return validateDesignationAssignment(
        {
            grade: grade || "III",
            employmentType: "PERMANENT",
            serviceLevel: resolveServiceLevel(levelId, serviceLevels)
        },
        designation
    );
};

const ASSIGNMENT_VALIDATION_EVENTS = new Set([
    "NEW_APPOINTMENT",
    "PROMOTION",
    "ASSIGNMENT_GRADE_UPDATE",
    "TRANSFER_IN"
]);

const applyEventToTimelineState = (state, event) => {
    const next = { ...state };

    switch (event.actionType) {
        case "NEW_APPOINTMENT":
            next.designationId = event.designationId;
            next.grade = event.grade || "III";
            next.active = true;
            break;
        case "PERMANENT_CONFIRMATION":
            break;
        case "PROMOTION":
        case "ASSIGNMENT_GRADE_UPDATE":
            if (event.designationId) {
                next.designationId = event.designationId;
            }
            if (event.grade) {
                next.grade = event.grade;
            }
            break;
        case "TRANSFER_IN":
            if (event.designationId) {
                next.designationId = event.designationId;
            }
            next.active = true;
            break;
        case "TRANSFER_OUT":
        case "RETIREMENT_OR_RESIGNATION":
        case "DISMISSAL":
            next.active = false;
            break;
        case "DEATH":
            next.active = false;
            break;
        default:
            break;
    }

    if (event.serviceLevelId) {
        next.serviceLevelId = event.serviceLevelId;
    }

    return next;
};

export const validateCareerHistoryDraftEvent = ({
    actionType,
    designationId,
    grade,
    serviceLevelId,
    timelineState,
    designations,
    serviceLevels
}) => {
    if (!actionType) {
        return null;
    }

    if (actionType === "PROMOTION") {
        return validateCareerHistoryEventAssignment({
            designationId,
            grade,
            serviceLevelId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels
        });
    }

    if (actionType === "ASSIGNMENT_GRADE_UPDATE") {
        return validateCareerHistoryEventAssignment({
            designationId: timelineState?.designationId,
            grade,
            serviceLevelId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels
        });
    }

    return null;
};

export const validateCareerHistoryTimeline = (
    events,
    designations,
    serviceLevels
) => {
    if (!events?.length) {
        return null;
    }

    let timelineState = {
        designationId: null,
        grade: null,
        serviceLevelId: null,
        active: false
    };

    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        timelineState = applyEventToTimelineState(timelineState, event);

        if (
            !timelineState.active
            || !ASSIGNMENT_VALIDATION_EVENTS.has(event.actionType)
            || !timelineState.designationId
        ) {
            continue;
        }

        const label =
            ACTION_TYPE_LABELS[event.actionType] || event.actionType;
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: timelineState.designationId,
            grade: timelineState.grade,
            serviceLevelId: timelineState.serviceLevelId,
            effectiveServiceLevelId: timelineState.serviceLevelId,
            designations,
            serviceLevels
        });

        if (assignmentError) {
            return `Event #${index + 1} (${label}): ${assignmentError}`;
        }
    }

    return null;
};
