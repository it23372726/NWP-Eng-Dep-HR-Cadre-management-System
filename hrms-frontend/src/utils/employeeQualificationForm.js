import {
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    FIXED_SPECIAL_REQUIREMENTS,
    FIXED_SUPRA_REQUIREMENTS,
    FIXED_TRAINING_GRADUATION_REQUIREMENTS,
    getEmployeeServiceRules,
    isRequirementCompleted,
    isTrainingEmployee,
    REQUIREMENT_STATUS,
    serviceAllowsSpecial,
    serviceAllowsSupra
} from "../constants/hrms";

const completedStatus = (checked) =>
    checked ? REQUIREMENT_STATUS.COMPLETED : REQUIREMENT_STATUS.PENDING;

export const requirementKey = (type, name) => `${type}:${name}`;

const SECTION_DEFINITIONS = {
    permanent: {
        id: "permanent",
        title: "Permanent Requirements",
        description:
            "Grade III permanency qualifications and certificate approvals.",
        fixedRequirements: FIXED_PERMANENT_REQUIREMENTS,
        customType: "CUSTOM_PERMANENT_REQUIREMENT",
        customField: "permanentRequirements"
    },
    grade2: {
        id: "grade2",
        title: "Grade II Promotion Requirements",
        description:
            "Requirements completed toward promotion from Grade III to Grade II.",
        fixedRequirements: FIXED_GRADE2_REQUIREMENTS,
        customType: "CUSTOM_GRADE_2_REQUIREMENT",
        customField: "grade2Requirements",
        showGrade2Years: true
    },
    grade1: {
        id: "grade1",
        title: "Grade I Promotion Requirements",
        description:
            "Requirements completed toward promotion from Grade II to Grade I.",
        fixedRequirements: FIXED_GRADE1_REQUIREMENTS,
        customType: "CUSTOM_GRADE_1_REQUIREMENT",
        customField: "grade1Requirements",
        showGrade1Years: true
    },
    supra: {
        id: "supra",
        title: "Supra Promotion Requirements",
        description:
            "Requirements completed toward promotion from Grade I to Supra.",
        fixedRequirements: FIXED_SUPRA_REQUIREMENTS,
        customType: "CUSTOM_SUPRA_REQUIREMENT",
        customField: "supraRequirements",
        showSupraYears: true
    },
    special: {
        id: "special",
        title: "Special Promotion Requirements",
        description:
            "Requirements completed toward promotion from Grade I to Special.",
        fixedRequirements: FIXED_SPECIAL_REQUIREMENTS,
        customType: "CUSTOM_SPECIAL_REQUIREMENT",
        customField: "specialRequirements",
        showSpecialYears: true
    },
    trainingGraduation: {
        id: "trainingGraduation",
        title: "Training → Permanent Requirements",
        description:
            "Pass the training examination and complete the training period before appointment as permanent.",
        fixedRequirements: FIXED_TRAINING_GRADUATION_REQUIREMENTS,
        customType: null,
        customField: null
    }
};

const HIGHER_PERMANENT_GRADES = ["II", "I", "Supra", "Special"];

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

export const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
    );

const REQUIREMENT_SECTION_BY_TYPE = {
    EB_GRADE_3: "permanent",
    GOVERNMENT_LANGUAGE_QUALIFICATION: "permanent",
    MEDICAL_REPORT: "permanent",
    OL_CERTIFICATE: "permanent",
    AL_CERTIFICATE: "permanent",
    DEGREE_CERTIFICATE: "permanent",
    BIRTH_CERTIFICATE: "permanent",
    CUSTOM_PERMANENT_REQUIREMENT: "permanent",
    EB_GRADE_2: "grade2",
    CUSTOM_GRADE_2_REQUIREMENT: "grade2",
    EB_GRADE_1: "grade1",
    CUSTOM_GRADE_1_REQUIREMENT: "grade1",
    SUPRA_REQUIREMENT: "supra",
    CUSTOM_SUPRA_REQUIREMENT: "supra",
    MASTERS_DEGREE: "special",
    CUSTOM_SPECIAL_REQUIREMENT: "special",
    TRAINING_EXAM: "trainingGraduation"
};

function getServiceTerminalSectionId(employee) {
    const service = getEmployeeServiceRules(employee);
    if (serviceAllowsSupra(service)) {
        return "supra";
    }
    if (serviceAllowsSpecial(service)) {
        return "special";
    }
    return null;
}

