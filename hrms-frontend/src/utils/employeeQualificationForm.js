import { isRequirementCompleted, REQUIREMENT_STATUS } from "../constants/hrms";

const completedStatus = (checked) =>
    checked ? REQUIREMENT_STATUS.COMPLETED : REQUIREMENT_STATUS.PENDING;

export const requirementKey = (type, name) => `${type}:${name}`;

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
    );

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

    const careerProgression = employee.careerProgression || {};
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
}

export function getQualificationUpdateContext(employee) {
    if (!employee) {
        return { canUpdate: false, section: null };
    }

    if (employee.employmentType !== "PERMANENT") {
        return {
            canUpdate: false,
            section: null,
            message:
                "Qualification tracking applies to permanent government employees only."
        };
    }

    const grade = employee.grade;
    const hasConfirmedPermanent = Boolean(
        employee.careerProgression?.permanentConfirmationDate
    );

    if (grade === "III" && !hasConfirmedPermanent) {
        return {
            canUpdate: true,
            section: "permanent",
            title: "Permanent Requirements",
            description:
                "Update Grade III permanency qualifications and certificate approvals."
        };
    }

    if (grade === "III" && hasConfirmedPermanent) {
        return {
            canUpdate: true,
            section: "grade2",
            title: "Grade II Promotion Requirements",
            description:
                "Record requirements completed toward promotion from Grade III to Grade II."
        };
    }

    if (grade === "II") {
        return {
            canUpdate: true,
            section: "grade1",
            title: "Grade I Promotion Requirements",
            description:
                "Record requirements completed toward promotion from Grade II to Grade I."
        };
    }

    if (grade === "I") {
        return {
            canUpdate: false,
            section: null,
            message:
                "Grade I employees have no further promotion requirements to update here."
        };
    }

    return {
        canUpdate: false,
        section: null,
        message: "No qualification requirements are available for this employee."
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
        requirements: buildRequirements(formData, designation, employee)
    };
}
