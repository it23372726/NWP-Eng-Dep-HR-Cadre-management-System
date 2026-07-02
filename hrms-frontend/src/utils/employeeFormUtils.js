import { deriveTimelineState } from "../components/CareerHistoryBuilder";
import {
    ACTION_TYPE_LABELS,
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    getServiceRules,
    isRequirementCompleted,
    NWP_ENGINEERING_DEPARTMENT,
    REQUIREMENT_STATUS,
    isOtherDesignation,
    isTrainingEmployee,
    normalizeDistrictLabel,
    toApiDistrict,
    TRAINING_FORM_TYPE,
    validateCustomDesignationAssignment,
    validateDesignationAssignment
} from "../constants/hrms";
import {
    getCareerHistoryEventMinDate,
    PROBATION_YEARS
} from "./gradeAchievementDates";
import { validateCareerHistoryChronology, validateTimelineDate } from "./timelineDates";
import { parseLegacyMonthDay } from "./monthDayDate";
import {
    buildDependentPayloadFields,
    emptyChildForm,
    emptySpouseForm,
    mapChildrenToForm,
    mapSpouseToForm
} from "./employeeDependentForm";

const formatServiceYearDate = (date) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB") : "—";

const toApiDate = (value) => (value ? value : null);

const toApiOptionalDate = (value) => (value ? value : null);

const resolvePayloadDesignationId = (designationId) => {
    if (!designationId || isOtherDesignation(designationId)) {
        return null;
    }

    const parsed = Number(designationId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveRulesDesignation = (designation, state, services) => {
    if (designation) {
        return designation;
    }

    if (state?.serviceId && services?.length) {
        const service = services.find(
            (item) => item.id === Number(state.serviceId)
        );
        return service ? { service } : null;
    }

    return null;
};

export const emptyForm = {
    employeeNo: "",
    fullName: "",
    designationId: "",
    nic: "",
    tin: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    grade: "None",
    dateOfFirstAppointment: "",
    incremantDate: "",
    widowsOrphansPensionNo: "",
    enteredDateToAllIslandService: "",
    reportedDateToPresentWorkingPlace: "",
    currentWorkingPlace: "",
    currentDepartment: NWP_ENGINEERING_DEPARTMENT,
    currentDistrictOfWorking: "",
    appointmentDateToPresentClassGrade: "",
    enteredDateToNWPCouncil: "",
    contractStartDate: "",
    contractEndDate: "",
    permanentAddress: "",
    residentDistrict: "",
    privateVehicleUsedForGovWork: "No",
    privateVehicleDescription: "",
    privateVehiclePermissionDate: "",
    privateVehicleExpireDate: "",
    privateVehicleInsuranceNumber: "",
    privateVehicleLicensePlateNumber: "",
    privateVehicleRented: "No",
    privateVehicleRentedFrom: "",
    contactNo: "",
    emailAddress: "",
    serviceLevelId: "",
    trainingPeriodYears: "1",
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
    ebGrade1Passed: false,
    spouse: emptySpouseForm(),
    children: []
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
    const service = getServiceRules(designation);

    (service?.permanentRequirements || []).forEach((requirement) => {
        form[requirementKey(
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        )] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        );
    });

    (service?.grade2Requirements || []).forEach((requirement) => {
        form[requirementKey(
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        )] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        );
    });

    (service?.grade1Requirements || []).forEach((requirement) => {
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
        tin: employee.tin ?? "",
        dateOfBirth: employee.dateOfBirth ?? "",
        gender: employee.gender ?? "",
        maritalStatus: employee.maritalStatus ?? "",
        grade: employee.grade ?? "None",
        dateOfFirstAppointment: employee.dateOfFirstAppointment ?? "",
        incremantDate: parseLegacyMonthDay(employee.incremantDate ?? ""),
        widowsOrphansPensionNo: employee.widowsOrphansPensionNo ?? "",
        enteredDateToAllIslandService:
            employee.enteredDateToAllIslandService ?? "",
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace ?? "",
        currentWorkingPlace: employee.currentOffice
            ?? employee.currentWorkingPlace?.split(" — ").pop()
            ?? employee.currentWorkingPlace
            ?? "",
        currentDepartment:
            employee.currentDepartment ?? NWP_ENGINEERING_DEPARTMENT,
        currentDistrictOfWorking: normalizeDistrictLabel(
            employee.currentDistrictOfWorking
        ),
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade ?? "",
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil ?? "",
        contractStartDate: employee.contractStartDate ?? "",
        contractEndDate: employee.contractEndDate ?? "",
        permanentAddress: employee.permanentAddress ?? "",
        residentDistrict: employee.residentDistrict ?? "",
        privateVehicleUsedForGovWork: employee.privateVehicleUsedForGovWork === true
            ? "Yes"
            : "No",
        privateVehicleDescription: employee.privateVehicleDescription ?? "",
        privateVehiclePermissionDate: employee.privateVehiclePermissionDate ?? "",
        privateVehicleExpireDate: employee.privateVehicleExpireDate ?? "",
        privateVehicleInsuranceNumber: employee.privateVehicleInsuranceNumber ?? "",
        privateVehicleLicensePlateNumber: employee.privateVehicleLicensePlateNumber ?? "",
        privateVehicleRented: employee.privateVehicleRented === true ? "Yes" : "No",
        privateVehicleRentedFrom: employee.privateVehicleRentedFrom ?? "",
        contactNo: employee.contactNo ?? "",
        emailAddress: employee.emailAddress ?? "",
        serviceLevelId: employee.serviceLevel?.id ?? "",
        trainingPeriodYears: String(employee.trainingPeriodYears ?? 1),
        employmentType: isTrainingEmployee(employee)
            ? TRAINING_FORM_TYPE
            : (employee.employmentType ?? "PERMANENT"),
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
        ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1"),
        spouse: mapSpouseToForm(employee.spouse),
        children: mapChildrenToForm(employee.children)
    };

    appendCustomRequirementFields(form, employee, employee.designation);
    return form;
}

export function validateWidowsOrphansPensionNo(formData) {
    if (!formData.widowsOrphansPensionNo?.trim()) {
        return "Widows' and Orphans' Pension No. is required.";
    }

    return null;
}

export function addYearsToDateString(dateString, years) {
    if (!dateString) {
        return "";
    }

    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) {
        return "";
    }

    const date = new Date(year, month - 1, day);
    date.setFullYear(date.getFullYear() + years);
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getDate()).padStart(2, "0");
    return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function clearPrivateVehicleDetails(formData) {
    return {
        ...formData,
        privateVehicleDescription: "",
        privateVehiclePermissionDate: "",
        privateVehicleExpireDate: "",
        privateVehicleInsuranceNumber: "",
        privateVehicleLicensePlateNumber: "",
        privateVehicleRented: "No",
        privateVehicleRentedFrom: ""
    };
}

