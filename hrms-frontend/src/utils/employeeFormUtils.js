import { deriveTimelineState } from "../components/CareerHistoryBuilder";
import {
    ACTION_TYPE_LABELS,
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    isRequirementCompleted,
    NWP_ENGINEERING_DEPARTMENT,
    REQUIREMENT_STATUS,
    normalizeDistrictLabel,
    toApiDistrict,
    validateDesignationAssignment
} from "../constants/hrms";
import {
    getCareerHistoryEventMinDate,
    PROBATION_YEARS
} from "./gradeAchievementDates";
import { validateCareerHistoryChronology, validateTimelineDate } from "./timelineDates";
import { parseLegacyMonthDay } from "./monthDayDate";

const formatServiceYearDate = (date) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB") : "—";

const toApiDate = (value) => (value ? value : null);

const toApiOptionalDate = (value) => (value ? value : null);

export const emptyForm = {
    employeeNo: "",
    fullName: "",
    designationId: "",
    nic: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
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
    privateVehicleUsedForGovWork: "No",
    privateVehicleDescription: "",
    privateVehiclePermissionDate: "",
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
        maritalStatus: employee.maritalStatus ?? "",
        grade: employee.grade ?? "None",
        dateOfFirstAppointment: employee.dateOfFirstAppointment ?? "",
        incremantDate: parseLegacyMonthDay(employee.incremantDate ?? ""),
        enteredDateToAllIslandService:
            employee.enteredDateToAllIslandService ?? "",
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace ?? "",
        currentWorkingPlace: employee.currentWorkingPlace ?? "",
        currentDistrictOfWorking: normalizeDistrictLabel(
            employee.currentDistrictOfWorking
        ),
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade ?? "",
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil ?? "",
        permanentAddress: employee.permanentAddress ?? "",
        residentDistrict: employee.residentDistrict ?? "",
        privateVehicleUsedForGovWork: employee.privateVehicleUsedForGovWork === true
            ? "Yes"
            : "No",
        privateVehicleDescription: employee.privateVehicleDescription ?? "",
        privateVehiclePermissionDate: employee.privateVehiclePermissionDate ?? "",
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

export function validatePrivateVehicleFields(formData) {
    if (formData.privateVehicleUsedForGovWork === "Yes") {
        if (!formData.privateVehicleDescription?.trim()) {
            return "Vehicle description is required when using a private vehicle for government work.";
        }
        if (!formData.privateVehiclePermissionDate) {
            return "Permission date is required when using a private vehicle for government work.";
        }
    }

    return null;
}

export function buildRevokePrivateVehiclePayload(employee) {
    const formData = mapEmployeeToForm(employee);
    formData.privateVehicleUsedForGovWork = "No";
    formData.privateVehicleDescription = "";
    formData.privateVehiclePermissionDate = "";

    return buildEmployeePayload(formData, employee.designation, employee);
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
        permanentConfirmationDate: state.permanentConfirmationDate ?? "",
        currentDepartment: state.currentDepartment ?? "",
        currentOffice: state.currentOffice ?? "",
        currentDistrictOfWorking: state.currentDistrictOfWorking ?? ""
    };

    if (state.currentDepartment && state.currentOffice) {
        next.currentWorkingPlace = `${state.currentDepartment} — ${state.currentOffice}`;
    }

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

    const district = toApiDistrict(formData.currentDistrictOfWorking);

    return {
        employeeNo: formData.employeeNo,
        fullName: formData.fullName,
        designationId: Number(formData.designationId),
        nic: formData.nic,
        dateOfBirth: toApiDate(formData.dateOfBirth),
        gender: formData.gender,
        maritalStatus: formData.maritalStatus || null,
        grade: formData.grade,
        dateOfFirstAppointment: toApiDate(formData.dateOfFirstAppointment),
        incremantDate: formData.incremantDate || null,
        enteredDateToAllIslandService:
            toApiOptionalDate(formData.enteredDateToAllIslandService),
        reportedDateToPresentWorkingPlace: toApiDate(
            formData.reportedDateToPresentWorkingPlace
        ),
        currentWorkingPlace: formData.currentWorkingPlace,
        ...(district ? { currentDistrictOfWorking: district } : {}),
        appointmentDateToPresentClassGrade:
            showPermanentConfirmationSection
                ? toApiOptionalDate(formData.permanentConfirmationDate)
                : showQualificationSection
                    ? null
                    : toApiOptionalDate(formData.appointmentDateToPresentClassGrade),
        enteredDateToNWPCouncil: toApiDate(formData.enteredDateToNWPCouncil),
        permanentAddress: formData.permanentAddress,
        residentDistrict: formData.residentDistrict || null,
        privateVehicleUsedForGovWork: formData.privateVehicleUsedForGovWork === "Yes",
        privateVehicleDescription: formData.privateVehicleUsedForGovWork === "Yes"
            ? formData.privateVehicleDescription?.trim() || null
            : null,
        privateVehiclePermissionDate: formData.privateVehicleUsedForGovWork === "Yes"
            ? toApiOptionalDate(formData.privateVehiclePermissionDate)
            : null,
        contactNo: formData.contactNo,
        serviceLevelId: Number(formData.serviceLevelId),
        employmentType: formData.employmentType,
        alreadyConfirmedPermanent: formData.alreadyConfirmedPermanent,
        permanentConfirmationDate: toApiOptionalDate(
            formData.permanentConfirmationDate
        ),
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
    const reportedDate =
        timelineForm.reportedDateToPresentWorkingPlace
        || state.firstAppointmentDate
        || councilDate;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            reportedDateToPresentWorkingPlace: reportedDate,
            dateOfFirstAppointment:
                state.firstAppointmentDate || timelineForm.dateOfFirstAppointment,
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
        careerHistory: prepareCareerHistoryForSave(historyEvents)
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

const districtValue = (district) => toApiDistrict(district);

const backfillNwpDistrict = (event, employee) => {
    const department = event.department || employee?.currentDepartment;
    if (department !== NWP_ENGINEERING_DEPARTMENT) {
        return event;
    }

    const fallbackDistrict = districtValue(employee?.currentDistrictOfWorking);
    if (!fallbackDistrict) {
        return event;
    }

    const next = { ...event };

    if (!next.district) {
        next.district = fallbackDistrict;
    }

    if (
        next.actionType === "TRANSFER_OUT"
        && !next.toDistrict
        && (next.toDepartment || department) === NWP_ENGINEERING_DEPARTMENT
    ) {
        next.toDistrict = fallbackDistrict;
    }

    return next;
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
                ),
                department: action.department ?? "",
                office: action.office ?? "",
                district: districtValue(action.district)
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

        case "TRANSFER_OUT":
            return {
                ...base,
                actionType: "TRANSFER_OUT",
                toDepartment: action.toDepartment ?? action.transferredTo ?? "",
                toOffice: action.toOffice ?? "",
                toDistrict: districtValue(action.district)
            };

        case "TRANSFER_IN":
            return {
                ...base,
                actionType: "TRANSFER_IN",
                designationId: action.newDesignationId ?? "",
                grade: action.newGrade ?? "",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                ),
                department: action.department ?? "",
                office: action.office ?? "",
                district: districtValue(action.district),
                transferredFrom:
                    action.transferredFrom ?? action.fromDepartment ?? "",
                autoCreated: Boolean(
                    action.autoCreated ?? action.linkedActionId
                ),
                linkedActionId: action.linkedActionId ?? null
            };

        case "OFFICE_CHANGE":
            return {
                ...base,
                actionType: "OFFICE_CHANGE",
                department: action.department ?? "",
                office: action.office ?? "",
                district: districtValue(action.district)
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
                department: employee?.currentDepartment ?? "",
                office: employee?.currentOffice ?? "",
                district: districtValue(employee?.currentDistrictOfWorking),
                remarks: ""
            }
        ];
    }

    const chronological = [...actions]
        .sort((left, right) => {
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
        const event = backfillNwpDistrict(
            mapActionToCareerEvent(
                action,
                designations,
                serviceLevelFallback
            ),
            employee
        );

        if (
            event.actionType === "NEW_APPOINTMENT"
            && !event.department
            && employee?.currentDepartment
        ) {
            event.department = employee.currentDepartment;
            event.office = employee.currentOffice ?? "";
        }

        if (event.serviceLevelId) {
            serviceLevelFallback = event.serviceLevelId;
        }

        return event;
    });
};