export function getEditableSectionId(employee) {
    if (!employee) {
        return null;
    }

    if (isTrainingEmployee(employee)) {
        return "trainingGraduation";
    }

    if (employee.employmentType !== "PERMANENT") {
        return null;
    }

    const grade = employee.grade;
    const hasConfirmedPermanent = Boolean(
        employee.careerProgression?.permanentConfirmationDate
    );

    if (grade === "III" && !hasConfirmedPermanent) {
        return "permanent";
    }

    if (grade === "III" && hasConfirmedPermanent) {
        return "grade2";
    }

    if (grade === "II") {
        return "grade1";
    }

    if (grade === "I") {
        return getServiceTerminalSectionId(employee);
    }

    return null;
}

export function isRequirementLocked(employee, type, name = null, sectionId = null) {
    if (!employee) {
        return false;
    }

    if (isTrainingEmployee(employee)) {
        return type === "EB_GRADE_2"
            || type === "EB_GRADE_1"
            || type === "CUSTOM_GRADE_2_REQUIREMENT"
            || type === "CUSTOM_GRADE_1_REQUIREMENT"
            || type === "SUPRA_REQUIREMENT"
            || type === "CUSTOM_SUPRA_REQUIREMENT"
            || type === "MASTERS_DEGREE"
            || type === "CUSTOM_SPECIAL_REQUIREMENT";
    }

    const requirementSection = sectionId ?? REQUIREMENT_SECTION_BY_TYPE[type];
    const editableSectionId = getEditableSectionId(employee);

    if (!editableSectionId) {
        return true;
    }

    if (requirementSection && requirementSection !== editableSectionId) {
        return true;
    }

    return false;
}

const resolveRequirementStatus = (employee, type, name, checked, sectionId) => {
    if (isRequirementLocked(employee, type, name, sectionId)) {
        return REQUIREMENT_STATUS.COMPLETED;
    }

    return completedStatus(checked);
};

const appendCustomRequirementFields = (form, employee) => {
    const service = getEmployeeServiceRules(employee);

    normalizeRequirements(service?.permanentRequirements).forEach(
        (requirement) => {
            const key = requirementKey(
                "CUSTOM_PERMANENT_REQUIREMENT",
                requirement.requirementName
            );
            form[key] = isNamedRequirementCompleted(
                employee,
                "CUSTOM_PERMANENT_REQUIREMENT",
                requirement.requirementName
            );
        }
    );

    normalizeRequirements(service?.grade2Requirements).forEach(
        (requirement) => {
            const key = requirementKey(
                "CUSTOM_GRADE_2_REQUIREMENT",
                requirement.requirementName
            );
            form[key] = isNamedRequirementCompleted(
                employee,
                "CUSTOM_GRADE_2_REQUIREMENT",
                requirement.requirementName
            );
        }
    );

    normalizeRequirements(service?.grade1Requirements).forEach(
        (requirement) => {
            const key = requirementKey(
                "CUSTOM_GRADE_1_REQUIREMENT",
                requirement.requirementName
            );
            form[key] = isNamedRequirementCompleted(
                employee,
                "CUSTOM_GRADE_1_REQUIREMENT",
                requirement.requirementName
            );
        }
    );

    normalizeRequirements(service?.supraRequirements).forEach(
        (requirement) => {
            const key = requirementKey(
                "CUSTOM_SUPRA_REQUIREMENT",
                requirement.requirementName
            );
            form[key] = isNamedRequirementCompleted(
                employee,
                "CUSTOM_SUPRA_REQUIREMENT",
                requirement.requirementName
            );
        }
    );

    normalizeRequirements(service?.specialRequirements).forEach(
        (requirement) => {
            const key = requirementKey(
                "CUSTOM_SPECIAL_REQUIREMENT",
                requirement.requirementName
            );
            form[key] = isNamedRequirementCompleted(
                employee,
                "CUSTOM_SPECIAL_REQUIREMENT",
                requirement.requirementName
            );
        }
    );
};

export function mapEmployeeToQualificationForm(employee) {
    if (!employee) {
        return {};
    }

    const form = {
        trainingExamPassed: isRequirementCompleted(employee, "TRAINING_EXAM"),
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
        ebGrade2Passed: isRequirementCompleted(employee, "EB_GRADE_2"),
        ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1"),
        supraExamPassed: isRequirementCompleted(employee, "SUPRA_REQUIREMENT"),
        mastersDegreeCompleted: isRequirementCompleted(employee, "MASTERS_DEGREE")
    };

    appendCustomRequirementFields(form, employee);
    return form;
}