export function applyPrivateVehicleFormChanges(formData, name, value) {
    let next = { ...formData, [name]: value };

    if (name === "privateVehicleUsedForGovWork" && value === "No") {
        return clearPrivateVehicleDetails(next);
    }

    if (name === "privateVehicleRented" && value === "No") {
        next.privateVehicleRentedFrom = "";
    }

    if (
        next.privateVehicleRented === "Yes"
        && (name === "privateVehicleRented" || name === "privateVehiclePermissionDate")
        && next.privateVehiclePermissionDate
    ) {
        next.privateVehicleExpireDate = addYearsToDateString(
            next.privateVehiclePermissionDate,
            2
        );
    }

    return next;
}

export function validatePrivateVehicleFields(formData) {
    if (formData.privateVehicleUsedForGovWork === "Yes") {
        if (!formData.privateVehicleDescription?.trim()) {
            return "Vehicle description is required when using a private vehicle for government work.";
        }
        if (!formData.privateVehiclePermissionDate) {
            return "Permission date is required when using a private vehicle for government work.";
        }
        if (formData.privateVehicleRented === "Yes") {
            if (!formData.privateVehicleRentedFrom?.trim()) {
                return "From whom is required when the vehicle is rented.";
            }
        } else if (!formData.privateVehicleExpireDate) {
            return "Expire date is required when using a private vehicle for government work.";
        }
        if (!formData.privateVehicleInsuranceNumber?.trim()) {
            return "Insurance number is required when using a private vehicle for government work.";
        }
        if (!formData.privateVehicleLicensePlateNumber?.trim()) {
            return "License plate number is required when using a private vehicle for government work.";
        }
    }

    return null;
}