const NON_WORKPLACE_EVENT_TYPES = new Set([
    "PERMANENT_CONFIRMATION",
    "PROMOTION",
    "ASSIGNMENT_GRADE_UPDATE",
    "RETIREMENT_OR_RESIGNATION",
    "DEATH",
    "DISMISSAL"
]);

const normalizeCareerHistoryEvent = (event) => {
    const normalized = { ...event };
    const district = districtValue(event.district);
    const toDistrict = districtValue(event.toDistrict);

    if (NON_WORKPLACE_EVENT_TYPES.has(event.actionType)) {
        delete normalized.department;
        delete normalized.office;
        delete normalized.district;
        delete normalized.toDepartment;
        delete normalized.toOffice;
        delete normalized.toDistrict;
        return normalized;
    }

    if (district) {
        normalized.district = district;
    } else {
        delete normalized.district;
    }

    if (toDistrict) {
        normalized.toDistrict = toDistrict;
    } else {
        delete normalized.toDistrict;
    }

    return normalized;
};

export const prepareCareerHistoryForSave = (events) =>
    (events ?? [])
        .filter(
            (event) => !(event.actionType === "TRANSFER_IN" && event.autoCreated)
        )
        .map(normalizeCareerHistoryEvent);

export const buildTransferInCompanionEvent = ({
    actionDate,
    toDepartment,
    toOffice,
    toDistrict,
    fromDepartment,
    timelineState,
    remarks
}) => ({
    actionType: "TRANSFER_IN",
    actionDate,
    designationId: timelineState?.designationId ?? null,
    grade: timelineState?.grade || "III",
    serviceLevelId: timelineState?.serviceLevelId ?? null,
    department: toDepartment,
    office: toOffice?.trim() ?? "",
    district: districtValue(toDistrict),
    transferredFrom: fromDepartment ?? null,
    autoCreated: true,
    remarks: remarks?.trim() || null
});

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
    const reportedDate =
        timelineForm.reportedDateToPresentWorkingPlace
        || state.firstAppointmentDate
        || councilDate;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            reportedDateToPresentWorkingPlace: reportedDate,
            dateOfFirstAppointment:
                state.firstAppointmentDate || timelineForm.dateOfFirstAppointment,
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
        careerHistory: prepareCareerHistoryForSave(historyEvents)
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
    "ASSIGNMENT_GRADE_UPDATE"
]);