export function buildRequirements(formData, employee) {
    if (isTrainingEmployee(employee)) {
        return [
            {
                requirementType: "TRAINING_EXAM",
                status: resolveRequirementStatus(
                    employee,
                    "TRAINING_EXAM",
                    null,
                    formData.trainingExamPassed,
                    "trainingGraduation"
                )
            }
        ];
    }

    const requirements = [
        {
            requirementType: "EB_GRADE_3",
            status: resolveRequirementStatus(
                employee,
                "EB_GRADE_3",
                null,
                formData.ebGrade3Passed,
                "permanent"
            )
        },
        {
            requirementType: "GOVERNMENT_LANGUAGE_QUALIFICATION",
            status: resolveRequirementStatus(
                employee,
                "GOVERNMENT_LANGUAGE_QUALIFICATION",
                null,
                formData.languageQualificationPassed,
                "permanent"
            )
        },
        {
            requirementType: "MEDICAL_REPORT",
            status: resolveRequirementStatus(
                employee,
                "MEDICAL_REPORT",
                null,
                formData.medicalReportCompleted,
                "permanent"
            )
        },
        {
            requirementType: "OL_CERTIFICATE",
            status: resolveRequirementStatus(
                employee,
                "OL_CERTIFICATE",
                null,
                formData.olApproved,
                "permanent"
            )
        },
        {
            requirementType: "AL_CERTIFICATE",
            status: resolveRequirementStatus(
                employee,
                "AL_CERTIFICATE",
                null,
                formData.alApproved,
                "permanent"
            )
        },
        {
            requirementType: "DEGREE_CERTIFICATE",
            status: resolveRequirementStatus(
                employee,
                "DEGREE_CERTIFICATE",
                null,
                formData.degreeApproved,
                "permanent"
            )
        },
        {
            requirementType: "BIRTH_CERTIFICATE",
            status: resolveRequirementStatus(
                employee,
                "BIRTH_CERTIFICATE",
                null,
                formData.birthCertificateApproved,
                "permanent"
            )
        },
        {
            requirementType: "EB_GRADE_2",
            status: resolveRequirementStatus(
                employee,
                "EB_GRADE_2",
                null,
                formData.ebGrade2Passed,
                "grade2"
            )
        },
        {
            requirementType: "EB_GRADE_1",
            status: resolveRequirementStatus(
                employee,
                "EB_GRADE_1",
                null,
                formData.ebGrade1Passed,
                "grade1"
            )
        }
    ];

    const service = getEmployeeServiceRules(employee);
    if (serviceAllowsSupra(service)) {
        requirements.push({
            requirementType: "SUPRA_REQUIREMENT",
            status: resolveRequirementStatus(
                employee,
                "SUPRA_REQUIREMENT",
                null,
                formData.supraExamPassed,
                "supra"
            )
        });
    }
    if (serviceAllowsSpecial(service)) {
        requirements.push({
            requirementType: "MASTERS_DEGREE",
            status: resolveRequirementStatus(
                employee,
                "MASTERS_DEGREE",
                null,
                formData.mastersDegreeCompleted,
                "special"
            )
        });
    }

    const appendCustomRequirements = (
        type,
        sectionId,
        designationRequirements
    ) => {
        normalizeRequirements(designationRequirements).forEach((requirement) => {
            const key = requirementKey(type, requirement.requirementName);
            const checked = formData[key] ?? isNamedRequirementCompleted(
                employee,
                type,
                requirement.requirementName
            );
            requirements.push({
                requirementType: type,
                requirementName: requirement.requirementName,
                status: resolveRequirementStatus(
                    employee,
                    type,
                    requirement.requirementName,
                    checked,
                    sectionId
                )
            });
        });
    };

    appendCustomRequirements(
        "CUSTOM_PERMANENT_REQUIREMENT",
        "permanent",
        service?.permanentRequirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_2_REQUIREMENT",
        "grade2",
        service?.grade2Requirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_1_REQUIREMENT",
        "grade1",
        service?.grade1Requirements
    );
    appendCustomRequirements(
        "CUSTOM_SUPRA_REQUIREMENT",
        "supra",
        service?.supraRequirements
    );
    appendCustomRequirements(
        "CUSTOM_SPECIAL_REQUIREMENT",
        "special",
        service?.specialRequirements
    );

    return requirements;
}

function getVisibleSectionIds(employee, grade, hasConfirmedPermanent) {
    const service = getEmployeeServiceRules(employee);
    const terminalSectionId = getServiceTerminalSectionId(employee);

    if (grade === "III" && !hasConfirmedPermanent) {
        return ["permanent"];
    }

    if (grade === "III" && hasConfirmedPermanent) {
        return ["permanent", "grade2"];
    }

    if (grade === "II") {
        return ["permanent", "grade2", "grade1"];
    }

    if (grade === "I" && terminalSectionId) {
        return ["permanent", "grade2", "grade1", terminalSectionId];
    }

    if ((grade === "Supra" && serviceAllowsSupra(service))
        || (grade === "Special" && serviceAllowsSpecial(service))) {
        return ["permanent", "grade2", "grade1", terminalSectionId].filter(Boolean);
    }

    if (HIGHER_PERMANENT_GRADES.includes(grade)) {
        return ["permanent", "grade2", "grade1"];
    }

    return [];
}