export function findTrainingServiceLevelId(serviceLevels) {
    return serviceLevels.find(
        (level) => level.levelName?.toLowerCase() === "training"
    )?.id ?? "";
}

export function validateTrainingFields(formData) {
    if (!formData.designationId) {
        return "Designation is required.";
    }
    if (!formData.dateOfFirstAppointment) {
        return "First appointment date is required.";
    }
    if (!formData.currentWorkingPlace?.trim()) {
        return "Current working place is required.";
    }
    if (!formData.currentDistrictOfWorking) {
        return "Working district is required.";
    }
    if (!formData.enteredDateToNWPCouncil) {
        return "Entered date to N.W.P. Council is required.";
    }
    if (!formData.reportedDateToPresentWorkingPlace) {
        return "Reported date to present working place is required.";
    }
    if (!formData.serviceLevelId) {
        return "Training service level is not configured.";
    }
    const trainingPeriodYears = Number(formData.trainingPeriodYears);
    if (trainingPeriodYears !== 1 && trainingPeriodYears !== 2) {
        return "Select a 1 year or 2 year training period.";
    }

    return null;
}

const buildTrainingPayloadBase = (formData) => {
    const department = formData.currentDepartment?.trim()
        || NWP_ENGINEERING_DEPARTMENT;
    const office = formData.currentWorkingPlace?.trim() || "";
    const district = toApiDistrict(formData.currentDistrictOfWorking);

    return {
        employeeNo: formData.employeeNo,
        fullName: formData.fullName,
        designationId: resolvePayloadDesignationId(formData.designationId),
        nic: formData.nic,
        tin: formData.tin?.trim() || null,
        dateOfBirth: toApiDate(formData.dateOfBirth),
        gender: formData.gender,
        maritalStatus: formData.maritalStatus || null,
        grade: "None",
        dateOfFirstAppointment: toApiDate(formData.dateOfFirstAppointment),
        appointmentDateToPresentClassGrade: toApiOptionalDate(
            formData.appointmentDateToPresentClassGrade
        ),
        reportedDateToPresentWorkingPlace: toApiDate(
            formData.reportedDateToPresentWorkingPlace
        ),
        currentWorkingPlace: office,
        currentDepartment: department,
        ...(district ? { currentDistrictOfWorking: district } : {}),
        enteredDateToNWPCouncil: toApiDate(formData.enteredDateToNWPCouncil),
        incremantDate: formData.incremantDate || null,
        permanentAddress: formData.permanentAddress,
        residentDistrict: formData.residentDistrict || null,
        contactNo: formData.contactNo,
        emailAddress: formData.emailAddress?.trim() || null,
        employmentType: null,
        serviceLevelId: Number(formData.serviceLevelId),
        trainingPeriodYears: Number(formData.trainingPeriodYears)
    };
};

export const buildTrainingCreatePayload = (formData) => ({
    ...buildTrainingPayloadBase(formData),
    entryType: "NEW_EMPLOYEE",
    transferredFrom: null,
    remarks: null
});

export const buildTrainingUpdatePayload = (formData) =>
    buildTrainingPayloadBase(formData);

export function validateContractFields(formData) {
    if (!formData.designationId) {
        return "Designation is required.";
    }
    if (!formData.currentDepartment?.trim()) {
        return "Department is required.";
    }
    if (!formData.currentWorkingPlace?.trim()) {
        return "Office is required.";
    }
    if (!formData.currentDistrictOfWorking) {
        return "Working district is required.";
    }
    if (!formData.enteredDateToNWPCouncil) {
        return "Entered date to N.W.P. Council is required.";
    }
    if (!formData.reportedDateToPresentWorkingPlace) {
        return "Reported date to present working place is required.";
    }
    if (!formData.contractStartDate) {
        return "Contract start date is required.";
    }
    if (!formData.contractEndDate) {
        return "Contract end date is required.";
    }
    if (formData.contractEndDate < formData.contractStartDate) {
        return "Contract end date cannot be before contract start date.";
    }

    return null;
}

