import {
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    isRequirementCompleted,
    REQUIREMENT_STATUS
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
    CUSTOM_GRADE_1_REQUIREMENT: "grade1"
};

export function getEditableSectionId(employee) {
    if (!employee || employee.employmentType !== "PERMANENT") {
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

    if (grade === "II" || HIGHER_PERMANENT_GRADES.includes(grade)) {
        return "grade1";
    }

    return null;
}

export function isRequirementLocked(employee, type, name = null, sectionId = null) {
    if (!employee) {
        return false;
    }

    const requirementSection = sectionId ?? REQUIREMENT_SECTION_BY_TYPE[type];
    const editableSectionId = getEditableSectionId(employee);

    if (requirementSection && requirementSection === editableSectionId) {
        return false;
    }

    if (name) {
        return isNamedRequirementCompleted(employee, type, name);
    }

    return isRequirementCompleted(employee, type);
}

const resolveRequirementStatus = (employee, type, name, checked, sectionId) => {
    if (isRequirementLocked(employee, type, name, sectionId)) {
        return REQUIREMENT_STATUS.COMPLETED;
    }

    return completedStatus(checked);
};

const appendCustomRequirementFields = (form, employee, designation) => {
    normalizeRequirements(designation?.permanentRequirements).forEach(
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

    normalizeRequirements(designation?.grade2Requirements).forEach(
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

    normalizeRequirements(designation?.grade1Requirements).forEach(
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
};

export function mapEmployeeToQualificationForm(employee) {
    if (!employee) {
        return {};
    }

    const form = {
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
        ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1")
    };

    appendCustomRequirementFields(form, employee, employee.designation);
    return form;
}

export function buildRequirements(formData, designation, employee) {
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
        designation?.permanentRequirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_2_REQUIREMENT",
        "grade2",
        designation?.grade2Requirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_1_REQUIREMENT",
        "grade1",
        designation?.grade1Requirements
    );

    return requirements;
}

function getVisibleSectionIds(grade, hasConfirmedPermanent) {
    if (grade === "III" && !hasConfirmedPermanent) {
        return ["permanent"];
    }

    if (grade === "III" && hasConfirmedPermanent) {
        return ["permanent", "grade2"];
    }

    if (grade === "II" || HIGHER_PERMANENT_GRADES.includes(grade)) {
        return ["permanent", "grade2", "grade1"];
    }

    return [];
}

export function getQualificationUpdateContext(employee) {
    if (!employee) {
        return { canUpdate: false, sections: [] };
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
    const sectionIds = getVisibleSectionIds(grade, hasConfirmedPermanent);
    const sections = sectionIds.map((id) => SECTION_DEFINITIONS[id]);

    if (sections.length === 0) {
        return {
            canUpdate: false,
            sections: [],
            message: "No qualification requirements are available for this employee."
        };
    }

    return {
        canUpdate: true,
        sections,
        editableSectionId: getEditableSectionId(employee)
    };
}

export function buildQualificationUpdatePayload(employee, formData) {
    const careerProgression = employee.careerProgression || {};
    const designation = employee.designation;

    return {
        employeeNo: employee.employeeNo,
        fullName: employee.fullName,
        designationId: designation?.id,
        nic: employee.nic,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        grade: employee.grade,
        dateOfFirstAppointment: employee.dateOfFirstAppointment,
        incremantDate: employee.incremantDate || null,
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
        contactNo: employee.contactNo,
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
        requirements: buildRequirements(formData, designation, employee)
    };
}