export const validateCareerHistoryServiceYears = ({
    actionType,
    actionDate,
    grade,
    timelineState,
    designations,
    designationId
}) => {
    if (!actionType || !actionDate) {
        return null;
    }

    const resolvedDesignationId =
        designationId ?? timelineState?.designationId;
    const designation = resolvedDesignationId
        ? designations.find((item) => item.id === Number(resolvedDesignationId))
        : null;

    const minDate = getCareerHistoryEventMinDate({
        actionType,
        grade,
        timelineState,
        designation
    });

    if (!minDate || actionDate >= minDate) {
        return null;
    }

    if (actionType === "PERMANENT_CONFIRMATION") {
        return `Confirmation date cannot be earlier than ${formatServiceYearDate(minDate)} (end of the ${PROBATION_YEARS}-year probation period).`;
    }

    if (timelineState?.grade === "III" && grade === "II") {
        return `Effective date cannot be earlier than ${formatServiceYearDate(minDate)} (Grade II service period from first appointment).`;
    }

    if (timelineState?.grade === "II" && grade === "I") {
        return `Effective date cannot be earlier than ${formatServiceYearDate(minDate)} (Grade I service period from Grade II achievement).`;
    }

    return null;
};

const applyEventToTimelineState = (state, event) => {
    const next = { ...state };

    switch (event.actionType) {
        case "NEW_APPOINTMENT":
            next.designationId = event.designationId;
            next.grade = event.grade || "III";
            next.firstAppointmentDate = event.actionDate;
            next.active = true;
            if (event.department) {
                next.currentDepartment = event.department;
                next.currentOffice = event.office;
                if (event.department === NWP_ENGINEERING_DEPARTMENT) {
                    const district = districtValue(event.district);
                    if (district) {
                        next.currentDistrictOfWorking = district;
                    }
                } else {
                    next.currentDistrictOfWorking = null;
                }
            }
            break;
        case "PERMANENT_CONFIRMATION":
            next.permanentConfirmed = true;
            next.permanentConfirmationDate = event.actionDate;
            break;
        case "PROMOTION":
        case "ASSIGNMENT_GRADE_UPDATE":
            if (event.designationId) {
                next.designationId = event.designationId;
            }
            if (event.grade) {
                if (next.grade === "III" && event.grade === "II") {
                    next.grade2AchievedDate = event.actionDate;
                }
                next.grade = event.grade;
            }
            break;
        case "TRANSFER_IN":
        case "TRANSFER_OUT":
            if (event.toDepartment) {
                next.currentDepartment = event.toDepartment;
                next.currentOffice = event.toOffice;
                if (event.toDepartment === NWP_ENGINEERING_DEPARTMENT) {
                    const district = districtValue(event.toDistrict);
                    if (district) {
                        next.currentDistrictOfWorking = district;
                    }
                } else {
                    next.currentDistrictOfWorking = null;
                }
            } else if (event.department) {
                next.currentDepartment = event.department;
                next.currentOffice = event.office;
                if (event.department === NWP_ENGINEERING_DEPARTMENT) {
                    const district = districtValue(event.district);
                    if (district) {
                        next.currentDistrictOfWorking = district;
                    }
                } else {
                    next.currentDistrictOfWorking = null;
                }
            }
            next.active = true;
            break;
        case "OFFICE_CHANGE":
            if (event.office) {
                next.currentOffice = event.office;
            }
            if (event.department) {
                next.currentDepartment = event.department;
            }
            if (event.district) {
                next.currentDistrictOfWorking = districtValue(event.district);
            }
            break;
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
    actionDate,
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
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId,
            grade,
            serviceLevelId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels
        });
        if (assignmentError) {
            return assignmentError;
        }
    }

    if (actionType === "ASSIGNMENT_GRADE_UPDATE") {
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: timelineState?.designationId,
            grade,
            serviceLevelId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels
        });
        if (assignmentError) {
            return assignmentError;
        }
    }

    if (actionType === "TRANSFER_OUT") {
        if (!timelineState?.currentDepartment || !timelineState?.currentOffice) {
            return "Current department and office must be set before transfer out";
        }
        return null;
    }

    if (actionType === "OFFICE_CHANGE") {
        if (!timelineState?.currentDepartment) {
            return "Current department must be set before office change";
        }
        return null;
    }

    if (actionType === "TRANSFER_IN") {
        return "Transfer in is created automatically when recording a transfer out";
    }

    const chronologyError = validateTimelineDate(
        actionDate,
        timelineState?.lastDate
    );
    if (chronologyError) {
        return chronologyError;
    }

    return validateCareerHistoryServiceYears({
        actionType,
        actionDate,
        grade,
        timelineState,
        designations,
        designationId:
            actionType === "PROMOTION"
                ? designationId
                : timelineState?.designationId
    });
};

export const validateCareerHistoryTimeline = (
    events,
    designations,
    serviceLevels
) => {
    if (!events?.length) {
        return null;
    }

    const chronologyError = validateCareerHistoryChronology(events);
    if (chronologyError) {
        return chronologyError;
    }

    let timelineState = {
        designationId: null,
        grade: null,
        serviceLevelId: null,
        currentDepartment: null,
        currentOffice: null,
        currentDistrictOfWorking: null,
        firstAppointmentDate: null,
        grade2AchievedDate: null,
        active: false
    };

    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];

        if (event.actionType === "TRANSFER_IN" && event.autoCreated) {
            timelineState = applyEventToTimelineState(timelineState, event);
            continue;
        }

        const serviceYearsError = validateCareerHistoryServiceYears({
            actionType: event.actionType,
            actionDate: event.actionDate,
            grade: event.grade,
            timelineState,
            designations,
            designationId:
                event.actionType === "PROMOTION"
                    ? event.designationId
                    : timelineState.designationId
        });

        if (serviceYearsError) {
            const label =
                ACTION_TYPE_LABELS[event.actionType] || event.actionType;
            return `Event #${index + 1} (${label}): ${serviceYearsError}`;
        }

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