const formatContractWorkingPlace = (department, office) => {
    if (!department?.trim() || !office?.trim()) {
        return office?.trim() || "";
    }

    return `${department.trim()} — ${office.trim()}`;
};

function buildPrivateVehiclePayloadFields(formData) {
    const used = formData.privateVehicleUsedForGovWork === "Yes";
    const rented = formData.privateVehicleRented === "Yes";

    if (!used) {
        return {
            privateVehicleUsedForGovWork: false,
            privateVehicleDescription: null,
            privateVehiclePermissionDate: null,
            privateVehicleExpireDate: null,
            privateVehicleInsuranceNumber: null,
            privateVehicleLicensePlateNumber: null,
            privateVehicleRented: false,
            privateVehicleRentedFrom: null
        };
    }

    const permissionDate = toApiOptionalDate(formData.privateVehiclePermissionDate);
    const expireDate = rented && formData.privateVehiclePermissionDate
        ? addYearsToDateString(formData.privateVehiclePermissionDate, 2)
        : toApiOptionalDate(formData.privateVehicleExpireDate);

    return {
        privateVehicleUsedForGovWork: true,
        privateVehicleDescription: formData.privateVehicleDescription?.trim() || null,
        privateVehiclePermissionDate: permissionDate,
        privateVehicleExpireDate: expireDate,
        privateVehicleInsuranceNumber:
            formData.privateVehicleInsuranceNumber?.trim() || null,
        privateVehicleLicensePlateNumber:
            formData.privateVehicleLicensePlateNumber?.trim() || null,
        privateVehicleRented: rented,
        privateVehicleRentedFrom: rented
            ? formData.privateVehicleRentedFrom?.trim() || null
            : null
    };
}

const buildContractPayloadBase = (formData) => {
    const department = formData.currentDepartment?.trim()
        || NWP_ENGINEERING_DEPARTMENT;
    const office = formData.currentWorkingPlace?.trim() || "";
    const district = toApiDistrict(formData.currentDistrictOfWorking);

    return {
        employeeNo: formData.employeeNo,
        fullName: formData.fullName,
        designationId: resolvePayloadDesignationId(formData.designationId),
        nic: formData.nic,
        tin: formData.tin?.trim() || null,
        dateOfBirth: toApiDate(formData.dateOfBirth),
        gender: formData.gender,
        maritalStatus: formData.maritalStatus || null,
        grade: "None",
        reportedDateToPresentWorkingPlace: toApiDate(
            formData.reportedDateToPresentWorkingPlace
        ),
        currentWorkingPlace: formatContractWorkingPlace(department, office),
        currentDepartment: department,
        ...(district ? { currentDistrictOfWorking: district } : {}),
        enteredDateToNWPCouncil: toApiDate(formData.enteredDateToNWPCouncil),
        contractStartDate: toApiDate(formData.contractStartDate),
        contractEndDate: toApiDate(formData.contractEndDate),
        permanentAddress: formData.permanentAddress,
        residentDistrict: formData.residentDistrict || null,
        ...buildPrivateVehiclePayloadFields(formData),
        contactNo: formData.contactNo,
        emailAddress: formData.emailAddress?.trim() || null,
        employmentType: "CONTRACT",
        ...buildDependentPayloadFields(formData)
    };
};

export const buildContractCreatePayload = (formData) => ({
    ...buildContractPayloadBase(formData),
    entryType: "NEW_EMPLOYEE",
    transferredFrom: null,
    remarks: null
});

export const buildContractUpdatePayload = (formData) =>
    buildContractPayloadBase(formData);