export function getQualificationUpdateContext(employee) {
    if (!employee) {
        return { canUpdate: false, sections: [] };
    }

    if (isTrainingEmployee(employee)) {
        return {
            canUpdate: true,
            canSave: true,
            sections: [SECTION_DEFINITIONS.trainingGraduation],
            editableSectionId: "trainingGraduation",
            isTraining: true
        };
    }

    if (employee.employmentType !== "PERMANENT") {
        return {
            canUpdate: false,
            sections: [],
            message:
                "Qualification tracking applies to permanent government employees only."
        };
    }

    const grade = employee.grade;
    const hasConfirmedPermanent = Boolean(
        employee.careerProgression?.permanentConfirmationDate
    );
    const sectionIds = getVisibleSectionIds(employee, grade, hasConfirmedPermanent);
    const sections = sectionIds.map((id) => SECTION_DEFINITIONS[id]);
    const editableSectionId = getEditableSectionId(employee);

    if (sections.length === 0) {
        return {
            canUpdate: false,
            sections: [],
            message: "No qualification requirements are available for this employee."
        };
    }

    if (!editableSectionId) {
        return {
            canUpdate: true,
            canSave: false,
            sections,
            editableSectionId: null,
            message:
                "All qualification stages for this grade are complete. Requirements are shown for reference only."
        };
    }

    return {
        canUpdate: true,
        canSave: true,
        sections,
        editableSectionId
    };
}

export function buildQualificationUpdatePayload(employee, formData) {
    if (isTrainingEmployee(employee)) {
        return buildTrainingQualificationUpdatePayload(employee, formData);
    }

    const careerProgression = employee.careerProgression || {};
    const designationId = employee.designation?.id ?? null;

    return {
        employeeNo: employee.employeeNo,
        fullName: employee.fullName,
        designationId,
        nic: employee.nic,
        tin: employee.tin || null,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        grade: employee.grade,
        dateOfFirstAppointment: employee.dateOfFirstAppointment,
        incremantDate: employee.incremantDate || null,
        widowsOrphansPensionNo: employee.widowsOrphansPensionNo || null,
        enteredDateToAllIslandService:
            employee.enteredDateToAllIslandService || null,
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace,
        currentWorkingPlace: employee.currentWorkingPlace,
        currentDistrictOfWorking: employee.currentDistrictOfWorking,
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade || null,
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil,
        permanentAddress: employee.permanentAddress,
        residentDistrict: employee.residentDistrict || null,
        privateVehicleUsedForGovWork: employee.privateVehicleUsedForGovWork ?? false,
        privateVehicleDescription: employee.privateVehicleDescription || null,
        privateVehiclePermissionDate: employee.privateVehiclePermissionDate || null,
        privateVehicleExpireDate: employee.privateVehicleExpireDate || null,
        privateVehicleInsuranceNumber: employee.privateVehicleInsuranceNumber || null,
        privateVehicleLicensePlateNumber: employee.privateVehicleLicensePlateNumber || null,
        privateVehicleRented: employee.privateVehicleRented ?? false,
        privateVehicleRentedFrom: employee.privateVehicleRentedFrom || null,
        contactNo: employee.contactNo,
        emailAddress: employee.emailAddress || null,
        serviceLevelId: employee.serviceLevel?.id,
        employmentType: employee.employmentType,
        alreadyConfirmedPermanent: Boolean(
            careerProgression.permanentConfirmationDate
        ),
        permanentConfirmationDate:
            careerProgression.permanentConfirmationDate || null,
        grade2RequiredYears: null,
        grade1RequiredYears: null,
        qualificationUpdateOnly: true,
        requirements: buildRequirements(formData, employee)
    };
}

export function buildTrainingQualificationUpdatePayload(employee, formData) {
    return {
        employeeNo: employee.employeeNo,
        fullName: employee.fullName,
        designationId: employee.designation?.id ?? null,
        nic: employee.nic,
        tin: employee.tin || null,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        dateOfFirstAppointment: employee.dateOfFirstAppointment,
        incremantDate: employee.incremantDate || null,
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil,
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace,
        currentWorkingPlace: employee.currentWorkingPlace,
        currentDistrictOfWorking: employee.currentDistrictOfWorking,
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade || null,
        permanentAddress: employee.permanentAddress,
        residentDistrict: employee.residentDistrict || null,
        contactNo: employee.contactNo,
        emailAddress: employee.emailAddress || null,
        serviceLevelId: employee.serviceLevel?.id,
        employmentType: null,
        qualificationUpdateOnly: true,
        requirements: buildRequirements(formData, employee)
    };
}