export function buildRevokePrivateVehiclePayload(employee) {
    const formData = clearPrivateVehicleDetails(mapEmployeeToForm(employee));
    formData.privateVehicleUsedForGovWork = "No";

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

    if (
        isPermanent
        && next.grade === "III"
        && next.dateOfFirstAppointment
    ) {
        next.appointmentDateToPresentClassGrade = next.dateOfFirstAppointment;
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
        recordedDesignationName: state.recordedDesignationName ?? "",
        serviceId: state.serviceId ?? "",
        grade: state.grade ?? "None",
        serviceLevelId: state.serviceLevelId ?? "",
        dateOfFirstAppointment: state.firstAppointmentDate ?? "",
        alreadyConfirmedPermanent: state.permanentConfirmed,
        permanentConfirmationDate: state.permanentConfirmationDate ?? "",
        currentDepartment: state.currentDepartment ?? "",
        currentOffice: state.currentOffice ?? "",
        currentDistrictOfWorking: state.currentDistrictOfWorking ?? "",
        reportedDateToPresentWorkingPlace:
            state.reportedDateToPresentWorkingPlace ?? "",
        enteredDateToNWPCouncil: state.enteredDateToNWPCouncil ?? ""
    };

    if (state.currentDepartment && state.currentOffice) {
        next.currentWorkingPlace = `${state.currentDepartment} — ${state.currentOffice}`;
    }

    next = applyGradeDerivedRequirements(next);
    const rulesDesignation = resolveRulesDesignation(designation, state, null);
    appendCustomRequirementFields(next, null, rulesDesignation);
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

    const service = getServiceRules(designation);

    appendCustomRequirements(
        "CUSTOM_PERMANENT_REQUIREMENT",
        service?.permanentRequirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_2_REQUIREMENT",
        service?.grade2Requirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_1_REQUIREMENT",
        service?.grade1Requirements
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
        designationId: resolvePayloadDesignationId(formData.designationId),
        nic: formData.nic,
        tin: formData.tin?.trim() || null,
        dateOfBirth: toApiDate(formData.dateOfBirth),
        gender: formData.gender,
        maritalStatus: formData.maritalStatus || null,
        grade: formData.grade,
        dateOfFirstAppointment: toApiDate(formData.dateOfFirstAppointment),
        incremantDate: formData.incremantDate || null,
        widowsOrphansPensionNo: formData.widowsOrphansPensionNo?.trim() || null,
        enteredDateToAllIslandService:
            toApiOptionalDate(formData.enteredDateToAllIslandService),
        reportedDateToPresentWorkingPlace: toApiDate(
            formData.reportedDateToPresentWorkingPlace
        ),
        currentWorkingPlace: formData.currentWorkingPlace,
        ...(district ? { currentDistrictOfWorking: district } : {}),
        appointmentDateToPresentClassGrade:
            showPermanentConfirmationSection || showQualificationSection
                ? toApiOptionalDate(formData.dateOfFirstAppointment)
                : toApiOptionalDate(formData.appointmentDateToPresentClassGrade),
        enteredDateToNWPCouncil: toApiDate(formData.enteredDateToNWPCouncil),
        permanentAddress: formData.permanentAddress,
        residentDistrict: formData.residentDistrict || null,
        ...buildPrivateVehiclePayloadFields(formData),
        contactNo: formData.contactNo,
        emailAddress: formData.emailAddress?.trim() || null,
        serviceLevelId: Number(formData.serviceLevelId),
        employmentType: formData.employmentType,
        alreadyConfirmedPermanent: formData.alreadyConfirmedPermanent,
        permanentConfirmationDate: toApiOptionalDate(
            formData.permanentConfirmationDate
        ),
        grade2RequiredYears: null,
        grade1RequiredYears: null,
        requirements: buildRequirements(formData, designation, employee),
        ...buildDependentPayloadFields(formData)
    };
};

const resolvePresentClassGradeDate = (state, timelineForm) => {
    if (timelineForm.grade === "III") {
        return state.firstAppointmentDate
            || timelineForm.dateOfFirstAppointment
            || timelineForm.appointmentDateToPresentClassGrade
            || null;
    }

    return timelineForm.appointmentDateToPresentClassGrade || null;
};

export const buildPermanentCreatePayload = (
    formData,
    historyEvents,
    designation,
    services = []
) => {
    const timelineForm = applyTimelineToFormData(
        formData,
        historyEvents,
        designation
    );
    const state = deriveTimelineState(historyEvents);
    const rulesDesignation = resolveRulesDesignation(
        designation,
        state,
        services
    );
    const showQualificationSection =
        timelineForm.grade === "III" && !timelineForm.alreadyConfirmedPermanent;
    const showPermanentConfirmationSection =
        timelineForm.grade === "III" && timelineForm.alreadyConfirmedPermanent;

    const councilDate = state.enteredDateToNWPCouncil || null;
    const reportedDate =
        state.reportedDateToPresentWorkingPlace
        || timelineForm.reportedDateToPresentWorkingPlace
        || state.firstAppointmentDate
        || null;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            reportedDateToPresentWorkingPlace: reportedDate,
            dateOfFirstAppointment:
                state.firstAppointmentDate || timelineForm.dateOfFirstAppointment,
            appointmentDateToPresentClassGrade:
                resolvePresentClassGradeDate(state, timelineForm)
        },
        rulesDesignation,
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

const mapActionToCareerEvent = (action, designations, serviceLevelFallback, employee) => {
    const base = {
        actionDate: action.actionDate ?? "",
        remarks: action.remarks ?? "",
        reason: action.reason ?? "",
        transferredFrom: action.transferredFrom ?? "",
        transferredTo: action.transferredTo ?? ""
    };
    const employeeServiceId =
        employee?.service?.id ?? employee?.designation?.service?.id ?? null;

    switch (action.actionType) {
        case "NEW_APPOINTMENT":
            if (action.recordedDesignationName) {
                return {
                    ...base,
                    actionType: "NEW_APPOINTMENT",
                    designationId: null,
                    recordedDesignationName: action.recordedDesignationName,
                    serviceId: employeeServiceId,
                    grade: action.newGrade || "III",
                    serviceLevelId: action.serviceLevelId
                        ?? serviceLevelFallback
                        ?? employee?.serviceLevel?.id
                        ?? "",
                    department: action.department ?? "",
                    office: action.office ?? "",
                    district: districtValue(action.district)
                };
            }

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
            if (action.recordedDesignationName) {
                return {
                    ...base,
                    actionType: "PROMOTION",
                    designationId: null,
                    recordedDesignationName: action.recordedDesignationName,
                    grade: action.newGrade ?? "",
                    serviceLevelId: action.serviceLevelId
                        ?? serviceLevelFallback
                        ?? employee?.serviceLevel?.id
                        ?? "",
                    ...(action.fromDepartment === NWP_ENGINEERING_DEPARTMENT
                        && action.department
                        && action.department !== NWP_ENGINEERING_DEPARTMENT
                        ? {
                            transferringOut: true,
                            toDepartment: action.department,
                            toOffice: action.office ?? "",
                            toDistrict: districtValue(action.district)
                        }
                        : {})
                };
            }

            return {
                ...base,
                actionType: "PROMOTION",
                designationId: action.newDesignationId ?? "",
                grade: action.newGrade ?? "",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                ),
                ...(action.fromDepartment === NWP_ENGINEERING_DEPARTMENT
                    && action.department
                    && action.department !== NWP_ENGINEERING_DEPARTMENT
                    ? {
                        transferringOut: true,
                        toDepartment: action.department,
                        toOffice: action.office ?? "",
                        toDistrict: districtValue(action.district)
                    }
                    : {})
            };

        case "TRANSFER_OUT":
            return {
                ...base,
                actionType: "TRANSFER_OUT",
                designationId: action.newDesignationId ?? "",
                recordedDesignationName: action.recordedDesignationName ?? "",
                serviceLevelId: inferServiceLevelId(
                    action.newDesignationId,
                    designations,
                    serviceLevelFallback
                ) || serviceLevelFallback || employee?.serviceLevel?.id || "",
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
        case "VACATION_OF_POST":
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
                designationId: employee?.recordedDesignationName
                    ? null
                    : employee?.designation?.id ?? "",
                recordedDesignationName: employee?.recordedDesignationName ?? "",
                serviceId: employee?.service?.id
                    ?? employee?.designation?.service?.id
                    ?? "",
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
                serviceLevelFallback,
                employee
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
    "DISMISSAL",
    "VACATION_OF_POST"
]);

const normalizeCareerHistoryEvent = (event) => {
    const normalized = { ...event };
    const district = districtValue(event.district);
    const toDistrict = districtValue(event.toDistrict);

    if (event.actionType === "PROMOTION" && event.transferringOut) {
        normalized.transferringOut = true;
        normalized.toDepartment = event.toDepartment;
        normalized.toOffice = event.toOffice;
        if (toDistrict) {
            normalized.toDistrict = toDistrict;
        } else {
            delete normalized.toDistrict;
        }
        delete normalized.department;
        delete normalized.office;
        delete normalized.district;
        return normalized;
    }

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
    designationId,
    recordedDesignationName,
    grade,
    serviceLevelId,
    remarks
}) => ({
    actionType: "TRANSFER_IN",
    actionDate,
    designationId: designationId ?? null,
    recordedDesignationName: recordedDesignationName ?? null,
    grade: grade || "III",
    serviceLevelId: serviceLevelId ?? null,
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
    employee,
    services = []
) => {
    const timelineForm = applyTimelineToFormData(
        formData,
        historyEvents,
        designation
    );
    const state = deriveTimelineState(historyEvents);
    const rulesDesignation = resolveRulesDesignation(
        designation,
        state,
        services
    );
    const showQualificationSection =
        timelineForm.grade === "III" && !timelineForm.alreadyConfirmedPermanent;
    const showPermanentConfirmationSection =
        timelineForm.grade === "III" && timelineForm.alreadyConfirmedPermanent;

    const councilDate = state.enteredDateToNWPCouncil || null;
    const reportedDate =
        state.reportedDateToPresentWorkingPlace
        || timelineForm.reportedDateToPresentWorkingPlace
        || state.firstAppointmentDate
        || null;

    const payload = buildEmployeePayload(
        {
            ...timelineForm,
            enteredDateToNWPCouncil: councilDate,
            reportedDateToPresentWorkingPlace: reportedDate,
            dateOfFirstAppointment:
                state.firstAppointmentDate || timelineForm.dateOfFirstAppointment,
            appointmentDateToPresentClassGrade:
                resolvePresentClassGradeDate(state, timelineForm)
        },
        rulesDesignation,
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
    recordedDesignationName,
    grade,
    serviceLevelId,
    serviceId,
    effectiveServiceLevelId,
    designations,
    serviceLevels,
    services
}) => {
    if (isOtherDesignation(designationId)
        || (recordedDesignationName && !designationId)) {
        if (!recordedDesignationName?.trim()) {
            return "Designation title is required";
        }

        const service = services?.find((item) => item.id === Number(serviceId));

        return validateCustomDesignationAssignment({
            grade: grade || "III",
            serviceLevelId: serviceLevelId ?? effectiveServiceLevelId,
            service
        });
    }

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
    services,
    designationId,
    serviceId
}) => {
    if (!actionType || !actionDate) {
        return null;
    }

    const resolvedDesignationId =
        designationId ?? timelineState?.designationId;
    const designation = resolvedDesignationId
        ? designations.find((item) => item.id === Number(resolvedDesignationId))
        : null;
    const service = designation?.service
        ?? services?.find((item) => item.id === Number(
            serviceId ?? timelineState?.serviceId
        ))
        ?? null;
    const rulesSource = designation ?? (service ? { service } : null);

    const minDate = getCareerHistoryEventMinDate({
        actionType,
        grade,
        timelineState,
        designation: rulesSource
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
            if (event.recordedDesignationName) {
                next.recordedDesignationName = event.recordedDesignationName;
                next.designationId = null;
                if (event.serviceId) {
                    next.serviceId = event.serviceId;
                }
            } else {
                next.designationId = event.designationId;
                next.recordedDesignationName = null;
            }
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
            if (event.recordedDesignationName) {
                next.recordedDesignationName = event.recordedDesignationName;
                next.designationId = null;
            } else if (event.designationId) {
                next.designationId = event.designationId;
                next.recordedDesignationName = null;
            }
            if (event.grade) {
                if (next.grade === "III" && event.grade === "II") {
                    next.grade2AchievedDate = event.actionDate;
                }
                next.grade = event.grade;
            }
            if (event.transferringOut && event.toDepartment) {
                next.currentDepartment = event.toDepartment;
                next.currentOffice = event.toOffice;
                next.currentDistrictOfWorking = null;
            }
            break;
        case "TRANSFER_IN":
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
        case "TRANSFER_OUT":
            if (event.recordedDesignationName) {
                next.recordedDesignationName = event.recordedDesignationName;
                next.designationId = null;
            } else if (event.designationId) {
                next.designationId = event.designationId;
                next.recordedDesignationName = null;
            }
            if (event.serviceLevelId) {
                next.serviceLevelId = event.serviceLevelId;
            }
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
        case "VACATION_OF_POST":
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
    recordedDesignationName,
    grade,
    serviceLevelId,
    serviceId,
    timelineState,
    designations,
    serviceLevels,
    services
}) => {
    if (!actionType) {
        return null;
    }

    if (actionType === "PROMOTION") {
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId,
            recordedDesignationName,
            grade,
            serviceLevelId,
            serviceId: serviceId ?? timelineState?.serviceId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels,
            services
        });
        if (assignmentError) {
            return assignmentError;
        }
        return null;
    }

    if (actionType === "ASSIGNMENT_GRADE_UPDATE") {
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: timelineState?.designationId,
            recordedDesignationName: timelineState?.recordedDesignationName,
            grade,
            serviceLevelId,
            serviceId: timelineState?.serviceId,
            effectiveServiceLevelId: timelineState?.serviceLevelId,
            designations,
            serviceLevels,
            services
        });
        if (assignmentError) {
            return assignmentError;
        }
    }

    if (actionType === "TRANSFER_OUT") {
        if (!timelineState?.currentDepartment || !timelineState?.currentOffice) {
            return "Current department and office must be set before transfer out";
        }
        if (!designationId) {
            return "Transfer out requires the destination designation";
        }
        if (isOtherDesignation(designationId) && !recordedDesignationName?.trim()) {
            return "Designation title is required for Other";
        }
        if (!serviceLevelId) {
            return "Transfer out requires the destination service level";
        }
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId,
            recordedDesignationName,
            grade: timelineState?.grade,
            serviceLevelId,
            serviceId: timelineState?.serviceId,
            effectiveServiceLevelId: serviceLevelId,
            designations,
            serviceLevels,
            services
        });
        if (assignmentError) {
            return assignmentError;
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
        services,
        designationId:
            actionType === "PROMOTION"
                ? designationId
                : timelineState?.designationId,
        serviceId: serviceId ?? timelineState?.serviceId
    });
};

export const validateCareerHistoryTimeline = (
    events,
    designations,
    serviceLevels,
    services = []
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
        recordedDesignationName: null,
        serviceId: null,
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

        if (event.actionType === "TRANSFER_OUT") {
            const transferError = validateCareerHistoryDraftEvent({
                actionType: event.actionType,
                actionDate: event.actionDate,
                designationId: event.designationId,
                recordedDesignationName: event.recordedDesignationName,
                serviceLevelId: event.serviceLevelId,
                timelineState,
                designations,
                serviceLevels,
                services
            });
            if (transferError) {
                return `Event #${index + 1} (Transfer Out): ${transferError}`;
            }
        }

        const serviceYearsError = validateCareerHistoryServiceYears({
            actionType: event.actionType,
            actionDate: event.actionDate,
            grade: event.grade,
            timelineState,
            designations,
            services,
            designationId:
                event.actionType === "PROMOTION"
                    || event.actionType === "TRANSFER_OUT"
                    ? event.designationId
                    : timelineState.designationId,
            serviceId: event.serviceId ?? timelineState.serviceId
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
        ) {
            continue;
        }

        const label =
            ACTION_TYPE_LABELS[event.actionType] || event.actionType;
        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: timelineState.designationId,
            recordedDesignationName: timelineState.recordedDesignationName,
            grade: timelineState.grade,
            serviceLevelId: timelineState.serviceLevelId,
            serviceId: timelineState.serviceId,
            effectiveServiceLevelId: timelineState.serviceLevelId,
            designations,
            serviceLevels,
            services
        });

        if (assignmentError) {
            return `Event #${index + 1} (${label}): ${assignmentError}`;
        }
    }

    return null;
};
